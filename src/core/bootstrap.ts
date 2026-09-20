import { join } from 'node:path';
import { config, type Config } from './config.js';
import { Store } from './store.js';
import { Auth } from './auth.js';
import { Network, type Http } from './http.js';
import { Embedder, Rag } from '../rag/index.js';
import { LanguageModel, type Model } from '../agents/llm.js';
import { MediaService } from './media.js';
import { SocialHub } from '../social/hub.js';
import { Studio } from './service.js';
import { Worker } from './worker.js';
import { Settings } from './settings.js';
import { Identity } from '../integrations/identity.js';
import { SocialOAuth } from '../integrations/oauth.js';
export function bootstrap(cfg: Config = config(), http?: Http, model?: Model, store?: Store) {
    const db = store ?? new Store(join(cfg.dataDir, 'studio.sqlite'));
    const auth = new Auth(db, cfg), settings = new Settings(db, cfg, auth);
    settings.apply(true);
    const origins = (process.env.OUTBOUND_ORIGINS ?? '').split(',').map(x => x.trim()).filter(Boolean);
    const network = http ?? new Network(origins), rag = new Rag(db, new Embedder(cfg, network)), media = new MediaService(db, cfg, network), hub = new SocialHub(db, cfg, network);
    const studio = new Studio(db, cfg, rag, media, hub, model ?? new LanguageModel(cfg, network));
    const identity = new Identity(auth, settings, network), oauth = new SocialOAuth(studio, auth, network);
    // Attached runtime services keep createApp(studio, auth) backward-compatible.
    studio.extensions = { settings, identity, oauth, network };
    return { cfg, network, store: db, auth, studio, settings, identity, oauth, worker: new Worker(studio) };
}
