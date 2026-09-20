import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, addAccount as publicAccount, response } from './helpers.js';
import type { SocialPost, Bag } from '../src/core/types.js';
import { validatePost } from '../src/social/capabilities.js';
const addAccount = (...args: Parameters<typeof publicAccount>) => { const visible = publicAccount(...args); return args[0].studio.hub.account(args[0].p, visible.id); };
const post = (extra: Bag = {}): SocialPost => ({ id: 'c'.repeat(32), title: 'Una domanda per la community', text: 'Quale idea vorresti condividere?', format: 'text', media: [], options: {}, ...extra });
const image = { url: 'https://media.example.test/photo.jpg', mime: 'image/jpeg', alt: 'Un paesaggio' };
const video = { url: 'https://media.example.test/reel.mp4', mime: 'video/mp4' };
const directCases: [
    string,
    string,
    Bag,
    Bag,
    string,
    (b: Bag, h: Headers) => void
][] = [
    ['telegram', '-1001', {}, { ok: true, result: { message_id: 7 } }, 'sendMessage', (b) => assert.equal(b.chat_id, '-1001')],
    ['facebook', 'page-1', {}, { id: 'fb-1' }, '/page-1/feed', (b) => assert.equal(b.message, post().text)],
    ['x', 'author', {}, { data: { id: 'x-1' } }, '/2/tweets', (b) => assert.equal(b.text, post().text)],
    ['linkedin', 'urn:li:person:member', {}, {}, '/rest/posts', (b, h) => { assert.equal(b.author, 'urn:li:person:member'); assert.equal(h.get('LinkedIn-Version'), '202609'); assert.equal(b.lifecycleState, 'PUBLISHED'); }],
    ['linkedin-page', 'urn:li:organization:org', {}, {}, '/rest/posts', (b) => assert.equal(b.author, 'urn:li:organization:org')],
    ['discord', 'channel', {}, { id: 'discord-1' }, '/channels/channel/messages', (b) => assert.deepEqual(b.allowed_mentions, { parse: [] })],
    ['slack', 'channel', {}, { ok: true, ts: '1.234' }, '/chat.postMessage', (b) => assert.equal(b.channel, 'channel')],
    ['reddit', 'testsub', { username: 'tester' }, { json: { errors: [], data: { name: 't3_abc', url: 'https://reddit.com/test' } } }, '/api/submit', (_b, h) => assert.equal(h.get('content-type'), 'application/x-www-form-urlencoded')],
    ['mastodon', 'author', { instance: 'https://instance.example.test' }, { id: 'mast-1', url: 'https://instance.example.test/@a/1' }, '/api/v1/statuses', (_b, h) => assert.equal(h.get('Idempotency-Key'), 'c'.repeat(32))],
    ['bluesky', 'author', { did: 'did:plc:test', pds: 'https://bsky.social' }, { uri: 'at://did:plc:test/app.bsky.feed.post/123', cid: 'blob-cid' }, '/xrpc/com.atproto.repo.createRecord', (b) => { assert.equal(b.repo, 'did:plc:test'); assert.equal(b.record.$type, 'app.bsky.feed.post'); }],
    ['farcaster', 'channel', { apiKey: 'neynar-test', signerUuid: 'signer' }, { success: true, cast: { hash: '0xabc' } }, '/v2/farcaster/cast/', (b, h) => { assert.equal(h.get('x-api-key'), 'neynar-test'); assert.equal(b.signer_uuid, 'signer'); }],
    ['twitch', 'broadcaster', { clientId: 'client-id', senderId: 'sender' }, { data: [{ is_sent: true, message_id: 'twitch-msg' }] }, '/helix/chat/messages', (b, h) => { assert.equal(h.get('Client-Id'), 'client-id'); assert.equal(b.sender_id, 'sender'); }]
];
for (const [platform, target, creds, reply, path, check] of directCases)
    test(`HTTP contract, not live: ${platform} text publishing`, async (t) => {
        const f = await fixture();
        t.after(() => f.cleanup());
        const a = addAccount(f, platform, 'direct', target, creds);
        f.http.handler = (url, init, b) => {
            assert.ok(url.endsWith(path), url);
            assert.equal(init.method, 'POST');
            check(b, new Headers(init.headers));
            if (platform === 'reddit') {
                const form = new URLSearchParams(String(init.body));
                assert.equal(form.get('sr'), 'testsub');
                assert.equal(form.get('kind'), 'self');
            }
            return response(reply, 201, platform.startsWith('linkedin') ? { 'x-restli-id': 'urn:li:share:1' } : {});
        };
        const r = await f.studio.hub.publish(a, post());
        assert.equal(r.state, 'PUBLISHED');
        assert.ok(r.externalId);
        assert.equal(f.http.calls.length, 1);
    });
test('Telegram album sends exactly one caption and preserves all returned IDs', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); const a = addAccount(f); f.http.handler = (u, _i, b) => { assert.ok(u.endsWith('/sendMediaGroup')); assert.equal(b.media.length, 2); assert.equal(b.media[0].caption, post().text); assert.equal(b.media[1].caption, undefined); return response({ ok: true, result: [{ message_id: 1 }, { message_id: 2 }] }); }; const r = await f.studio.hub.publish(a, post({ format: 'carousel', media: [image, image] })); assert.deepEqual(r.details?.messageIds, ['1', '2']); });
test('Pinterest native image and board contract', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); const a = addAccount(f, 'pinterest', 'direct', 'board-1'); f.http.handler = (u, _i, b) => { assert.equal(u, 'https://api.pinterest.com/v5/pins'); assert.deepEqual(b.media_source, { source_type: 'image_url', url: image.url }); assert.equal(b.board_id, 'board-1'); return response({ id: 'pin-1' }); }; assert.equal((await f.studio.hub.publish(a, post({ format: 'image', media: [image] }))).state, 'PUBLISHED'); });
for (const platform of ['instagram', 'threads'])
    test(`${platform}: container creation, pure GET readiness, separate final publication`, async (t) => {
        const f = await fixture();
        t.after(() => f.cleanup());
        const a = addAccount(f, platform, 'direct', 'creator');
        const seen: string[] = [];
        f.http.handler = (u, i, b) => {
            seen.push(i.method ?? 'GET');
            if (seen.length === 1) {
                assert.ok(u.endsWith(platform === 'threads' ? '/creator/threads' : '/creator/media'));
                assert.equal(b.image_url, image.url);
                return response({ id: 'container-1' });
            }
            if (seen.length === 2) {
                assert.equal(i.method, undefined);
                return response(platform === 'threads' ? { status: 'FINISHED' } : { status_code: 'FINISHED' });
            }
            assert.equal(b.creation_id, 'container-1');
            assert.ok(u.endsWith(platform === 'threads' ? '/threads_publish' : '/media_publish'));
            return response({ id: 'public-1' });
        };
        let r = await f.studio.hub.publish(a, post({ format: 'image', media: [image] }));
        assert.equal(r.state, 'PROCESSING');
        r = await f.studio.hub.poll(a, r);
        assert.equal(r.state, 'PROCESSING');
        assert.equal(r.details?.readyToPublish, true);
        r = await f.studio.hub.finalize(a, r);
        assert.equal(r.state, 'PUBLISHED');
        assert.equal(r.externalId, 'public-1');
        assert.deepEqual(seen, ['POST', 'GET', 'POST']);
    });
test('Instagram carousel children are image containers, final parent carries caption', async (t) => {
    const f = await fixture();
    t.after(() => f.cleanup());
    const a = addAccount(f, 'instagram', 'direct', 'creator');
    let n = 0;
    f.http.handler = (_u, _i, b) => {
        n++;
        if (n < 3) {
            assert.equal(b.is_carousel_item, true);
            return response({ id: 'child' + n });
        }
        assert.equal(b.media_type, 'CAROUSEL');
        assert.deepEqual(b.children, ['child1', 'child2']);
        return response({ id: 'parent' });
    };
    const r = await f.studio.hub.publish(a, post({ format: 'carousel', media: [image, image] }));
    assert.equal(r.state, 'PROCESSING');
    assert.equal(r.externalId, 'parent');
});
test('Facebook video remains PROCESSING until video_status ready', async (t) => {
    const f = await fixture();
    t.after(() => f.cleanup());
    const a = addAccount(f, 'facebook', 'direct', 'page');
    f.http.handler = (u, i, b) => {
        if (i.method === 'POST') {
            assert.ok(u.endsWith('/page/videos'));
            assert.equal(b.file_url, video.url);
            return response({ id: 'video-1' });
        }
        return response({ status: { video_status: 'ready' } });
    };
    const r = await f.studio.hub.publish(a, post({ format: 'video', media: [video] }));
    assert.equal(r.state, 'PROCESSING');
    assert.equal((await f.studio.hub.poll(a, r)).state, 'PUBLISHED');
});
for (const platform of ['messenger', 'instagram-dm'])
    test(`${platform}: reply routes recipient without inventing delivery receipt`, async (t) => {
        const f = await fixture();
        t.after(() => f.cleanup());
        const a = addAccount(f, platform, 'direct', 'page');
        f.http.handler = (_u, _i, b) => {
            assert.deepEqual(b.recipient, { id: 'recipient' });
            assert.equal(b.message.text, post().text);
            if (platform === 'messenger')
                assert.equal(b.messaging_type, 'RESPONSE');
            return response({ message_id: 'msg-1' });
        };
        const r = await f.studio.hub.publish(a, post({ format: 'message', options: { recipient: 'recipient' } }));
        assert.equal(r.details?.delivery, 'accepted-by-api');
    });
test('WhatsApp template accepted receipt is PROCESSING, never delivery success', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); const a = addAccount(f, 'whatsapp', 'direct', 'phone'); const template = { name: 'approved_template', language: { code: 'it' }, components: [] }; f.http.handler = (u, _i, b) => { assert.ok(u.endsWith('/phone/messages')); assert.equal(b.messaging_product, 'whatsapp'); assert.equal(b.to, '391234'); assert.deepEqual(b.template, template); return response({ messages: [{ id: 'wamid.test' }] }); }; const r = await f.studio.hub.publish(a, post({ format: 'template', options: { recipient: '391234', template } })); assert.equal(r.state, 'PROCESSING'); assert.equal(r.details?.stage, 'webhook'); });
const ttOpts = { consent: true, privacyLevel: 'SELF_ONLY', allowComments: false, allowDuet: false, allowStitch: false, brandContent: false, brandOrganic: false, isAigc: true };
test('TikTok video creator permissions -> init ticket -> authoritative status', async (t) => {
    const f = await fixture();
    t.after(() => f.cleanup());
    const a = addAccount(f, 'tiktok', 'direct', 'creator');
    f.http.handler = (u, _i, b) => {
        if (u.endsWith('/creator_info/query/'))
            return response({ error: { code: 'ok' }, data: { privacy_level_options: ['SELF_ONLY'], comment_disabled: true, duet_disabled: true, stitch_disabled: true } });
        if (u.endsWith('/video/init/')) {
            assert.equal(b.source_info.source, 'PULL_FROM_URL');
            assert.equal(b.post_info.disable_comment, true);
            assert.equal(b.post_info.is_aigc, true);
            return response({ error: { code: 'ok' }, data: { publish_id: 'ticket-1' } });
        }
        assert.equal(b.publish_id, 'ticket-1');
        return response({ error: { code: 'ok' }, data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: ['public-id'] } });
    };
    let r = await f.studio.hub.publish(a, post({ format: 'video', media: [video], options: ttOpts }));
    assert.equal(r.state, 'PROCESSING');
    r = await f.studio.hub.poll(a, r);
    assert.equal(r.state, 'PUBLISHED');
    assert.deepEqual(r.details?.publicPostIds, ['public-id']);
});
test('TikTok unaudited public post is refused before publish init', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); const a = addAccount(f, 'tiktok', 'direct', 'creator'); f.http.handler = () => response({ error: { code: 'ok' }, data: { privacy_level_options: ['PUBLIC_TO_EVERYONE'] } }); await assert.rejects(() => f.studio.hub.publish(a, post({ format: 'video', media: [video], options: { ...ttOpts, privacyLevel: 'PUBLIC_TO_EVERYONE' } })), /audit/); assert.equal(f.http.calls.length, 1); });
test('TikTok photo DIRECT_POST contract, explicit privacy and commercial flags', async (t) => {
    const f = await fixture();
    t.after(() => f.cleanup());
    const a = addAccount(f, 'tiktok', 'direct', 'creator');
    f.http.handler = (u, _i, b) => {
        if (u.endsWith('/creator_info/query/'))
            return response({ error: { code: 'ok' }, data: { privacy_level_options: ['SELF_ONLY'] } });
        assert.ok(u.endsWith('/content/init/'));
        assert.equal(b.post_mode, 'DIRECT_POST');
        assert.equal(b.media_type, 'PHOTO');
        assert.deepEqual(b.source_info.photo_images, [image.url, image.url]);
        assert.equal(b.post_info.brand_content_toggle, false);
        return response({ error: { code: 'ok' }, data: { publish_id: 'photo-ticket' } });
    };
    assert.equal((await f.studio.hub.publish(a, post({ format: 'carousel', media: [image, image], options: ttOpts }))).state, 'PROCESSING');
});
for (const platform of ['youtube', 'linkedin', 'x'])
    test(`Postiz ${platform}: upload, provider contract and monitored publication`, async (t) => {
        const f = await fixture();
        t.after(() => f.cleanup());
        const a = addAccount(f, platform, 'postiz', 'integration');
        let published = false;
        f.http.handler = (u, i, b) => {
            assert.equal(new Headers(i.headers).get('Authorization'), 'TEST_POSTIZ');
            if (u.endsWith('/upload-from-url'))
                return response({ id: 'media-1', path: 'https://postiz.example.test/media.mp4' });
            if (u.endsWith('/posts')) {
                assert.equal(b.type, 'now');
                assert.equal(b.posts[0].integration.id, 'integration');
                assert.equal(b.posts[0].value[0].image[0].id, 'media-1');
                if (platform === 'youtube') {
                    assert.equal(b.posts[0].settings.__type, 'youtube');
                    assert.equal(b.posts[0].settings.selfDeclaredMadeForKids, 'no');
                    assert.equal(b.posts[0].settings.type, 'private');
                }
                return response([{ postId: 'job-1', integration: 'integration' }]);
            }
            const q = new URL(u).searchParams;
            assert.ok(q.get('startDate'));
            assert.ok(q.get('endDate'));
            return response({ posts: [{ id: 'job-1', integration: { id: 'integration' }, state: published ? 'PUBLISHED' : 'QUEUE', releaseURL: 'https://social.example.test/post' }] });
        };
        const p = post({ format: platform === 'youtube' ? 'video' : 'image', media: [platform === 'youtube' ? video : image], options: { madeForKids: false, privacy: 'private', tags: [] } });
        let r = await f.studio.hub.publish(a, p);
        assert.equal(r.state, 'PROCESSING');
        assert.equal((await f.studio.hub.poll(a, r)).state, 'PROCESSING');
        published = true;
        r = await f.studio.hub.poll(a, r);
        assert.equal(r.state, 'PUBLISHED');
        assert.equal(r.url, 'https://social.example.test/post');
    });
test('Postiz analytics uses latest snapshot, not a false sum of cumulative totals', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); const a = addAccount(f, 'x', 'postiz', 'integration'); f.http.handler = u => { assert.ok(u.endsWith('/analytics/post/job-1?date=30')); return response([{ label: 'views', data: [{ date: '2026-09-19', total: '120' }, { date: '2026-09-18', total: '100' }] }]); }; const m = await f.studio.hub.metrics(a, { state: 'PUBLISHED', externalId: 'job-1' }); assert.equal(m.values.views, 120); assert.ok(m.raw?.series); });
test('Unsupported native metrics do not return invented zero values', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); await assert.rejects(() => f.studio.hub.metrics(addAccount(f, 'telegram'), { state: 'PUBLISHED', externalId: '1' }), /metriche/); assert.equal(f.http.calls.length, 0); });
test('Disabled integrations and unsupported format fail before the first external call', async (t) => { const f = await fixture(); t.after(() => f.cleanup()); const a = addAccount(f, 'x'); assert.throws(() => validatePost(a.data, post({ format: 'image', media: [image] })), /Postiz/); assert.throws(() => validatePost({ ...a.data, enabled: false }, post()), /disabilitato/); assert.equal(f.http.calls.length, 0); });
