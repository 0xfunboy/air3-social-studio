import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
    console.error('.env esiste già: nessun segreto sovrascritto.');
    process.exitCode = 1;
}
else {
    const password = randomBytes(24).toString('base64url');
    const env = `# AIR3 Social Studio. Never commit this file.\nMASTER_KEY=${randomBytes(32).toString('hex')}\nBOOTSTRAP_EMAIL=admin@localhost.test\nBOOTSTRAP_PASSWORD=${password}\nHOST=127.0.0.1\nPORT=3100\nBASE_URL=http://localhost:3100\nDATA_DIR=data\nWORKER_ENABLED=true\n\n# Gemini native or compatible (e.g. llama.cpp / vLLM / OpenRouter).\nLLM_PROVIDER=gemini\nLLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta\nLLM_MODEL=\nLLM_API_KEY=\nGEMINI_API_KEY=\nGEMINI_IMAGE_MODEL=\n\n# OpenAI-compatible embeddings endpoint; optional lexical fallback.\nEMBEDDING_BASE_URL=\nEMBEDDING_MODEL=\nEMBEDDING_API_KEY=\n\n# Explicitly allow trusted LOCAL / custom service origins, comma-separated.\nOUTBOUND_ORIGINS=\nMETA_GRAPH_VERSION=\nLINKEDIN_VERSION=202609\nFFMPEG_PATH=ffmpeg\nFONT_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf\n`;
    writeFileSync('.env', env, { mode: 0o600, flag: 'wx' });
    mkdirSync('data', { recursive: true, mode: 0o700 });
    console.log('Configurazione creata.\nEmail: admin@localhost.test\nPassword iniziale: ' + password + '\n\nConserva MASTER_KEY e .env in un password manager. Imposta provider/modello prima di usare la generazione AI.\nAvvio: npm start');
}
