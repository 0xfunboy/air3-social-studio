import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootstrap } from '../src/core/bootstrap.js';
import { config } from '../src/core/config.js';
import { Store } from '../src/core/store.js';
import type { Http, HttpResult } from '../src/core/http.js';
import type { Model } from '../src/agents/llm.js';
import type { Bag, Principal } from '../src/core/types.js';
export class FakeHttp implements Http {
    calls: {
        url: string;
        init: RequestInit;
        json: Bag;
    }[] = [];
    handler: (url: string, init: RequestInit, json: Bag) => Promise<HttpResult> | HttpResult = () => { throw new Error('Unstubbed test HTTP call'); };
    async request(url: string, init: RequestInit = {}): Promise<HttpResult> { let json: Bag = {}; try {
        json = typeof init.body === 'string' ? JSON.parse(init.body) : {};
    }
    catch { } this.calls.push({ url, init, json }); return this.handler(url, init, json); }
}
export const response = (body: unknown, status = 200, headers: Record<string, string> = {}): HttpResult => ({ body, status, headers: new Headers(headers) });
export class FakeModel implements Model {
    calls: {
        role: string;
        input: Bag;
        system: string;
    }[] = [];
    constructor(readonly available = false) { }
    readonly name = 'TEST_FIXTURE_NOT_A_LIVE_MODEL';
    async generate(system: string, input: Bag, _schema: Bag, _images: Bag[] = [], role = ''): Promise<Bag> {
        this.calls.push({ system, input, role });
        if (!this.available)
            throw new Error('Test model disabled');
        if (role === 'strategist')
            return { topic: input.topic, target: 'pendolari', objective: input.objective, angle: 'domanda aperta', hook: 'Parliamone', cta: 'Raccontaci', rationale: 'Usa il brief fornito senza inferire trend.' };
        if (role === 'copywriter')
            return { title: 'La tua prossima idea', text: 'Come immagini il tuo prossimo viaggio condiviso?', hashtags: [], slides: [{ headline: 'La tua prossima idea', body: 'Parliamone insieme.' }], videoScript: 'Mostra la slide per quattro secondi.', voiceoverScript: 'Parliamone insieme.', claims: [], openQuestions: [] };
        if (role === 'creative')
            return { imagePrompt: 'Sfondo astratto editoriale', headline: 'La tua prossima idea', layout: 'editorial', altText: 'Visual editoriale del brand' };
        if (role === 'reviewer')
            return { passed: true, score: 95, issues: [] };
        if (role === 'analyst')
            return { summary: 'Il campione è limitato.', hypotheses: ['Valutare nuovi contenuti su un periodo comparabile.'], limitations: ['Nessuna evidenza causale.'], recommendations: ['Raccogliere ulteriori osservazioni.'] };
        if (role === 'planner')
            return { ideas: [{ accountId: input.accounts[0].id, topic: 'La prossima settimana', objective: 'Dialogo', format: 'text', suggestedAt: new Date(Date.now() + 86400000).toISOString() }] };
        throw new Error('Unknown test role');
    }
}
export async function fixture(ai = false) {
    const dir = await mkdtemp(join(tmpdir(), 'air3-test-'));
    const cfg = config({ MASTER_KEY: '11'.repeat(32), DATA_DIR: dir, BASE_URL: 'http://127.0.0.1:3100', BOOTSTRAP_EMAIL: 'test@example.test', BOOTSTRAP_PASSWORD: 'test-password-long-enough', META_GRAPH_VERSION: 'vTEST.0', LLM_MODEL: ai ? 'test-model' : '' });
    cfg.graphVersion = 'v23.0';
    const http = new FakeHttp(), model = new FakeModel(ai), app = bootstrap(cfg, http, model, new Store(':memory:'));
    const member = app.store.db.prepare('SELECT * FROM memberships').get() as Bag;
    const p: Principal = { userId: member.user_id, workspaceId: member.workspace_id, role: 'admin', via: 'session' };
    const brand = app.studio.saveBrand(p, { name: 'Test brand', description: 'Progetto di prova', colors: ['#172338'] });
    return { ...app, http, model, p, brand, dir, async cleanup() { await app.worker.stop(); app.store.close(); await rm(dir, { recursive: true, force: true }); } };
}
export function addAccount(f: Awaited<ReturnType<typeof fixture>>, platform = 'telegram', transport = 'direct', targetId = '-1001234', credentials: Bag = {}, options: Bag = {}) { const base = platform === 'telegram' ? { botToken: '123456:TEST_TOKEN', webhookSecret: 'signed-test-secret' } : platform === 'discord' ? { botToken: 'TEST' } : platform === 'farcaster' ? { apiKey: 'TEST', signerUuid: 'UUID' } : { accessToken: 'TEST_ACCESS_TOKEN' }; return f.studio.saveAccount(f.p, f.brand.id, { name: platform + ' test', platform, transport, targetId, credentials: transport === 'postiz' ? { apiKey: 'TEST_POSTIZ', ...credentials } : { ...base, ...credentials }, options }); }
export function addContent(f: Awaited<ReturnType<typeof fixture>>, accountId: string, extra: Bag = {}) { return f.studio.saveContent(f.p, f.brand.id, { accountId, title: 'Il prossimo viaggio', text: 'Come immagini il tuo prossimo viaggio?', format: 'text', objective: 'Conversazione', ...extra }); }
export async function approved(f: Awaited<ReturnType<typeof fixture>>, accountId: string, extra: Bag = {}) { let e = addContent(f, accountId, extra); e = await f.studio.review(f.p, e.id); return f.studio.approve(f.p, e.id, e.revision, { visualConfirmed: true, consent: true }); }
