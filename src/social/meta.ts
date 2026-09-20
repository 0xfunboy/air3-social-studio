import type { Account, Bag, Receipt, SocialPost, Metrics } from '../core/types.js';
import type { Config } from '../core/config.js';
import type { Http } from '../core/http.js';
import { jsonRequest, apiSuccess } from '../core/http.js';
import { assert, now } from '../core/util.js';
export class MetaClient {
    constructor(private http: Http, private cfg: Config) { }
    private base(a: Account): string { if (a.platform === 'threads')
        return 'https://graph.threads.net/v1.0'; const v = this.cfg.graphVersion; assert(/^v\d+\.\d+$/.test(v), 'META_VERSION', 'Configurare META_GRAPH_VERSION con una versione supportata dalla propria app Meta'); return `https://${a.options.login === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com'}/${v}`; }
    private async get(a: Account, c: Bag, path: string): Promise<Bag> { return (await this.http.request(this.base(a) + path, { headers: { Authorization: `Bearer ${c.accessToken}` } })).body; }
    private async post(a: Account, c: Bag, path: string, body: Bag): Promise<Bag> { assert(c.accessToken, 'META_TOKEN', 'Access token Meta mancante'); const r = await this.http.request(this.base(a) + path, jsonRequest(body, c.accessToken)); apiSuccess(r.body, 'Meta'); return r.body; }
    async publish(a: Account, c: Bag, p: SocialPost): Promise<Receipt> {
        const target = encodeURIComponent(a.targetId), m = p.media[0];
        if (a.platform === 'whatsapp') {
            const body: Bag = { messaging_product: 'whatsapp', recipient_type: 'individual', to: p.options.recipient };
            if (p.format === 'template') {
                assert(p.options.template?.name && p.options.template?.language?.code, 'TEMPLATE', 'Nome e lingua del template approvato richiesti');
                body.type = 'template';
                body.template = p.options.template;
            }
            else if (m) {
                body.type = m.mime.startsWith('video/') ? 'video' : 'image';
                body[body.type] = { link: m.url, caption: p.text };
            }
            else {
                body.type = 'text';
                body.text = { body: p.text, preview_url: false };
            }
            const b = await this.post(a, c, `/${target}/messages`, body);
            assert(b.messages?.[0]?.id, 'META_RESPONSE', 'ID messaggio WhatsApp mancante');
            return { state: 'PROCESSING', externalId: b.messages[0].id, details: { stage: 'webhook', delivery: 'accepted' } };
        }
        if (['messenger', 'instagram-dm'].includes(a.platform)) {
            const message = m ? { attachment: { type: m.mime.startsWith('video/') ? 'video' : 'image', payload: { url: m.url } } } : { text: p.text };
            const b = await this.post(a, c, `/${target}/messages`, { recipient: { id: p.options.recipient }, ...(a.platform === 'messenger' ? { messaging_type: 'RESPONSE' } : {}), message });
            assert(b.message_id, 'META_RESPONSE', 'ID messaggio Meta mancante');
            return { state: 'PUBLISHED', externalId: b.message_id, details: { delivery: 'accepted-by-api' } };
        }
        if (a.platform === 'facebook') {
            if (!m) {
                const b = await this.post(a, c, `/${target}/feed`, { message: p.text });
                assert(b.id, 'META_RESPONSE', 'ID post mancante');
                return { state: 'PUBLISHED', externalId: String(b.id) };
            }
            if (m.mime.startsWith('video/')) {
                const b = await this.post(a, c, `/${target}/videos`, { file_url: m.url, description: p.text, title: p.title });
                assert(b.id, 'META_RESPONSE', 'ID video mancante');
                return { state: 'PROCESSING', externalId: String(b.id), details: { stage: 'facebook-video' } };
            }
            const b = await this.post(a, c, `/${target}/photos`, { url: m.url, caption: p.text, published: true });
            assert(b.post_id || b.id, 'META_RESPONSE', 'ID foto mancante');
            return { state: 'PUBLISHED', externalId: String(b.post_id || b.id) };
        }
        const threads = a.platform === 'threads', edge = threads ? 'threads' : 'media';
        let body: Bag = {};
        if (p.format === 'carousel') {
            assert(p.media.every(x => x.mime.startsWith('image/')), 'FORMAT', 'Il carousel nativo supporta immagini; per media misti usare Postiz');
            const children: string[] = [];
            for (const child of p.media) {
                const b = await this.post(a, c, `/${target}/${edge}`, { ...(threads ? { media_type: 'IMAGE' } : {}), image_url: child.url, is_carousel_item: true });
                assert(b.id, 'META_RESPONSE', 'Container figlio mancante');
                children.push(String(b.id));
            }
            body = { media_type: 'CAROUSEL', children: threads ? children.join(',') : children, ...(threads ? { text: p.text } : { caption: p.text }) };
        }
        else if (!m && threads)
            body = { media_type: 'TEXT', text: p.text };
        else {
            assert(m?.url, 'MEDIA', 'Media richiesto');
            const video = m.mime.startsWith('video/');
            body = { ...(video ? { video_url: m.url } : { image_url: m.url }), ...(threads ? { media_type: video ? 'VIDEO' : 'IMAGE', text: p.text } : { caption: p.text, ...(video ? { media_type: p.format === 'story' ? 'STORIES' : 'REELS' } : p.format === 'story' ? { media_type: 'STORIES' } : {}) }) };
            if (!threads && video && p.format !== 'story')
                body.share_to_feed = true;
        }
        const b = await this.post(a, c, `/${target}/${edge}`, body);
        assert(b.id, 'META_RESPONSE', 'Container mancante');
        return { state: 'PROCESSING', externalId: String(b.id), details: { stage: 'container', threads } };
    }
    /** Pure GET: the worker performs the actual publish in a separately leased write job. */
    async poll(a: Account, c: Bag, r: Receipt): Promise<Receipt> {
        if (r.details?.stage === 'webhook')
            return r;
        if (r.details?.stage === 'facebook-video') {
            const b = await this.get(a, c, `/${encodeURIComponent(r.externalId)}?fields=status`);
            if (b.status?.video_status === 'ready')
                return { ...r, state: 'PUBLISHED' };
            if (b.status?.video_status === 'error')
                return { ...r, state: 'FAILED', error: 'Elaborazione video Facebook fallita' };
            return r;
        }
        const b = await this.get(a, c, `/${encodeURIComponent(r.externalId)}?fields=${a.platform === 'threads' ? 'status,error_message' : 'status_code,status'}`);
        const status = b.status_code || b.status;
        if (status === 'FINISHED')
            return { ...r, details: { ...r.details, readyToPublish: true } };
        if (['ERROR', 'EXPIRED'].includes(status))
            return { ...r, state: 'FAILED', error: `Container Meta ${status}` };
        return r;
    }
    async finalize(a: Account, c: Bag, r: Receipt): Promise<Receipt> { assert(r.details?.readyToPublish, 'META_STATUS', 'Container non pronto'); const b = await this.post(a, c, `/${encodeURIComponent(a.targetId)}/${a.platform === 'threads' ? 'threads_publish' : 'media_publish'}`, { creation_id: r.externalId }); assert(b.id, 'META_RESPONSE', 'ID pubblicazione mancante'); return { state: 'PUBLISHED', externalId: String(b.id), details: { containerId: r.externalId } }; }
    async metrics(a: Account, c: Bag, r: Receipt): Promise<Metrics> {
        assert(['instagram', 'threads'].includes(a.platform), 'METRICS_UNSUPPORTED', 'Metriche native non disponibili per questo canale; usare Postiz o importazione verificata');
        const fields = a.platform === 'instagram' ? 'like_count,comments_count' : 'is_quote_post';
        assert(a.platform === 'instagram', 'METRICS_UNSUPPORTED', 'Per Threads usare le analytics Postiz');
        const b = await this.get(a, c, `/${encodeURIComponent(r.externalId)}?fields=${fields}`);
        const values: Record<string, number> = {};
        if (Number.isFinite(b.like_count))
            values.likes = b.like_count;
        if (Number.isFinite(b.comments_count))
            values.comments = b.comments_count;
        return { collectedAt: now(), values, source: 'instagram-graph' };
    }
}
