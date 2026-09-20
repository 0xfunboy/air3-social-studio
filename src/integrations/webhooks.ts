import type { IncomingHttpHeaders } from 'node:http';
import type { Account, Bag, Content, Entity, Principal } from '../core/types.js';
import { Studio } from '../core/service.js';
import { assert, now, sha, safeError } from '../core/util.js';
import { decrypt, equal, hmac } from '../core/crypto.js';
/** Receives provider-authenticated events only. Public request bodies never set lastInboundAt. */
export class Webhooks {
    constructor(private studio: Studio) { }
    private account(accountId: string): {
        p: Principal;
        a: Entity<Account>;
        c: Bag;
    } { const row = this.studio.store.db.prepare("SELECT workspace_id,brand_id FROM entities WHERE id=? AND kind='account'").get(accountId) as Bag | undefined; assert(row, 'NOT_FOUND', 'Webhook non trovato', 404); const p: Principal = { workspaceId: row.workspace_id, brandId: row.brand_id, userId: 'webhook', role: 'admin', via: 'system' }; const a = this.studio.hub.account(p, accountId); assert(a.data.enabled && a.data.transport === 'direct', 'WEBHOOK', 'Account webhook non attivo', 403); return { p, a, c: this.studio.hub.credentials(a) }; }
    challenge(accountId: string, q: URLSearchParams): string { const { c } = this.account(accountId); assert(c.webhookVerifyToken && q.get('hub.mode') === 'subscribe' && equal(q.get('hub.verify_token') ?? '', c.webhookVerifyToken), 'WEBHOOK_VERIFY', 'Token verifica non valido', 403); return q.get('hub.challenge') ?? ''; }
    async receive(accountId: string, headers: IncomingHttpHeaders, raw: Buffer): Promise<void> {
        const { p, a, c } = this.account(accountId);
        if (a.data.platform === 'telegram') {
            assert(c.webhookSecret && equal(String(headers['x-telegram-bot-api-secret-token'] ?? ''), c.webhookSecret), 'WEBHOOK_SIGNATURE', 'Firma webhook non valida', 403);
            const body = JSON.parse(raw.toString()) as Bag;
            await this.telegram(p, a, c, body);
            return;
        }
        assert(['whatsapp', 'messenger', 'instagram-dm', 'instagram'].includes(a.data.platform), 'WEBHOOK', 'Questo canale non espone una inbox webhook in questa release');
        assert(c.appSecret && equal(String(headers['x-hub-signature-256'] ?? ''), 'sha256=' + hmac(raw, c.appSecret)), 'WEBHOOK_SIGNATURE', 'Firma webhook non valida', 403);
        const body = JSON.parse(raw.toString()) as Bag;
        for (const entry of (body.entry ?? []).slice(0, 100)) {
            if (a.data.platform === 'whatsapp')
                for (const change of (entry.changes ?? []).slice(0, 100)) {
                    const v = change.value ?? {};
                    if (String(v.metadata?.phone_number_id) !== a.data.targetId)
                        continue;
                    for (const m of (v.messages ?? []).slice(0, 100)) {
                        const at = new Date(Number(m.timestamp) * 1000).toISOString();
                        this.inbound(p, a, String(m.id), String(m.from), String(m.text?.body ?? `[${m.type}]`), at);
                    }
                    for (const status of (v.statuses ?? []).slice(0, 100))
                        this.delivery(p, a, status);
                }
            else {
                if (String(entry.id) !== a.data.targetId)
                    continue;
                for (const event of (entry.messaging ?? []).slice(0, 100)) {
                    if (!event.message?.mid || event.message.is_echo)
                        continue;
                    this.inbound(p, a, String(event.message.mid), String(event.sender?.id), String(event.message.text ?? '[media]'), new Date(Number(event.timestamp)).toISOString());
                }
            }
        }
    }
    private metaSettings(wid: string, global = false): Bag {
        const r = (global ? this.studio.store.db.prepare('SELECT value FROM installation WHERE key=?').get('oauth:meta') : this.studio.store.db.prepare('SELECT value FROM workspace_settings WHERE workspace_id=? AND key=?').get(wid, 'oauth:meta')) as Bag | undefined;
        assert(r, 'NOT_FOUND', 'Webhook non trovato', 404);
        const a = decrypt<Bag>(r.value, this.studio.cfg.masterKey, global ? 'installation:oauth:meta' : `oauth-app:${wid}:meta`);
        assert(a.enabled !== false && a.clientSecret, 'WEBHOOK', 'App disabilitata', 403);
        return a;
    }
    metaChallenge(wid: string, q: URLSearchParams, global = false): string { const a = this.metaSettings(wid, global); assert(a.webhookVerifyToken && q.get('hub.mode') === 'subscribe' && equal(q.get('hub.verify_token') ?? '', a.webhookVerifyToken), 'WEBHOOK_VERIFY', 'Token non valido', 403); return q.get('hub.challenge') ?? ''; }
    async metaReceive(wid: string, headers: IncomingHttpHeaders, raw: Buffer, global = false): Promise<void> {
        const app = this.metaSettings(wid, global);
        assert(equal(String(headers['x-hub-signature-256'] ?? ''), 'sha256=' + hmac(raw, app.clientSecret)), 'WEBHOOK_SIGNATURE', 'Firma non valida', 403);
        const workspaces = global ? this.studio.store.db.prepare('SELECT id FROM workspaces').all() as Bag[] : [{ id: wid }];
        for (const w of workspaces) {
            const p: Principal = { workspaceId: w.id, userId: 'webhook', role: 'admin', via: 'system' };
            for (const e of this.studio.store.list<Account>(p, 'account', undefined, 10000)) {
                if (!e.data.enabled || e.data.transport !== 'direct' || !['whatsapp', 'messenger', 'instagram-dm', 'instagram'].includes(e.data.platform))
                    continue;
                const c = this.studio.hub.credentials(e);
                if (c.oauthProvider !== 'meta' || c.oauthClientId !== app.clientId || (c.oauthAppScope ?? 'workspace') !== (global ? 'installation' : 'workspace'))
                    continue;
                if (c.appSecret !== app.clientSecret)
                    continue;
                // The per-account handler still validates the signature and exact destination ID.
                await this.receive(e.id, headers, raw);
            }
        }
    }
    private once(a: Entity<Account>, eventId: string, fn: () => void): boolean {
        const db = this.studio.store.db;
        return this.studio.store.transaction(() => {
            const result = db.prepare('INSERT OR IGNORE INTO webhook_events VALUES (?,?,?)').run(a.id, eventId, Date.now());
            if (!result.changes)
                return false;
            fn();
            return true;
        });
    }
    private inbound(p: Principal, a: Entity<Account>, eventId: string, recipient: string, body: string, at: string): void {
        assert(Number.isFinite(Date.parse(at)) && Date.parse(at) < Date.now() + 300000, 'EVENT_DATE', 'Data evento non valida');
        this.once(a, eventId, () => {
            const store = this.studio.store;
            store.create(p, a.brandId, 'inbox', { accountId: a.id, platform: a.data.platform, recipient, text: body.slice(0, 10000), at, direction: 'INBOUND', externalId: eventId, status: 'OPEN' });
            const old = store.list(p, 'contact', a.brandId).find(x => x.data.accountId === a.id && x.data.recipient === recipient);
            const lastInboundAt = old?.data.lastInboundAt && old.data.lastInboundAt > at ? old.data.lastInboundAt : at;
            const data = { ...old?.data, accountId: a.id, recipient, name: old?.data.name ?? recipient, optIn: old?.data.optIn ?? false, lastInboundAt };
            if (old)
                store.update(p, old.id, old.revision, data);
            else
                store.create(p, a.brandId, 'contact', data);
        });
    }
    private delivery(p: Principal, a: Entity<Account>, status: Bag): void {
        const key = `status:${status.id}:${status.status}`;
        this.once(a, key, () => {
            const s = this.studio.store;
            const e = s.list<Content>(p, 'content', a.brandId, 5000).find(x => x.data.accountId === a.id && x.data.publication?.externalId === String(status.id));
            if (!e?.data.publication)
                return;
            const state = ['sent', 'delivered', 'read'].includes(status.status) ? 'PUBLISHED' : status.status === 'failed' ? 'FAILED' : e.data.status;
            const delivery = e.data.publication.details?.delivery;
            const rank: Bag = { accepted: 0, sent: 1, delivered: 2, read: 3 };
            if (rank[delivery] > rank[status.status])
                return;
            s.update(p, e.id, e.revision, { ...e.data, status: state, publication: { ...e.data.publication, state: state === 'PUBLISHED' ? 'PUBLISHED' : state === 'FAILED' ? 'FAILED' : 'PROCESSING', details: { ...e.data.publication.details, delivery: status.status, lastStatusAt: now() } } });
            s.audit(p, a.brandId, 'message.delivery', e.id, { delivery: status.status });
        });
    }
    private async telegram(p: Principal, a: Entity<Account>, c: Bag, b: Bag): Promise<void> {
        const s = this.studio.store;
        assert(Number.isInteger(b.update_id), 'TELEGRAM_UPDATE', 'update_id non valido');
        if (s.db.prepare('SELECT 1 FROM webhook_events WHERE account_id=? AND event_id=?').get(a.id, 'tg:' + b.update_id))
            return;
        const query = b.callback_query;
        const message = b.message ?? b.channel_post;
        if (query) {
            const uid = a.data.options.approvers?.[String(query.from?.id)];
            const membership = uid ? s.db.prepare('SELECT role FROM memberships WHERE user_id=? AND workspace_id=?').get(uid, a.workspaceId) as Bag | undefined : undefined;
            let reply = 'Utente non autorizzato';
            try {
                assert(membership && ['approver', 'admin'].includes(membership.role) && String(query.message?.chat?.id) === String(a.data.options.approvalChatId), 'TELEGRAM_ACL', 'Utente o chat non autorizzati', 403);
                const actor: Principal = { ...p, userId: uid, role: membership.role, via: 'telegram' };
                const match = /^(ap|no):([a-f0-9]{32}):(\d+)$/.exec(String(query.data));
                assert(match, 'CALLBACK', 'Comando non valido');
                const content = this.studio.content(actor, match[2]!);
                assert(content.data.platform !== 'tiktok', 'TIKTOK_CONSENT', 'Per TikTok usare il consenso nella dashboard');
                if (match[1] === 'ap')
                    this.studio.approve(actor, content.id, Number(match[3]));
                else
                    this.studio.reject(actor, content.id, Number(match[3]), 'Rifiutato dal responsabile via Telegram');
                reply = match[1] === 'ap' ? 'Versione approvata. Programma dalla dashboard.' : 'Contenuto rifiutato.';
            }
            catch (err) {
                reply = safeError(err);
            }
            this.once(a, 'tg:' + b.update_id, () => { });
            await this.studio.hub.direct.telegram(c, 'answerCallbackQuery', { callback_query_id: query.id, text: reply.slice(0, 190), show_alert: true });
            return;
        }
        if (message?.chat?.id && message.message_id && String(message.chat.id) === String(a.data.targetId)) {
            this.inbound(p, a, 'tgmsg:' + message.chat.id + ':' + message.message_id, String(message.chat.id), String(message.text ?? message.caption ?? '[media]'), new Date(Number(message.date) * 1000).toISOString());
        }
        this.once(a, 'tg:' + b.update_id, () => { });
    }
    async installTelegram(p: Principal, accountId: string): Promise<Bag> { const a = this.studio.hub.account(p, accountId), c = this.studio.hub.credentials(a); assert(a.data.platform === 'telegram' && c.webhookSecret, 'TELEGRAM_CONFIG', 'Configurare webhookSecret nel bot'); const accounts = this.studio.store.list<Account>({ ...p, brandId: undefined }, 'account', undefined, 10000); assert(!accounts.some(x => x.id !== a.id && x.data.enabled && x.data.platform === 'telegram' && this.studio.hub.credentials(x).botToken === c.botToken), 'TELEGRAM_SINGLE_WEBHOOK', 'Telegram permette un solo webhook per bot. Usare un bot distinto per ciascun canale con inbox/approvazioni.'); assert(this.studio.cfg.baseUrl.startsWith('https://'), 'HTTPS', 'Un webhook Telegram richiede BASE_URL HTTPS pubblica'); return this.studio.hub.direct.telegram(c, 'setWebhook', { url: this.studio.cfg.baseUrl + '/webhooks/' + a.id, secret_token: c.webhookSecret, allowed_updates: ['message', 'channel_post', 'callback_query'], drop_pending_updates: false }); }
}
