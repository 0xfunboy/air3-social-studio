import { bootstrap } from './src/core/bootstrap.js';
import { backup } from 'node:sqlite';
import { mkdir, cp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const app = bootstrap();
try {
    const command = process.argv[2];
    if (command === 'doctor') {
        console.log(JSON.stringify({ node: process.version, sqlite: true, model: { configured: app.studio.model.available, name: app.studio.model.name }, embeddings: app.studio.rag.embedder.enabled, renderer: await app.studio.media.health(), graphVersion: app.cfg.graphVersion || 'NOT_CONFIGURED', baseUrl: app.cfg.baseUrl, accounts: app.store.db.prepare("SELECT count(*) n FROM entities WHERE kind='account'").get() }, null, 2));
    }
    else if (command === 'backup') {
        const target = resolve(process.argv[3] ?? join('backups', new Date().toISOString().replace(/[:.]/g, '-')));
        await mkdir(target, { recursive: true, mode: 0o700 });
        await backup(app.store.db, join(target, 'studio.sqlite'));
        await cp(join(app.cfg.dataDir, 'assets'), join(target, 'assets'), { recursive: true }).catch((e) => {
            if (e.code !== 'ENOENT')
                throw e;
        });
        await writeFile(join(target, 'RESTORE.txt'), 'Stop the application. Restore studio.sqlite and assets into DATA_DIR. Restore the original MASTER_KEY from your secret backup. This archive intentionally does not contain .env or MASTER_KEY.\n', { mode: 0o600 });
        console.log(target);
    }
    else
        throw new Error('Comandi: doctor | backup [directory]');
}
finally {
    app.store.close();
}
//# sourceMappingURL=cli.js.map