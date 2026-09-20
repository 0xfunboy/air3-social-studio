import type { Account, Bag, Receipt, SocialPost } from '../core/types.js';
import type { Http } from '../core/http.js';
import { apiSuccess, jsonRequest } from '../core/http.js';
import { assert } from '../core/util.js';
export class TikTokClient {
    constructor(private http: Http) { }
    private async call(c: Bag, path: string, payload: Bag): Promise<Bag> { assert(c.accessToken, 'TIKTOK_TOKEN', 'Token TikTok mancante'); const r = await this.http.request('https://open.tiktokapis.com/v2/' + path, jsonRequest(payload, c.accessToken)); apiSuccess(r.body, 'TikTok'); return r.body.data; }
    async creator(c: Bag): Promise<Bag> { return this.call(c, 'post/publish/creator_info/query/', {}); }
    async publish(a: Account, c: Bag, p: SocialPost): Promise<Receipt> {
        const creator = await this.creator(c);
        assert(creator.privacy_level_options?.includes(p.options.privacyLevel), 'TIKTOK_PRIVACY', 'Privacy non disponibile per il creator; aggiornare creator info');
        assert(!creator.comment_disabled || !p.options.allowComments, 'TIKTOK_PERMISSION', 'Commenti disabilitati dal creator');
        assert(!creator.duet_disabled || !p.options.allowDuet, 'TIKTOK_PERMISSION', 'Duet disabilitati dal creator');
        assert(!creator.stitch_disabled || !p.options.allowStitch, 'TIKTOK_PERMISSION', 'Stitch disabilitati dal creator');
        if (a.options.audited !== true)
            assert(p.options.privacyLevel === 'SELF_ONLY', 'TIKTOK_AUDIT', 'App non dichiarata sottoposta ad audit: ammesso solo SELF_ONLY');
        const photo = p.media.every(x => x.mime.startsWith('image/'));
        const info: Bag = { privacy_level: p.options.privacyLevel, disable_comment: p.options.allowComments !== true, brand_content_toggle: p.options.brandContent, brand_organic_toggle: p.options.brandOrganic };
        let b: Bag;
        if (photo)
            b = await this.call(c, 'post/publish/content/init/', { post_mode: 'DIRECT_POST', media_type: 'PHOTO', post_info: { ...info, title: p.title.slice(0, 90), description: p.text, auto_add_music: p.options.autoAddMusic === true }, source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: p.media.map(x => x.url) } });
        else
            b = await this.call(c, 'post/publish/video/init/', { post_info: { ...info, title: p.text, disable_duet: p.options.allowDuet !== true, disable_stitch: p.options.allowStitch !== true, is_aigc: p.options.isAigc === true }, source_info: { source: 'PULL_FROM_URL', video_url: p.media[0]?.url } });
        assert(b.publish_id, 'TIKTOK_RESPONSE', 'publish_id TikTok mancante');
        return { state: 'PROCESSING', externalId: String(b.publish_id), details: { ticket: true } };
    }
    async poll(c: Bag, r: Receipt): Promise<Receipt> {
        const b = await this.call(c, 'post/publish/status/fetch/', { publish_id: r.externalId });
        if (b.status === 'PUBLISH_COMPLETE')
            return { ...r, state: 'PUBLISHED', details: { ...r.details, publicPostIds: (b.publicaly_available_post_id ?? []).map(String) } };
        if (b.status === 'FAILED')
            return { ...r, state: 'FAILED', error: String(b.fail_reason || 'TikTok ha rifiutato il contenuto') };
        return r;
    }
}
