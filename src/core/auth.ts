import type { IncomingMessage } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { Store } from './store.js';
import type { Config } from './config.js';
import { passwordHash, passwordValid, equal } from './crypto.js';
import { assert, id, sha, text, now } from './util.js';
import { ROLES, type Principal, type Role, type Bag } from './types.js';
export function requireRole(p: Principal, role: Role): void { assert(ROLES.indexOf(p.role) >= ROLES.indexOf(role), 'FORBIDDEN', 'Permesso insufficiente', 403); }
export function requireHuman(p: Principal): void { assert((p.via === 'session' || p.via === 'telegram'), 'HUMAN_REQUIRED', 'Questa azione richiede una sessione umana autenticata', 403); }
export class Auth {
    private attempts = new Map<string, {
        count: number;
        until: number;
    }>();
    constructor(readonly store: Store, readonly cfg: Config) {
        const row = store.db.prepare('SELECT count(*) n FROM users').get() as Bag;
        if (row.n === 0 && cfg.bootstrapEmail && cfg.bootstrapPassword) {
            assert(cfg.bootstrapPassword.length >= 16, 'CONFIG', 'Password bootstrap: almeno 16 caratteri');
            store.transaction(() => { const uid = id(), wid = id(); store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(uid, cfg.bootstrapEmail.toLowerCase(), passwordHash(cfg.bootstrapPassword), now()); store.db.prepare('INSERT INTO workspaces VALUES (?,?)').run(wid, 'Il mio workspace'); store.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(uid, wid, 'admin'); });
        }
    }
    login(email: string, password: string, ip: string): {
        token: string;
        csrf: string;
        user: Bag;
        workspaces: Bag[];
    } {
        const time = Date.now();
        for (const [k, v] of this.attempts)
            if (v.until < time)
                this.attempts.delete(k);
        assert(this.attempts.size < 10000 || this.attempts.has(ip), 'RATE_LIMIT', 'Troppi tentativi', 429);
        const rate = this.attempts.get(ip) ?? { count: 0, until: time + 900000 };
        rate.count++;
        this.attempts.set(ip, rate);
        assert(rate.count <= 10, 'RATE_LIMIT', 'Attendere prima di riprovare', 429);
        const u = this.store.db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) as Bag | undefined;
        // Constant-work password check for unknown accounts, without leaking account existence.
        const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
        const valid = passwordValid(password, u?.password ?? dummy);
        assert(u && valid, 'LOGIN', 'Credenziali non valide', 401);
        this.attempts.delete(ip);
        const token = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
        this.store.db.prepare('DELETE FROM sessions WHERE expires<?').run(time);
        this.store.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(sha(token), u.id, csrf, time + 12 * 3600000);
        return { token, csrf, user: { id: u.id, email: u.email }, workspaces: this.workspaces(u.id) };
    }
    workspaces(userId: string): Bag[] { return this.store.db.prepare('SELECT w.*,m.role FROM workspaces w JOIN memberships m ON m.workspace_id=w.id WHERE m.user_id=?').all(userId) as Bag[]; }
    principal(req: IncomingMessage, mutating: boolean): {
        principal: Principal;
        csrf?: string;
    } {
        const authorization = req.headers.authorization ?? '';
        if (authorization.startsWith('Bearer ')) {
            const t = this.store.db.prepare('SELECT * FROM tokens WHERE token_hash=? AND expires>?').get(sha(authorization.slice(7)), Date.now()) as Bag | undefined;
            assert(t, 'AUTH', 'Token non valido o scaduto', 401);
            return { principal: { userId: 'token:' + t.id, workspaceId: t.workspace_id, brandId: t.brand_id, role: t.role, via: 'token' } };
        }
        const token = (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith('smm_session='))?.slice(12);
        assert(token, 'AUTH', 'Accesso richiesto', 401);
        const s = this.store.db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(sha(token), Date.now()) as Bag | undefined;
        assert(s, 'AUTH', 'Sessione scaduta', 401);
        if (mutating) {
            assert(equal(String(req.headers['x-csrf-token'] ?? ''), s.csrf), 'CSRF', 'Token CSRF non valido', 403);
            const origin = req.headers.origin;
            assert(!origin || origin === this.cfg.baseUrl, 'ORIGIN', 'Origin non consentita', 403);
        }
        const list = this.workspaces(s.user_id);
        const requested = String(req.headers['x-workspace-id'] ?? '');
        const w = requested ? list.find(x => x.id === requested) : list[0];
        assert(w, 'WORKSPACE', 'Workspace non autorizzato', 403);
        return { principal: { userId: s.user_id, workspaceId: w.id, role: w.role, via: 'session' }, csrf: s.csrf };
    }
    logout(req: IncomingMessage): void { const token = (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith('smm_session='))?.slice(12); if (token)
        this.store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token)); }
    cookie(token: string, remove = false): string { return `smm_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove ? 0 : 43200}${this.cfg.baseUrl.startsWith('https:') ? '; Secure' : ''}`; }
    createToken(p: Principal, brandId: string, name: string, role: Role, days = 30): {
        id: string;
        token: string;
    } { requireRole(p, 'admin'); requireHuman(p); this.store.get(p, brandId, 'brand'); assert(role === 'viewer' || role === 'editor', 'ROLE', 'I token macchina non possono approvare contenuti'); assert(Number.isInteger(days) && days >= 1 && days <= 365, 'VALIDATION', 'Durata token 1..365 giorni'); const token = randomBytes(32).toString('base64url'), tid = id(); this.store.db.prepare('INSERT INTO tokens VALUES (?,?,?,?,?,?,?)').run(tid, sha(token), p.workspaceId, brandId, role, text(name, 'nome', 100), Date.now() + days * 86400000); this.store.audit(p, brandId, 'token.created', tid, { role, name }); return { id: tid, token }; }
    addUser(p: Principal, email: string, password: string, role: Role): string { requireRole(p, 'admin'); requireHuman(p); assert(ROLES.includes(role), 'ROLE', 'Ruolo non valido'); assert(password.length >= 16, 'PASSWORD', 'Password: almeno 16 caratteri'); assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'EMAIL', 'Email non valida'); return this.store.transaction(() => { let u = this.store.db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase()) as Bag | undefined; if (!u) {
        u = { id: id() };
        this.store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(u.id, email.toLowerCase(), passwordHash(password), now());
    } if (role !== 'admin') {
        const prior = this.store.db.prepare('SELECT role FROM memberships WHERE user_id=? AND workspace_id=?').get(u.id, p.workspaceId) as Bag | undefined;
        const admins = this.store.db.prepare("SELECT count(*) n FROM memberships WHERE workspace_id=? AND role='admin'").get(p.workspaceId) as Bag;
        assert(prior?.role !== 'admin' || admins.n > 1, 'LAST_ADMIN', 'Non è possibile rimuovere l’ultimo amministratore');
    } this.store.db.prepare('INSERT INTO memberships VALUES (?,?,?) ON CONFLICT(user_id,workspace_id) DO UPDATE SET role=excluded.role').run(u.id, p.workspaceId, role); this.store.audit(p, '', 'membership.set', u.id, { email, role }); return u.id; }); }
}
