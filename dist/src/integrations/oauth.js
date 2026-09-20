import { randomBytes } from 'node:crypto';
import { ProviderError } from '../core/http.js';
import { publicAccount } from '../core/service.js';
import { requireHuman, requireRole } from '../core/auth.js';
import { encrypt, decrypt, equal } from '../core/crypto.js';
import { assert, id, sha, text, now, safeError } from '../core/util.js';
import { credentialAad } from '../social/hub.js';
import { cookieValue, flowCookie } from './identity.js';
export const OAUTH = {
    meta: { label: 'Meta Business', platforms: ['facebook', 'instagram', 'messenger', 'instagram-dm', 'whatsapp'], auth: 'https://www.facebook.com/{version}/dialog/oauth', token: 'https://graph.facebook.com/{version}/oauth/access_token', scopes: [], separator: ',', docs: 'https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/' },
    threads: { label: 'Threads', platforms: ['threads'], auth: 'https://www.threads.net/oauth/authorize', token: 'https://graph.threads.net/oauth/access_token', scopes: ['threads_basic', 'threads_content_publish', 'threads_manage_insights'], separator: ',', docs: 'https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api' },
    tiktok: { label: 'TikTok', platforms: ['tiktok'], auth: 'https://www.tiktok.com/v2/auth/authorize/', token: 'https://open.tiktokapis.com/v2/oauth/token/', scopes: ['user.info.basic', 'video.publish'], separator: ',', docs: 'https://developers.tiktok.com/doc/login-kit-web/' },
    x: { label: 'X', platforms: ['x'], auth: 'https://x.com/i/oauth2/authorize', token: 'https://api.x.com/2/oauth2/token', scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'], pkce: true, basic: true, docs: 'https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code' },
    linkedin: { label: 'LinkedIn', platforms: ['linkedin', 'linkedin-page'], auth: 'https://www.linkedin.com/oauth/v2/authorization', token: 'https://www.linkedin.com/oauth/v2/accessToken', scopes: ['openid', 'profile', 'w_member_social'], docs: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow' },
    youtube: { label: 'YouTube', platforms: ['youtube'], auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'], pkce: true, extra: { access_type: 'offline', prompt: 'consent' }, docs: 'https://developers.google.com/identity/protocols/oauth2/web-server' },
    pinterest: { label: 'Pinterest', platforms: ['pinterest'], auth: 'https://www.pinterest.com/oauth/', token: 'https://api.pinterest.com/v5/oauth/token', scopes: ['boards:read', 'pins:read', 'pins:write', 'user_accounts:read'], separator: ',', basic: true, docs: 'https://developers.pinterest.com/docs/getting-started/connect-app/' },
    reddit: { label: 'Reddit', platforms: ['reddit'], auth: 'https://www.reddit.com/api/v1/authorize', token: 'https://www.reddit.com/api/v1/access_token', scopes: ['identity', 'read', 'submit', 'mysubreddits'], basic: true, extra: { duration: 'permanent' }, docs: 'https://github.com/reddit-archive/reddit/wiki/OAuth2' },
    twitch: { label: 'Twitch', platforms: ['twitch'], auth: 'https://id.twitch.tv/oauth2/authorize', token: 'https://id.twitch.tv/oauth2/token', scopes: ['user:write:chat'], docs: 'https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/' },
    slack: { label: 'Slack', platforms: ['slack'], auth: 'https://slack.com/oauth/v2/authorize', token: 'https://slack.com/api/oauth.v2.access', scopes: ['chat:write', 'channels:read', 'groups:read'], separator: ',', docs: 'https://docs.slack.dev/authentication/installing-with-oauth/' },
    discord: { label: 'Discord', platforms: ['discord'], auth: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', scopes: ['identify', 'guilds', 'bot'], extra: { permissions: '52224' }, docs: 'https://docs.discord.com/developers/topics/oauth2' },
    mastodon: { label: 'Mastodon', platforms: ['mastodon'], auth: '{instance}/oauth/authorize', token: '{instance}/oauth/token', scopes: ['read:accounts', 'write:statuses'], docs: 'https://docs.joinmastodon.org/client/token/' }
};
const basic = (a) => 'Basic ' + Buffer.from(a.clientId + ':' + a.clientSecret).toString('base64');
const bearer = (token) => ({ Authorization: 'Bearer ' + token });
function tokenFields(b) { assert(typeof b.access_token === 'string' && b.access_token.length > 0, 'OAUTH_TOKEN', 'Il provider non ha restituito un access token'); return { accessToken: b.access_token, ...(b.refresh_token ? { refreshToken: b.refresh_token } : {}), ...(Number(b.expires_in) > 0 ? { expiresAt: Date.now() + Number(b.expires_in) * 1000 } : {}), ...(Number(b.refresh_expires_in ?? b.refresh_token_expires_in) > 0 ? { refreshExpiresAt: Date.now() + Number(b.refresh_expires_in ?? b.refresh_token_expires_in) * 1000 } : {}), ...(b.scope ? { scopes: String(b.scope).split(/[ ,]+/).filter(Boolean) } : {}), issuedAt: Date.now() }; }
export class SocialOAuth {
    studio;
    auth;
    http;
    locks = new Map();
    maintenanceTimer;
    maintaining = false;
    constructor(studio, auth, http) {
        this.studio = studio;
        this.auth = auth;
        this.http = http;
        studio.hub.refreshCredentials = (e) => this.credentials(e);
    }
    providerFor(platform) { return Object.entries(OAUTH).find(([, p]) => p.platforms.includes(platform))?.[0]; }
    storedApp(wid, provider, global = false) {
        const r = (global ? this.studio.store.db.prepare('SELECT value FROM installation WHERE key=?').get('oauth:' + provider) : this.studio.store.db.prepare('SELECT value FROM workspace_settings WHERE workspace_id=? AND key=?').get(wid, 'oauth:' + provider));
        return r ? { ...decrypt(r.value, this.studio.cfg.masterKey, global ? `installation:oauth:${provider}` : `oauth-app:${wid}:${provider}`), _scope: global ? 'installation' : 'workspace' } : {};
    }
    app(wid, provider) { const local = this.storedApp(wid, provider); return local._scope ? local : this.storedApp(wid, provider, true); }
    apps(p, global = false) {
        if (global)
            this.auth.requireSiteAdmin(p);
        else {
            requireRole(p, 'admin');
            requireHuman(p);
        }
        return Object.entries(OAUTH).map(([provider, spec]) => { const a = global ? this.storedApp(p.workspaceId, provider, true) : this.app(p.workspaceId, provider); return { provider, ...spec, token: undefined, auth: undefined, source: a._scope ?? (global ? 'installation' : 'workspace'), inherited: !global && a._scope === 'installation', clientId: a.clientId ?? '', configured: !!(a.clientId && a.clientSecret && a.enabled !== false), hasSecret: !!a.clientSecret, hasBotToken: !!a.botToken, webhookUrl: this.studio.cfg.baseUrl + (a._scope === 'installation' ? '/webhooks/meta-global' : '/webhooks/meta/' + p.workspaceId), configId: a.configId ?? '', businessId: a.businessId ?? '', instance: a.instance ?? '', enabled: a.enabled !== false, redirectUri: this.studio.cfg.baseUrl + `/oauth/${provider}/callback` }; });
    }
    saveApp(p, provider, input, global = false) {
        if (global)
            this.auth.requireSiteAdmin(p);
        else {
            requireRole(p, 'admin');
            requireHuman(p);
        }
        assert(OAUTH[provider], 'OAUTH_PROVIDER', 'Provider non supportato');
        // A workspace override must never copy a shared installation secret into customer-owned data.
        const prior = this.storedApp(p.workspaceId, provider, global), a = { ...prior, clientId: text(input.clientId, 'Client ID', 500), enabled: input.enabled !== false, webhookVerifyToken: prior.webhookVerifyToken ?? randomBytes(32).toString('base64url') };
        delete a._scope;
        for (const field of ['clientSecret', 'botToken', 'configId', 'businessId', 'instance'])
            if (input[field] !== undefined && String(input[field]).trim())
                a[field] = text(input[field], field, 5000);
        if (input.clearSecret === true)
            delete a.clientSecret;
        assert(!a.instance || (/^https:\/\//.test(a.instance) && new URL(a.instance).origin === a.instance), 'INSTANCE', 'Istanza Mastodon: origin HTTPS senza slash finale');
        if (global)
            this.studio.store.db.prepare('INSERT INTO installation VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('oauth:' + provider, encrypt(a, this.studio.cfg.masterKey, `installation:oauth:${provider}`));
        else
            this.studio.store.db.prepare('INSERT INTO workspace_settings VALUES (?,?,?) ON CONFLICT(workspace_id,key) DO UPDATE SET value=excluded.value').run(p.workspaceId, 'oauth:' + provider, encrypt(a, this.studio.cfg.masterKey, `oauth-app:${p.workspaceId}:${provider}`));
        this.studio.store.audit(p, '', global ? 'installation.oauth.saved' : 'oauth.app.saved', '', { provider });
        return this.apps(p, global);
    }
    useSharedApp(p, provider) { requireRole(p, 'admin'); requireHuman(p); assert(OAUTH[provider], 'OAUTH_PROVIDER', 'Provider non supportato'); this.studio.store.db.prepare('DELETE FROM workspace_settings WHERE workspace_id=? AND key=?').run(p.workspaceId, 'oauth:' + provider); this.studio.store.audit(p, '', 'oauth.app.override.removed', '', { provider }); }
    endpoint(provider, which, a) {
        const s = OAUTH[provider];
        if (provider === 'meta')
            assert(/^v\d+\.0$/.test(this.studio.cfg.graphVersion), 'META_VERSION', 'Configurare META_GRAPH_VERSION nelle impostazioni installazione');
        if (provider === 'mastodon')
            assert(a.instance, 'INSTANCE', 'Configurare l’istanza Mastodon');
        return s[which].replace('{version}', this.studio.cfg.graphVersion).replace('{instance}', a.instance ?? '');
    }
    scopes(provider, platform) {
        if (provider === 'meta') {
            if (platform === 'whatsapp')
                return ['business_management', 'whatsapp_business_management', 'whatsapp_business_messaging'];
            if (platform === 'instagram')
                return ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'];
            if (platform === 'instagram-dm')
                return ['pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'instagram_basic', 'instagram_manage_messages'];
            if (platform === 'messenger')
                return ['pages_show_list', 'pages_read_engagement', 'pages_messaging', 'pages_manage_metadata'];
            return ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
        }
        if (platform === 'linkedin-page')
            return ['openid', 'profile', 'w_organization_social', 'rw_organization_admin'];
        return OAUTH[provider].scopes;
    }
    start(p, brandId, platform) {
        requireRole(p, 'admin');
        requireHuman(p);
        this.studio.scope(p, brandId);
        const provider = this.providerFor(platform);
        assert(provider, 'OAUTH_UNAVAILABLE', 'Questo canale usa un collegamento guidato con token o Postiz');
        const a = this.app(p.workspaceId, provider);
        assert(a.clientId && a.clientSecret && a.enabled !== false, 'OAUTH_APP_REQUIRED', 'Configura prima l’app developer di ' + OAUTH[provider].label);
        if (provider === 'discord')
            assert(a.botToken, 'BOT_TOKEN', 'Configurare il bot token Discord insieme alla app OAuth');
        const state = randomBytes(32).toString('base64url'), sid = sha(state), binding = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url'), redirectUri = this.studio.cfg.baseUrl + `/oauth/${provider}/callback`, scopes = this.scopes(provider, platform), spec = OAUTH[provider];
        const data = { binding: sha(binding), verifier, redirectUri, platform, clientId: a.clientId, scopes, appFingerprint: sha(JSON.stringify(a)) };
        this.studio.store.db.prepare('DELETE FROM oauth_states WHERE expires<?').run(Date.now());
        this.studio.store.db.prepare('INSERT INTO oauth_states VALUES (?,?,?,?,?,?,?)').run(sid, p.workspaceId, brandId, p.userId, provider, encrypt(data, this.studio.cfg.masterKey, 'oauth:' + sid), Date.now() + 600000);
        const u = new URL(this.endpoint(provider, 'auth', a));
        u.search = new URLSearchParams({ [provider === 'tiktok' ? 'client_key' : 'client_id']: a.clientId, response_type: 'code', redirect_uri: redirectUri, scope: scopes.join(spec.separator ?? ' '), state, ...(spec.extra ?? {}) }).toString();
        if (spec.pkce) {
            u.searchParams.set('code_challenge', Buffer.from(sha(verifier), 'hex').toString('base64url'));
            u.searchParams.set('code_challenge_method', 'S256');
        }
        if (provider === 'meta' && a.configId) {
            u.searchParams.set('config_id', a.configId);
            u.searchParams.set('override_default_response_type', 'true');
        }
        return { url: u.href, cookie: flowCookie('air3_oauth_' + sid.slice(0, 16), binding, this.studio.cfg.baseUrl.startsWith('https:')) };
    }
    async callback(req, provider, u) {
        assert(OAUTH[provider], 'OAUTH_PROVIDER', 'Provider non valido');
        const state = u.searchParams.get('state') ?? '', sid = sha(state), db = this.studio.store.db;
        const row = db.prepare('SELECT * FROM oauth_states WHERE id=? AND provider=? AND expires>?').get(sid, provider, Date.now());
        assert(row, 'OAUTH_STATE', 'Richiesta scaduta o già utilizzata');
        const d = decrypt(row.data, this.studio.cfg.masterKey, 'oauth:' + sid), name = 'air3_oauth_' + sid.slice(0, 16);
        assert(equal(sha(cookieValue(req, name)), d.binding), 'OAUTH_BINDING', 'Il browser non corrisponde alla richiesta OAuth', 403);
        const p = this.auth.principal(req, false).principal;
        assert(p.userId === row.user_id, 'OAUTH_USER', 'La sessione è cambiata', 403);
        const member = this.auth.workspaces(p.userId).find(w => w.id === row.workspace_id);
        assert(member?.role === 'admin', 'FORBIDDEN', 'Permessi workspace revocati', 403);
        const owner = { ...p, workspaceId: row.workspace_id, brandId: row.brand_id, role: 'admin' };
        this.studio.scope(owner, row.brand_id);
        assert(db.prepare('DELETE FROM oauth_states WHERE id=?').run(sid).changes === 1, 'OAUTH_REPLAY', 'Richiesta già usata', 409);
        assert(!u.searchParams.has('error'), 'OAUTH_DENIED', 'Autorizzazione non concessa dal provider');
        const a = this.app(row.workspace_id, provider);
        assert(sha(JSON.stringify(a)) === d.appFingerprint, 'OAUTH_CONFIG', 'App modificata durante il login: riconnettere');
        const spec = OAUTH[provider], body = new URLSearchParams({ grant_type: 'authorization_code', code: text(u.searchParams.get('code'), 'code', 5000), redirect_uri: d.redirectUri });
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (spec.basic)
            headers.Authorization = basic(a);
        else {
            body.set(provider === 'tiktok' ? 'client_key' : 'client_id', a.clientId);
            body.set('client_secret', a.clientSecret);
        }
        if (provider === 'x')
            body.set('client_id', a.clientId);
        if (spec.pkce)
            body.set('code_verifier', d.verifier);
        if (provider === 'reddit')
            headers['User-Agent'] = 'air3-social-studio/0.2 (self-hosted OAuth app)';
        const r = await this.http.request(this.endpoint(provider, 'token', a), { method: 'POST', headers, body: body.toString() });
        assert((!r.body.error || r.body.error.code === 'ok') && r.body.ok !== false, 'OAUTH_EXCHANGE', 'Il provider ha rifiutato lo scambio del codice');
        let c = tokenFields(r.body);
        if (provider === 'threads') {
            const exchanged = await this.http.request('https://graph.threads.net/access_token?' + new URLSearchParams({ grant_type: 'th_exchange_token', client_secret: a.clientSecret, access_token: c.accessToken }));
            c = { ...c, ...tokenFields(exchanged.body) };
        }
        if (provider === 'meta') {
            const exchanged = await this.http.request(this.endpoint(provider, 'token', a) + '?' + new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: a.clientId, client_secret: a.clientSecret, fb_exchange_token: c.accessToken }));
            c = { ...c, ...tokenFields(exchanged.body) };
        }
        // Scope response, when present, is authoritative. Do not copy requested scopes as granted.
        if (c.scopes) {
            const needed = d.scopes.filter((x) => !['offline.access', 'openid', 'profile'].includes(x));
            assert(needed.every((s) => c.scopes.includes(s)), 'OAUTH_SCOPE', 'Permessi incompleti: riconnettere e concedere gli scope richiesti');
        }
        c = { ...c, oauthProvider: provider, oauthClientId: a.clientId, oauthAppScope: a._scope ?? 'workspace', oauthConfigFingerprint: d.appFingerprint, oauthGrantId: id() };
        const candidates = await this.discover(provider, d.platform, c, a, r.body);
        assert(candidates.length > 0, 'OAUTH_NO_TARGETS', 'Nessun account o destinazione idonea trovata. Controlla ruoli, prodotti API e autorizzazioni dell’app.');
        const grantId = id(), payload = { candidates: candidates.slice(0, 200), scopes: c.scopes ?? [], scopeStatus: c.scopes ? 'reported' : 'not-reported', provider };
        db.prepare('DELETE FROM connection_grants WHERE expires<?').run(Date.now());
        db.prepare('INSERT INTO connection_grants VALUES (?,?,?,?,?,?,?)').run(grantId, row.workspace_id, row.brand_id, row.user_id, provider, encrypt(payload, this.studio.cfg.masterKey, 'grant:' + grantId), Date.now() + 15 * 60000);
        this.studio.store.audit(owner, row.brand_id, 'oauth.authorized', '', { provider, targets: candidates.length });
        return { grantId, clear: flowCookie(name, '', this.studio.cfg.baseUrl.startsWith('https:'), 0) };
    }
    async get(url, token, headers = {}) { const b = (await this.http.request(url, { headers: { ...bearer(token), ...headers } })).body; assert((!b.error || b.error.code === 'ok') && b.ok !== false, 'OAUTH_DISCOVERY', 'La lettura degli account è stata rifiutata dal provider'); return b; }
    async discover(provider, platform, c, a, response) {
        const out = [], push = (targetId, name, credentials = c, options = {}) => { assert(targetId, 'OAUTH_TARGET', 'ID destinazione mancante'); out.push({ key: id(), platform, targetId: String(targetId), name: String(name ?? targetId).slice(0, 150), credentials, options }); };
        const t = c.accessToken;
        if (provider === 'meta') {
            const base = 'https://graph.facebook.com/' + this.studio.cfg.graphVersion;
            if (platform === 'whatsapp') {
                const businesses = a.businessId ? [{ id: a.businessId }] : (await this.get(base + '/me/businesses?fields=id,name&limit=100', t)).data ?? [];
                for (const b of businesses.slice(0, 20)) {
                    const accounts = (await this.get(`${base}/${encodeURIComponent(b.id)}/owned_whatsapp_business_accounts?fields=id,name&limit=100`, t)).data ?? [];
                    for (const w of accounts) {
                        const phones = (await this.get(`${base}/${encodeURIComponent(w.id)}/phone_numbers?fields=id,display_phone_number,verified_name`, t)).data ?? [];
                        for (const ph of phones)
                            push(ph.id, ph.verified_name + ' · ' + ph.display_phone_number, { ...c, appSecret: a.clientSecret, webhookVerifyToken: a.webhookVerifyToken }, { wabaId: w.id, businessId: b.id });
                    }
                }
            }
            else {
                let cursor = '', pageCount = 0;
                do {
                    const fields = 'id,name,access_token,tasks' + (platform.startsWith('instagram') ? ',instagram_business_account{id,username,name,account_type}' : '');
                    const b = await this.get(base + '/me/accounts?' + new URLSearchParams({ fields, limit: '100', ...(cursor ? { after: cursor } : {}) }), t);
                    for (const page of b.data ?? []) {
                        if (!page.access_token)
                            continue;
                        const cc = { ...c, accessToken: page.access_token, appSecret: a.clientSecret, webhookVerifyToken: a.webhookVerifyToken };
                        if (platform.startsWith('instagram')) {
                            if (page.instagram_business_account)
                                push(page.instagram_business_account.id, page.instagram_business_account.username ?? page.name, cc, { pageId: page.id, login: 'facebook', accountType: page.instagram_business_account.account_type });
                        }
                        else
                            push(page.id, page.name, cc);
                    }
                    cursor = b.paging?.next ? b.paging?.cursors?.after ?? '' : '';
                } while (cursor && ++pageCount < 5);
            }
        }
        else if (provider === 'threads') {
            const me = await this.get('https://graph.threads.net/v1.0/me?fields=id,username', t);
            push(me.id, me.username);
        }
        else if (provider === 'tiktok') {
            const b = await this.get('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', t);
            push(b.data?.user?.open_id ?? response.open_id, b.data?.user?.display_name ?? 'TikTok');
        }
        else if (provider === 'x') {
            const b = await this.get('https://api.x.com/2/users/me', t);
            push(b.data?.id, b.data?.username);
        }
        else if (provider === 'linkedin') {
            if (platform === 'linkedin-page') {
                const h = { 'LinkedIn-Version': this.studio.cfg.linkedinVersion, 'X-Restli-Protocol-Version': '2.0.0' };
                const b = await this.get('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED', t, h);
                for (const x of b.elements ?? []) {
                    const urn = String(x.organization ?? ''), org = urn.split(':').pop();
                    if (!org)
                        continue;
                    const item = await this.get('https://api.linkedin.com/rest/organizations/' + encodeURIComponent(org), t, h);
                    push(urn, item.localizedName ?? urn);
                }
            }
            else {
                const me = await this.get('https://api.linkedin.com/v2/userinfo', t);
                push('urn:li:person:' + me.sub, me.name);
            }
        }
        else if (provider === 'youtube') {
            const b = await this.get('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', t);
            for (const x of b.items ?? [])
                push(x.id, x.snippet?.title);
        }
        else if (provider === 'pinterest') {
            const b = await this.get('https://api.pinterest.com/v5/boards?page_size=100', t);
            for (const x of b.items ?? [])
                push(x.id, x.name);
        }
        else if (provider === 'reddit') {
            const h = { 'User-Agent': 'air3-social-studio/0.2 (self-hosted OAuth app)' }, me = await this.get('https://oauth.reddit.com/api/v1/me', t, h), b = await this.get('https://oauth.reddit.com/subreddits/mine/subscriber?limit=100', t, h);
            for (const x of b.data?.children ?? [])
                push(x.data?.display_name, 'r/' + x.data?.display_name, { ...c, username: me.name });
        }
        else if (provider === 'twitch') {
            const me = await this.get('https://api.twitch.tv/helix/users', t, { 'Client-Id': a.clientId });
            for (const x of me.data ?? [])
                push(x.id, x.display_name, { ...c, clientId: a.clientId, senderId: x.id });
        }
        else if (provider === 'slack') {
            const b = await this.get('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200', t);
            for (const x of b.channels ?? [])
                if (x.is_member)
                    push(x.id, '#' + x.name);
        }
        else if (provider === 'discord') {
            const guilds = await this.get('https://discord.com/api/v10/users/@me/guilds', t);
            for (const g of (Array.isArray(guilds) ? guilds : []).slice(0, 30)) {
                const perms = BigInt(g.permissions ?? 0);
                if (!g.owner && !(perms & 8n) && !(perms & 32n))
                    continue;
                const channels = (await this.http.request(`https://discord.com/api/v10/guilds/${encodeURIComponent(g.id)}/channels`, { headers: { Authorization: 'Bot ' + a.botToken } })).body;
                for (const ch of Array.isArray(channels) ? channels : [])
                    if (ch.type === 0 || ch.type === 5)
                        push(ch.id, g.name + ' / #' + ch.name, { ...c, botToken: a.botToken }, { guildId: g.id });
            }
        }
        else if (provider === 'mastodon') {
            const me = await this.get(a.instance + '/api/v1/accounts/verify_credentials', t);
            push(me.id, me.acct, { ...c, instance: a.instance });
        }
        return out;
    }
    grant(p, grantId) { requireRole(p, 'admin'); requireHuman(p); const r = this.studio.store.db.prepare('SELECT * FROM connection_grants WHERE id=? AND workspace_id=? AND user_id=? AND expires>?').get(grantId, p.workspaceId, p.userId, Date.now()); assert(r && (!p.brandId || p.brandId === r.brand_id), 'GRANT', 'Connessione scaduta o non autorizzata', 404); return { ...r, payload: decrypt(r.data, this.studio.cfg.masterKey, 'grant:' + grantId) }; }
    publicGrant(p, grantId) { const r = this.grant(p, grantId); return { id: r.id, brandId: r.brand_id, workspaceId: r.workspace_id, provider: r.provider, scopes: r.payload.scopes, scopeStatus: r.payload.scopeStatus, expires: r.expires, candidates: r.payload.candidates.map((x) => ({ key: x.key, platform: x.platform, targetId: x.targetId, name: x.name })) }; }
    select(p, grantId, keys) {
        return this.studio.store.transaction(() => {
            const r = this.grant(p, grantId);
            const activeApp = this.app(p.workspaceId, r.provider);
            for (const c of r.payload.candidates) {
                assert(activeApp.enabled !== false && sha(JSON.stringify(activeApp)) === c.credentials.oauthConfigFingerprint, 'OAUTH_CONFIG', 'App modificata dopo il consenso: riconnettere');
            }
            assert(Array.isArray(keys) && keys.length > 0 && keys.length <= 50 && new Set(keys).size === keys.length, 'TARGETS', 'Scegli da 1 a 50 destinazioni');
            const chosen = keys.map(k => { const c = r.payload.candidates.find((x) => x.key === k); assert(c, 'TARGETS', 'Destinazione non presente nel grant'); return c; });
            const results = chosen.map(c => { const old = this.studio.store.list(p, 'account', r.brand_id).find(e => e.data.platform === c.platform && e.data.targetId === c.targetId && e.data.transport === 'direct'); const result = this.studio.saveAccount(p, r.brand_id, { ...c, transport: 'direct', enabled: true, revision: old?.revision }, old?.id); this.health(result.id, 'CONNECTED', 'Identità e destinazione lette dal provider; nessun test di pubblicazione eseguito.'); return result; });
            this.studio.store.db.prepare('DELETE FROM connection_grants WHERE id=?').run(grantId);
            return results;
        });
    }
    health(aid, state, detail) { this.studio.store.db.prepare('INSERT INTO connection_health VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET state=excluded.state,checked_at=excluded.checked_at,detail=excluded.detail').run(aid, state, now(), detail.slice(0, 1000)); }
    list(p, bid) { this.studio.scope(p, bid); return this.studio.store.list(p, 'account', bid).map(e => { const c = this.studio.hub.credentials(e), h = this.studio.store.db.prepare('SELECT * FROM connection_health WHERE account_id=?').get(e.id); return { ...publicAccount(e), connection: { state: !e.data.enabled ? 'DISABLED' : c.expiresAt && c.expiresAt < Date.now() ? 'EXPIRED' : h?.state ?? 'UNVERIFIED', checkedAt: h?.checked_at ?? null, detail: h?.detail ?? 'Credenziali salvate. Verifica connessione non eseguita.', provider: c.oauthProvider ?? null, expiresAt: c.expiresAt ?? null, refreshable: !!c.refreshToken || c.oauthProvider === 'threads', scopes: c.scopes ?? [], webhookUrl: this.studio.cfg.baseUrl + (c.oauthProvider === 'meta' ? (c.oauthAppScope === 'installation' ? '/webhooks/meta-global' : '/webhooks/meta/' + p.workspaceId) : '/webhooks/' + e.id) } }; }); }
    current(e) { return this.studio.hub.account({ workspaceId: e.workspaceId, brandId: e.brandId, userId: 'oauth-maintenance', role: 'admin', via: 'system' }, e.id); }
    async credentials(input) {
        const e = this.current(input), c = this.studio.hub.credentials(e);
        assert(e.data.enabled, 'ACCOUNT_DISABLED', 'Account disabilitato');
        if (!c.oauthProvider)
            return c;
        const a = this.app(e.workspaceId, c.oauthProvider);
        assert(a.enabled !== false && a.clientId === c.oauthClientId && (a._scope ?? 'workspace') === (c.oauthAppScope ?? 'workspace'), 'OAUTH_CONFIG', 'App modificata o disabilitata: riconnettere');
        if (!c.expiresAt || c.expiresAt - Date.now() > 300000)
            return c;
        // Boards/channels selected from the same grant share one rotating refresh token.
        const key = e.workspaceId + ':' + (c.oauthGrantId ?? e.id), existing = this.locks.get(key);
        if (existing) {
            await existing;
            return this.studio.hub.credentials(this.current(e));
        }
        const promise = this.refresh(e, c).finally(() => this.locks.delete(key));
        this.locks.set(key, promise);
        await promise;
        return this.studio.hub.credentials(this.current(e));
    }
    async refresh(e, c) {
        try {
            const provider = String(c.oauthProvider), a = this.app(e.workspaceId, provider), spec = OAUTH[provider];
            assert(spec && a.enabled !== false && a.clientId === c.oauthClientId && (a._scope ?? 'workspace') === (c.oauthAppScope ?? 'workspace'), 'OAUTH_CONFIG', 'App modificata o disabilitata: riconnettere');
            let b;
            if (provider === 'threads') {
                assert(c.expiresAt > Date.now(), 'TOKEN_EXPIRED', 'Token Threads scaduto: riconnettere');
                b = (await this.http.request('https://graph.threads.net/refresh_access_token?' + new URLSearchParams({ grant_type: 'th_refresh_token', access_token: c.accessToken }))).body;
            }
            else {
                assert(c.refreshToken && (!c.refreshExpiresAt || c.refreshExpiresAt > Date.now()), 'TOKEN_EXPIRED', 'Nessun refresh token valido. Riconnettere il canale.');
                const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: c.refreshToken }), headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
                if (spec.basic)
                    headers.Authorization = basic(a);
                else {
                    body.set(provider === 'tiktok' ? 'client_key' : 'client_id', a.clientId);
                    body.set('client_secret', a.clientSecret);
                }
                if (provider === 'x')
                    body.set('client_id', a.clientId);
                if (provider === 'reddit')
                    headers['User-Agent'] = 'air3-social-studio/0.2';
                b = (await this.http.request(this.endpoint(provider, 'token', a), { method: 'POST', headers, body: body.toString() })).body;
            }
            assert((!b.error || b.error.code === 'ok') && b.ok !== false, 'REFRESH_FAILED', 'Rinnovo rifiutato');
            const tokens = tokenFields(b), updated = { ...c, ...tokens };
            this.studio.store.transaction(() => {
                const latest = this.current(e);
                assert(latest.data.enabled && latest.data.credential === e.data.credential, 'REFRESH_CONFLICT', 'Credenziali cambiate durante il rinnovo');
                const p = { workspaceId: e.workspaceId, userId: 'oauth-maintenance', role: 'admin', via: 'system' };
                const siblings = c.oauthGrantId ? this.studio.store.list(p, 'account', undefined, 10000) : [latest];
                for (const account of siblings) {
                    if (!account.data.enabled)
                        continue;
                    const own = this.studio.hub.credentials(account);
                    if (c.oauthGrantId ? own.oauthGrantId !== c.oauthGrantId : account.id !== e.id)
                        continue;
                    if (own.oauthProvider !== c.oauthProvider || own.oauthClientId !== c.oauthClientId)
                        continue;
                    // Keep destination-specific data and editorial revisions. Only token fields rotate.
                    const cipher = encrypt({ ...own, ...tokens }, this.studio.cfg.masterKey, credentialAad(account.workspaceId, account.brandId, account.id));
                    this.studio.store.db.prepare("UPDATE entities SET data=json_set(data,'$.credential',?) WHERE id=? AND workspace_id=? AND brand_id=?").run(cipher, account.id, account.workspaceId, account.brandId);
                    this.health(account.id, 'CONNECTED', 'Token rinnovato dal provider');
                }
            });
            return updated;
        }
        catch (err) {
            this.health(e.id, 'RECONNECT_REQUIRED', safeError(err));
            throw new ProviderError('oauth', false, false, 0, 'Rinnovo credenziali non riuscito: riconnettere il canale. Nessun post inviato.', 502);
        }
    }
    async maintain() {
        if (this.maintaining)
            return;
        this.maintaining = true;
        try {
            const rows = this.studio.store.db.prepare("SELECT id,workspace_id,brand_id FROM entities WHERE kind='account'").all();
            for (const r of rows) {
                const e = this.studio.hub.account({ workspaceId: r.workspace_id, brandId: r.brand_id, userId: 'oauth-maintenance', role: 'admin', via: 'system' }, r.id);
                if (!e.data.enabled)
                    continue;
                const c = this.studio.hub.credentials(e);
                if (!c.oauthProvider || !c.expiresAt || c.expiresAt - Date.now() > 300000 || (!c.refreshToken && c.oauthProvider !== 'threads'))
                    continue;
                const h = this.studio.store.db.prepare('SELECT * FROM connection_health WHERE account_id=?').get(e.id);
                if (h?.state === 'RECONNECT_REQUIRED' && Date.now() - Date.parse(h.checked_at) < 3600000)
                    continue;
                try {
                    await this.credentials(e);
                }
                catch { /* Health records an actionable reconnect state; no public content is sent. */ }
            }
            this.studio.store.db.prepare('DELETE FROM oauth_states WHERE expires<?').run(Date.now());
            this.studio.store.db.prepare('DELETE FROM connection_grants WHERE expires<?').run(Date.now());
        }
        finally {
            this.maintaining = false;
        }
    }
    startMaintenance() {
        if (this.maintenanceTimer)
            return;
        this.maintenanceTimer = setInterval(() => void this.maintain().catch(() => console.error('OAuth maintenance failed')), 60000);
        this.maintenanceTimer.unref();
    }
    async stopMaintenance() {
        if (this.maintenanceTimer)
            clearInterval(this.maintenanceTimer);
        this.maintenanceTimer = undefined;
        while (this.maintaining)
            await new Promise(r => setTimeout(r, 25));
    }
    webhookConfig(p, global = false) {
        requireRole(p, 'admin');
        requireHuman(p);
        if (global)
            this.auth.requireSiteAdmin(p);
        const a = global ? this.storedApp(p.workspaceId, 'meta', true) : this.app(p.workspaceId, 'meta');
        assert(a.clientId && a.webhookVerifyToken, 'OAUTH_APP_REQUIRED', 'Configurare l’app Meta');
        const managed = a._scope === 'installation' && !this.auth.siteAdmin(p.userId);
        return { url: this.studio.cfg.baseUrl + (a._scope === 'installation' ? '/webhooks/meta-global' : '/webhooks/meta/' + p.workspaceId), managed, verifyToken: managed ? undefined : a.webhookVerifyToken, configuration: managed ? 'La callback dell’app condivisa è amministrata dal gestore. Non serve copiare segreti nel workspace.' : 'Registrare callback e token nella console Meta, selezionare i campi messages/message status e le risorse autorizzate. La sottoscrizione richiede i permessi approvati dal provider.' };
    }
    async verify(p, accountId) {
        requireRole(p, 'admin');
        requireHuman(p);
        const e = this.studio.hub.account(p, accountId);
        try {
            const c = await this.credentials(e);
            if (e.data.transport === 'postiz') {
                await this.studio.hub.postiz.integrations(c);
            }
            else if (e.data.platform === 'telegram') {
                const me = await this.studio.hub.direct.telegram(c, 'getMe', {});
                const member = await this.studio.hub.direct.telegram(c, 'getChatMember', { chat_id: e.data.targetId, user_id: me.id });
                const chat = await this.studio.hub.direct.telegram(c, 'getChat', { chat_id: e.data.targetId });
                assert(['creator', 'administrator', 'member'].includes(member.status) && (chat.type !== 'channel' || (['creator', 'administrator'].includes(member.status) && member.can_post_messages !== false)), 'PERMISSION', 'Il bot non ha permessi di pubblicazione nella chat');
            }
            else if (c.oauthProvider === 'meta') {
                const resource = await this.get('https://graph.facebook.com/' + this.studio.cfg.graphVersion + '/' + encodeURIComponent(e.data.targetId) + '?fields=id', c.accessToken);
                assert(String(resource.id) === e.data.targetId, 'PERMISSION', 'Target Meta non più accessibile');
            }
            else if (c.oauthProvider) {
                const a = this.app(p.workspaceId, c.oauthProvider), targets = await this.discover(c.oauthProvider, e.data.platform, c, a, {});
                assert(targets.some(x => x.targetId === e.data.targetId), 'PERMISSION', 'Destinazione non più autorizzata');
            }
            else
                assert(false, 'VERIFY_UNSUPPORTED', 'Verifica guidata non disponibile per questo token manuale. Usare OAuth o la console del provider.');
            this.health(e.id, 'CONNECTED', 'Identità e destinazione confermate dal provider. Nessun messaggio di prova inviato.');
        }
        catch (err) {
            this.health(e.id, 'CHECK_FAILED', safeError(err));
            throw err;
        }
        return this.list(p, e.brandId).find(x => x.id === e.id);
    }
    async connectTelegram(p, bid, input) { requireRole(p, 'admin'); requireHuman(p); this.studio.scope(p, bid); const botToken = text(input.botToken, 'Bot token', 500), target = text(input.targetId, 'Chat ID o @canale', 200); const me = await this.studio.hub.direct.telegram({ botToken }, 'getMe', {}), chat = await this.studio.hub.direct.telegram({ botToken }, 'getChat', { chat_id: target }), member = await this.studio.hub.direct.telegram({ botToken }, 'getChatMember', { chat_id: chat.id, user_id: me.id }); assert(chat.type !== 'channel' || (['administrator', 'creator'].includes(member.status) && member.can_post_messages !== false), 'TELEGRAM_PERMISSION', 'Il bot deve essere amministratore con permesso di pubblicare'); assert(!['left', 'kicked', 'restricted'].includes(member.status), 'TELEGRAM_PERMISSION', 'Bot senza permessi nella chat'); const credentials = { botToken, webhookSecret: randomBytes(32).toString('base64url') }; const old = this.studio.store.list(p, 'account', bid).find(x => x.data.platform === 'telegram' && x.data.targetId === String(chat.id)); const account = this.studio.saveAccount(p, bid, { name: chat.title ?? me.username, platform: 'telegram', transport: 'direct', targetId: String(chat.id), credentials, revision: old?.revision }, old?.id); this.health(account.id, 'CONNECTED', 'Bot e permessi verificati con Telegram'); return account; }
    async disconnect(p, accountId) { requireRole(p, 'admin'); requireHuman(p); const e = this.studio.hub.account(p, accountId); const blank = encrypt({}, this.studio.cfg.masterKey, credentialAad(e.workspaceId, e.brandId, e.id)); this.studio.store.update(p, e.id, e.revision, { ...e.data, enabled: false, credential: blank }); this.health(e.id, 'DISABLED', 'Credenziali locali eliminate. La revoca globale del grant va eseguita nella console del social.'); this.studio.store.audit(p, e.brandId, 'account.disconnected', e.id); }
}
//# sourceMappingURL=oauth.js.map