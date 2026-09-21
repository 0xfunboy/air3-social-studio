import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const envPath = resolve('.env');
if (!existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
}

// Parse .env
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        env[key] = val;
    }
}

const masterKey = env.MASTER_KEY;
if (!masterKey) {
    console.error('MASTER_KEY not found in .env');
    process.exit(1);
}

const aad = 'installation:environment';

function encrypt(value, key, aadStr) {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    c.setAAD(Buffer.from(aadStr));
    const encrypted = Buffer.concat([c.update(JSON.stringify(value)), c.final()]);
    return [iv, c.getAuthTag(), encrypted].map(b => b.toString('base64url')).join('.');
}

function decrypt(payload, key, aadStr) {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    const d = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(ivB64, 'base64url'));
    d.setAAD(Buffer.from(aadStr));
    d.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(dataB64, 'base64url')), d.final()]).toString('utf8'));
}

const dbPath = resolve(env.DATA_DIR || 'data', 'studio.sqlite');
const db = new DatabaseSync(dbPath);

const row = db.prepare("SELECT value FROM installation WHERE key='environment'").get();
let envObj = {};
if (row && row.value) {
    try {
        envObj = decrypt(row.value, masterKey, aad);
    } catch (e) {
        console.warn('Could not decrypt existing installation environment, initializing new object.');
    }
}

if (env.GOOGLE_CLIENT_ID) envObj.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
if (env.GOOGLE_CLIENT_SECRET) envObj.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
if (env.SUPPORT_EMAIL) envObj.SUPPORT_EMAIL = env.SUPPORT_EMAIL;
if (env.PRIVACY_URL) envObj.PRIVACY_URL = env.PRIVACY_URL;
if (env.TERMS_URL) envObj.TERMS_URL = env.TERMS_URL;

const encrypted = encrypt(envObj, masterKey, aad);
db.prepare("INSERT INTO installation (key, value) VALUES ('environment', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(encrypted);
db.close();

console.log('Google credentials and configuration synchronized from .env into encrypted database store successfully!');
