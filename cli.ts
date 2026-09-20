import { bootstrap } from './src/core/bootstrap.js';
import { backup } from 'node:sqlite';
import { mkdir, cp, writeFile, chmod, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { assert } from './src/core/util.js';
import type { Bag } from './src/core/types.js';
const app = bootstrap();
try {
    const command = process.argv[2];
    if (command === 'doctor') {
        const renderer = await app.studio.media.health(), publicConfig = app.settings.public();
        const checks = { https: app.cfg.baseUrl.startsWith('https://'), modelConfigured: app.studio.model.available, renderer: renderer.ffmpeg && renderer.font, siteAdmin: Number((app.store.db.prepare('SELECT count(*) n FROM site_admins').get() as Bag).n) > 0, privacy: !!publicConfig.privacyUrl, terms: !!publicConfig.termsUrl, support: !!publicConfig.supportEmail, registrationEmail: !publicConfig.registration || app.settings.mailEnabled };
        let envPrivate = true;
        try {
            envPrivate = ((await stat('.env')).mode & 0o077) === 0;
        }
        catch { /* Env can be injected by orchestrator instead of a file. */ }
        const ready = Object.values(checks).every(Boolean) && envPrivate;
        console.log(JSON.stringify({ version: '0.2.0', node: process.version, sqlite: true, checks, envPrivate, localReadiness: ready ? 'PASS' : 'ACTION_REQUIRED', externalProviderVerification: 'NOT_PERFORMED_BY_DOCTOR', model: { configured: app.studio.model.available, name: app.studio.model.name }, embeddings: app.studio.rag.embedder.enabled, renderer, baseUrl: app.cfg.baseUrl, accounts: (app.store.db.prepare("SELECT count(*) n FROM entities WHERE kind='account'").get() as Bag).n, notes: 'Il controllo locale non certifica OAuth, app review, consegna email, DNS/TLS o pubblicazione live.' }, null, 2));
        if (process.argv.includes('--production') && !ready)
            process.exitCode = 2;
    }
    else if (command === 'site-admin') {
        const email = String(process.argv[3] ?? '').toLowerCase();
        assert(process.argv.includes('--confirm'), 'CONFIRM', 'Uso: site-admin email --confirm. Solo operatore locale con accesso ai segreti.');
        const user = app.store.db.prepare('SELECT id FROM users WHERE email=?').get(email) as Bag | undefined;
        assert(user, 'NOT_FOUND', 'Utente esistente non trovato');
        app.store.db.prepare('INSERT OR IGNORE INTO site_admins VALUES (?)').run(user.id);
        console.log('Amministratore installazione abilitato: ' + email);
    }
    else if (command === 'password-reset') {
        const email = String(process.argv[3] ?? '').toLowerCase();
        assert(process.argv.includes('--confirm'), 'CONFIRM', 'Uso locale: password-reset email --confirm');
        const user = app.store.db.prepare('SELECT id FROM users WHERE email=?').get(email) as Bag | undefined;
        assert(user, 'NOT_FOUND', 'Utente non trovato');
        const token = app.identity.createAction('reset', email, user.id, null, null, {}, 30);
        console.log('Link di recupero locale, valido 30 minuti. Non condividerlo:\n' + app.cfg.baseUrl + '/reset#' + token);
    }
    else if (command === 'backup') {
        const target = resolve(process.argv[3] ?? join('backups', new Date().toISOString().replace(/[:.]/g, '-')));
        await mkdir(target, { recursive: true, mode: 0o700 });
        await backup(app.store.db, join(target, 'studio.sqlite'));
        await chmod(join(target, 'studio.sqlite'), 0o600);
        await cp(join(app.cfg.dataDir, 'assets'), join(target, 'assets'), { recursive: true }).catch(e => { if (e.code !== 'ENOENT')
            throw e; });
        await writeFile(join(target, 'RESTORE.txt'), 'Stop the application and keep it stopped during restore. Restore studio.sqlite and assets into DATA_DIR. Restore the original MASTER_KEY and bootstrap environment from a separate secret backup. Encrypted installation settings and OAuth apps are in SQLite. This archive intentionally excludes .env and MASTER_KEY. Do not rotate keys or run setup over an existing database. For a consistent file snapshot, pause content writes/uploads while backing up.\n', { mode: 0o600 });
        console.log(target);
    }
    else
        throw new Error('Comandi: doctor [--production] | backup [directory] | site-admin email --confirm | password-reset email --confirm');
}
catch (error) {
    console.error(error instanceof Error ? error.message : 'Operazione non riuscita');
    process.exitCode = 1;
}
finally {
    await app.oauth.stopMaintenance();
    app.store.close();
}
