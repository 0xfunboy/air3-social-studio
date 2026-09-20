import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Account, Bag, Entity, Metrics, Receipt, SocialPost } from '../core/types.js';
import type { Config } from '../core/config.js';
import type { Store } from '../core/store.js';
import type { Http } from '../core/http.js';
import { jsonRequest } from '../core/http.js';
import { assert, now } from '../core/util.js';
/** Bounded local-asset upload. External URL fetching is intentionally not a SSRF-capable proxy. */
export class YouTubeClient {
    constructor(readonly http: Http, readonly store: Store, readonly cfg: Config) { }
    async publish(e: Entity<Account>, c: Bag, p: SocialPost): Promise<Receipt> {
        assert(p.media.length === 1 && p.media[0]?.id, 'YOUTUBE_ASSET', 'YouTube diretto richiede un video caricato nella media library');
        const asset = this.store.get({ workspaceId: e.workspaceId, brandId: e.brandId }, p.media[0].id, 'asset');
        assert(asset.data.mime === 'video/mp4' && /^[a-f0-9]{32}\.mp4$/.test(asset.data.file), 'YOUTUBE_ASSET', 'Asset MP4 locale non valido');
        const bytes = await readFile(join(this.cfg.dataDir, 'assets', asset.data.file));
        assert(bytes.length === asset.data.size && bytes.length <= 128 * 1024 * 1024, 'YOUTUBE_SIZE', 'Dimensione video non valida');
        const init = await this.http.request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', jsonRequest({ snippet: { title: p.title.slice(0, 100), description: p.text }, status: { privacyStatus: p.options.privacy, selfDeclaredMadeForKids: p.options.madeForKids } }, c.accessToken, { 'X-Upload-Content-Type': asset.data.mime, 'X-Upload-Content-Length': String(bytes.length) }));
        const location = init.headers.get('location');
        assert(location, 'YOUTUBE_SESSION', 'Sessione upload assente');
        const url = new URL(location);
        assert(url.origin === 'https://www.googleapis.com' && url.pathname.startsWith('/upload/youtube/'), 'YOUTUBE_ORIGIN', 'Destinazione upload non autorizzata');
        const uploaded = await this.http.request(url.href, { method: 'PUT', headers: { Authorization: 'Bearer ' + c.accessToken, 'Content-Type': asset.data.mime, 'Content-Length': String(bytes.length) }, body: bytes as any });
        assert(uploaded.body.id, 'YOUTUBE_RESPONSE', 'ID video mancante');
        return { state: 'PROCESSING', externalId: String(uploaded.body.id), details: { stage: 'youtube-processing', privacy: p.options.privacy } };
    }
    async poll(c: Bag, r: Receipt): Promise<Receipt> { const b = (await this.http.request('https://www.googleapis.com/youtube/v3/videos?' + new URLSearchParams({ part: 'status', id: r.externalId }), { headers: { Authorization: 'Bearer ' + c.accessToken } })).body; const s = b.items?.[0]?.status; assert(s, 'YOUTUBE_RESPONSE', 'Video non leggibile'); if (['failed', 'rejected', 'deleted'].includes(s.uploadStatus))
        return { ...r, state: 'FAILED', error: 'Elaborazione video rifiutata da YouTube' }; if (s.uploadStatus === 'processed')
        return { ...r, state: 'PUBLISHED', url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(r.externalId) }; return r; }
    async metrics(c: Bag, r: Receipt): Promise<Metrics> { const b = (await this.http.request('https://www.googleapis.com/youtube/v3/videos?' + new URLSearchParams({ part: 'statistics', id: r.externalId }), { headers: { Authorization: 'Bearer ' + c.accessToken } })).body; const values: Record<string, number> = {}; for (const [k, v] of Object.entries(b.items?.[0]?.statistics ?? {}))
        if (Number.isFinite(Number(v)))
            values[k] = Number(v); return { collectedAt: now(), values, source: 'youtube-data-api' }; }
}
