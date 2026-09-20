import { fixture } from '../../dist/tests/helpers.js';
import { CAPABILITIES } from '../../dist/src/social/capabilities.js';
import { writeFile } from 'node:fs/promises';
const f = await fixture();
const data = { me: { csrf: 'UI_TEST', principal: f.p, user: { id: f.p.userId, email: 'studio@example.test' }, siteAdmin: true, googleLinked: false, workspaces: [{ id: f.p.workspaceId, name: 'Collaudo UI', role: 'admin' }] }, status: { version: '0.2.0', model: { configured: false, name: '', provider: 'gemini' }, embeddings: { configured: false, model: null }, imageModel: null, renderer: { ffmpeg: true, font: true }, platforms: CAPABILITIES, baseUrl: 'https://studio.example.test' }, brands: [{ ...f.brand, data: { ...f.brand.data, name: 'Forma Studio' } }], installation: f.settings.read(f.p), oauth: f.oauth.apps(f.p), members: [{ id: f.p.userId, email: 'studio@example.test', role: 'admin' }], public: { name: 'AIR3 Social Studio', google: false, registration: false, emailEnabled: false }, site: { users: [{ id: f.p.userId, email: 'studio@example.test', verified: 1, disabled: 0, site_admin: 1 }], counts: { workspaces: 1, brands: 1 }, audit: [] } };
await writeFile(process.argv[2], JSON.stringify(data));
await f.cleanup();
