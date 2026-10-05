import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { bootstrap } from '../src/core/bootstrap.js';
import { createApp } from '../src/api/server.js';
import { Auth } from '../src/core/auth.js';
import { ENV_FIELDS } from '../src/core/settings.js';
import { encrypt, hmac } from '../src/core/crypto.js';
import { id } from '../src/core/util.js';
import { Webhooks } from '../src/integrations/webhooks.js';
import type { Bag, Platform } from '../src/core/types.js';
import { fixture, response } from './helpers.js';

async function setup(t: TestContext) {
    const keys = [...Object.keys(ENV_FIELDS), 'SUPERADMIN_EMAIL', 'SUPERADMIN_EMAILS', 'BOOTSTRAP_EMAIL',
        'META_CLIENT_ID', 'META_CLIENT_SECRET', 'META_WEBHOOK_VERIFY_TOKEN', 'META_CONFIG_ID', 'META_BUSINESS_ID',
        'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET', 'INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET', 'INSTAGRAM_WEBHOOK_VERIFY_TOKEN'];
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    const f = await fixture();
    t.after(async () => {
        await f.oauth.stopMaintenance();
        await f.cleanup();
        for (const k of keys) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    });
    return f;
}

type F = Awaited<ReturnType<typeof setup>>;
async function connect(f: F, provider: string, platform: Platform) {
    const start = f.oauth.start(f.p, f.brand.id, platform, provider), u = new URL(start.url);
    const session = f.auth.issueSession(f.p.userId);
    const req = { headers: { cookie: `smm_session=${session.token}; ${start.cookie.split(';')[0]}`, 'x-workspace-id': f.p.workspaceId }, socket: { remoteAddress: '127.0.0.1' } } as unknown as IncomingMessage;
    const callback = new URL(`${f.cfg.baseUrl}/oauth/${provider}/callback?code=fixture-code&state=${u.searchParams.get('state')}`);
    const result = await f.oauth.callback(req, provider, callback);
    const grant = f.oauth.publicGrant(f.p, result.grantId);
    return f.oauth.select(f.p, result.grantId, [grant.candidates[0].key])[0]!;
}

test('Existing registration settings still require email verification after upgrade', async t => {
    const f = await setup(t);
    const legacy = { ALLOW_REGISTRATION: 'true', RESEND_API_KEY: 'fixture-mail-key', MAIL_FROM: 'mail@example.test' };
    f.store.db.prepare("INSERT INTO installation VALUES ('environment',?)").run(encrypt(legacy, f.cfg.masterKey, 'installation:environment'));
    f.http.handler = () => response({ id: 'fixture-mail' });
    await f.identity.signup({ email: 'unproved@example.test', password: 'fixture-password-long-enough' }, 'fixture');
    const user = f.store.db.prepare('SELECT u.id,f.verified FROM users u JOIN user_flags f ON f.user_id=u.id WHERE email=?').get('unproved@example.test') as Bag;
    assert.equal(user.verified, 0);
    assert.equal(f.settings.public().emailVerificationRequired, true);
    assert.throws(() => f.auth.issueSession(user.id), { code: 'LOGIN' });
    assert.equal(f.http.calls.length, 1);
});

test('Opening the previous SQLite schema adds opt-out support without changing users or ciphertext', async t => {
    const f = await setup(t), file = join(f.dir, 'legacy.sqlite');
    const before = f.store.db.prepare('SELECT * FROM entities ORDER BY id').all();
    f.store.db.exec(`VACUUM INTO '${file}'`);
    const legacy = new DatabaseSync(file);
    legacy.exec('DROP TABLE unverified_access');
    legacy.close();
    const { Store } = await import('../src/core/store.js');
    const upgraded = bootstrap(f.cfg, f.http, f.model, new Store(file));
    try {
        assert.deepEqual(upgraded.store.db.prepare('SELECT * FROM entities ORDER BY id').all(), before);
        assert.equal((upgraded.store.db.prepare('SELECT count(*) n FROM unverified_access').get() as Bag).n, 0);
        assert.equal(upgraded.auth.siteAdmin(f.p.userId), true);
        assert.ok(upgraded.auth.login('test@example.test', 'test-password-long-enough', 'fixture').token);
    }
    finally { await upgraded.oauth.stopMaintenance(); upgraded.store.close(); }
});

test('Explicit verification opt-out permits access without falsely verifying the email', async t => {
    const f = await setup(t);
    f.settings.save(f.p, { ALLOW_REGISTRATION: 'true', REQUIRE_EMAIL_VERIFICATION: 'false' });
    await f.identity.signup({ email: 'unverified@example.test', password: 'fixture-password-long-enough' }, 'fixture');
    const user = f.store.db.prepare('SELECT u.id,f.verified FROM users u JOIN user_flags f ON f.user_id=u.id WHERE email=?').get('unverified@example.test') as Bag;
    assert.equal(user.verified, 0);
    const session = f.auth.login('unverified@example.test', 'fixture-password-long-enough', 'fixture');
    const req = { headers: { cookie: `smm_session=${session.token}` } } as IncomingMessage;
    assert.equal(f.auth.principal(req, false).principal.userId, user.id);
    assert.equal(f.auth.siteAdmin(user.id), false);
    assert.equal(f.http.calls.length, 0);
    process.env.SUPERADMIN_EMAIL = 'unverified@example.test';
    assert.throws(() => f.auth.issueSession(user.id));
    assert.throws(() => f.auth.principal(req, false));
    assert.equal(f.auth.siteAdmin(user.id), false);
    assert.equal((f.store.db.prepare('SELECT verified FROM user_flags WHERE user_id=?').get(user.id) as Bag).verified, 0);
});

test('Unknown configured administrator cannot create an account through password login or public signup', async t => {
    const f = await setup(t);
    process.env.SUPERADMIN_EMAIL = 'reserved@example.test';
    assert.throws(() => f.auth.login('reserved@example.test', 'caller-chosen-password-123', 'fixture'), { code: 'LOGIN' });
    assert.equal(f.store.db.prepare('SELECT id FROM users WHERE email=?').get('reserved@example.test'), undefined);
    f.settings.save(f.p, { ALLOW_REGISTRATION: 'true', REQUIRE_EMAIL_VERIFICATION: 'false' });
    await assert.rejects(() => f.identity.signup({ email: 'reserved@example.test', password: 'caller-chosen-password-123' }, 'fixture'), { code: 'EMAIL_RESERVED' });
    assert.equal(f.store.db.prepare('SELECT id FROM users WHERE email=?').get('reserved@example.test'), undefined);
});

test('Configured administrator promotion never verifies pending users or re-enables disabled users', async t => {
    const f = await setup(t);
    const uid = f.auth.addUser(f.p, 'reserved@example.test', 'known-password-long-enough', 'viewer');
    process.env.SUPERADMIN_EMAIL = 'reserved@example.test';
    for (const [verified, disabled] of [[0, 0], [1, 1]]) {
        f.store.db.prepare('INSERT INTO user_flags VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET verified=excluded.verified,disabled=excluded.disabled').run(uid, verified!, disabled!);
        new Auth(f.store, f.cfg);
        assert.throws(() => f.auth.login('reserved@example.test', 'known-password-long-enough', 'fixture'));
        assert.throws(() => f.auth.ensureSuperadmin(uid), { code: 'SITE_ADMIN' });
        assert.equal(f.auth.siteAdmin(uid), false);
        assert.deepEqual({ ...(f.store.db.prepare('SELECT verified,disabled FROM user_flags WHERE user_id=?').get(uid) as Bag) }, { verified, disabled });
    }
    f.store.db.prepare('UPDATE user_flags SET verified=1,disabled=0 WHERE user_id=?').run(uid);
    assert.ok(f.auth.login('reserved@example.test', 'known-password-long-enough', 'fixture').token);
    assert.equal(f.auth.siteAdmin(uid), true);
});

test('Instagram Login accepts wrapped token responses and authenticates its webhook without exposing secrets', async t => {
    const f = await setup(t);
    f.oauth.saveApp(f.p, 'instagram', { clientId: 'fixture-ig-app', clientSecret: 'fixture-ig-secret' });
    f.http.handler = url => url.includes('api.instagram.com/oauth/access_token')
        ? response({ data: [{ access_token: 'fixture-short', user_id: 'app-scoped', permissions: ['instagram_business_basic', 'instagram_business_manage_messages'] }] })
        : url.includes('graph.instagram.com/access_token') ? response({ access_token: 'fixture-long', expires_in: 5184000 })
            : response({ user_id: 'professional-id', username: 'studio', account_type: 'BUSINESS' });
    const a = await connect(f, 'instagram', 'instagram-dm'), hooks = new Webhooks(f.studio);
    const w = f.oauth.webhookConfig(f.p, false, 'instagram');
    assert(w.url.endsWith('/webhooks/instagram/' + f.p.workspaceId));
    assert.equal(hooks.metaChallenge(f.p.workspaceId, new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': w.verifyToken, 'hub.challenge': 'fixture' }), false, 'instagram'), 'fixture');
    const raw = Buffer.from(JSON.stringify({ entry: [{ id: a.data.targetId, messaging: [{ sender: { id: 'sender' }, timestamp: Date.now(), message: { mid: 'message', text: 'hello' } }] }] }));
    await assert.rejects(() => hooks.metaReceive(f.p.workspaceId, { 'x-hub-signature-256': 'forged' }, raw, false, 'instagram'), { code: 'WEBHOOK_SIGNATURE' });
    await hooks.metaReceive(f.p.workspaceId, { 'x-hub-signature-256': 'sha256=' + hmac(raw, 'fixture-ig-secret') }, raw, false, 'instagram');
    assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 1);
    assert(!JSON.stringify(f.oauth.list(f.p, f.brand.id)).includes('fixture-ig-secret'));
    const creds = f.studio.hub.credentials(f.studio.hub.account(f.p, a.id));
    assert.equal(hooks.challenge(a.id, new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': creds.webhookVerifyToken, 'hub.challenge': 'fixture' })), 'fixture');
});

test('Environment-only Meta apps expose working global webhooks and preserve workspace boundaries', async t => {
    const f = await setup(t);
    Object.assign(process.env, { META_CLIENT_ID: 'fixture-meta-app', META_CLIENT_SECRET: 'fixture-meta-secret' });
    const global = f.oauth.apps(f.p, true).find(a => a.provider === 'meta')!;
    assert.equal(global.configured, true);
    assert.equal(global.environmentManaged, true);
    assert(!JSON.stringify(global).includes('fixture-meta-secret'));
    f.http.handler = url => url.includes('/oauth/access_token') ? response({ access_token: 'meta-user', expires_in: 5184000 })
        : response({ data: [{ id: 'page1', name: 'Page 1', access_token: 'page-token' }] });
    const a = await connect(f, 'meta', 'messenger');
    const wid = id();
    f.store.db.prepare('INSERT INTO workspaces VALUES (?,?)').run(wid, 'Other workspace');
    f.store.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(f.p.userId, wid, 'admin');
    const p2 = { ...f.p, workspaceId: wid }, b2 = f.studio.saveBrand(p2, { name: 'Other brand' });
    f.studio.saveAccount(p2, b2.id, { platform: 'messenger', transport: 'direct', name: 'Other page', targetId: 'page2', credentials: { accessToken: 'other-token', appSecret: 'fixture-meta-secret', oauthProvider: 'meta', oauthClientId: 'fixture-meta-app', oauthAppScope: 'installation' } });
    const hooks = new Webhooks(f.studio), w = f.oauth.webhookConfig(f.p, true);
    assert.equal(hooks.metaChallenge('', new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': w.verifyToken, 'hub.challenge': 'fixture' }), true), 'fixture');
    const raw = Buffer.from(JSON.stringify({ entry: [{ id: a.data.targetId, messaging: [{ sender: { id: 'sender' }, timestamp: Date.now(), message: { mid: 'message', text: 'hello' } }] }] }));
    await assert.rejects(() => hooks.metaReceive('', { 'x-hub-signature-256': 'forged' }, raw, true), { code: 'WEBHOOK_SIGNATURE' });
    await hooks.metaReceive('', { 'x-hub-signature-256': 'sha256=' + hmac(raw, 'fixture-meta-secret') }, raw, true);
    assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 1);
    assert.equal(f.store.list(p2, 'inbox', b2.id).length, 0);
    f.oauth.saveApp(f.p, 'meta', { clientId: 'fixture-meta-app', enabled: false }, true);
    assert.throws(() => hooks.metaChallenge('', new URLSearchParams(), true), { code: 'WEBHOOK' });
});

test('Environment-only Instagram app has its own global callback, separate from Meta', async t => {
    const f = await setup(t);
    Object.assign(process.env, { INSTAGRAM_CLIENT_ID: 'fixture-ig-app', INSTAGRAM_CLIENT_SECRET: 'fixture-ig-secret' });
    f.http.handler = url => url.includes('api.instagram.com/oauth/access_token') ? response({ access_token: 'short', permissions: ['instagram_business_basic', 'instagram_business_manage_messages'] })
        : url.includes('/access_token') ? response({ access_token: 'long', expires_in: 5184000 })
            : response({ user_id: 'professional-id', username: 'studio', account_type: 'BUSINESS' });
    const a = await connect(f, 'instagram', 'instagram-dm'), hooks = new Webhooks(f.studio);
    assert(f.oauth.list(f.p, f.brand.id)[0]!.connection.webhookUrl.endsWith('/webhooks/instagram-global'));
    const w = f.oauth.webhookConfig(f.p, true, 'instagram');
    assert.equal(hooks.metaChallenge('', new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': w.verifyToken, 'hub.challenge': 'fixture' }), true, 'instagram'), 'fixture');
    const raw = Buffer.from(JSON.stringify({ entry: [{ id: a.data.targetId, messaging: [{ sender: { id: 'sender' }, timestamp: Date.now(), message: { mid: 'message', text: 'hello' } }] }] }));
    await hooks.metaReceive('', { 'x-hub-signature-256': 'sha256=' + hmac(raw, 'fixture-ig-secret') }, raw, true, 'instagram');
    assert.equal(f.store.list(f.p, 'inbox', f.brand.id).length, 1);
});

test('Existing Facebook Instagram configuration remains usable alongside dedicated Instagram Login', async t => {
    const f = await setup(t);
    f.oauth.saveApp(f.p, 'meta', { clientId: 'existing-meta-app', clientSecret: 'existing-meta-secret' });
    assert.equal(new URL(f.oauth.start(f.p, f.brand.id, 'instagram').url).origin, 'https://www.facebook.com');
    f.http.handler = url => url.includes('/oauth/access_token') ? response({ access_token: 'user-token', expires_in: 5184000 })
        : response({ data: [{ id: 'page1', name: 'Page', access_token: 'PAGE-TOKEN', instagram_business_account: { id: 'ig1', username: 'brand', account_type: 'BUSINESS' } }] });
    const account = await connect(f, 'meta', 'instagram');
    assert.equal(account.data.targetId, 'ig1');
    assert.equal(account.data.options.login, 'facebook');
    assert.equal(f.studio.hub.credentials(f.studio.hub.account(f.p, account.id)).accessToken, 'PAGE-TOKEN');
    f.oauth.saveApp(f.p, 'instagram', { clientId: 'dedicated', clientSecret: 'dedicated-secret' });
    assert.equal(new URL(f.oauth.start(f.p, f.brand.id, 'instagram').url).origin, 'https://www.instagram.com');
    assert.equal(new URL(f.oauth.start(f.p, f.brand.id, 'instagram', 'meta').url).origin, 'https://www.facebook.com');
    assert.throws(() => f.oauth.start(f.p, f.brand.id, 'instagram', 'x'), { code: 'OAUTH_PROVIDER' });
});

test('Workspace OAuth override never copies environment-managed installation secrets', async t => {
    const f = await setup(t);
    Object.assign(process.env, { META_CLIENT_ID: 'shared-app', META_CLIENT_SECRET: 'shared-secret' });
    f.oauth.saveApp(f.p, 'meta', { clientId: 'local-app' });
    assert.equal(f.oauth.apps(f.p).find(a => a.provider === 'meta')!.hasSecret, false);
    assert.throws(() => f.oauth.start(f.p, f.brand.id, 'facebook'), { code: 'OAUTH_APP_REQUIRED' });
    assert.equal(f.oauth.apps(f.p, true).find(a => a.provider === 'meta')!.configured, true);
});

test('Instagram renews near-expiry tokens and rejects incomplete permissions during initial consent', async t => {
    const f = await setup(t);
    f.oauth.saveApp(f.p, 'instagram', { clientId: 'ig-app', clientSecret: 'ig-secret' });
    f.http.handler = url => url.includes('api.instagram.com/oauth/access_token') ? response({ access_token: 'short', permissions: ['instagram_business_basic', 'instagram_business_content_publish'] })
        : url.includes('/access_token') ? response({ access_token: 'long', expires_in: 240 })
            : response({ user_id: 'ig1', username: 'studio', account_type: 'BUSINESS' });
    const a = await connect(f, 'instagram', 'instagram');
    f.http.handler = url => {
        const u = new URL(url);
        assert.equal(u.origin, 'https://graph.instagram.com');
        assert.equal(u.pathname, '/refresh_access_token');
        assert.equal(u.searchParams.get('grant_type'), 'ig_refresh_token');
        return response({ access_token: 'renewed', expires_in: 5184000 });
    };
    const renewed = await f.oauth.credentials(f.studio.hub.account(f.p, a.id));
    assert.equal(renewed.accessToken, 'renewed');
    assert.equal(renewed.appSecret, 'ig-secret');
    assert(renewed.scopes.includes('instagram_business_content_publish'));
    f.http.handler = url => url.includes('api.instagram.com/oauth/access_token') ? response({ data: [{ access_token: 'short', permissions: ['instagram_business_basic'] }] })
        : response({ access_token: 'long', expires_in: 5184000 });
    await assert.rejects(() => connect(f, 'instagram', 'instagram'), { code: 'OAUTH_SCOPE' });
    assert.equal(f.store.list(f.p, 'account', f.brand.id).length, 1);
});

test('Real HTTP signup messages match verification policy and both global webhook routes validate signatures', async t => {
    const f = await setup(t), server = createApp(f.studio, f.auth);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    f.cfg.baseUrl = base;
    f.settings.save(f.p, { ALLOW_REGISTRATION: 'true', REQUIRE_EMAIL_VERIFICATION: 'false' });
    const signup = await fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'http-unverified@example.test', password: 'fixture-password-long-enough' }) });
    assert.equal(signup.status, 202);
    const message = await signup.json() as Bag;
    assert.equal(message.emailVerificationRequired, false);
    assert(!message.message.includes('riceverai'));
    const session = f.auth.issueSession(f.p.userId);
    const headers = { Cookie: `smm_session=${session.token}`, 'X-CSRF-Token': session.csrf, 'X-Workspace-ID': f.p.workspaceId, Origin: base, 'Content-Type': 'application/json' };
    for (const provider of ['meta', 'instagram']) {
        const prefix = provider === 'meta' ? 'META' : 'INSTAGRAM';
        process.env[`${prefix}_CLIENT_ID`] = 'fixture-' + provider;
        process.env[`${prefix}_CLIENT_SECRET`] = 'secret-' + provider;
        const config = await fetch(base + `/api/admin/oauth/${provider}/webhook`, { headers });
        assert.equal(config.status, 200);
        const w = await config.json() as Bag;
        const query = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': w.verifyToken, 'hub.challenge': 'http-fixture' });
        const challenge = await fetch(w.url + '?' + query);
        assert.equal(challenge.status, 200);
        assert.equal(await challenge.text(), 'http-fixture');
        const forged = await fetch(w.url, { method: 'POST', body: '{}', headers: { 'X-Hub-Signature-256': 'forged' } });
        assert.equal(forged.status, 403);
        const signed = await fetch(w.url, { method: 'POST', body: '{}', headers: { 'X-Hub-Signature-256': 'sha256=' + hmac('{}', 'secret-' + provider) } });
        assert.equal(signed.status, 200);
    }
    const start = await fetch(base + `/api/brands/${f.brand.id}/oauth/instagram/start`, { method: 'POST', headers, body: JSON.stringify({ provider: 'meta' }) });
    assert.equal(start.status, 200);
    assert.equal(new URL((await start.json() as Bag).url).origin, 'https://www.facebook.com');
});
