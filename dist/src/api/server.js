import { clientIp } from '../core/proxy.js';
import { ExperienceApi } from './experience.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { publicAccount } from '../core/service.js';
import { requireRole, requireHuman } from '../core/auth.js';
import { AppError, assert, id, now, object, safeError, text, strings } from '../core/util.js';
import { CAPABILITIES } from '../social/capabilities.js';
import { CONTRACTS } from '../agents/prompts.js';
import { McpServer } from '../integrations/mcp.js';
import { Webhooks } from '../integrations/webhooks.js';
import { passwordHash, passwordValid } from '../core/crypto.js';
export async function readBody(req, max = 1500000) {
    let n = 0;
    const chunks = [];
    for await (const chunk of req) {
        n += chunk.length;
        assert(n <= max, 'BODY_SIZE', 'Richiesta troppo grande', 413);
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
function send(res, value, status = 200) { const raw = JSON.stringify(value); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(raw); }
function jsonBody(raw) {
    try {
        return object(JSON.parse(raw.toString() || '{}'));
    }
    catch {
        throw new AppError(400, 'JSON', 'JSON non valido');
    }
}
function safeKnowledge(e) { const { chunks, ...data } = e.data; return { ...e, data: { ...data, chunkCount: chunks.length } }; }
export function createApp(studio, auth, webRoot = resolve('web')) {
    const mcp = new McpServer(studio), webhooks = new Webhooks(studio), experience = new ExperienceApi(studio, auth);
    const rate = new Map();
    const server = createServer(async (req, res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
        if (studio.cfg.baseUrl.startsWith('https://'))
            res.setHeader('Strict-Transport-Security', 'max-age=31536000');
        try {
            const method = req.method ?? 'GET', u = new URL(req.url ?? '/', studio.cfg.baseUrl), path = u.pathname;
            if (await experience.callback(req, res, u))
                return;
            if (path === '/healthz' && (method === 'GET' || method === 'HEAD')) {
                send(res, { ok: true, service: 'air3-social-studio', version: '0.2.0' });
                return;
            }
            if (path === '/webhooks/meta-global') {
                if (method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(webhooks.metaChallenge('', u.searchParams, true));
                    return;
                }
                if (method === 'POST') {
                    await webhooks.metaReceive('', req.headers, await readBody(req, 1000000), true);
                    send(res, { ok: true });
                    return;
                }
                throw new AppError(405, 'METHOD', 'Metodo non consentito');
            }
            const metaWebhook = /^\/webhooks\/meta\/([a-f0-9]{32})$/.exec(path);
            if (metaWebhook) {
                if (method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(webhooks.metaChallenge(metaWebhook[1], u.searchParams));
                    return;
                }
                if (method === 'POST') {
                    await webhooks.metaReceive(metaWebhook[1], req.headers, await readBody(req, 1000000));
                    send(res, { ok: true });
                    return;
                }
                throw new AppError(405, 'METHOD', 'Metodo non consentito');
            }
            const signed = /^\/media\/([a-f0-9]{32})$/.exec(path);
            if (signed && ['GET', 'HEAD'].includes(method)) {
                const file = studio.media.signed(signed[1], u.searchParams);
                const size = file.asset.data.size;
                res.setHeader('Content-Type', file.asset.data.mime);
                res.setHeader('Cache-Control', 'private, max-age=300');
                res.setHeader('Accept-Ranges', 'bytes');
                const range = req.headers.range;
                if (range) {
                    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
                    assert(match, 'RANGE', 'Range non valida', 416);
                    const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
                    assert(start <= end && start < size, 'RANGE', 'Range oltre il file', 416);
                    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
                    if (method === 'HEAD')
                        res.end();
                    else
                        createReadStream(file.path, { start, end }).on('error', () => res.destroy()).pipe(res);
                }
                else {
                    res.writeHead(200, { 'Content-Length': size });
                    if (method === 'HEAD')
                        res.end();
                    else
                        createReadStream(file.path).on('error', () => res.destroy()).pipe(res);
                }
                return;
            }
            const wh = /^\/webhooks\/([a-f0-9]{32})$/.exec(path);
            if (wh) {
                if (method === 'GET') {
                    const challenge = webhooks.challenge(wh[1], u.searchParams);
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(challenge);
                    return;
                }
                assert(method === 'POST', 'METHOD', 'Metodo non consentito', 405);
                await webhooks.receive(wh[1], req.headers, await readBody(req, 2000000));
                send(res, { received: true });
                return;
            }
            if (path.startsWith('/api/') || path === '/mcp') {
                const ip = clientIp(req), at = Date.now();
                for (const [k, v] of rate)
                    if (v.until < at)
                        rate.delete(k);
                assert(rate.size < 10000 || rate.has(ip), 'RATE_LIMIT', 'Troppi client', 429);
                const r = rate.get(ip) ?? { n: 0, until: at + 60000 };
                r.n++;
                rate.set(ip, r);
                assert(r.n <= 500, 'RATE_LIMIT', 'Limite richieste al minuto raggiunto', 429);
                const mutating = !['GET', 'HEAD'].includes(method);
                if (await experience.public(req, res, u))
                    return;
                if (path === '/api/login' && method === 'POST') {
                    assert(!req.headers.origin || req.headers.origin === studio.cfg.baseUrl, 'ORIGIN', 'Origin non consentita', 403);
                    assert(req.headers['content-type']?.startsWith('application/json'), 'CONTENT_TYPE', 'Richiesto application/json', 415);
                    const b = jsonBody(await readBody(req, 10000)), result = auth.login(text(b.email, 'email', 300), text(b.password, 'password', 1000), ip);
                    res.setHeader('Set-Cookie', auth.cookie(result.token));
                    send(res, { csrf: result.csrf, user: result.user, workspaces: result.workspaces });
                    return;
                }
                const { principal: p, csrf } = auth.principal(req, mutating);
                if (await experience.protected(req, res, u, p))
                    return;
                const bidMatch = /^\/api\/brands\/([a-f0-9]{32})(?:\/(.*))?$/.exec(path);
                if (path === '/api/logout' && method === 'POST') {
                    auth.logout(req);
                    res.setHeader('Set-Cookie', auth.cookie('', true));
                    send(res, { ok: true });
                    return;
                }
                if (path === '/api/me' && method === 'GET') {
                    const user = studio.store.db.prepare('SELECT id,email FROM users WHERE id=?').get(p.userId);
                    send(res, { principal: p, csrf, user, siteAdmin: auth.siteAdmin(p.userId), googleLinked: !!studio.store.db.prepare("SELECT user_id FROM identities WHERE provider='google' AND user_id=?").get(p.userId), workspaces: p.via === 'session' ? auth.workspaces(p.userId) : [] });
                    return;
                }
                if (path === '/api/status' && method === 'GET') {
                    send(res, { version: '0.2.0', model: { configured: studio.model.available, name: studio.model.name, provider: studio.cfg.llmProvider }, embeddings: { configured: studio.rag.embedder.enabled, model: studio.rag.embedder.enabled ? studio.rag.embedder.model : null, fallback: 'lexical' }, imageModel: studio.cfg.imageModel || null, workerEnabled: studio.cfg.worker, renderer: await studio.media.health(), baseUrl: studio.cfg.baseUrl, platforms: CAPABILITIES });
                    return;
                }
                if (path === '/api/brands' && method === 'GET') {
                    send(res, studio.store.list(p, 'brand'));
                    return;
                }
                if (path === '/api/brands' && method === 'POST') {
                    send(res, studio.saveBrand(p, jsonBody(await readBody(req))), 201);
                    return;
                }
                if (path === '/api/admin/users') {
                    requireRole(p, 'admin');
                    requireHuman(p);
                    if (method === 'GET') {
                        const rows = studio.store.db.prepare('SELECT u.id,u.email,m.role,COALESCE(mp.permissions,"[]") as permissions FROM users u JOIN memberships m ON m.user_id=u.id LEFT JOIN member_permissions mp ON mp.workspace_id=m.workspace_id AND mp.user_id=u.id WHERE m.workspace_id=?').all(p.workspaceId);
                        send(res, rows.map(r => {
                            let perms = [];
                            try {
                                perms = JSON.parse(r.permissions);
                            }
                            catch { }
                            return { id: r.id, email: r.email, role: r.role, permissions: Array.isArray(perms) ? perms : [] };
                        }));
                        return;
                    }
                    if (method === 'POST') {
                        const b = jsonBody(await readBody(req, 10000));
                        send(res, { id: auth.addUser(p, text(b.email, 'email', 300), text(b.password, 'password', 1000), b.role) }, 201);
                        return;
                    }
                }
                if (path === '/api/admin/workspaces' && method === 'POST') {
                    requireRole(p, 'admin');
                    requireHuman(p);
                    const b = jsonBody(await readBody(req, 10000)), wid = id();
                    studio.store.transaction(() => { studio.store.db.prepare('INSERT INTO workspaces VALUES (?,?)').run(wid, text(b.name, 'nome workspace', 100)); studio.store.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(p.userId, wid, 'admin'); });
                    send(res, { id: wid }, 201);
                    return;
                }
                if (path === '/api/password' && method === 'POST') {
                    requireHuman(p);
                    const b = jsonBody(await readBody(req, 10000)), row = studio.store.db.prepare('SELECT password FROM users WHERE id=?').get(p.userId);
                    assert(passwordValid(text(b.current, 'password attuale', 1000), row.password), 'PASSWORD', 'Password attuale non valida');
                    const password = text(b.password, 'nuova password', 1000);
                    assert(password.length >= 16, 'PASSWORD', 'Minimo 16 caratteri');
                    studio.store.transaction(() => { studio.store.db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(password), p.userId); studio.store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(p.userId); });
                    res.setHeader('Set-Cookie', auth.cookie('', true));
                    send(res, { ok: true });
                    return;
                }
                if (path === '/api/prompts' && method === 'GET') {
                    requireRole(p, 'admin');
                    send(res, CONTRACTS);
                    return;
                }
                if (path === '/mcp') {
                    assert(!req.headers.origin || req.headers.origin === studio.cfg.baseUrl, 'ORIGIN', 'Origin MCP non autorizzata', 403);
                    assert(method === 'POST', 'METHOD', 'Server MCP stateless: usare POST; nessuno stream SSE persistente', 405);
                    const version = req.headers['mcp-protocol-version'];
                    assert(!version || ['2025-11-25', '2025-06-18', '2025-03-26'].includes(String(version)), 'MCP_VERSION', 'Versione MCP non supportata');
                    const output = await mcp.handle(p, jsonBody(await readBody(req)));
                    if (output)
                        send(res, output);
                    else {
                        res.writeHead(202);
                        res.end();
                    }
                    return;
                }
                if (bidMatch) {
                    const bid = bidMatch[1], tail = bidMatch[2] ?? '';
                    const scoped = studio.scope(p, bid);
                    if (!tail && method === 'GET') {
                        send(res, studio.brand(scoped, bid));
                        return;
                    }
                    if (!tail && method === 'PUT') {
                        send(res, studio.saveBrand(p, jsonBody(await readBody(req)), bid));
                        return;
                    }
                    const collections = { accounts: 'account', contents: 'content', knowledge: 'knowledge', campaigns: 'campaign', assets: 'asset', inbox: 'inbox', metrics: 'metric', insights: 'insight', plans: 'plan', prompts: 'prompt', executions: 'execution', contacts: 'contact' };
                    if (collections[tail] && method === 'GET') {
                        let rows = studio.store.list(scoped, collections[tail], bid, tail === 'executions' ? 100 : 1000);
                        if (tail === 'accounts')
                            rows = rows.map(x => publicAccount(x));
                        if (tail === 'knowledge')
                            rows = rows.map(x => safeKnowledge(x));
                        if (tail === 'assets')
                            rows = rows.map(x => ({ ...x, data: { ...x.data, url: studio.media.url(scoped, x.id) } }));
                        if (tail === 'executions')
                            rows = rows.map(x => ({ ...x, data: { ...x.data, input: undefined, output: undefined } }));
                        send(res, rows);
                        return;
                    }
                    if (tail === 'jobs' && method === 'GET') {
                        send(res, studio.store.jobs(scoped, bid));
                        return;
                    }
                    if (tail === 'audit' && method === 'GET') {
                        requireRole(p, 'approver');
                        send(res, studio.store.audits(scoped, bid).map(x => ({ ...x, detail: JSON.parse(x.detail) })));
                        return;
                    }
                    if (tail === 'assets' && method === 'POST') {
                        requireRole(p, 'editor');
                        const bytes = await readBody(req, 128 * 1024 * 1024);
                        const e = await studio.media.save(scoped, bid, bytes, String(req.headers['content-type'] ?? '').split(';')[0], u.searchParams.get('name') ?? 'Upload', false, u.searchParams.get('alt') ?? '');
                        send(res, { ...e, data: { ...e.data, url: studio.media.url(scoped, e.id) } }, 201);
                        return;
                    }
                    if (tail === 'knowledge' && method === 'POST') {
                        send(res, safeKnowledge(await studio.saveKnowledge(scoped, bid, jsonBody(await readBody(req)))), 201);
                        return;
                    }
                    if (tail === 'accounts' && method === 'POST') {
                        send(res, studio.saveAccount(scoped, bid, jsonBody(await readBody(req))), 201);
                        return;
                    }
                    if (tail === 'contents' && method === 'POST') {
                        send(res, studio.saveContent(scoped, bid, jsonBody(await readBody(req))), 201);
                        return;
                    }
                    if (tail === 'campaigns' && method === 'POST') {
                        send(res, studio.saveCampaign(scoped, bid, jsonBody(await readBody(req))), 201);
                        return;
                    }
                    if (tail === 'prompts' && method === 'POST') {
                        send(res, studio.savePrompt(scoped, bid, jsonBody(await readBody(req))), 201);
                        return;
                    }
                    if (tail === 'contacts' && method === 'POST') {
                        send(res, studio.saveContact(scoped, bid, jsonBody(await readBody(req))), 201);
                        return;
                    }
                    if (tail === 'rag' && method === 'POST') {
                        const b = jsonBody(await readBody(req));
                        send(res, { mode: studio.rag.embedder.enabled ? 'hybrid-when-available' : 'lexical', hits: await studio.rag.retrieve(scoped, bid, text(b.query, 'query', 3000), text(b.role ?? 'copywriter', 'ruolo', 50), b.platform ?? '*') });
                        return;
                    }
                    if (tail === 'render' && method === 'POST') {
                        requireRole(p, 'editor');
                        const b = jsonBody(await readBody(req));
                        const e = await studio.media.render(scoped, bid, studio.brand(scoped, bid).data, text(b.headline, 'headline', 1000), text(b.body ?? '', 'testo', 3000, true), b.options ?? {});
                        send(res, { ...e, data: { ...e.data, url: studio.media.url(scoped, e.id) } }, 201);
                        return;
                    }
                    if (tail === 'video' && method === 'POST') {
                        requireRole(p, 'editor');
                        const b = jsonBody(await readBody(req));
                        send(res, await studio.media.slideshow(scoped, bid, strings(b.assetIds, 'slide', 10), b.audioId), 201);
                        return;
                    }
                    if (tail === 'plan' && method === 'POST') {
                        requireRole(p, 'editor');
                        assert(studio.model.available, 'MODEL_REQUIRED', 'Configurare il modello');
                        const b = jsonBody(await readBody(req));
                        send(res, { jobId: studio.store.enqueue(scoped, bid, 'plan', bid, { objective: text(b.objective ?? 'Piano della prossima settimana', 'obiettivo', 3000) }) }, 202);
                        return;
                    }
                    if (tail === 'analyze' && method === 'POST') {
                        requireRole(p, 'editor');
                        assert(studio.model.available, 'MODEL_REQUIRED', 'Configurare il modello');
                        send(res, { jobId: studio.store.enqueue(scoped, bid, 'analyze', bid) }, 202);
                        return;
                    }
                    if (tail === 'tokens' && method === 'POST') {
                        const b = jsonBody(await readBody(req));
                        send(res, auth.createToken(p, bid, b.name, b.role ?? 'editor', b.days ?? 30), 201);
                        return;
                    }
                    if (tail === 'tokens' && method === 'GET') {
                        requireRole(p, 'admin');
                        send(res, studio.store.db.prepare('SELECT id,name,role,expires FROM tokens WHERE workspace_id=? AND brand_id=?').all(p.workspaceId, bid));
                        return;
                    }
                    if (tail.startsWith('tokens/') && method === 'DELETE') {
                        requireRole(p, 'admin');
                        requireHuman(p);
                        studio.store.db.prepare('DELETE FROM tokens WHERE id=? AND workspace_id=? AND brand_id=?').run(tail.slice(7), p.workspaceId, bid);
                        send(res, { ok: true });
                        return;
                    }
                }
                const item = /^\/api\/(contents|accounts|knowledge|campaigns|insights|inbox|executions|plans)\/([a-f0-9]{32})(?:\/(.*))?$/.exec(path);
                if (item) {
                    const type = item[1], itemId = item[2], action = item[3] ?? '';
                    const kinds = { contents: 'content', accounts: 'account', knowledge: 'knowledge', campaigns: 'campaign', insights: 'insight', inbox: 'inbox', executions: 'execution', plans: 'plan' };
                    const e = studio.store.get(p, itemId, kinds[type]), scoped = studio.scope(p, e.brandId);
                    if (!action && method === 'GET') {
                        if (type === 'accounts')
                            send(res, publicAccount(e));
                        else if (type === 'contents') {
                            const content = e;
                            send(res, { ...content, data: { ...content.data, media: await studio.media.hydrate(scoped, content.data.media) }, history: studio.store.list(scoped, 'contentHistory', e.brandId).filter(x => x.data.contentId === e.id) });
                        }
                        else
                            send(res, e);
                        return;
                    }
                    if (!action && method === 'PUT') {
                        const b = jsonBody(await readBody(req));
                        if (type === 'contents') {
                            send(res, studio.saveContent(scoped, e.brandId, b, e.id));
                            return;
                        }
                        if (type === 'accounts') {
                            send(res, studio.saveAccount(scoped, e.brandId, b, e.id));
                            return;
                        }
                        if (type === 'knowledge') {
                            send(res, safeKnowledge(await studio.saveKnowledge(scoped, e.brandId, b, e.id)));
                            return;
                        }
                        if (type === 'campaigns') {
                            send(res, studio.saveCampaign(scoped, e.brandId, b, e.id));
                            return;
                        }
                    }
                    if (type === 'knowledge' && action === 'approve' && method === 'POST') {
                        const b = jsonBody(await readBody(req));
                        send(res, studio.approveKnowledge(scoped, e.id, Number(b.revision), b.approved === true));
                        return;
                    }
                    if (type === 'knowledge' && !action && method === 'DELETE') {
                        requireRole(p, 'approver');
                        requireHuman(p);
                        studio.store.remove(scoped, e.id);
                        studio.store.audit(scoped, e.brandId, 'knowledge.deleted', e.id);
                        send(res, { ok: true });
                        return;
                    }
                    if (type === 'insights' && action === 'accept' && method === 'POST') {
                        const b = jsonBody(await readBody(req));
                        send(res, await studio.acceptInsight(scoped, e.id, Number(b.revision)));
                        return;
                    }
                    if (type === 'inbox' && action === 'reply-draft' && method === 'POST') {
                        requireRole(p, 'editor');
                        const b = jsonBody(await readBody(req));
                        const draft = studio.saveContent(scoped, e.brandId, { accountId: e.data.accountId, title: 'Risposta a: ' + e.data.text.slice(0, 200), objective: 'Rispondi al messaggio con fatti del brand: ' + e.data.text.slice(0, 2000), format: ['whatsapp', 'messenger', 'instagram-dm'].includes(e.data.platform) ? 'message' : 'text', text: b.text ?? '', options: { recipient: e.data.recipient, inboxId: e.id } });
                        send(res, draft, 201);
                        return;
                    }
                    if (type === 'inbox' && action === 'close' && method === 'POST') {
                        requireRole(p, 'editor');
                        const b = jsonBody(await readBody(req));
                        send(res, studio.store.update(scoped, e.id, Number(b.revision), { ...e.data, status: 'CLOSED' }));
                        return;
                    }
                    if (type === 'plans' && action === 'drafts' && method === 'POST') {
                        send(res, studio.convertPlan(scoped, e.id), 201);
                        return;
                    }
                    if (type === 'accounts') {
                        const a = e;
                        if (action === 'creator-info' && method === 'GET') {
                            assert(a.data.platform === 'tiktok' && a.data.transport === 'direct', 'TIKTOK', 'Creator info nativa solo per account TikTok diretto');
                            send(res, await studio.hub.tiktok.creator(studio.hub.credentials(a)));
                            return;
                        }
                        if (action === 'install-webhook' && method === 'POST') {
                            requireRole(p, 'admin');
                            requireHuman(p);
                            send(res, await webhooks.installTelegram(scoped, e.id));
                            return;
                        }
                        if (action === 'postiz-integrations' && method === 'GET') {
                            requireRole(p, 'admin');
                            requireHuman(p);
                            assert(a.data.transport === 'postiz', 'POSTIZ', 'Account Postiz richiesto');
                            send(res, await studio.hub.postiz.integrations(studio.hub.credentials(a)));
                            return;
                        }
                        if (action === 'connect' && method === 'POST') {
                            requireRole(p, 'admin');
                            requireHuman(p);
                            assert(a.data.transport === 'postiz', 'POSTIZ', 'OAuth delegato a Postiz: scegliere trasporto Postiz');
                            send(res, { url: await studio.hub.postiz.connect(studio.hub.credentials(a), CAPABILITIES[a.data.platform].postiz) });
                            return;
                        }
                    }
                    if (type === 'contents' && method === 'POST') {
                        const b = jsonBody(await readBody(req));
                        let result;
                        if (action === 'generate')
                            result = studio.enqueueGeneration(scoped, e.id, Number(b.revision), b.mode ?? 'all');
                        else if (action === 'review')
                            result = await studio.review(scoped, e.id);
                        else if (action === 'approve')
                            result = studio.approve(scoped, e.id, Number(b.revision), b);
                        else if (action === 'schedule')
                            result = studio.schedule(scoped, e.id, Number(b.revision), text(b.at, 'data', 60));
                        else if (action === 'cancel')
                            result = studio.cancel(scoped, e.id, Number(b.revision));
                        else if (action === 'reject')
                            result = studio.reject(scoped, e.id, Number(b.revision), text(b.reason, 'motivo', 2000));
                        else if (action === 'reconcile')
                            result = studio.reconcile(scoped, e.id, Number(b.revision), b);
                        else if (action === 'metrics')
                            result = studio.recordMetric(scoped, e.id, b);
                        else if (action === 'collect-metrics') {
                            requireRole(p, 'editor');
                            result = { jobId: studio.store.enqueue(scoped, e.brandId, 'metrics', e.id, { window: 'manual' }, Date.now(), `manual-metrics:${e.id}:${Math.floor(Date.now() / 60000)}`) };
                        }
                        else if (action === 'adapt') {
                            requireRole(p, 'editor');
                            const ids = strings(b.accountIds, 'account', 20);
                            ids.forEach(aid => studio.hub.account(scoped, aid));
                            result = ids.map(accountId => { const a = studio.hub.account(scoped, accountId); const original = e.data; const format = a.data.transport === 'direct' && !CAPABILITIES[a.data.platform].native.includes(original.format) ? CAPABILITIES[a.data.platform].native[0] : original.format; return studio.saveContent(scoped, e.brandId, { ...original, accountId, format, media: format === 'text' ? [] : original.media, options: { ...original.options, consent: false } }); });
                        }
                        else
                            throw new AppError(404, 'NOT_FOUND', 'Azione non trovata');
                        send(res, result);
                        return;
                    }
                }
                throw new AppError(404, 'NOT_FOUND', 'Endpoint non trovato');
            }
            assert(method === 'GET' || method === 'HEAD', 'METHOD', 'Metodo non consentito', 405);
            const pages = ['/', '/app', '/login', '/register', '/forgot', '/reset', '/verify', '/invite', '/privacy', '/terms'];
            const assets = { '/app.js': 'text/javascript; charset=utf-8', '/style.css': 'text/css; charset=utf-8', '/brand.js': 'text/javascript; charset=utf-8', '/favicon.svg': 'image/svg+xml', '/assets/mark.svg': 'image/svg+xml', '/assets/logo-light.svg': 'image/svg+xml', '/assets/logo-dark.svg': 'image/svg+xml' };
            const filename = pages.includes(path) ? 'index.html' : Object.hasOwn(assets, path) ? path.slice(1) : null;
            assert(filename, 'NOT_FOUND', 'Pagina non trovata', 404);
            res.writeHead(200, { 'Content-Type': pages.includes(path) ? 'text/html; charset=utf-8' : assets[path], 'Cache-Control': 'no-cache' });
            res.end(method === 'HEAD' ? '' : await readFile(join(webRoot, filename)));
        }
        catch (err) {
            if (res.headersSent) {
                res.destroy();
                return;
            }
            const status = err instanceof AppError ? err.status : 500;
            send(res, { error: { code: err instanceof AppError ? err.code : 'INTERNAL', message: status === 500 ? 'Errore interno. Consultare il log locale.' : safeError(err) } }, status);
            if (status === 500)
                console.error(JSON.stringify({ at: now(), error: safeError(err) }));
        }
    });
    server.requestTimeout = 180000;
    server.headersTimeout = 15000;
    return server;
}
//# sourceMappingURL=server.js.map