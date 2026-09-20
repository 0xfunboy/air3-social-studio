import type { Account, Bag, Metrics, Receipt, SocialPost } from '../core/types.js';
import type { Http } from '../core/http.js';
import { jsonRequest } from '../core/http.js';
import { assert, now } from '../core/util.js';
import { CAPABILITIES } from './capabilities.js';
/** Postiz is an optional publishing backend, not a simulated client. */
export class PostizClient {
    constructor(private http: Http) { }
    private base(c: Bag): string { return String(c.baseUrl || 'https://api.postiz.com/public/v1').replace(/\/$/, ''); }
    private headers(c: Bag): Record<string, string> { assert(c.apiKey, 'POSTIZ_KEY', 'API key Postiz mancante'); return { Authorization: String(c.apiKey) }; }
    async integrations(c: Bag): Promise<Bag[]> { const r = await this.http.request(this.base(c) + '/integrations', { headers: this.headers(c) }); assert(Array.isArray(r.body), 'POSTIZ_RESPONSE', 'Elenco integrazioni Postiz non valido'); return r.body; }
    async connect(c: Bag, provider: string): Promise<string> { const r = await this.http.request(this.base(c) + '/social/' + encodeURIComponent(provider), { headers: this.headers(c) }); assert(typeof r.body.url === 'string' && r.body.url.startsWith('https://'), 'OAUTH_URL', 'Postiz non ha restituito una URL OAuth HTTPS'); return r.body.url; }
    settings(a: Account, p: SocialPost): Bag {
        const provider = CAPABILITIES[a.platform].postiz;
        assert(provider, 'POSTIZ_UNSUPPORTED', 'Questo canale non usa Postiz');
        const s: Bag = { ...(a.options.settings ?? {}), ...(p.options.settings ?? {}), __type: provider };
        if (a.platform === 'instagram')
            s.post_type = p.format === 'story' ? 'story' : 'post';
        if (a.platform === 'x')
            s.who_can_reply_post ??= 'everyone';
        if (a.platform === 'youtube')
            Object.assign(s, { title: p.title, type: p.options.privacy, selfDeclaredMadeForKids: p.options.madeForKids ? 'yes' : 'no', tags: (p.options.tags ?? []).map((v: string) => ({ value: v, label: v })), thumbnail: s.thumbnail ?? null });
        if (a.platform === 'tiktok')
            Object.assign(s, { title: p.title.slice(0, 90), privacy_level: p.options.privacyLevel, duet: p.options.allowDuet === true, stitch: p.options.allowStitch === true, comment: p.options.allowComments === true, autoAddMusic: p.options.autoAddMusic ? 'yes' : 'no', brand_content_toggle: p.options.brandContent, brand_organic_toggle: p.options.brandOrganic, video_made_with_ai: p.options.isAigc === true, content_posting_method: 'DIRECT_POST' });
        return s;
    }
    async publish(a: Account, c: Bag, p: SocialPost): Promise<Receipt> {
        const image: Bag[] = [];
        for (const m of p.media) {
            assert(m.url, 'MEDIA_URL', 'URL media non disponibile');
            const r = await this.http.request(this.base(c) + '/upload-from-url', jsonRequest({ url: m.url }, undefined, this.headers(c)));
            assert(r.body.id && r.body.path, 'POSTIZ_UPLOAD', 'Postiz non ha restituito id e path del media');
            image.push({ id: r.body.id, path: r.body.path, alt: m.alt ?? '' });
        }
        const at = now();
        const result = await this.http.request(this.base(c) + '/posts', jsonRequest({ type: 'now', date: at, shortLink: false, tags: [], posts: [{ integration: { id: a.targetId }, value: [{ content: p.text, image }], settings: this.settings(a, p) }] }, undefined, this.headers(c)));
        const item = Array.isArray(result.body) ? result.body.find((x: Bag) => x.integration === a.targetId) : undefined;
        assert(item?.postId, 'POSTIZ_RESPONSE', 'Risposta di creazione Postiz priva di postId');
        return { state: 'PROCESSING', externalId: String(item.postId), details: { transport: 'postiz', submittedAt: at } };
    }
    async poll(a: Account, c: Bag, r: Receipt): Promise<Receipt> {
        const start = new Date(Date.parse(r.details?.submittedAt ?? now()) - 86400000).toISOString(), end = new Date(Date.now() + 86400000).toISOString();
        const result = await this.http.request(this.base(c) + '/posts?' + new URLSearchParams({ startDate: start, endDate: end }), { headers: this.headers(c) });
        const item = result.body.posts?.find((x: Bag) => x.id === r.externalId && x.integration?.id === a.targetId);
        if (!item)
            return r;
        if (item.state === 'PUBLISHED')
            return { ...r, state: 'PUBLISHED', url: item.releaseURL || undefined };
        if (['ERROR', 'FAILED'].includes(item.state))
            return { ...r, state: 'FAILED', error: 'Postiz segnala pubblicazione fallita; consultare il log del provider.' };
        return r;
    }
    async metrics(c: Bag, r: Receipt): Promise<Metrics> {
        const result = await this.http.request(this.base(c) + '/analytics/post/' + encodeURIComponent(r.externalId) + '?date=30', { headers: this.headers(c) });
        assert(Array.isArray(result.body), 'ANALYTICS', 'Risposta analytics Postiz non valida');
        const values: Record<string, number> = {};
        for (const series of result.body) {
            const points = [...(series.data ?? [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
            const last = points.at(-1);
            if (last && Number.isFinite(Number(last.total)))
                values[String(series.label)] = Number(last.total);
        }
        return { collectedAt: now(), values, source: 'postiz:last-observation-not-sum', raw: { series: result.body } };
    }
}
