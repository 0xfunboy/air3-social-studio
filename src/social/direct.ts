import type { Account, Bag, Metrics, Receipt, SocialPost } from '../core/types.js';
import type { Http } from '../core/http.js';
import type { Config } from '../core/config.js';
import { apiSuccess, jsonRequest } from '../core/http.js';
import { assert, now } from '../core/util.js';
export class DirectClients {
    constructor(private http: Http, private cfg: Config) { }
    async telegram(c: Bag, method: string, body: Bag): Promise<Bag> { assert(c.botToken && /^[0-9]+:[A-Za-z0-9_-]+$/.test(c.botToken), 'TELEGRAM_TOKEN', 'Bot token Telegram non valido'); const r = await this.http.request(`https://api.telegram.org/bot${c.botToken}/${method}`, jsonRequest(body)); apiSuccess(r.body, 'Telegram'); return r.body.result; }
    async publish(a: Account, c: Bag, p: SocialPost): Promise<Receipt> {
        let b: Bag;
        const m = p.media[0];
        switch (a.platform) {
            case 'telegram': {
                if (p.media.length > 1)
                    b = await this.telegram(c, 'sendMediaGroup', { chat_id: a.targetId, media: p.media.map((x, i) => ({ type: x.mime.startsWith('video/') ? 'video' : 'photo', media: x.url, ...(i === 0 ? { caption: p.text } : {}) })) });
                else if (m)
                    b = await this.telegram(c, m.mime.startsWith('video/') ? 'sendVideo' : 'sendPhoto', { chat_id: a.targetId, [m.mime.startsWith('video/') ? 'video' : 'photo']: m.url, caption: p.text });
                else
                    b = await this.telegram(c, 'sendMessage', { chat_id: a.targetId, text: p.text, link_preview_options: { is_disabled: false } });
                const items = Array.isArray(b) ? b : [b];
                assert(items[0]?.message_id, 'TELEGRAM_RESPONSE', 'message_id mancante');
                return { state: 'PUBLISHED', externalId: String(items[0].message_id), details: { messageIds: items.map(x => String(x.message_id)) } };
            }
            case 'x': {
                const r = await this.http.request('https://api.x.com/2/tweets', jsonRequest({ text: p.text }, c.accessToken));
                assert(r.body.data?.id, 'X_RESPONSE', 'ID post X mancante');
                return { state: 'PUBLISHED', externalId: r.body.data.id, url: `https://x.com/i/web/status/${r.body.data.id}` };
            }
            case 'linkedin':
            case 'linkedin-page': {
                assert(/^urn:li:(person|organization):/.test(a.targetId), 'LINKEDIN_AUTHOR', 'targetId deve essere una URN autore LinkedIn');
                const r = await this.http.request('https://api.linkedin.com/rest/posts', jsonRequest({ author: a.targetId, commentary: p.text, visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false }, c.accessToken, { 'LinkedIn-Version': this.cfg.linkedinVersion, 'X-Restli-Protocol-Version': '2.0.0' }));
                const urn = r.headers.get('x-restli-id');
                assert(urn, 'LINKEDIN_RESPONSE', 'Header x-restli-id mancante');
                return { state: 'PUBLISHED', externalId: urn };
            }
            case 'discord': {
                const embeds = p.media.filter(x => x.mime.startsWith('image/')).map(x => ({ image: { url: x.url }, description: x.alt ?? '' }));
                const body = { content: p.text + (m?.mime.startsWith('video/') ? '\n' + m.url : ''), embeds, allowed_mentions: { parse: [] } };
                const r = await this.http.request(`https://discord.com/api/v10/channels/${encodeURIComponent(a.targetId)}/messages`, jsonRequest(body, undefined, { Authorization: `Bot ${c.botToken}` }));
                assert(r.body.id, 'DISCORD_RESPONSE', 'ID messaggio Discord mancante');
                return { state: 'PUBLISHED', externalId: String(r.body.id) };
            }
            case 'slack': {
                const r = await this.http.request('https://slack.com/api/chat.postMessage', jsonRequest({ channel: a.targetId, text: p.text, unfurl_links: false, unfurl_media: false }, c.accessToken));
                assert(r.body.ok === true && r.body.ts, 'SLACK_RESPONSE', 'Slack non ha accettato il messaggio');
                return { state: 'PUBLISHED', externalId: r.body.ts };
            }
            case 'reddit': {
                const form = new URLSearchParams({ api_type: 'json', sr: a.targetId, kind: 'self', title: p.title, text: p.text, resubmit: 'false' });
                const r = await this.http.request('https://oauth.reddit.com/api/submit', { method: 'POST', headers: { Authorization: `Bearer ${c.accessToken}`, 'User-Agent': 'air3-social-studio/0.1 by ' + String(c.username ?? 'operator'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
                assert(!r.body.json?.errors?.length && r.body.json?.data?.name, 'REDDIT_RESPONSE', 'Reddit ha rifiutato il post');
                return { state: 'PUBLISHED', externalId: r.body.json.data.name, url: r.body.json.data.url };
            }
            case 'mastodon': {
                const base = String(c.instance).replace(/\/$/, '');
                const r = await this.http.request(base + '/api/v1/statuses', jsonRequest({ status: p.text, visibility: p.options.visibility ?? 'public' }, c.accessToken, { 'Idempotency-Key': p.id }));
                assert(r.body.id, 'MASTODON_RESPONSE', 'ID status mancante');
                return { state: 'PUBLISHED', externalId: String(r.body.id), url: r.body.url };
            }
            case 'bluesky': {
                const base = String(c.pds || 'https://bsky.social').replace(/\/$/, '');
                assert(c.did?.startsWith('did:'), 'BLUESKY_DID', 'DID autore richiesto');
                const r = await this.http.request(base + '/xrpc/com.atproto.repo.createRecord', jsonRequest({ repo: c.did, collection: 'app.bsky.feed.post', rkey: p.id, record: { $type: 'app.bsky.feed.post', text: p.text, createdAt: now() } }, c.accessToken));
                assert(r.body.uri, 'BLUESKY_RESPONSE', 'URI record mancante');
                return { state: 'PUBLISHED', externalId: r.body.uri, details: { cid: r.body.cid } };
            }
            case 'pinterest': {
                assert(m?.url, 'PINTEREST_MEDIA', 'Immagine richiesta');
                const r = await this.http.request('https://api.pinterest.com/v5/pins', jsonRequest({ board_id: a.targetId, title: p.title, description: p.text, alt_text: m.alt || p.title, ...(p.options.link ? { link: p.options.link } : {}), media_source: { source_type: 'image_url', url: m.url } }, c.accessToken));
                assert(r.body.id, 'PINTEREST_RESPONSE', 'ID Pin mancante');
                return { state: 'PUBLISHED', externalId: String(r.body.id) };
            }
            case 'farcaster': {
                const r = await this.http.request('https://api.neynar.com/v2/farcaster/cast/', jsonRequest({ signer_uuid: c.signerUuid, text: p.text, embeds: p.media.map(x => ({ url: x.url })), ...(a.targetId ? { channel_id: a.targetId } : {}) }, undefined, { 'x-api-key': c.apiKey }));
                assert(r.body.success && r.body.cast?.hash, 'FARCASTER_RESPONSE', 'Cast non accettato');
                return { state: 'PUBLISHED', externalId: r.body.cast.hash };
            }
            case 'twitch': {
                const r = await this.http.request('https://api.twitch.tv/helix/chat/messages', jsonRequest({ broadcaster_id: a.targetId, sender_id: c.senderId, message: p.text }, c.accessToken, { 'Client-Id': c.clientId }));
                const msg = r.body.data?.[0];
                assert(msg?.is_sent === true, 'TWITCH_RESPONSE', 'Messaggio Twitch non inviato');
                return { state: 'PUBLISHED', externalId: msg.message_id };
            }
            default: throw new Error('Trasporto diretto non supportato; scegliere Postiz per questo canale');
        }
    }
    async metrics(a: Account, c: Bag, r: Receipt): Promise<Metrics> {
        const values: Record<string, number> = {};
        if (a.platform === 'x') {
            const b = (await this.http.request(`https://api.x.com/2/tweets/${encodeURIComponent(r.externalId)}?tweet.fields=public_metrics`, { headers: { Authorization: `Bearer ${c.accessToken}` } })).body;
            for (const [k, v] of Object.entries(b.data?.public_metrics ?? {}))
                if (typeof v === 'number')
                    values[k] = v;
        }
        else if (a.platform === 'mastodon') {
            const b = (await this.http.request(String(c.instance).replace(/\/$/, '') + '/api/v1/statuses/' + encodeURIComponent(r.externalId), { headers: { Authorization: `Bearer ${c.accessToken}` } })).body;
            for (const key of ['favourites_count', 'reblogs_count', 'replies_count'])
                if (typeof b[key] === 'number')
                    values[key] = b[key];
        }
        else
            assert(false, 'METRICS_UNSUPPORTED', 'Questo client non espone metriche native. Usare Postiz oppure importare metriche con fonte dichiarata.');
        return { collectedAt: now(), values, source: a.platform + '-api' };
    }
}
