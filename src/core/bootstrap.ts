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
export function bootstrap(cfg: Config = config(), http?: Http, model?: Model, store?: Store) { const origins = (process.env.OUTBOUND_ORIGINS ?? '').split(',').map(x => x.trim()).filter(Boolean); const network = http ?? new Network(origins); const db = store ?? new Store(join(cfg.dataDir, 'studio.sqlite')); const auth = new Auth(db, cfg), rag = new Rag(db, new Embedder(cfg, network)), media = new MediaService(db, cfg, network), hub = new SocialHub(db, cfg, network), studio = new Studio(db, cfg, rag, media, hub, model ?? new LanguageModel(cfg, network)); return { cfg, network, store: db, auth, studio, worker: new Worker(studio) }; }
