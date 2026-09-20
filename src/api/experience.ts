import { clientIp } from '../core/proxy.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Studio } from '../core/service.js';
import type { Auth } from '../core/auth.js';
import { requireHuman, requireRole } from '../core/auth.js';
import { Network } from '../core/http.js';
import type { Bag, Principal, Role, Platform } from '../core/types.js';
import { assert, AppError, text, id, now, object } from '../core/util.js';
import { readBody } from './server.js';
const send = (res: ServerResponse, value: unknown, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
async function body(req: IncomingMessage): Promise<Bag> { assert(req.headers['content-type']?.startsWith('application/json'), 'CONTENT_TYPE', 'Richiesto application/json', 415); try {
    return object(JSON.parse((await readBody(req, 100000)).toString()));
}
catch (err) {
    if (err instanceof AppError)
        throw err;
    throw new AppError(400, 'JSON', 'JSON non valido');
} }
export class ExperienceApi {
    constructor(readonly studio: Studio, readonly auth: Auth) { }
    async callback(req: IncomingMessage, res: ServerResponse, u: URL): Promise<boolean> {
        const match = /^\/oauth\/([a-z]+)\/callback$/.exec(u.pathname);
        if (!match || !this.studio.extensions)
            return false;
        const { identity, oauth } = this.studio.extensions;
        const provider = match[1]!;
        assert(req.method === 'GET', 'METHOD', 'Metodo non consentito', 405);
        try {
            identity.limit('callback:' + clientIp(req), 60);
            if (provider === 'google') {
                const r = await identity.googleCallback(req, u);
                res.setHeader('Set-Cookie', [r.cookie, r.clear]);
                res.writeHead(303, { Location: '/app' + (r.linked ? '?linked=google#settings' : '') });
            }
            else {
                const r = await oauth.callback(req, provider, u), row = this.studio.store.db.prepare('SELECT workspace_id FROM connection_grants WHERE id=?').get(r.grantId) as Bag;
                res.setHeader('Set-Cookie', r.clear);
                res.writeHead(303, { Location: '/app?grant=' + r.grantId + '&workspace=' + encodeURIComponent(row.workspace_id) + '#accounts' });
            }
            res.end();
        }
        catch (err) {
            const code = err instanceof AppError ? err.code : 'PROVIDER_UNAVAILABLE';
            res.writeHead(303, { Location: (provider === 'google' ? '/login?error=' : '/app?oauth_error=') + encodeURIComponent(code) + (provider === 'google' ? '' : '#accounts') });
            res.end();
        }
        return true;
    }
    async public(req: IncomingMessage, res: ServerResponse, u: URL): Promise<boolean> {
        if (!this.studio.extensions)
            return false;
        const { settings, identity } = this.studio.extensions, path = u.pathname, method = req.method;
        if (path === '/api/public' && method === 'GET') {
            send(res, settings.public());
            return true;
        }
        const routes = ['/api/auth/signup', '/api/auth/forgot', '/api/auth/resend', '/api/auth/reset', '/api/auth/verify', '/api/auth/invite', '/api/auth/google/start'];
        if (!routes.includes(path))
            return false;
        assert(method === 'POST', 'METHOD', 'Metodo non consentito', 405);
        assert(!req.headers.origin || req.headers.origin === this.studio.cfg.baseUrl, 'ORIGIN', 'Origin non consentita', 403);
        const b = await body(req), ip = clientIp(req);
        if (path === '/api/auth/google/start') {
            identity.limit('google:' + ip, 30);
            const p = b.link ? this.auth.principal(req, true).principal : undefined;
            if (p)
                requireHuman(p);
            const r = identity.googleStart(p);
            res.setHeader('Set-Cookie', r.cookie);
            send(res, { url: r.url });
            return true;
        }
        if (path === '/api/auth/signup') {
            await identity.signup(b, ip);
            send(res, { message: 'Se l’indirizzo è idoneo, riceverai un’email per completare la registrazione.' }, 202);
            return true;
        }
        if (path === '/api/auth/forgot' || path === '/api/auth/resend') {
            const email = text(b.email, 'email', 300);
            if (path.endsWith('forgot'))
                await identity.forgot(email, ip);
            else
                await identity.resend(email, ip);
            send(res, { message: 'Se l’indirizzo è idoneo, riceverai un’email con le istruzioni.' }, 202);
            return true;
        }
        identity.limit('auth-action:' + ip, 15);
        const token = text(b.token, 'token', 200);
        if (path.endsWith('/reset'))
            identity.reset(token, text(b.password, 'password', 1000));
        if (path.endsWith('/verify'))
            identity.verifyEmail(token);
        if (path.endsWith('/invite')) {
            let p: Principal | undefined;
            try {
                p = this.auth.principal(req, true).principal;
            }
            catch { }
            identity.acceptInvite(token, String(b.password ?? ''), p);
        }
        send(res, { ok: true });
        return true;
    }
    async protected(req: IncomingMessage, res: ServerResponse, u: URL, p: Principal): Promise<boolean> {
        if (!this.studio.extensions)
            return false;
        const { settings, identity, oauth, network } = this.studio.extensions, path = u.pathname, method = req.method;
        if (path === '/api/auth/reauth' && method === 'POST') {
            requireHuman(p);
            identity.limit('reauth:' + p.userId);
            const b = await body(req);
            this.auth.reauthenticate(req, p, text(b.password, 'password', 1000));
            send(res, { ok: true });
            return true;
        }
        if (path === '/api/onboarding') {
            if (method === 'GET')
                send(res, settings.onboarding(p));
            else if (method === 'PUT') {
                const b = await body(req);
                if (b.completed === true)
                    assert(this.studio.store.list(p, 'brand').length > 0, 'SETUP_INCOMPLETE', 'Creare almeno un brand prima di completare il wizard');
                send(res, settings.saveOnboarding(p, b));
            }
            else
                return false;
            return true;
        }
        if (path === '/api/admin/installation') {
            if (method === 'GET')
                send(res, settings.read(p));
            else if (method === 'PUT') {
                this.auth.requireSiteAdmin(p);
                assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma nuovamente la tua identità prima di cambiare la configurazione', 403);
                send(res, settings.save(p, await body(req)));
                if (network instanceof Network)
                    network.setExtraOrigins(settings.value('OUTBOUND_ORIGINS').split(',').map(x => x.trim()).filter(Boolean));
            }
            else
                return false;
            return true;
        }
        if (path === '/api/admin/installation/export' && method === 'POST') {
            this.auth.requireSiteAdmin(p);
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità', 403);
            const b = await body(req);
            assert(b.includeSecrets === true, 'CONFIRM', 'Confermare esplicitamente l’esportazione dei segreti');
            this.studio.store.audit(p, '', 'installation.secrets.exported', '');
            send(res, { filename: 'runtime.generated.env', content: settings.env(true) });
            return true;
        }
        if (path === '/api/admin/installation/test-model' && method === 'POST') {
            this.auth.requireSiteAdmin(p);
            identity.limit('model-test:' + p.userId, 10);
            const result = await this.studio.model.generate('Return {"ok":true}. This is a connectivity check.', { test: true }, { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } }, additionalProperties: false });
            send(res, { ok: result.ok === true, model: this.studio.model.name });
            return true;
        }
        if (path === '/api/admin/installation/test-email' && method === 'POST') {
            this.auth.requireSiteAdmin(p);
            identity.limit('email-test:' + p.userId, 5);
            const user = this.studio.store.db.prepare('SELECT email FROM users WHERE id=?').get(p.userId) as Bag;
            await identity.mail(user.email, 'Test email • AIR3 Social Studio', 'La tua email transazionale è configurata.');
            send(res, { ok: true });
            return true;
        }
        if (path === '/api/admin/invitations') {
            requireRole(p, 'admin');
            requireHuman(p);
            if (method === 'GET')
                send(res, this.studio.store.db.prepare("SELECT token_hash id,email,role,expires FROM auth_actions WHERE kind='invite' AND workspace_id=? AND expires>?").all(p.workspaceId, Date.now()));
            else if (method === 'POST') {
                identity.limit('invite:' + p.userId, 20);
                const b = await body(req);
                send(res, await identity.invite(p, text(b.email, 'email', 300), b.role as Role), 201);
            }
            else
                return false;
            return true;
        }
        const invite = /^\/api\/admin\/invitations\/([a-f0-9]{64})$/.exec(path);
        if (invite && method === 'DELETE') {
            requireRole(p, 'admin');
            requireHuman(p);
            this.studio.store.db.prepare("DELETE FROM auth_actions WHERE token_hash=? AND workspace_id=? AND kind='invite'").run(invite[1]!, p.workspaceId);
            send(res, { ok: true });
            return true;
        }
        if (path === '/api/admin/workspace' && method === 'PUT') {
            requireRole(p, 'admin');
            requireHuman(p);
            const b = await body(req);
            this.studio.store.db.prepare('UPDATE workspaces SET name=? WHERE id=?').run(text(b.name, 'nome', 100), p.workspaceId);
            send(res, { ok: true });
            return true;
        }
        const member = /^\/api\/admin\/members\/([a-f0-9]{32})$/.exec(path);
        if (member && ['PUT', 'DELETE'].includes(method ?? '')) {
            requireRole(p, 'admin');
            requireHuman(p);
            const uid = member[1]!, b = method === 'PUT' ? await body(req) : {}, old = this.studio.store.db.prepare('SELECT role FROM memberships WHERE user_id=? AND workspace_id=?').get(uid, p.workspaceId) as Bag | undefined;
            assert(old, 'NOT_FOUND', 'Membro non trovato', 404);
            assert(method !== 'PUT' || ['viewer', 'editor', 'approver', 'admin'].includes(b.role), 'ROLE', 'Ruolo non valido');
            const admins = this.studio.store.db.prepare("SELECT count(*) n FROM memberships WHERE workspace_id=? AND role='admin'").get(p.workspaceId) as Bag;
            assert(!(old.role === 'admin' && admins.n === 1 && (method === 'DELETE' || b.role !== 'admin')), 'LAST_ADMIN', 'Non puoi rimuovere l’ultimo amministratore');
            if (method === 'DELETE')
                this.studio.store.db.prepare('DELETE FROM memberships WHERE user_id=? AND workspace_id=?').run(uid, p.workspaceId);
            else
                this.studio.store.db.prepare('UPDATE memberships SET role=? WHERE user_id=? AND workspace_id=?').run(b.role, uid, p.workspaceId);
            this.studio.store.audit(p, '', 'member.updated', uid, { role: b.role ?? 'removed' });
            send(res, { ok: true });
            return true;
        }
        if (path === '/api/admin/site' && method === 'GET') {
            this.auth.requireSiteAdmin(p);
            send(res, { users: this.studio.store.db.prepare('SELECT u.id,u.email,u.created_at,COALESCE(f.disabled,0) disabled,COALESCE(f.verified,1) verified,CASE WHEN a.user_id IS NULL THEN 0 ELSE 1 END site_admin FROM users u LEFT JOIN user_flags f ON f.user_id=u.id LEFT JOIN site_admins a ON a.user_id=u.id').all(), counts: { workspaces: (this.studio.store.db.prepare('SELECT count(*) n FROM workspaces').get() as Bag).n, brands: (this.studio.store.db.prepare("SELECT count(*) n FROM entities WHERE kind='brand'").get() as Bag).n }, audit: this.studio.store.db.prepare("SELECT actor,action,at FROM audit WHERE brand_id='' ORDER BY at DESC LIMIT 100").all() });
            return true;
        }
        const siteUser = /^\/api\/admin\/site\/users\/([a-f0-9]{32})$/.exec(path);
        if (siteUser && method === 'PUT') {
            this.auth.requireSiteAdmin(p);
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità', 403);
            const b = await body(req), uid = siteUser[1]!;
            assert(uid !== p.userId && !this.auth.siteAdmin(uid), 'SITE_ADMIN', 'Non è possibile disabilitare un amministratore dell’installazione');
            assert(this.studio.store.db.prepare('SELECT id FROM users WHERE id=?').get(uid), 'NOT_FOUND', 'Utente non trovato', 404);
            this.studio.store.db.prepare('INSERT INTO user_flags VALUES (?,1,?) ON CONFLICT(user_id) DO UPDATE SET disabled=excluded.disabled').run(uid, b.disabled === true ? 1 : 0);
            this.studio.store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);
            this.studio.store.audit(p, '', 'user.disabled', uid, { disabled: b.disabled === true });
            send(res, { ok: true });
            return true;
        }
        if (path === '/api/oauth/meta/webhook' && method === 'GET') {
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità', 403);
            send(res, oauth.webhookConfig(p));
            return true;
        }
        if (path === '/api/admin/oauth/apps' && method === 'GET') {
            send(res, oauth.apps(p, true));
            return true;
        }
        if (path === '/api/admin/oauth/meta/webhook' && method === 'GET') {
            this.auth.requireSiteAdmin(p);
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità', 403);
            send(res, oauth.webhookConfig(p, true));
            return true;
        }
        const sharedApp = /^\/api\/admin\/oauth\/apps\/([a-z]+)$/.exec(path);
        if (sharedApp && method === 'PUT') {
            this.auth.requireSiteAdmin(p);
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità', 403);
            send(res, oauth.saveApp(p, sharedApp[1]!, await body(req), true));
            return true;
        }
        const appOverride = /^\/api\/oauth\/apps\/([a-z]+)$/.exec(path);
        if (appOverride && method === 'DELETE') {
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità', 403);
            oauth.useSharedApp(p, appOverride[1]!);
            send(res, { ok: true });
            return true;
        }
        if (path === '/api/oauth/apps' && method === 'GET') {
            send(res, oauth.apps(p));
            return true;
        }
        const app = /^\/api\/oauth\/apps\/([a-z]+)$/.exec(path);
        if (app && method === 'PUT') {
            assert(this.auth.recent(req), 'REAUTH_REQUIRED', 'Conferma la tua identità per cambiare le credenziali OAuth', 403);
            send(res, oauth.saveApp(p, app[1]!, await body(req)));
            return true;
        }
        const start = /^\/api\/brands\/([a-f0-9]{32})\/oauth\/([a-z-]+)\/start$/.exec(path);
        if (start && method === 'POST') {
            identity.limit('oauth-start:' + p.userId, 40);
            const r = oauth.start(p, start[1]!, start[2] as Platform);
            res.setHeader('Set-Cookie', r.cookie);
            send(res, { url: r.url });
            return true;
        }
        const g = /^\/api\/oauth\/grants\/([a-f0-9]{32})$/.exec(path);
        if (g) {
            if (method === 'GET')
                send(res, oauth.publicGrant(p, g[1]!));
            else if (method === 'POST') {
                const b = await body(req);
                send(res, oauth.select(p, g[1]!, b.keys));
            }
            else
                return false;
            return true;
        }
        const connections = /^\/api\/brands\/([a-f0-9]{32})\/connections$/.exec(path);
        if (connections && method === 'GET') {
            send(res, oauth.list(p, connections[1]!));
            return true;
        }
        const tg = /^\/api\/brands\/([a-f0-9]{32})\/connect-telegram$/.exec(path);
        if (tg && method === 'POST') {
            identity.limit('telegram-connect:' + p.userId, 10);
            send(res, await oauth.connectTelegram(p, tg[1]!, await body(req)), 201);
            return true;
        }
        const account = /^\/api\/accounts\/([a-f0-9]{32})\/(check|disconnect)$/.exec(path);
        if (account && method === 'POST') {
            identity.limit('account-action:' + p.userId, 30);
            if (account[2] === 'check')
                send(res, await oauth.verify(p, account[1]!));
            else {
                await oauth.disconnect(p, account[1]!);
                send(res, { ok: true });
            }
            return true;
        }
        return false;
    }
}
