import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const app = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');
const popupFunction = app.slice(app.indexOf('async function openOAuthWindow('), app.indexOf('async function commandPalette('));
const catalogFunction = app.slice(app.indexOf('function channelCatalog('), app.indexOf('function accountsPage('));
function popupHarness(options = {}) {
    const calls = [], timers = new Map();
    let listener, nextId = 0, grants = 0;
    const location = { origin: 'http://studio.example.test', pathname: '/app', search: '', assign: (_url) => { calls.push('redirect'); } };
    const popup = { closed: false, focus() { }, close() { this.closed = true; }, location: { origin: 'http://studio.example.test', pathname: '/blank', search: '', replace: (_url) => { calls.push('navigate'); } } };
    const context = vm.createContext({
        api: async (_path, _method, body) => { calls.push('request:' + (body.provider || 'default')); if (options.failure)
            throw new Error('START_FAILED'); return { url: 'https://provider.example.test/auth' }; },
        base: () => '/api/brands/fixture', matchMedia: () => ({ matches: !!options.mobile }), navigator: { userAgent: 'desktop' },
        screen: { width: 1440, height: 1080 }, window: { open: () => { calls.push('open'); return options.blocked ? null : popup; } }, location,
        URLSearchParams, oauthError: (x) => x, grantDialog: async () => { grants++; },
        addEventListener: (_name, cb) => { listener = cb; }, removeEventListener: () => { listener = undefined; },
        clearInterval: (id) => { timers.delete(id); }, clearTimeout: (id) => { timers.delete(id); },
        setInterval: (cb) => { const id = ++nextId; timers.set(id, cb); return id; },
        setTimeout: (cb) => { const id = ++nextId; timers.set(id, cb); return id; }
    });
    const promise = vm.runInContext(popupFunction + '\nopenOAuthWindow("instagram", "meta")', context);
    return { promise, popup, calls, timers, emit: (ev) => listener?.(ev), grants: () => grants };
}
test('OAuth popup opens during the click before awaiting the start request and settles on closure', async () => {
    const h = popupHarness();
    const rejected = assert.rejects(h.promise, /OAUTH_CANCELLED/);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(h.calls, ['open', 'request:meta', 'navigate']);
    h.popup.closed = true;
    h.timers.get(1)();
    await rejected;
    assert.equal(h.timers.size, 0);
});
test('OAuth popup accepts a result only from its own window and same origin, then cleans up', async () => {
    const h = popupHarness();
    await new Promise(resolve => setImmediate(resolve));
    h.emit({ origin: 'https://foreign.example.test', source: h.popup, data: { type: 'air3-oauth-result', grant: 'fixture' } });
    h.emit({ origin: 'http://studio.example.test', source: {}, data: { type: 'air3-oauth-result', grant: 'fixture' } });
    assert.equal(h.grants(), 0);
    assert.equal(h.timers.size, 2);
    h.emit({ origin: 'http://studio.example.test', source: h.popup, data: { type: 'air3-oauth-result', grant: 'fixture' } });
    await h.promise;
    assert.equal(h.grants(), 1);
    assert.equal(h.timers.size, 0);
    assert.equal(h.popup.closed, true);
});
test('OAuth redirects when popups are blocked or on mobile, and closes the blank window on request failure', async () => {
    for (const options of [{ blocked: true }, { mobile: true }]) {
        const h = popupHarness(options);
        await h.promise;
        assert(h.calls.includes('redirect'));
        assert.equal(h.timers.size, 0);
        if ('mobile' in options)
            assert(!h.calls.includes('open'));
    }
    const h = popupHarness({ failure: true });
    await assert.rejects(h.promise, /START_FAILED/);
    assert.equal(h.popup.closed, true);
});
test('OAuth popup polling and timeout both settle and release listeners', async () => {
    const h = popupHarness();
    await new Promise(resolve => setImmediate(resolve));
    h.popup.location.pathname = '/app';
    h.popup.location.search = '?grant=fixture';
    h.timers.get(1)();
    await h.promise;
    assert.equal(h.grants(), 1);
    assert.equal(h.timers.size, 0);
    const timed = popupHarness();
    const rejected = assert.rejects(timed.promise, /OAUTH_TIMEOUT/);
    await new Promise(resolve => setImmediate(resolve));
    timed.timers.get(2)();
    await rejected;
    assert.equal(timed.timers.size, 0);
});
test('Channel catalog keeps existing Facebook Instagram connections and workspace app controls', () => {
    const meta = { provider: 'meta', label: 'Facebook / Meta', platforms: ['instagram'], configured: true, inherited: false };
    const instagram = { provider: 'instagram', label: 'Instagram', platforms: ['instagram'], configured: false, inherited: false };
    const context = vm.createContext({ currentLang: 'it', state: { me: { siteAdmin: false }, status: { platforms: { instagram: { label: 'Instagram', notes: '' } } } },
        oauthApps: [meta, instagram], connections: [], may: () => true, icon: () => '', socialMark: () => '', esc: (x) => x,
        dataId: (x) => `data-id="${x}"`, button: (label, action, _cls, data) => `<button data-action="${action}" ${data}>${label}</button>` });
    const html = vm.runInContext(catalogFunction + '\nchannelCatalog()', context);
    assert(html.includes('Login Facebook'));
    assert(html.includes('data-provider="meta"'));
    assert(html.includes('data-action="configure-oauth"'));
    assert(!html.includes('data-action="configure-shared-oauth"'));
    instagram.configured = true;
    const both = vm.runInContext('channelCatalog()', context);
    assert(both.includes('data-provider="instagram"'));
    assert(both.includes('data-provider="meta"'));
});
//# sourceMappingURL=oauth-ui.test.js.map