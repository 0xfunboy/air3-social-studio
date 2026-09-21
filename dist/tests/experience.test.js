import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp } from '../src/api/server.js';
import { hasPermission, requirePermission, getMemberPermissions } from '../src/core/auth.js';
import { ENV_FIELDS } from '../src/core/settings.js';
import { decrypt, hmac, passwordValid } from '../src/core/crypto.js';
import { sha, id } from '../src/core/util.js';
import { OAUTH } from '../src/integrations/oauth.js';
import { verifyGoogleJwt } from '../src/integrations/identity.js';
import { Webhooks } from '../src/integrations/webhooks.js';
import { Embedder } from '../src/rag/index.js';
import { validatePost } from '../src/social/capabilities.js';
import { fixture, addAccount, response } from './helpers.js';
async function setup(t) {
    const env = Object.fromEntries(Object.keys(ENV_FIELDS).map(k => [k, process.env[k]]));
    const f = await fixture();
    t.after(async () => {
        for (const [k, v] of Object.entries(env)) {
            if (v === undefined)
                delete process.env[k];
            else
                process.env[k] = v;
        }
        await f.oauth.stopMaintenance();
        await f.cleanup();
    });
    return f;
}
const request = (cookie = '', headers = {}) => ({ headers: { cookie, ...headers }, socket: { remoteAddress: '127.0.0.1' } });
function browser(f, extra = '') { const s = f.auth.issueSession(f.p.userId); return request(`smm_session=${s.token}; ${extra}`, { 'x-workspace-id': f.p.workspaceId }); }
function keyFromUrl(s) { return new URL(s).hash.slice(1); }
function grant(f, provider = 'x', platform = 'x') {
    f.oauth.saveApp(f.p, provider, { clientId: 'client-id', clientSecret: 'APP-SECRET', enabled: true });
    const start = f.oauth.start(f.p, f.brand.id, platform), u = new URL(start.url), state = u.searchParams.get('state'), sid = sha(state);
    const row = f.store.db.prepare('SELECT * FROM oauth_states WHERE id=?').get(sid);
    return { start, u, state, sid, row, data: decrypt(row.data, f.cfg.masterKey, 'oauth:' + sid), req: browser(f, start.cookie.split(';')[0]), callback: new URL(`${f.cfg.baseUrl}/oauth/${provider}/callback?state=${state}&code=authorization-code`) };
}
function xResponse(url) {
    if (url.endsWith('/token'))
        return response({ access_token: 'ACCESS-ONLY-SERVER', refresh_token: 'REFRESH-ONLY-SERVER', expires_in: 3600, scope: 'tweet.read tweet.write users.read offline.access' });
    if (url.endsWith('/users/me'))
        return response({ data: { id: 'author-1', username: 'creator' } });
    throw new Error('Unexpected URL ' + url);
}
test('Installation configuration defaults match the actual runtime and secrets never appear in read responses', async (t) => { const f = await setup(t); const fields = f.settings.read(f.p).fields; assert.equal(fields.find((x) => x.key === 'LLM_BASE_URL').value, f.cfg.llmBase); f.settings.save(f.p, { values: { LLM_API_KEY: 'LLM-SECRET-ALPHA', SITE_NAME: 'Forma studio' } }); const shown = JSON.stringify(f.settings.read(f.p)); assert(!shown.includes('LLM-SECRET-ALPHA')); assert(shown.includes('[REDACTED]')); assert.equal(f.cfg.llmKey, 'LLM-SECRET-ALPHA'); const raw = f.store.db.prepare("SELECT value FROM installation WHERE key='environment'").get(); assert(!raw.value.includes('LLM-SECRET-ALPHA')); assert.equal((await stat(join(f.dir, 'runtime.generated.env'))).mode & 0o777, 0o600); assert((await readFile(join(f.dir, 'runtime.generated.env'), 'utf8')).includes('LLM-SECRET-ALPHA')); });
test('Host configuration rejects tenant admin, token access, unknown variables and env injection', async (t) => { const f = await setup(t); const uid = f.auth.addUser(f.p, 'customer@example.test', 'customer-long-password', 'admin'), customer = { ...f.p, userId: uid }; assert.throws(() => f.settings.read(customer), /installazione/); assert.throws(() => f.settings.save({ ...f.p, via: 'token' }, {})); assert.throws(() => f.settings.save(f.p, { NODE_OPTIONS: '--require evil' }), /modificabile/); assert.throws(() => f.settings.save(f.p, { SITE_NAME: 'studio\nMASTER_KEY=evil' }), /multilinea/); assert.throws(() => f.auth.addUser(customer, 'unverified@example.test', 'sufficient-password-1', 'viewer'), /installazione/); });
test('Secret clearing is explicit, restart fields are staged, and incomplete public registration is rejected', async (t) => { const f = await setup(t); const origin = f.cfg.baseUrl; f.settings.save(f.p, { LLM_API_KEY: 'secret' }); f.settings.save(f.p, { LLM_API_KEY: '' }); assert.equal(f.cfg.llmKey, 'secret'); f.settings.save(f.p, { values: { BASE_URL: 'https://studio.example.test' }, clear: ['LLM_API_KEY'] }); assert.equal(f.cfg.baseUrl, origin); assert.equal(f.settings.read(f.p).pendingRestart, true); assert.equal(f.cfg.llmKey, ''); assert.throws(() => f.settings.save(f.p, { ALLOW_REGISTRATION: 'true' }), /email/); f.settings.apply(true); assert.equal(f.cfg.baseUrl, 'https://studio.example.test'); });
test('Embedding query cache is invalidated by embedding-space change', async (t) => { const f = await setup(t); f.cfg.embeddingBase = 'https://models.example.test/v1'; f.cfg.embeddingModel = 'a'; const emb = new Embedder(f.cfg, f.http); f.http.handler = () => response({ data: [{ index: 0, embedding: f.cfg.embeddingModel === 'a' ? [1, 0] : [0, 1] }] }); assert.deepEqual(await emb.query('same words'), [1, 0]); f.cfg.embeddingModel = 'b'; assert.deepEqual(await emb.query('same words'), [0, 1]); assert.equal(f.http.calls.length, 2); });
test('Public registration verifies email before sessions and never grants site administrator', async (t) => { const f = await setup(t); f.settings.save(f.p, { RESEND_API_KEY: 'resend-test', MAIL_FROM: 'hello@example.test', ALLOW_REGISTRATION: 'true' }); f.http.handler = () => response({ id: 'mail-1' }); await f.identity.signup({ email: 'new@example.test', password: 'very-long-new-password', name: 'New Studio' }, 'test'); const user = f.store.db.prepare('SELECT * FROM users WHERE email=?').get('new@example.test'); assert.throws(() => f.auth.issueSession(user.id), /Accesso/); assert.equal(f.auth.siteAdmin(user.id), false); const email = f.http.calls.at(-1).json.text, token = /\/verify#([\w-]{43})/.exec(email)[1]; const raw = JSON.stringify(f.store.db.prepare('SELECT * FROM auth_actions').all()); assert(!raw.includes(token)); f.identity.verifyEmail(token); assert.ok(f.auth.issueSession(user.id).token); assert.equal(f.auth.workspaces(user.id)[0].name, 'New Studio'); assert.throws(() => f.identity.verifyEmail(token), /usato/); });
test('Password reset is one-time, invalidates sessions and does not re-enable disabled users', async (t) => { const f = await setup(t); const old = f.auth.issueSession(f.p.userId), token = f.identity.createAction('reset', 'test@example.test', f.p.userId, null, null); f.identity.reset(token, 'new-password-after-reset'); assert.throws(() => f.auth.principal(request('smm_session=' + old.token), false), /scaduta/); assert.throws(() => f.identity.reset(token, 'another-long-password'), /usato/); const next = f.identity.createAction('reset', 'test@example.test', f.p.userId, null, null); f.store.db.prepare('UPDATE user_flags SET disabled=1 WHERE user_id=?').run(f.p.userId); f.identity.reset(next, 'second-new-password-1'); assert.throws(() => f.auth.issueSession(f.p.userId), /Accesso/); });
test('Invitation cannot change an existing user password and preserves token after failed verification', async (t) => { const f = await setup(t); const uid = f.auth.addUser(f.p, 'member@example.test', 'known-original-password', 'viewer'); const r = await f.identity.invite(f.p, 'member@example.test', 'approver'), token = keyFromUrl(r.url); assert.equal(r.delivered, false); assert.throws(() => f.identity.acceptInvite(token, 'attacker-password'), /esistente/); f.identity.acceptInvite(token, 'known-original-password'); const u = f.store.db.prepare('SELECT password FROM users WHERE id=?').get(uid); assert(passwordValid('known-original-password', u.password)); assert.throws(() => f.identity.acceptInvite(token, 'known-original-password'), /usato/); });
test('New invited user receives only the invited membership and never installation control', async (t) => { const f = await setup(t); const r = await f.identity.invite(f.p, 'invited@example.test', 'editor'); f.identity.acceptInvite(keyFromUrl(r.url), 'invited-long-password'); const u = f.store.db.prepare('SELECT id FROM users WHERE email=?').get('invited@example.test'); assert.equal(f.auth.workspaces(u.id)[0].role, 'editor'); assert.equal(f.auth.siteAdmin(u.id), false); });
const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...kp.publicKey.export({ format: 'jwk' }), kid: 'test-rsa', alg: 'RS256', use: 'sig' };
function jwt(patch = {}, header = {}) { const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-rsa', ...header })).toString('base64url'), c = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: 'google-client', sub: 'google-sub', nonce: 'nonce-test', email: 'test@example.test', email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...patch })).toString('base64url'); return h + '.' + c + '.' + sign('RSA-SHA256', Buffer.from(h + '.' + c), kp.privateKey).toString('base64url'); }
test('Google identity signature, issuer, audience and nonce are cryptographically verified', () => { assert.equal(verifyGoogleJwt(jwt(), [jwk], 'google-client', 'nonce-test').sub, 'google-sub'); const pieces = jwt().split('.'); pieces[2] = Buffer.alloc(256).toString('base64url'); assert.throws(() => verifyGoogleJwt(pieces.join('.'), [jwk], 'google-client', 'nonce-test'), /Firma/); });
for (const [name, patch] of Object.entries({ issuer: { iss: 'https://attacker.example' }, audience: { aud: 'another-client' }, nonce: { nonce: 'replay' }, expired: { exp: 1 }, unverified: { email_verified: false }, future: { iat: Date.now() / 1000 + 3600 }, presenter: { aud: ['google-client', 'another'], azp: 'another' }, subject: { sub: '' } }))
    test('Google ID token rejects ' + name, () => { assert.throws(() => verifyGoogleJwt(jwt(patch), [jwk], 'google-client', 'nonce-test')); });
test('Google rejects unsigned and unsupported algorithms', () => { assert.throws(() => verifyGoogleJwt(jwt({}, { alg: 'none' }), [jwk], 'google-client', 'nonce-test'), /Algoritmo/); });
function googleFlow(f, link = false) { f.settings.save(f.p, { GOOGLE_CLIENT_ID: 'google-client', GOOGLE_CLIENT_SECRET: 'google-secret' }); const start = f.identity.googleStart(link ? f.p : undefined), u = new URL(start.url), sid = sha(u.searchParams.get('state')); const row = f.store.db.prepare('SELECT * FROM oauth_states WHERE id=?').get(sid), data = decrypt(row.data, f.cfg.masterKey, 'oauth:' + sid); f.http.handler = url => url.includes('/certs') ? response({ keys: [jwk] }) : response({ id_token: jwt({ nonce: data.nonce }) }); return { start, u, sid, data, req: browser(f, start.cookie.split(';')[0]), callback: new URL(f.cfg.baseUrl + '/oauth/google/callback?code=grant&state=' + u.searchParams.get('state')) }; }
test('Google matching email never silently links an existing password account', async (t) => { const f = await setup(t), g = googleFlow(f); assert.equal(g.u.searchParams.get('code_challenge_method'), 'S256'); await assert.rejects(() => f.identity.googleCallback(g.req, g.callback), /Esiste/); assert.equal(f.store.db.prepare('SELECT count(*) n FROM identities').get().n, 0); });
test('Google explicit linking binds current user, validates ID token, rotates session and consumes state', async (t) => { const f = await setup(t), g = googleFlow(f, true); const result = await f.identity.googleCallback(g.req, g.callback); assert(result.linked); assert(result.cookie.includes('HttpOnly')); assert(result.cookie.includes('SameSite=Lax')); assert.equal(f.store.db.prepare('SELECT user_id FROM identities').get().user_id, f.p.userId); await assert.rejects(() => f.identity.googleCallback(g.req, g.callback), /usata/); const exchange = f.http.calls.find(c => c.url.endsWith('/token')); assert.equal(new URLSearchParams(String(exchange.init.body)).get('code_verifier'), g.data.verifier); });
test('Google OAuth rejects missing browser binding before exchanging the code', async (t) => { const f = await setup(t), g = googleFlow(f); await assert.rejects(() => f.identity.googleCallback(browser(f), g.callback), /Browser/); assert.equal(f.http.calls.length, 0); });
test('OAuth authorization state is random, encrypted, browser-bound, PKCE-protected and app-scoped', async (t) => { const f = await setup(t), g = grant(f); assert.equal(g.u.searchParams.get('code_challenge_method'), 'S256'); assert.equal(g.u.searchParams.get('code_challenge'), Buffer.from(sha(g.data.verifier), 'hex').toString('base64url')); assert(!g.row.data.includes(g.data.verifier)); assert(!JSON.stringify(f.oauth.apps(f.p)).includes('APP-SECRET')); await assert.rejects(() => f.oauth.callback(browser(f), 'x', g.callback), /browser/); assert.equal(f.http.calls.length, 0); });
test('OAuth callback stages discovered accounts; only explicit selected destinations become accounts', async (t) => { const f = await setup(t), g = grant(f); f.http.handler = xResponse; const result = await f.oauth.callback(g.req, 'x', g.callback); assert.equal(f.store.list(f.p, 'account', f.brand.id).length, 0); const publicGrant = f.oauth.publicGrant(f.p, result.grantId); assert(!JSON.stringify(publicGrant).includes('ACCESS-ONLY-SERVER')); assert(!JSON.stringify(f.store.db.prepare('SELECT * FROM connection_grants').all()).includes('ACCESS-ONLY-SERVER')); assert.throws(() => f.oauth.select(f.p, result.grantId, ['invented']), /Destinazione/); const created = f.oauth.select(f.p, result.grantId, [publicGrant.candidates[0].key]); assert.equal(created.length, 1); assert.equal(created[0].data.targetId, 'author-1'); assert(!JSON.stringify(created).includes('ACCESS-ONLY-SERVER')); assert.throws(() => f.oauth.publicGrant(f.p, result.grantId), /scaduta/); await assert.rejects(() => f.oauth.callback(g.req, 'x', g.callback), /scaduta/); assert.equal(f.store.jobs(f.p, f.brand.id).length, 0); });
test('OAuth callback refuses revoked membership before token exchange', async (t) => { const f = await setup(t), g = grant(f); f.store.db.prepare("UPDATE memberships SET role='viewer' WHERE user_id=?").run(f.p.userId); await assert.rejects(() => f.oauth.callback(g.req, 'x', g.callback), /revocati/); assert.equal(f.http.calls.length, 0); });
test('OAuth callback refuses changed app configuration and partial scopes', async (t) => { const f = await setup(t), g = grant(f); f.oauth.saveApp(f.p, 'x', { clientId: 'different', clientSecret: 'APP-SECRET' }); await assert.rejects(() => f.oauth.callback(g.req, 'x', g.callback), /modificata/); assert.equal(f.http.calls.length, 0); const h = grant(f); f.http.handler = () => response({ access_token: 'token', scope: 'users.read' }); await assert.rejects(() => f.oauth.callback(h.req, 'x', h.callback), /Permessi/); assert.equal(f.store.list(f.p, 'account').length, 0); });
test('Staged grant cannot cross user or workspace boundaries', async (t) => { const f = await setup(t), g = grant(f); f.http.handler = xResponse; const r = await f.oauth.callback(g.req, 'x', g.callback); assert.throws(() => f.oauth.publicGrant({ ...f.p, userId: 'other' }, r.grantId), /scaduta/); assert.throws(() => f.oauth.publicGrant({ ...f.p, workspaceId: 'other' }, r.grantId), /scaduta/); });
test('One refresh rotates every destination in the same grant without invalidating editorial revisions', async (t) => {
    const f = await setup(t);
    f.oauth.saveApp(f.p, 'pinterest', { clientId: 'client-id', clientSecret: 'APP-SECRET' });
    const c = { accessToken: 'old', refreshToken: 'rotate-me', expiresAt: Date.now() + 1000, oauthProvider: 'pinterest', oauthClientId: 'client-id', oauthGrantId: 'shared-grant' };
    const a = addAccount(f, 'pinterest', 'direct', 'board-a', { ...c, customTarget: 'A' }), b = addAccount(f, 'pinterest', 'direct', 'board-b', { ...c, customTarget: 'B' });
    f.http.handler = async () => { await new Promise(r => setTimeout(r, 10)); return response({ access_token: 'new-token', refresh_token: 'new-refresh', expires_in: 3600 }); };
    const out = await Promise.all([f.oauth.credentials(f.studio.hub.account(f.p, a.id)), f.oauth.credentials(f.studio.hub.account(f.p, b.id))]);
    assert.equal(f.http.calls.length, 1);
    assert.deepEqual(out.map(x => x.customTarget), ['A', 'B']);
    for (const e of [a, b]) {
        const saved = f.studio.hub.account(f.p, e.id), token = f.studio.hub.credentials(saved);
        assert.equal(saved.revision, e.revision);
        assert.equal(token.refreshToken, 'new-refresh');
        assert.equal(token.accessToken, 'new-token');
    }
});
test('Refresh failure surfaces reconnect state, not a fake successful connection or signed-out session', async (t) => { const f = await setup(t); f.oauth.saveApp(f.p, 'x', { clientId: 'client-id', clientSecret: 'secret' }); const a = addAccount(f, 'x', 'direct', 'author', { accessToken: 'expired', expiresAt: 1, oauthProvider: 'x', oauthClientId: 'client-id' }); await assert.rejects(() => f.oauth.credentials(f.studio.hub.account(f.p, a.id)), (e) => e.status === 502); assert.equal(f.oauth.list(f.p, f.brand.id)[0].connection.state, 'EXPIRED'); assert.equal(f.store.db.prepare('SELECT state FROM connection_health WHERE account_id=?').get(a.id).state, 'RECONNECT_REQUIRED'); assert.equal(f.http.calls.length, 0); });
test('Disabling an OAuth app blocks use even when the saved access token has not expired', async (t) => { const f = await setup(t); f.oauth.saveApp(f.p, 'x', { clientId: 'client-id', clientSecret: 'secret', enabled: false }); const a = addAccount(f, 'x', 'direct', 'author', { oauthProvider: 'x', oauthClientId: 'client-id', expiresAt: Date.now() + 3600000 }); await assert.rejects(() => f.oauth.credentials(f.studio.hub.account(f.p, a.id)), /disabilitata/); assert.equal(f.http.calls.length, 0); });
test('Disconnect removes local tokens, increments revision and retains published history', async (t) => { const f = await setup(t); const a = addAccount(f); await f.oauth.disconnect(f.p, a.id); const saved = f.studio.hub.account(f.p, a.id); assert.equal(saved.data.enabled, false); assert.equal(saved.revision, a.revision + 1); assert.deepEqual(f.studio.hub.credentials(saved), {}); });
// These are contract tests, not claims of live authorization or app review approval.
const discoveries = {
    x: { platform: 'x', body: { data: { id: 'x1', username: 'writer' } }, path: '/2/users/me' },
    tiktok: { platform: 'tiktok', body: { data: { user: { open_id: 'tt1', display_name: 'Creator' } }, error: { code: 'ok' } }, path: '/v2/user/info/' },
    linkedin: { platform: 'linkedin', body: { sub: 'person', name: 'Writer' }, path: '/v2/userinfo' },
    youtube: { platform: 'youtube', body: { items: [{ id: 'yt1', snippet: { title: 'Studio' } }] }, path: '/youtube/v3/channels' },
    pinterest: { platform: 'pinterest', body: { items: [{ id: 'board1', name: 'Stories' }] }, path: '/v5/boards' },
    twitch: { platform: 'twitch', body: { data: [{ id: 'tw1', display_name: 'Studio' }] }, path: '/helix/users' },
    slack: { platform: 'slack', body: { ok: true, channels: [{ id: 'ch1', name: 'studio', is_member: true }] }, path: '/api/conversations.list' }
};
for (const [provider, spec] of Object.entries(discoveries))
    test(`${provider} OAuth exchange and destination discovery follow the registered provider contract`, async (t) => {
        const f = await setup(t), g = grant(f, provider, spec.platform);
        f.http.handler = (url, init) => {
            if (new URL(url).pathname === new URL(OAUTH[provider].token).pathname) {
                const params = new URLSearchParams(String(init.body));
                assert.equal(params.get('code'), 'authorization-code');
                if (OAUTH[provider].pkce)
                    assert.equal(params.get('code_verifier'), g.data.verifier);
                if (provider === 'tiktok')
                    assert.equal(params.get('client_key'), 'client-id');
                if (OAUTH[provider].basic)
                    assert(new Headers(init.headers).get('Authorization')?.startsWith('Basic '));
                return response({ access_token: 'private-access-token', expires_in: 3600 });
            }
            assert.equal(new URL(url).pathname, spec.path);
            return response(spec.body);
        };
        const r = await f.oauth.callback(g.req, provider, g.callback), candidate = f.oauth.publicGrant(f.p, r.grantId).candidates[0];
        assert.equal(candidate.platform, spec.platform);
        assert(candidate.targetId);
    });
test('Threads short-lived token is exchanged before account selection; renewal requires a still-valid token', async (t) => { const f = await setup(t), g = grant(f, 'threads', 'threads'); f.http.handler = url => url.endsWith('/oauth/access_token') ? response({ access_token: 'short' }) : url.includes('/access_token?') ? response({ access_token: 'long', expires_in: 5184000 }) : response({ id: 'threads1', username: 'studio' }); const r = await f.oauth.callback(g.req, 'threads', g.callback), c = f.oauth.publicGrant(f.p, r.grantId).candidates[0]; const account = f.oauth.select(f.p, r.grantId, [c.key])[0]; assert.equal(f.studio.hub.credentials(f.studio.hub.account(f.p, account.id)).accessToken, 'long'); });
test('Meta OAuth discovers linked Instagram accounts with exact Page token and account type', async (t) => { const f = await setup(t), g = grant(f, 'meta', 'instagram'); f.http.handler = url => url.includes('/oauth/access_token') ? response({ access_token: 'user-token', expires_in: 5184000 }) : response({ data: [{ id: 'page1', name: 'Brand Page', access_token: 'PAGE-TOKEN', instagram_business_account: { id: 'ig1', username: 'brand', account_type: 'BUSINESS' } }] }); const r = await f.oauth.callback(g.req, 'meta', g.callback), c = f.oauth.publicGrant(f.p, r.grantId).candidates[0], a = f.oauth.select(f.p, r.grantId, [c.key])[0]; assert.equal(a.data.targetId, 'ig1'); assert.equal(a.data.options.accountType, 'BUSINESS'); const creds = f.studio.hub.credentials(f.studio.hub.account(f.p, a.id)); assert.equal(creds.accessToken, 'PAGE-TOKEN'); assert(creds.webhookVerifyToken); });
test('Telegram guided connection verifies administrator publishing permission without sending a message', async (t) => { const f = await setup(t); f.http.handler = url => response({ ok: true, result: url.endsWith('/getMe') ? { id: 42, username: 'studio_bot' } : url.endsWith('/getChat') ? { id: -100, title: 'Studio', type: 'channel' } : { status: 'administrator', can_post_messages: true } }); const a = await f.oauth.connectTelegram(f.p, f.brand.id, { botToken: '123:token', targetId: '@studio' }); assert.equal(a.data.targetId, '-100'); assert.equal(f.http.calls.length, 3); assert(!f.http.calls.some(c => c.url.includes('sendMessage'))); f.http.handler = () => response({ ok: true, result: { id: -200, type: 'channel', status: 'member' } }); await assert.rejects(() => f.oauth.connectTelegram(f.p, f.brand.id, { botToken: '123:token', targetId: '@other' }), /amministratore/); });
test('Telegram signed events cannot inject a different chat into a brand inbox', async (t) => { const f = await setup(t), a = addAccount(f, 'telegram', 'direct', '-100'), hooks = new Webhooks(f.studio); const event = (chat, update) => Buffer.from(JSON.stringify({ update_id: update, message: { message_id: 100, chat: { id: chat }, date: Math.floor(Date.now() / 1000), text: 'hello' } })); await hooks.receive(a.id, { 'x-telegram-bot-api-secret-token': 'signed-test-secret' }, event(-200, 1)); assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 0); await hooks.receive(a.id, { 'x-telegram-bot-api-secret-token': 'signed-test-secret' }, event(-100, 2)); assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 1); });
test('Shared Meta webhook verifies the app signature and isolates exact phone IDs across brands', async (t) => { const f = await setup(t); f.oauth.saveApp(f.p, 'meta', { clientId: 'meta-app', clientSecret: 'meta-secret' }); const b2 = f.studio.saveBrand(f.p, { name: 'Second brand' }); const c = { accessToken: 'token', appSecret: 'meta-secret', oauthProvider: 'meta', oauthClientId: 'meta-app' }; addAccount(f, 'whatsapp', 'direct', 'phone1', c); f.studio.saveAccount(f.p, b2.id, { name: 'Another', platform: 'whatsapp', transport: 'direct', targetId: 'phone2', credentials: c }); const hooks = new Webhooks(f.studio), raw = Buffer.from(JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: 'phone1' }, messages: [{ id: 'wam1', from: '39123', timestamp: String(Math.floor(Date.now() / 1000)), text: { body: 'hello' } }] } }] }] })); await assert.rejects(() => hooks.metaReceive(f.p.workspaceId, { 'x-hub-signature-256': 'forged' }, raw), /Firma/); await hooks.metaReceive(f.p.workspaceId, { 'x-hub-signature-256': 'sha256=' + hmac(raw, 'meta-secret') }, raw); assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 1); assert.equal(f.store.list(f.p, 'inbox', b2.id).length, 0); const wc = f.oauth.webhookConfig(f.p); assert.equal(hooks.metaChallenge(f.p.workspaceId, new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': wc.verifyToken, 'hub.challenge': 'hello' })), 'hello'); });
test('YouTube local MP4 upload uses pinned resumable endpoint, checks processing and collects actual metrics', async (t) => {
    const f = await setup(t), a = addAccount(f, 'youtube', 'direct', 'channel');
    const assetId = id(), file = assetId + '.mp4', bytes = Buffer.from('local fixture bytes');
    await mkdir(join(f.dir, 'assets'), { recursive: true });
    await writeFile(join(f.dir, 'assets', file), bytes);
    f.store.create(f.p, f.brand.id, 'asset', { file, size: bytes.length, mime: 'video/mp4' }, assetId);
    const p = { id: id(), text: 'Description', title: 'Test upload', format: 'video', media: [{ id: assetId, mime: 'video/mp4', url: 'https://studio.example.test/media/video' }], options: { privacy: 'private', madeForKids: false } };
    f.http.handler = (url, init) => {
        if (new URL(url).pathname === '/upload/youtube/v3/videos' && init.method === 'POST')
            return response({}, 200, { location: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=SESSION' });
        if (init.method === 'PUT') {
            assert.equal(new Headers(init.headers).get('Content-Length'), String(bytes.length));
            return response({ id: 'video1' });
        }
        return response({ items: [{ id: 'video1', status: { uploadStatus: 'processed' }, statistics: { viewCount: '7', likeCount: '2' } }] });
    };
    let receipt = await f.studio.hub.publish(f.studio.hub.account(f.p, a.id), p);
    assert.equal(receipt.state, 'PROCESSING');
    receipt = await f.studio.hub.poll(f.studio.hub.account(f.p, a.id), receipt);
    assert.equal(receipt.state, 'PUBLISHED');
    assert.equal((await f.studio.hub.metrics(f.studio.hub.account(f.p, a.id), receipt)).values.viewCount, 7);
    f.http.handler = () => response({}, 200, { location: 'https://attacker.example/upload/youtube/v3/videos' });
    await assert.rejects(() => f.studio.hub.publish(f.studio.hub.account(f.p, a.id), p), /autorizzata/);
    assert.throws(() => validatePost(f.studio.hub.account(f.p, a.id).data, { ...p, media: [{ mime: 'video/mp4', url: 'https://external.example/file.mp4' }] }), /locale/);
});
test('Real HTTP frontend routes, CSP, setup persistence and recent-auth administrative boundary', async (t) => {
    const f = await setup(t), server = createApp(f.studio, f.auth);
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const origin = 'http://127.0.0.1:' + server.address().port;
    f.cfg.baseUrl = origin;
    t.after(() => new Promise(r => server.close(() => r())));
    for (const path of ['/', '/app', '/login', '/register', '/forgot', '/reset', '/invite']) {
        const r = await fetch(origin + path);
        assert.equal(r.status, 200);
        assert(r.headers.get('content-security-policy')?.includes("script-src 'self'"));
        assert(!(r.headers.get('content-security-policy') ?? '').includes('unsafe-inline'));
        assert((await r.text()).includes('/app.js'));
    }
    const publicConfig = await (await fetch(origin + '/api/public')).json();
    assert.equal(publicConfig.registration, false);
    assert.equal((await fetch(origin + '/api/admin/installation')).status, 401);
    const login = await fetch(origin + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ email: 'test@example.test', password: 'test-password-long-enough' }) }), l = await login.json(), headers = { Cookie: login.headers.get('set-cookie').split(';')[0], Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': l.csrf };
    const req = (path, method = 'GET', body) => fetch(origin + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    assert.equal((await req('/api/admin/installation')).status, 200);
    assert.equal((await req('/api/onboarding', 'PUT', { step: 3, completed: false })).status, 200);
    assert.equal((await (await req('/api/onboarding')).json()).step, 3);
    f.store.db.prepare('UPDATE session_recent SET at=0').run();
    assert.equal((await req('/api/admin/installation', 'PUT', { SITE_NAME: 'Changed' })).status, 403);
    assert.equal((await req('/api/auth/reauth', 'POST', { password: 'wrong' })).status, 401);
    assert.equal((await req('/api/me')).status, 200);
    assert.equal((await req('/api/auth/reauth', 'POST', { password: 'test-password-long-enough' })).status, 200);
    assert.equal((await req('/api/admin/installation', 'PUT', { SITE_NAME: 'Changed' })).status, 200);
    assert.equal((await req('/api/admin/members/' + f.p.userId, 'DELETE')).status, 400);
    assert.equal((await req('/api/admin/site/users/' + f.p.userId, 'PUT', { disabled: true })).status, 400);
    const forged = await fetch(origin + '/api/auth/google/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' });
    assert.equal(forged.status, 403);
});
import { clientIp } from '../src/core/proxy.js';
test('Proxy headers never override the socket address unless the immediate peer is explicitly trusted', () => { const req = request('', { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '198.51.100.9' }); assert.equal(clientIp(req, ''), '127.0.0.1'); assert.equal(clientIp(req, '192.0.2.2'), '127.0.0.1'); assert.equal(clientIp(req, '127.0.0.1'), '203.0.113.9'); assert.equal(clientIp(request('', { 'x-forwarded-for': '203.0.113.9' }), '127.0.0.1'), '127.0.0.1'); assert.equal(clientIp(request('', { 'x-real-ip': '203.0.113.9, 127.0.0.1' }), '127.0.0.1'), '127.0.0.1'); });
test('Installation OAuth apps are inherited without copying secrets into a workspace override', async (t) => { const f = await setup(t); f.oauth.saveApp(f.p, 'x', { clientId: 'shared-client', clientSecret: 'SHARED-SECRET' }, true); const uid = f.auth.addUser(f.p, 'customer2@example.test', 'customer-long-password', 'admin'), customer = { ...f.p, userId: uid }; let app = f.oauth.apps(customer).find(a => a.provider === 'x'); assert.equal(app.inherited, true); assert.equal(app.configured, true); assert(!JSON.stringify(app).includes('SHARED-SECRET')); assert.throws(() => f.oauth.saveApp(customer, 'x', { clientId: 'bad', clientSecret: 'bad' }, true), /installazione/); f.oauth.saveApp(customer, 'x', { clientId: 'own-client' }); app = f.oauth.apps(customer).find(a => a.provider === 'x'); assert.equal(app.configured, false); assert.equal(app.inherited, false); assert(!app.hasSecret); f.oauth.useSharedApp(customer, 'x'); assert.equal(f.oauth.apps(customer).find(a => a.provider === 'x').clientId, 'shared-client'); });
test('OAuth using a shared app stores its scope and rejects a replaced config before selecting destinations', async (t) => { const f = await setup(t); f.oauth.saveApp(f.p, 'x', { clientId: 'client-id', clientSecret: 'shared-secret' }, true); const start = f.oauth.start(f.p, f.brand.id, 'x'), u = new URL(start.url), req = browser(f, start.cookie.split(';')[0]); f.http.handler = xResponse; const r = await f.oauth.callback(req, 'x', new URL(f.cfg.baseUrl + '/oauth/x/callback?code=code&state=' + u.searchParams.get('state'))), publicGrant = f.oauth.publicGrant(f.p, r.grantId); assert.equal(f.oauth.grant(f.p, r.grantId).payload.candidates[0].credentials.oauthAppScope, 'installation'); f.oauth.saveApp(f.p, 'x', { clientId: 'changed', clientSecret: 'changed' }, true); assert.throws(() => f.oauth.select(f.p, r.grantId, [publicGrant.candidates[0].key]), /modificata/); assert.equal(f.store.list(f.p, 'account').length, 0); });
test('Shared Meta callback verifies the installation secret and isolates targets across workspaces', async (t) => { const f = await setup(t); f.oauth.saveApp(f.p, 'meta', { clientId: 'shared', clientSecret: 'GLOBAL-META' }, true); const w2 = id(); f.store.db.prepare('INSERT INTO workspaces VALUES (?,?)').run(w2, 'Second workspace'); const p2 = { ...f.p, workspaceId: w2 }; f.store.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(f.p.userId, w2, 'admin'); const b2 = f.studio.saveBrand(p2, { name: 'Second brand' }), c = { accessToken: 'token', appSecret: 'GLOBAL-META', oauthProvider: 'meta', oauthClientId: 'shared', oauthAppScope: 'installation' }; addAccount(f, 'whatsapp', 'direct', 'phone1', c); f.studio.saveAccount(p2, b2.id, { name: 'Target 2', platform: 'whatsapp', transport: 'direct', targetId: 'phone2', credentials: c }); const raw = Buffer.from(JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: 'phone1' }, messages: [{ id: 'msg', from: '39123', timestamp: String(Math.floor(Date.now() / 1000)), text: { body: 'only first' } }] } }] }] })), hooks = new Webhooks(f.studio); await hooks.metaReceive('', { 'x-hub-signature-256': 'sha256=' + hmac(raw, 'GLOBAL-META') }, raw, true); assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 1); assert.equal(f.store.list(p2, 'inbox', b2.id).length, 0); const uid = f.auth.addUser(f.p, 'viewer-admin@example.test', 'customer-long-password', 'admin'); const config = f.oauth.webhookConfig({ ...f.p, userId: uid }); assert.equal(config.managed, true); assert.equal(config.verifyToken, undefined); assert(config.url.endsWith('/webhooks/meta-global')); });
for (const provider of ['reddit', 'discord', 'mastodon'])
    test(`${provider} OAuth authenticates and discovers only concrete destinations`, async (t) => {
        const f = await setup(t);
        f.oauth.saveApp(f.p, provider, { clientId: 'client-id', clientSecret: 'secret', ...(provider === 'discord' ? { botToken: 'discord-bot' } : {}), ...(provider === 'mastodon' ? { instance: 'https://social.example.test' } : {}) });
        const start = f.oauth.start(f.p, f.brand.id, provider), u = new URL(start.url);
        f.http.handler = (url, init) => {
            const path = new URL(url).pathname;
            if (path.includes('/oauth/token') || path === '/api/v1/access_token' || path === '/api/oauth2/token')
                return response({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 });
            if (provider === 'reddit')
                return path === '/api/v1/me' ? response({ name: 'moderator' }) : response({ data: { children: [{ data: { display_name: 'creative' } }] } });
            if (provider === 'discord') {
                if (path === '/api/v10/users/@me/guilds')
                    return response([{ id: 'guild1', name: 'Studio', permissions: '32' }, { id: 'noaccess', name: 'Other', permissions: '0' }]);
                assert.equal(new Headers(init.headers).get('Authorization'), 'Bot discord-bot');
                assert(!url.includes('noaccess'));
                return response([{ id: 'text1', name: 'creative', type: 0 }, { id: 'voice1', name: 'Voice', type: 2 }]);
            }
            assert.equal(path, '/api/v1/accounts/verify_credentials');
            return response({ id: 'masto1', acct: 'studio' });
        };
        const r = await f.oauth.callback(browser(f, start.cookie.split(';')[0]), provider, new URL(f.cfg.baseUrl + '/oauth/' + provider + '/callback?code=code&state=' + u.searchParams.get('state'))), g = f.oauth.publicGrant(f.p, r.grantId);
        assert.equal(g.candidates.length, 1);
        assert.equal(g.candidates[0].platform, provider);
        assert(g.candidates[0].targetId);
        assert(!JSON.stringify(g).includes('discord-bot'));
    });
test('WhatsApp OAuth resolves owned WABA phone number IDs instead of treating numbers as targets', async (t) => { const f = await setup(t), g = grant(f, 'meta', 'whatsapp'); f.http.handler = url => url.includes('/oauth/access_token') ? response({ access_token: 'user-token' }) : url.includes('/me/businesses') ? response({ data: [{ id: 'biz1' }] }) : url.includes('/owned_whatsapp_business_accounts') ? response({ data: [{ id: 'waba1' }] }) : response({ data: [{ id: 'phone-id1', display_phone_number: '+39 000', verified_name: 'Brand' }] }); const r = await f.oauth.callback(g.req, 'meta', g.callback), v = f.oauth.publicGrant(f.p, r.grantId); assert.equal(v.candidates[0].targetId, 'phone-id1'); const a = f.oauth.select(f.p, r.grantId, [v.candidates[0].key])[0]; assert.equal(a.data.options.wabaId, 'waba1'); });
test('LinkedIn Page OAuth discovers only organizations returned by the approved admin ACL request', async (t) => {
    const f = await setup(t), g = grant(f, 'linkedin', 'linkedin-page');
    f.http.handler = (url, init) => {
        if (url.endsWith('/accessToken'))
            return response({ access_token: 'token' });
        assert.equal(new Headers(init.headers).get('LinkedIn-Version'), f.cfg.linkedinVersion);
        return url.includes('/organizationAcls') ? response({ elements: [{ organization: 'urn:li:organization:42' }] }) : response({ localizedName: 'Studio company' });
    };
    const r = await f.oauth.callback(g.req, 'linkedin', g.callback);
    assert.equal(f.oauth.publicGrant(f.p, r.grantId).candidates[0].targetId, 'urn:li:organization:42');
});
test('Google auto-onboarding registers new user as viewer, verified, and strictly isolated from site admins', async (t) => {
    const f = await setup(t);
    f.settings.save(f.p, { GOOGLE_CLIENT_ID: 'google-client', GOOGLE_CLIENT_SECRET: 'google-secret' });
    const start = f.identity.googleStart(undefined);
    const u = new URL(start.url), sid = sha(u.searchParams.get('state'));
    const row = f.store.db.prepare('SELECT * FROM oauth_states WHERE id=?').get(sid);
    const data = decrypt(row.data, f.cfg.masterKey, 'oauth:' + sid);
    f.http.handler = url => url.includes('/certs')
        ? response({ keys: [jwk] })
        : response({ id_token: jwt({ email: 'newcolleague@example.test', sub: 'new-google-sub-456', nonce: data.nonce }) });
    const req = browser(f, start.cookie.split(';')[0]);
    const callback = new URL(f.cfg.baseUrl + '/oauth/google/callback?code=grant&state=' + u.searchParams.get('state'));
    const result = await f.identity.googleCallback(req, callback);
    assert.equal(result.linked, false);
    assert(result.cookie.includes('smm_session='));
    const newUser = f.store.db.prepare('SELECT * FROM users WHERE email=?').get('newcolleague@example.test');
    assert(newUser);
    assert.equal(f.auth.siteAdmin(newUser.id), false);
    const userWorkspaces = f.auth.workspaces(newUser.id);
    assert.equal(userWorkspaces.length, 1);
    assert.equal(userWorkspaces[0].role, 'viewer');
    const flags = f.store.db.prepare('SELECT * FROM user_flags WHERE user_id=?').get(newUser.id);
    assert.equal(flags.verified, 1);
    assert.equal(flags.disabled, 0);
});
test('Granular permissions enforce custom rights and allow explicit assignment by workspace admin', async (t) => {
    const f = await setup(t);
    const uid = f.auth.addUser(f.p, 'collaborator@example.test', 'super-strong-password-1', 'viewer');
    const memberPrincipal = { ...f.p, userId: uid, role: 'viewer' };
    assert.equal(hasPermission(f.store, memberPrincipal, 'content.publish'), false);
    assert.throws(() => requirePermission(f.store, memberPrincipal, 'content.publish'), /Permesso/);
    f.store.db.prepare('INSERT INTO member_permissions VALUES (?,?,?) ON CONFLICT(workspace_id,user_id) DO UPDATE SET permissions=excluded.permissions').run(f.p.workspaceId, uid, JSON.stringify(['content.publish', 'content.create']));
    const perms = getMemberPermissions(f.store, f.p.workspaceId, uid, 'viewer');
    assert.deepEqual(perms.sort(), ['content.create', 'content.publish']);
    assert.equal(hasPermission(f.store, memberPrincipal, 'content.publish'), true);
    assert.equal(hasPermission(f.store, memberPrincipal, 'content.approve'), false);
    assert.doesNotThrow(() => requirePermission(f.store, memberPrincipal, 'content.publish'));
    assert.throws(() => requirePermission(f.store, memberPrincipal, 'content.approve'), /Permesso/);
});
test('Strict boundary prevents non-site-admins from reading or modifying env secrets', async (t) => {
    const f = await setup(t);
    const uid = f.auth.addUser(f.p, 'teamlead@example.test', 'super-strong-password-2', 'admin');
    const teamLeadPrincipal = { ...f.p, userId: uid, role: 'admin' };
    assert.throws(() => f.settings.read(teamLeadPrincipal), /installazione/);
    assert.throws(() => f.settings.save(teamLeadPrincipal, { LLM_API_KEY: 'hacked' }), /installazione/);
    assert.equal(f.auth.siteAdmin(uid), false);
    assert.equal(f.auth.siteAdmin(f.p.userId), true);
});
//# sourceMappingURL=experience.test.js.map