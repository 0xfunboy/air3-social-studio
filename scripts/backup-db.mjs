import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, unlinkSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dbPath = resolve(process.env.DATA_DIR || 'data', 'studio.sqlite');
const backupDir = resolve(process.env.DATA_DIR || 'data', 'backups');

if (!existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}`);
    process.exit(1);
}

mkdirSync(backupDir, { recursive: true, mode: 0o700 });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const targetFile = join(backupDir, `studio-backup-${timestamp}.sqlite`);

console.log(`[${new Date().toISOString()}] Initiating SQLite online backup...`);

try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    db.exec(`VACUUM INTO '${targetFile}'`);
    db.close();
    console.log(`[${new Date().toISOString()}] Backup completed successfully: ${targetFile}`);

    // Prune backups older than 7 days
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const f of readdirSync(backupDir)) {
        if (!f.startsWith('studio-backup-') || !f.endsWith('.sqlite')) continue;
        const full = join(backupDir, f);
        const stats = statSync(full);
        if (now - stats.mtimeMs > maxAgeMs) {
            unlinkSync(full);
            console.log(`Pruned old backup: ${f}`);
        }
    }
} catch (err) {
    console.error(`Backup failed:`, err);
    process.exit(1);
}
