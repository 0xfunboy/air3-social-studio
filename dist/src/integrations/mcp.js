import { publicAccount } from '../core/service.js';
import { AppError, assert, object, text, safeError } from '../core/util.js';
import { validateSchema } from '../agents/llm.js';
const string = { type: 'string' };
const schema = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const TOOL_DEFS = [
    { name: 'brand_context', description: 'Legge regole obbligatorie e account del brand, senza segreti.', inputSchema: schema({ brandId: string }), annotations: { readOnlyHint: true } },
    { name: 'knowledge_search', description: 'RAG su documenti approvati del brand con filtro ruolo e piattaforma.', inputSchema: schema({ brandId: string, query: string, role: string, platform: string }, ['brandId', 'query', 'role']), annotations: { readOnlyHint: true } },
    { name: 'recent_posts', description: 'Legge post e stati, senza pubblicare.', inputSchema: schema({ brandId: string }), annotations: { readOnlyHint: true } },
    { name: 'analytics_summary', description: 'Legge le osservazioni metriche disponibili e la loro provenienza.', inputSchema: schema({ brandId: string }), annotations: { readOnlyHint: true } },
    { name: 'create_draft', description: 'Crea una bozza; non approva e non pubblica.', inputSchema: schema({ brandId: string, accountId: string, title: string, text: string, objective: string, format: { type: 'string', enum: ['text', 'image', 'carousel', 'video', 'reel', 'story', 'message', 'template'] } }, ['brandId', 'accountId', 'title', 'format']), annotations: { readOnlyHint: false, destructiveHint: false } },
    { name: 'request_generation', description: 'Accoda la generazione di una bozza esistente.', inputSchema: schema({ contentId: string, revision: { type: 'integer', minimum: 1 } }), annotations: { readOnlyHint: false, destructiveHint: false } },
    { name: 'schedule_approved', description: 'Programma esclusivamente una versione già approvata da un umano o da policy esplicita.', inputSchema: schema({ contentId: string, revision: { type: 'integer', minimum: 1 }, at: string }), annotations: { readOnlyHint: false, destructiveHint: false } }
];
export class McpServer {
    studio;
    constructor(studio) {
        this.studio = studio;
    }
    async handle(p, request) {
        const rid = request.id ?? null;
        try {
            assert(request.jsonrpc === '2.0' && typeof request.method === 'string', 'RPC', 'Richiesta JSON-RPC non valida');
            if (request.method.startsWith('notifications/'))
                return null;
            if (request.method === 'initialize')
                return { jsonrpc: '2.0', id: rid, result: { protocolVersion: ['2025-11-25', '2025-06-18', '2025-03-26'].includes(request.params?.protocolVersion) ? request.params.protocolVersion : '2025-11-25', serverInfo: { name: 'air3-social-studio', version: '0.1.0' }, capabilities: { tools: {}, resources: {} }, instructions: 'Tutte le operazioni sono limitate al workspace e al brand del token. Approvazione umana non esposta come tool.' } };
            if (request.method === 'ping')
                return { jsonrpc: '2.0', id: rid, result: {} };
            if (request.method === 'tools/list')
                return { jsonrpc: '2.0', id: rid, result: { tools: TOOL_DEFS } };
            if (request.method === 'resources/list')
                return { jsonrpc: '2.0', id: rid, result: { resources: this.studio.store.list(p, 'brand').map(x => ({ uri: `smm://brand/${x.id}`, name: x.data.name, mimeType: 'application/json' })) } };
            if (request.method === 'resources/read') {
                const match = /^smm:\/\/brand\/([a-f0-9]{32})$/.exec(request.params?.uri ?? '');
                assert(match, 'RESOURCE', 'URI non supportata');
                const e = this.studio.brand(p, match[1]);
                return { jsonrpc: '2.0', id: rid, result: { contents: [{ uri: request.params.uri, mimeType: 'application/json', text: JSON.stringify(e.data) }] } };
            }
            if (request.method === 'tools/call') {
                const def = TOOL_DEFS.find(x => x.name === request.params?.name);
                assert(def, 'TOOL', 'Tool non disponibile');
                const a = object(request.params.arguments ?? {});
                validateSchema(a, def.inputSchema);
                let result;
                try {
                    switch (def.name) {
                        case 'brand_context': {
                            const q = this.studio.scope(p, a.brandId);
                            result = { brand: this.studio.brand(q, a.brandId), accounts: this.studio.store.list(q, 'account', a.brandId).map(publicAccount) };
                            break;
                        }
                        case 'knowledge_search':
                            result = await this.studio.rag.retrieve(p, a.brandId, text(a.query, 'query', 3000), text(a.role, 'ruolo', 30), a.platform ?? '*');
                            break;
                        case 'recent_posts':
                            this.studio.scope(p, a.brandId);
                            result = this.studio.recent(p, a.brandId);
                            break;
                        case 'analytics_summary':
                            this.studio.scope(p, a.brandId);
                            result = this.studio.store.list(p, 'metric', a.brandId, 200);
                            break;
                        case 'create_draft':
                            result = this.studio.saveContent(p, a.brandId, a);
                            break;
                        case 'request_generation':
                            result = this.studio.enqueueGeneration(p, a.contentId, a.revision);
                            break;
                        case 'schedule_approved':
                            result = this.studio.schedule(p, a.contentId, a.revision, a.at);
                            break;
                    }
                    return { jsonrpc: '2.0', id: rid, result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false } };
                }
                catch (err) {
                    return { jsonrpc: '2.0', id: rid, result: { content: [{ type: 'text', text: safeError(err) }], isError: true } };
                }
            }
            return { jsonrpc: '2.0', id: rid, error: { code: -32601, message: 'Metodo non disponibile' } };
        }
        catch (err) {
            return { jsonrpc: '2.0', id: rid, error: { code: err instanceof AppError ? -32602 : -32603, message: safeError(err) } };
        }
    }
}
//# sourceMappingURL=mcp.js.map