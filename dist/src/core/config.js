import { resolve } from 'node:path';
import { assert } from './util.js';
export function config(env = process.env) {
    const masterKey = env.MASTER_KEY ?? '';
    assert(/^[a-f0-9]{64}$/i.test(masterKey), 'CONFIG', 'MASTER_KEY deve contenere 64 caratteri esadecimali. Eseguire npm run setup.');
    const port = Number(env.PORT ?? 3100);
    assert(Number.isInteger(port) && port >= 1 && port <= 65535, 'CONFIG', 'PORT non valida');
    const baseUrl = (env.BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, '');
    const url = new URL(baseUrl);
    assert(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'CONFIG', 'BASE_URL deve essere una origin http(s)');
    return { dataDir: resolve(env.DATA_DIR ?? 'data'), masterKey, baseUrl, port, host: env.HOST ?? '127.0.0.1', bootstrapEmail: env.BOOTSTRAP_EMAIL ?? '', bootstrapPassword: env.BOOTSTRAP_PASSWORD ?? '', llmBase: (env.LLM_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, ''), llmKey: env.LLM_API_KEY ?? env.GEMINI_API_KEY ?? '', llmModel: env.LLM_MODEL ?? '', llmProvider: env.LLM_PROVIDER === 'compatible' ? 'compatible' : 'gemini', embeddingBase: (env.EMBEDDING_BASE_URL ?? '').replace(/\/$/, ''), embeddingKey: env.EMBEDDING_API_KEY ?? '', embeddingModel: env.EMBEDDING_MODEL ?? '', imageModel: env.GEMINI_IMAGE_MODEL ?? '', geminiKey: env.GEMINI_API_KEY ?? '', graphVersion: env.META_GRAPH_VERSION ?? '', linkedinVersion: env.LINKEDIN_VERSION ?? '202609', ffmpeg: env.FFMPEG_PATH ?? 'ffmpeg', font: env.FONT_PATH ?? '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', worker: env.WORKER_ENABLED !== 'false' };
}
//# sourceMappingURL=config.js.map