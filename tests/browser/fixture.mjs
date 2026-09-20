import { fixture } from '../../dist/tests/helpers.js';
import { CAPABILITIES } from '../../dist/src/social/capabilities.js';
import { writeFile } from 'node:fs/promises';
const f = await fixture();
await writeFile(process.argv[2], JSON.stringify({ me: { csrf: 'UI_TEST', principal: f.p, user: { id: f.p.userId, email: 'test@example.test' }, workspaces: [{ id: f.p.workspaceId, name: 'Collaudo UI', role: 'admin' }] }, status: { version: '0.1.0', model: { configured: false, name: '', provider: 'gemini' }, embeddings: { configured: false, model: null }, imageModel: null, renderer: { ffmpeg: true, font: true }, platforms: CAPABILITIES, baseUrl: 'https://studio.example.test' }, brands: [f.brand] }));
await f.cleanup();
