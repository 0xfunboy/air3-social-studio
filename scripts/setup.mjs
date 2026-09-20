import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
const args = process.argv.slice(2);
function option(name) { const at = args.indexOf('--' + name); if (at < 0)
    return undefined; const value = args[at + 1]; if (!value || value.startsWith('--'))
    throw new Error('--' + name + ' richiede un valore'); return value; }
if (args.includes('--help')) {
    console.log('node scripts/setup.mjs [--email indirizzo] [--url origin] [--data-dir directory] [--production]\nGenera .env e credenziali casuali. Non sovrascrive installazioni esistenti.');
    process.exit(0);
}
try {
    if (existsSync('.env'))
        throw new Error('.env esiste già: nessun segreto sovrascritto. Per un upgrade conserva .env e DATA_DIR.');
    const production = args.includes('--production'), data = option('data-dir') ?? 'data';
    if (existsSync(join(resolve(data), 'studio.sqlite')))
        throw new Error('Database esistente senza .env: recupera la MASTER_KEY originale. Non generare una nuova chiave su questi dati.');
    let email = option('email'), url = option('url');
    if (process.stdin.isTTY) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        try {
            email = email || await rl.question('Email amministratore: ');
            url = url || await rl.question('URL pubblica (invio: http://localhost:3100): ');
        }
        finally {
            rl.close();
        }
    }
    email = email || (!production ? 'admin@localhost.test' : '');
    url = url || 'http://localhost:3100';
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
        throw new Error('Inserisci --email con un indirizzo valido.');
    const origin = new URL(url);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash)
        throw new Error('URL deve essere una origin HTTP(S), senza path, credenziali o query.');
    if (production && (origin.protocol !== 'https:' || /localhost|\.test$/.test(origin.hostname) || email.endsWith('.test')))
        throw new Error('Produzione: usa email reale e URL HTTPS pubblica, con DNS configurato.');
    const password = randomBytes(24).toString('base64url'), settings = {
        MASTER_KEY: randomBytes(32).toString('hex'), BOOTSTRAP_EMAIL: email.toLowerCase(), BOOTSTRAP_PASSWORD: password,
        HOST: '127.0.0.1', PORT: '3100', BASE_URL: origin.origin, DOMAIN: origin.hostname, DATA_DIR: data, WORKER_ENABLED: 'true',
        ALLOW_REGISTRATION: 'false', SITE_NAME: 'AIR3 Social Studio', SUPPORT_EMAIL: email, PRIVACY_URL: '', TERMS_URL: '',
        LLM_PROVIDER: 'gemini', LLM_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta', LLM_MODEL: '', LLM_API_KEY: '', GEMINI_API_KEY: '', GEMINI_IMAGE_MODEL: '',
        EMBEDDING_BASE_URL: '', EMBEDDING_MODEL: '', EMBEDDING_API_KEY: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', RESEND_API_KEY: '', MAIL_FROM: '',
        OUTBOUND_ORIGINS: '', META_GRAPH_VERSION: '', LINKEDIN_VERSION: '202609', TRUST_PROXY_IPS: '', FFMPEG_PATH: 'ffmpeg',
        FONT_PATH: process.platform === 'win32' ? join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts', 'arial.ttf') : process.platform === 'darwin' ? '/System/Library/Fonts/Supplemental/Arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    };
    const env = '# AIR3 Social Studio 0.2.0 — bootstrap secrets. NEVER commit.\n# The web wizard persists installation settings in encrypted SQLite and DATA_DIR/runtime.generated.env.\n' + Object.entries(settings).map(([k, v]) => k + '=' + JSON.stringify(v)).join('\n') + '\n';
    mkdirSync(resolve(data), { recursive: true, mode: 0o700 });
    writeFileSync('.env', env, { mode: 0o600, flag: 'wx' });
    console.log('\nConfigurazione creata.\nEmail: ' + email + '\nPassword iniziale: ' + password + '\nURL: ' + origin.origin + '\n\nConserva MASTER_KEY in un password manager e un backup separato.\nAvvio locale: npm start\nHTTPS con Caddy: docker compose -f compose.yaml -f compose.production.yaml up -d --build\nDopo l’accesso, completa Modelli, Google e Social dal wizard. Nessun provider è collegato automaticamente.');
}
catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
