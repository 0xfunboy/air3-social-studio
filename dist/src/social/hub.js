import { decrypt } from '../core/crypto.js';
import { validatePost } from './capabilities.js';
import { PostizClient } from './postiz.js';
import { MetaClient } from './meta.js';
import { TikTokClient } from './tiktok.js';
import { DirectClients } from './direct.js';
import { YouTubeClient } from './youtube.js';
import { assert } from '../core/util.js';
export const credentialAad = (workspaceId, brandId, accountId) => `${workspaceId}:${brandId}:${accountId}`;
export class SocialHub {
    store;
    cfg;
    refreshCredentials;
    youtube;
    postiz;
    meta;
    tiktok;
    direct;
    constructor(store, cfg, http) {
        this.store = store;
        this.cfg = cfg;
        this.youtube = new YouTubeClient(http, store, cfg);
        this.postiz = new PostizClient(http);
        this.meta = new MetaClient(http, cfg);
        this.tiktok = new TikTokClient(http);
        this.direct = new DirectClients(http, cfg);
    }
    account(p, accountId) { return this.store.get(p, accountId, 'account'); }
    credentials(e) { return decrypt(e.data.credential, this.cfg.masterKey, credentialAad(e.workspaceId, e.brandId, e.id)); }
    isMeta(a) { return ['facebook', 'instagram', 'threads', 'whatsapp', 'messenger', 'instagram-dm'].includes(a.platform); }
    async publish(e, p) {
        validatePost(e.data, p);
        const a = e.data, c = this.refreshCredentials ? await this.refreshCredentials(e) : this.credentials(e);
        if (a.transport === 'postiz')
            return this.postiz.publish(a, c, p);
        if (this.isMeta(a))
            return this.meta.publish(a, c, p);
        if (a.platform === 'youtube')
            return this.youtube.publish(e, c, p);
        if (a.platform === 'tiktok')
            return this.tiktok.publish(a, c, p);
        return this.direct.publish(a, c, p);
    }
    async poll(e, r) {
        const a = e.data, c = this.refreshCredentials ? await this.refreshCredentials(e) : this.credentials(e);
        if (a.transport === 'postiz')
            return this.postiz.poll(a, c, r);
        if (this.isMeta(a))
            return this.meta.poll(a, c, r);
        if (a.platform === 'youtube')
            return this.youtube.poll(c, r);
        if (a.platform === 'tiktok')
            return this.tiktok.poll(c, r);
        return r;
    }
    async finalize(e, r) { assert(e.data.transport === 'direct' && this.isMeta(e.data), 'FINALIZE', 'Finalizzazione non prevista'); return this.meta.finalize(e.data, this.refreshCredentials ? await this.refreshCredentials(e) : this.credentials(e), r); }
    async metrics(e, r) {
        const a = e.data, c = this.refreshCredentials ? await this.refreshCredentials(e) : this.credentials(e);
        if (a.transport === 'postiz')
            return this.postiz.metrics(c, r);
        if (this.isMeta(a))
            return this.meta.metrics(a, c, r);
        if (a.platform === 'youtube')
            return this.youtube.metrics(c, r);
        return this.direct.metrics(a, c, r);
    }
}
//# sourceMappingURL=hub.js.map