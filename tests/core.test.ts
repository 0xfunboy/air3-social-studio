import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, addAccount, addContent, approved, response } from './helpers.js';
import { encrypt, decrypt, passwordHash, passwordValid } from '../src/core/crypto.js';
import { cosineSimilarity, jaccard } from '../src/rag/similarity.js';
import { chunkText } from '../src/rag/index.js';
import { requireHuman } from '../src/core/auth.js';
import { ProviderError } from '../src/core/http.js';
import { McpServer } from '../src/integrations/mcp.js';
import { validateSchema } from '../src/agents/llm.js';
import { CAPABILITIES, validatePost, weightedX } from '../src/social/capabilities.js';
import type { Account, Bag, Content, Principal } from '../src/core/types.js';
test('AES-GCM binds ciphertext to workspace, brand and account', () => { const key = '22'.repeat(32), cipher = encrypt({ token: 'secret' }, key, 'tenant:brand:account'); assert.deepEqual(decrypt(cipher, key, 'tenant:brand:account'), { token: 'secret' }); assert.throws(() => decrypt(cipher, key, 'other:brand:account')); assert.throws(() => decrypt(cipher.slice(0, -2) + 'ab', key, 'tenant:brand:account')); });
test('scrypt validates only the correct password', () => { const h = passwordHash('sufficiently-long-password'); assert(passwordValid('sufficiently-long-password', h)); assert(!passwordValid('wrong', h)); });
test('reused GoonersBot similarity primitives handle edge cases', () => { assert.equal(cosineSimilarity([1, 0], [1, 0]), 1); assert.equal(cosineSimilarity([1], [1, 2]), 0); assert.equal(cosineSimilarity([0, 0], [1, 2]), 0); assert.equal(jaccard('Viaggio condiviso', 'viaggio condiviso!'), 1); assert.equal(jaccard('', ''), 0); });
test('chunker bounds, overlap and newline splitting', () => { const input = 'abcd '.repeat(800); const chunks = chunkText(input, 1000, 120); assert(chunks.length > 3); assert(chunks.every(c => c.length <= 1000)); assert.throws(() => chunkText(input, 100, 100)); });
test('strict model schemas reject extra properties, wrong types and unbounded scores', () => { const schema = { type: 'object', required: ['score'], additionalProperties: false, properties: { score: { type: 'integer', minimum: 0, maximum: 100 } } }; assert.throws(() => validateSchema({ score: 101 }, schema)); assert.throws(() => validateSchema({ score: 50, approve: true }, schema)); assert.throws(() => validateSchema({ score: '50' }, schema)); validateSchema({ score: 90 }, schema); });
test('platform catalog covers requested channels and refuses silent media loss', () => { for (const p of ['facebook', 'instagram', 'threads', 'whatsapp', 'messenger', 'instagram-dm', 'tiktok', 'x', 'linkedin', 'linkedin-page', 'telegram', 'youtube'])
    assert(p in CAPABILITIES); const a: Account = { name: 'X', platform: 'x', transport: 'direct', targetId: 'x', credential: '', enabled: true, options: {} }; assert.throws(() => validatePost(a, { id: '1', title: 'hi', text: 'hi', format: 'text', media: [{ url: 'https://example.test/a.jpg', mime: 'image/jpeg' }], options: {} })); assert.equal(weightedX('https://example.com/a/very/long/link'), 23); });
test('account ciphertext never appears in public representation; scoped decrypt works', async () => { const f = await fixture(); try {
    const a = addAccount(f);
    assert(!('credential' in a.data));
    assert(a.data.configured);
    const stored = f.studio.hub.account(f.p, a.id);
    assert.equal(f.studio.hub.credentials(stored).botToken, '123456:TEST_TOKEN');
    assert(!stored.data.credential.includes('TEST_TOKEN'));
}
finally {
    await f.cleanup();
} });
test('brand-scoped entities cannot be accessed through another brand or workspace', async () => { const f = await fixture(); try {
    const b = f.studio.saveBrand(f.p, { name: 'Other brand' }), a = addAccount(f);
    assert.throws(() => f.store.get({ ...f.p, brandId: b.id }, a.id));
    assert.throws(() => f.store.get({ ...f.p, workspaceId: 'other' }, a.id));
    assert.throws(() => f.studio.saveContent(f.p, b.id, { accountId: a.id, title: 'Cross brand', format: 'text' }));
}
finally {
    await f.cleanup();
} });
test('optimistic content revisions reject stale edits', async () => { const f = await fixture(); try {
    const a = addAccount(f), e = addContent(f, a.id);
    f.studio.saveContent(f.p, f.brand.id, { ...e.data, text: 'Edited once', revision: e.revision }, e.id);
    assert.throws(() => f.studio.saveContent(f.p, f.brand.id, { ...e.data, text: 'Stale edit', revision: e.revision }, e.id), /modificata/);
}
finally {
    await f.cleanup();
} });
test('machine tokens cannot approve, grant their own approval, or create admin tokens', async () => { const f = await fixture(); try {
    const a = addAccount(f);
    let e = addContent(f, a.id);
    e = await f.studio.review(f.p, e.id);
    const p: Principal = { ...f.p, via: 'token', role: 'editor', brandId: f.brand.id };
    assert.throws(() => f.studio.approve(p, e.id, e.revision));
    assert.throws(() => f.auth.createToken(p, f.brand.id, 'bad', 'admin'));
    assert.throws(() => requireHuman({ ...p, role: 'admin' }));
}
finally {
    await f.cleanup();
} });
test('mandatory brand rules cannot be overridden by a high reviewer score', async () => { const f = await fixture(true); try {
    f.brand = f.studio.saveBrand(f.p, { ...f.brand.data, bannedWords: ['vietato'], revision: f.brand.revision }, f.brand.id);
    const a = addAccount(f), e = addContent(f, a.id, { text: 'Questo è vietato.' });
    const reviewed = await f.studio.review(f.p, e.id);
    assert(!reviewed.data.review?.passed);
    assert.throws(() => f.studio.approve(f.p, e.id, reviewed.revision, { reason: 'Provo a ignorare i vincoli' }), /vietato/);
}
finally {
    await f.cleanup();
} });
test('editing approved content invalidates approval and changing brand invalidates signature', async () => { const f = await fixture(); try {
    const a = addAccount(f), e = await approved(f, a.id);
    const edited = f.studio.saveContent(f.p, f.brand.id, { ...e.data, text: 'New caption', revision: e.revision }, e.id);
    assert.equal(edited.data.status, 'DRAFT');
    assert(!edited.data.approval);
    const e2 = await approved(f, a.id);
    f.studio.saveBrand(f.p, { ...f.brand.data, tone: ['changed'], revision: f.brand.revision }, f.brand.id);
    assert.throws(() => f.studio.schedule(f.p, e2.id, e2.revision, new Date().toISOString()), /scaduta/);
}
finally {
    await f.cleanup();
} });
test('scheduling is durable and cancellation removes queued publication', async () => { const f = await fixture(); try {
    const a = addAccount(f), e = await approved(f, a.id), scheduled = f.studio.schedule(f.p, e.id, e.revision, new Date(Date.now() + 10000).toISOString());
    assert.equal(f.store.jobs(f.p, f.brand.id)[0]!.state, 'QUEUED');
    assert.throws(() => f.studio.saveContent(f.p, f.brand.id, { ...scheduled.data, revision: scheduled.revision }, e.id), /Annullare/);
    const c = f.studio.cancel(f.p, e.id, scheduled.revision);
    assert.equal(c.data.status, 'DRAFT');
    assert.equal(f.store.jobs(f.p, f.brand.id)[0]!.state, 'CANCELLED');
}
finally {
    await f.cleanup();
} });
test('one worker publish yields one provider call and schedules 24h/72h observations', async () => { const f = await fixture(); try {
    f.http.handler = () => response({ ok: true, result: { message_id: 321 } });
    const a = addAccount(f), e = await approved(f, a.id);
    f.studio.schedule(f.p, e.id, e.revision, new Date().toISOString());
    await Promise.all([f.worker.tick(), f.worker.tick()]);
    assert.equal(f.http.calls.length, 1);
    assert.equal(f.studio.content(f.p, e.id).data.status, 'PUBLISHED');
    assert.equal(f.store.jobs(f.p, f.brand.id).filter(j => j.kind === 'metrics').length, 2);
    await f.worker.tick();
    assert.equal(f.http.calls.length, 1);
}
finally {
    await f.cleanup();
} });
test('ambiguous provider failure is UNCERTAIN and is never blindly retried', async () => { const f = await fixture(); try {
    f.http.handler = () => { throw new ProviderError('telegram', true, true, 0, 'Connection lost after write'); };
    const a = addAccount(f), e = await approved(f, a.id);
    f.studio.schedule(f.p, e.id, e.revision, new Date().toISOString());
    await f.worker.tick();
    assert.equal(f.studio.content(f.p, e.id).data.status, 'UNCERTAIN');
    assert.equal(f.store.jobs(f.p, f.brand.id)[0]!.state, 'UNCERTAIN');
    await f.worker.tick();
    assert.equal(f.http.calls.length, 1);
}
finally {
    await f.cleanup();
} });
test('a definite 429 is queued with backoff, not marked as successfully published', async () => { const f = await fixture(); try {
    f.http.handler = () => { throw new ProviderError('telegram', true, false, 30000, 'Rate limited', 429); };
    const a = addAccount(f), e = await approved(f, a.id);
    f.studio.schedule(f.p, e.id, e.revision, new Date().toISOString());
    await f.worker.tick();
    assert.equal(f.studio.content(f.p, e.id).data.status, 'SCHEDULED');
    const job = f.store.jobs(f.p, f.brand.id).find(j => j.kind === 'publish')!;
    assert.equal(job.state, 'QUEUED');
    assert(job.dueAt > Date.now() + 25000);
}
finally {
    await f.cleanup();
} });
test('expired write leases require reconciliation, read leases are safe to reclaim', async () => { const f = await fixture(); try {
    const a = addAccount(f), e = await approved(f, a.id);
    f.studio.schedule(f.p, e.id, e.revision, new Date().toISOString());
    const j = f.store.claim()!;
    f.store.recover(j.leaseUntil! + 1);
    assert.equal(f.studio.content(f.p, e.id).data.status, 'UNCERTAIN');
    assert.equal(f.store.jobs(f.p, f.brand.id)[0]!.state, 'UNCERTAIN');
}
finally {
    await f.cleanup();
} });
test('RAG filters approval, scope, role, platform and expiry; repeated input is deduplicated', async () => { const f = await fixture(); try {
    const approved = await f.studio.saveKnowledge(f.p, f.brand.id, { title: 'Pendolari', text: 'I pendolari condividono il viaggio.', approved: true, roles: ['copywriter'], platform: 'instagram' });
    await f.studio.saveKnowledge(f.p, f.brand.id, { title: 'Non approvato', text: 'Pendolari e segreti non verificati', approved: false, roles: ['copywriter'] });
    await f.studio.saveKnowledge(f.p, f.brand.id, { title: 'Scaduto', text: 'Pendolari vecchia campagna', approved: true, roles: ['copywriter'], validUntil: '2020-01-01T00:00:00Z' });
    assert.equal((await f.studio.rag.retrieve(f.p, f.brand.id, 'pendolari', 'copywriter', 'instagram')).length, 1);
    assert.equal((await f.studio.rag.retrieve(f.p, f.brand.id, 'pendolari', 'strategist', 'instagram')).length, 0);
    assert.equal((await f.studio.rag.retrieve(f.p, f.brand.id, 'pendolari', 'copywriter', 'x')).length, 0);
    await assert.rejects(() => f.studio.saveKnowledge(f.p, f.brand.id, { ...approved.data }), /quasi identico/);
}
finally {
    await f.cleanup();
} });
test('knowledge changes invalidate an existing publication approval', async () => { const f = await fixture(); try {
    const a = addAccount(f), doc = await f.studio.saveKnowledge(f.p, f.brand.id, { title: 'Product', text: 'Il brand offre un servizio condiviso.', approved: true });
    const source = doc.id + ':' + doc.data.chunks[0]!.id;
    const e = await approved(f, a.id, { sourceIds: [source], claims: [{ text: 'Il brand offre un servizio condiviso.', sourceIds: [source] }] });
    f.studio.approveKnowledge(f.p, doc.id, doc.revision, false);
    assert.throws(() => f.studio.schedule(f.p, e.id, e.revision, new Date().toISOString()), /scaduta/);
}
finally {
    await f.cleanup();
} });
test('MCP negotiates protocol, enforces tool schemas and never exposes an approve tool', async () => { const f = await fixture(); try {
    const m = new McpServer(f.studio), p: Principal = { ...f.p, role: 'editor', via: 'token', brandId: f.brand.id };
    const init = await m.handle(p, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } });
    assert.equal(init!.result.protocolVersion, '2025-11-25');
    const tools = await m.handle(p, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    assert(!tools!.result.tools.some((x: Bag) => x.name === 'approve'));
    const bad = await m.handle(p, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_draft', arguments: { brandId: f.brand.id } } });
    assert(bad!.error);
    const cross = await m.handle(p, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'brand_context', arguments: { brandId: 'other' } } });
    assert(cross!.result.isError);
}
finally {
    await f.cleanup();
} });
test('fixture AI pipeline records role-specific calls and stops at human approval', async () => { const f = await fixture(true); try {
    const a = addAccount(f), e = addContent(f, a.id);
    f.studio.enqueueGeneration(f.p, e.id, e.revision);
    await f.worker.tick();
    const result = f.studio.content(f.p, e.id);
    assert.equal(result.data.status, 'WAITING_APPROVAL');
    assert(!result.data.approval);
    assert.equal(f.http.calls.length, 0);
    assert.deepEqual(f.model.calls.map(x => x.role), ['strategist', 'copywriter', 'reviewer']);
    assert(f.store.list(f.p, 'execution', f.brand.id).every(e => e.data.status === 'SUCCESS'));
}
finally {
    await f.cleanup();
} });
test('analyst uses real snapshot IDs and separate latest observation per post', async () => { const f = await fixture(true); try {
    const a = addAccount(f), e = await approved(f, a.id);
    f.store.update<Content>(f.p, e.id, e.revision, { ...e.data, status: 'PUBLISHED', publication: { state: 'PUBLISHED', externalId: 'real-test-id' } });
    f.studio.recordMetric(f.p, e.id, { values: { likes: 5 }, source: 'test-export', collectedAt: new Date(Date.now() - 3600000).toISOString() });
    f.studio.recordMetric(f.p, e.id, { values: { likes: 8 }, source: 'test-export', collectedAt: new Date().toISOString() });
    const insight = await f.studio.analyze(f.p, f.brand.id);
    assert.equal(insight.data.sampleSize, 1);
    assert.equal(f.model.calls.at(-1)!.input.rows[0].metrics.likes, 8);
    assert.equal(insight.data.accepted, false);
}
finally {
    await f.cleanup();
} });
