// Run with AIR3_LEGACY_ROOT pointing at an extracted 0.1.0 release. No external requests.
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { bootstrap } from '../../dist/src/core/bootstrap.js';
import { config } from '../../dist/src/core/config.js';
const legacy = process.env.AIR3_LEGACY_ROOT;
if (!legacy)
    throw new Error('Set AIR3_LEGACY_ROOT to the directory containing the old dist/src/core/bootstrap.js');
const root = resolve(import.meta.dirname, '../..'), dir = await mkdtemp(join(tmpdir(), 'air3-migration-'));
const env = { MASTER_KEY: '88'.repeat(32), DATA_DIR: dir, BASE_URL: 'http://localhost:3100', BOOTSTRAP_EMAIL: 'migration@example.test', BOOTSTRAP_PASSWORD: 'migration-password-long', WORKER_ENABLED: 'false' };
let old, current;
try {
    const { bootstrap: previous } = await import(pathToFileURL(join(resolve(legacy), 'dist/src/core/bootstrap.js')).href);
    const { config: previousConfig } = await import(pathToFileURL(join(resolve(legacy), 'dist/src/core/config.js')).href);
    const http = { async request() { throw new Error('No external request allowed during migration test'); } };
    old = previous(previousConfig(env), http);
    const m = old.store.db.prepare('SELECT * FROM memberships').get(), p = { workspaceId: m.workspace_id, userId: m.user_id, role: 'admin', via: 'session' };
    const brand = old.studio.saveBrand(p, { name: 'Brand precedente', description: 'Persistenza legacy' });
    const account = old.studio.saveAccount(p, brand.id, { name: 'Telegram precedente', platform: 'telegram', transport: 'direct', targetId: '-100', credentials: { botToken: 'legacy-test-token' } });
    const before = old.store.db.prepare('SELECT * FROM entities ORDER BY id').all();
    old.store.close();
    old = null;
    current = bootstrap(config(env), http);
    assert.equal(current.auth.siteAdmin(p.userId), false, 'Never auto-escalate existing workspace admins');
    assert.equal(current.auth.login(env.BOOTSTRAP_EMAIL, env.BOOTSTRAP_PASSWORD, 'migration-test').user.id, p.userId);
    assert.equal(current.studio.hub.credentials(current.studio.hub.account(p, account.id)).botToken, 'legacy-test-token');
    assert.deepEqual(current.store.db.prepare('SELECT * FROM entities ORDER BY id').all(), before);
    assert.equal(current.store.db.prepare('PRAGMA user_version').get().user_version, 2);
    current.store.close();
    current = null;
    const promote = spawnSync(process.execPath, ['dist/cli.js', 'site-admin', env.BOOTSTRAP_EMAIL, '--confirm'], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8' });
    assert.equal(promote.status, 0, promote.stderr);
    current = bootstrap(config(env), http);
    assert.equal(current.auth.siteAdmin(p.userId), true);
    console.log(JSON.stringify({ migration: '0.1.0 → 0.2.0', database: 'PASS', preservedEntitiesAndCiphertext: 'PASS', legacyPasswordLogin: 'PASS', legacyTokenDecryption: 'PASS', noAutomaticPrivilegeEscalation: 'PASS', explicitCliAdminPromotion: 'PASS', externalCalls: 0 }, null, 2));
}
finally {
    if (old)
        old.store.close();
    if (current)
        current.store.close();
    await rm(dir, { recursive: true, force: true });
}
