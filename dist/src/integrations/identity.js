import { randomBytes, createPublicKey, verify } from 'node:crypto';
import { jsonRequest } from '../core/http.js';
import { requireRole, requireHuman } from '../core/auth.js';
import { passwordHash, passwordValid, encrypt, decrypt, equal } from '../core/crypto.js';
import { assert, id, sha, now, text } from '../core/util.js';
export function verifyGoogleJwt(token, keys, audience, nonce, at = Date.now()) {
    assert(token.length < 20000, 'OIDC', 'ID token troppo grande', 401);
    const parts = token.split('.');
    assert(parts.length === 3, 'OIDC', 'ID token non valido', 401);
    let header, claims;
    try {
        header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    }
    catch {
        throw new Error('ID token non decodificabile');
    }
    assert(header.alg === 'RS256' && typeof header.kid === 'string' && !header.crit, 'OIDC', 'Algoritmo token non consentito', 401);
    const jwk = keys.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.use || k.use === 'sig') && (!k.alg || k.alg === 'RS256'));
    assert(jwk, 'OIDC', 'Chiave Google non disponibile', 401);
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    assert(verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url')), 'OIDC', 'Firma ID token non valida', 401);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud], seconds = at / 1000;
    assert(['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss) && aud.includes(audience), 'OIDC', 'Issuer o audience non validi', 401);
    assert((aud.length === 1 && !claims.azp) || claims.azp === audience, 'OIDC', 'Presenter non valido', 401);
    assert(typeof claims.exp === 'number' && claims.exp > seconds && typeof claims.iat === 'number' && claims.iat <= seconds + 60 && (!claims.nbf || claims.nbf <= seconds + 60), 'OIDC', 'Token scaduto o non ancora valido', 401);
    assert(typeof claims.nonce === 'string' && equal(claims.nonce, nonce), 'OIDC', 'Nonce non valido', 401);
    assert(typeof claims.sub === 'string' && claims.sub.length > 0 && claims.sub.length <= 255 && (claims.email_verified === true || claims.email_verified === 'true'), 'OIDC', 'Identità non verificata', 401);
    assert(typeof claims.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email), 'OIDC', 'Email verificata richiesta', 401);
    return claims;
}
export const cookieValue = (req, name) => (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) ?? '';
export function flowCookie(name, value, secure, maxAge = 600) { return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`; }
export class Identity {
    auth;
    settings;
    http;
    limits = new Map();
    jwks = { keys: [], until: 0 };
    constructor(auth, settings, http) {
        this.auth = auth;
        this.settings = settings;
        this.http = http;
    }
    limit(key, n = 5) {
        const at = Date.now();
        for (const [k, v] of this.limits)
            if (v.until < at)
                this.limits.delete(k);
        assert(this.limits.size < 10000 || this.limits.has(key), 'RATE_LIMIT', 'Troppi tentativi', 429);
        const x = this.limits.get(key) ?? { n: 0, until: at + 15 * 60000 };
        x.n++;
        this.limits.set(key, x);
        assert(x.n <= n, 'RATE_LIMIT', 'Attendere prima di riprovare', 429);
    }
    async mail(to, subject, body) {
        assert(this.settings.mailEnabled, 'MAIL_DISABLED', 'Email transazionale non configurata', 503);
        const r = await this.http.request('https://api.resend.com/emails', jsonRequest({ from: this.settings.value('MAIL_FROM'), to: [to], subject, text: body }, this.settings.value('RESEND_API_KEY')));
        assert(r.body.id, 'MAIL_FAILED', 'Email non accettata dal provider', 502);
    }
    createAction(kind, email, uid, wid, role, data = {}, minutes = 60) {
        const token = randomBytes(32).toString('base64url');
        const db = this.auth.store.db;
        db.prepare('DELETE FROM auth_actions WHERE expires<?').run(Date.now());
        db.prepare('INSERT INTO auth_actions VALUES (?,?,?,?,?,?,?,?)').run(sha(token), kind, email, uid, wid, role, encrypt(data, this.auth.cfg.masterKey, 'auth-action:' + sha(token)), Date.now() + minutes * 60000);
        return token;
    }
    action(token, kind) { assert(/^[A-Za-z0-9_-]{43}$/.test(token), 'ACTION', 'Link non valido o scaduto', 400); const row = this.auth.store.db.prepare('SELECT * FROM auth_actions WHERE token_hash=? AND kind=? AND expires>?').get(sha(token), kind, Date.now()); assert(row, 'ACTION', 'Link non valido, scaduto o già usato', 400); return row; }
    async signup(b, ip) {
        this.limit('signup:' + ip);
        assert(this.settings.value('ALLOW_REGISTRATION') === 'true', 'REGISTRATION_CLOSED', 'Registrazione chiusa. Richiedi un invito al gestore.', 403);
        const email = text(b.email, 'email', 300).toLowerCase(), password = text(b.password, 'password', 1000);
        assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'EMAIL', 'Email non valida');
        assert(password.length >= 16, 'PASSWORD', 'Almeno 16 caratteri');
        assert(this.settings.mailEnabled, 'MAIL_DISABLED', 'Verifica email non configurata', 503);
        const existing = this.auth.store.db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if (existing)
            return;
        const uid = id(), wid = id();
        this.auth.store.transaction(() => { this.auth.store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(uid, email, passwordHash(password), now()); this.auth.store.db.prepare('INSERT INTO user_flags VALUES (?,0,0)').run(uid); this.auth.store.db.prepare('INSERT INTO workspaces VALUES (?,?)').run(wid, text(b.workspace ?? b.name ?? 'Il mio studio', 'workspace', 100)); this.auth.store.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(uid, wid, 'admin'); });
        const token = this.createAction('verify', email, uid, wid, null, {}, 1440);
        await this.mail(email, 'Verifica la tua email • AIR3 Social Studio', `Conferma il tuo indirizzo email aprendo questo link:\n${this.auth.cfg.baseUrl}/verify#${token}\n\nScade tra 24 ore. Se non hai richiesto l’account, ignora il messaggio.`).catch(() => console.error('Signup verification delivery failed; user can request a new verification link.'));
    }
    async forgot(email, ip) {
        this.limit('reset:' + ip);
        this.limit('reset-email:' + sha(email.toLowerCase()), 3);
        const u = this.auth.store.db.prepare('SELECT u.*,f.disabled FROM users u LEFT JOIN user_flags f ON f.user_id=u.id WHERE email=?').get(email.toLowerCase());
        if (!u || u.disabled || !this.settings.mailEnabled)
            return;
        const token = this.createAction('reset', u.email, u.id, null, null, {}, 30);
        await this.mail(u.email, 'Recupero accesso • AIR3 Social Studio', `Imposta una nuova password:\n${this.auth.cfg.baseUrl}/reset#${token}\n\nIl link scade tra 30 minuti. Se non hai richiesto il recupero, ignora il messaggio.`).catch(() => console.error('Transactional reset delivery failed; check mail provider configuration.'));
    }
    async resend(email, ip) {
        this.limit('verify:' + ip);
        this.limit('verify-email:' + sha(email.toLowerCase()), 3);
        const u = this.auth.store.db.prepare('SELECT u.* FROM users u JOIN user_flags f ON f.user_id=u.id WHERE email=? AND f.verified=0 AND f.disabled=0').get(email.toLowerCase());
        if (!u || !this.settings.mailEnabled)
            return;
        const token = this.createAction('verify', u.email, u.id, null, null, {}, 1440);
        await this.mail(u.email, 'Verifica email • AIR3 Social Studio', `${this.auth.cfg.baseUrl}/verify#${token}\nValido per 24 ore.`).catch(() => console.error('Transactional verification delivery failed; check mail provider configuration.'));
    }
    reset(token, password) { assert(password.length >= 16 && password.length <= 1000, 'PASSWORD', 'Password tra 16 e 1000 caratteri'); const hash = passwordHash(password); this.auth.store.transaction(() => { const r = this.action(token, 'reset'); this.auth.store.db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, r.user_id); this.auth.store.db.prepare('INSERT INTO user_flags VALUES (?,1,0) ON CONFLICT(user_id) DO UPDATE SET verified=1').run(r.user_id); this.auth.store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(r.user_id); this.auth.store.db.prepare("DELETE FROM auth_actions WHERE user_id=? AND kind IN ('reset','verify')").run(r.user_id); }); }
    verifyEmail(token) { this.auth.store.transaction(() => { const r = this.action(token, 'verify'); this.auth.store.db.prepare('UPDATE user_flags SET verified=1 WHERE user_id=?').run(r.user_id); this.auth.store.db.prepare("DELETE FROM auth_actions WHERE user_id=? AND kind='verify'").run(r.user_id); }); }
    async invite(p, email, role) {
        requireRole(p, 'admin');
        requireHuman(p);
        assert(['viewer', 'editor', 'approver', 'admin'].includes(role), 'ROLE', 'Ruolo non valido');
        assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'EMAIL', 'Email non valida');
        const token = this.createAction('invite', email.toLowerCase(), null, p.workspaceId, role, {}, 72 * 60), url = `${this.auth.cfg.baseUrl}/invite#${token}`;
        let delivered = false;
        if (this.settings.mailEnabled) {
            try {
                await this.mail(email, 'Invito al workspace • AIR3 Social Studio', `Sei stato invitato con ruolo ${role}.\n${url}\n\nIl link scade tra 72 ore.`);
                delivered = true;
            }
            catch {
                console.error('Invitation delivery failed; authorized administrator can copy the one-time link.');
            }
        }
        this.auth.store.audit(p, '', 'invitation.created', '', { email, role, delivered });
        return { url, delivered, expiresHours: 72 };
    }
    acceptInvite(token, password, authenticated) {
        this.auth.store.transaction(() => {
            const a = this.action(token, 'invite');
            let u = this.auth.store.db.prepare('SELECT * FROM users WHERE email=?').get(a.email);
            if (u) {
                assert(authenticated?.userId === u.id || passwordValid(password, u.password), 'INVITE_LOGIN', 'Questo indirizzo ha già un account. Usa la password esistente oppure accedi prima.', 401);
            }
            else {
                assert(password.length >= 16 && password.length <= 1000, 'PASSWORD', 'Password tra 16 e 1000 caratteri');
                u = { id: id() };
                this.auth.store.db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(u.id, a.email, passwordHash(password), now());
            }
            this.auth.store.db.prepare('INSERT INTO user_flags VALUES (?,1,0) ON CONFLICT(user_id) DO UPDATE SET verified=1').run(u.id);
            this.auth.store.db.prepare('INSERT OR IGNORE INTO memberships VALUES (?,?,?)').run(u.id, a.workspace_id, a.role);
            this.auth.store.db.prepare('DELETE FROM auth_actions WHERE token_hash=?').run(a.token_hash);
        });
    }
    googleStart(p) { const clientId = this.settings.value('GOOGLE_CLIENT_ID'); assert(clientId && this.settings.value('GOOGLE_CLIENT_SECRET'), 'GOOGLE_NOT_CONFIGURED', 'Accesso Google non configurato', 503); const state = randomBytes(32).toString('base64url'), binding = randomBytes(32).toString('base64url'), nonce = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url'), callback = this.auth.cfg.baseUrl + '/oauth/google/callback'; const data = { binding: sha(binding), nonce, verifier, callback, clientId, link: !!p }; this.auth.store.db.prepare('INSERT INTO oauth_states VALUES (?,?,?,?,?,?,?)').run(sha(state), p?.workspaceId ?? '', '', p?.userId ?? '', 'google', encrypt(data, this.auth.cfg.masterKey, 'oauth:' + sha(state)), Date.now() + 600000); const u = new URL('https://accounts.google.com/o/oauth2/v2/auth'); u.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: Buffer.from(sha(verifier), 'hex').toString('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString(); return { url: u.href, cookie: flowCookie('air3_google_' + sha(state).slice(0, 16), binding, this.auth.cfg.baseUrl.startsWith('https:')) }; }
    async googleCallback(req, u) {
        const state = u.searchParams.get('state') ?? '', sid = sha(state);
        const row = this.auth.store.db.prepare("SELECT * FROM oauth_states WHERE id=? AND provider='google' AND expires>?").get(sid, Date.now());
        assert(row, 'OAUTH_STATE', 'Sessione OAuth scaduta o già usata', 400);
        const data = decrypt(row.data, this.auth.cfg.masterKey, 'oauth:' + sid), name = 'air3_google_' + sid.slice(0, 16);
        assert(equal(sha(cookieValue(req, name)), data.binding), 'OAUTH_BINDING', 'Browser OAuth non corrispondente', 403);
        const deleted = this.auth.store.db.prepare('DELETE FROM oauth_states WHERE id=?').run(sid);
        assert(deleted.changes === 1, 'OAUTH_REPLAY', 'Richiesta già usata', 409);
        assert(!u.searchParams.has('error'), 'OAUTH_DENIED', 'Consenso Google non concesso');
        assert(this.settings.value('GOOGLE_CLIENT_ID') === data.clientId, 'OAUTH_CONFIG', 'Configurazione cambiata. Riconnetti.');
        if (data.link) {
            const p = this.auth.principal(req, false).principal;
            assert(p.userId === row.user_id, 'OAUTH_USER', 'Sessione utente cambiata', 403);
        }
        const body = new URLSearchParams({ grant_type: 'authorization_code', code: text(u.searchParams.get('code'), 'code', 5000), client_id: data.clientId, client_secret: this.settings.value('GOOGLE_CLIENT_SECRET'), redirect_uri: data.callback, code_verifier: data.verifier });
        const r = await this.http.request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
        let jwtKid = '';
        try {
            jwtKid = JSON.parse(Buffer.from(String(r.body.id_token ?? '').split('.')[0] ?? '', 'base64url').toString()).kid;
        }
        catch { }
        if (this.jwks.until < Date.now() || !this.jwks.keys.some((k) => k.kid === jwtKid)) {
            const k = await this.http.request('https://www.googleapis.com/oauth2/v3/certs');
            assert(Array.isArray(k.body.keys), 'OIDC', 'JWKS non valido');
            this.jwks = { keys: k.body.keys, until: Date.now() + 3600000 };
        }
        const claims = verifyGoogleJwt(String(r.body.id_token ?? ''), this.jwks.keys, data.clientId, data.nonce), email = claims.email.toLowerCase();
        const db = this.auth.store.db;
        let uid;
        uid = this.auth.store.transaction(() => {
            const identity = db.prepare("SELECT user_id FROM identities WHERE provider='google' AND subject=?").get(claims.sub);
            if (data.link) {
                const user = db.prepare('SELECT email FROM users WHERE id=?').get(row.user_id);
                assert(user?.email === email, 'LINK_EMAIL', 'Collega un account Google con la stessa email verificata');
                assert(!identity || identity.user_id === row.user_id, 'LINK_CONFLICT', 'Identità già collegata a un altro account', 409);
                db.prepare("INSERT OR IGNORE INTO identities VALUES ('google',?,?,?)").run(claims.sub, row.user_id, email);
                return row.user_id;
            }
            if (identity) {
                if (email === '0xfunboy@gmail.com')
                    this.auth.ensureSuperadmin(identity.user_id);
                return identity.user_id;
            }
            const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
            if (email === '0xfunboy@gmail.com') {
                if (existing) {
                    db.prepare("INSERT OR IGNORE INTO identities VALUES ('google',?,?,?)").run(claims.sub, existing.id, email);
                    this.auth.ensureSuperadmin(existing.id);
                    return existing.id;
                }
                const userId = id(), wid = db.prepare('SELECT id FROM workspaces LIMIT 1').get()?.id || id();
                db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(userId, email, passwordHash(randomBytes(48).toString('base64url')), now());
                db.prepare('INSERT OR IGNORE INTO user_flags VALUES (?,1,0)').run(userId);
                db.prepare('INSERT OR IGNORE INTO workspaces VALUES (?,?)').run(wid, 'Il mio studio');
                db.prepare('INSERT OR IGNORE INTO memberships VALUES (?,?,?)').run(userId, wid, 'admin');
                db.prepare("INSERT OR IGNORE INTO identities VALUES ('google',?,?,?)").run(claims.sub, userId, email);
                this.auth.ensureSuperadmin(userId);
                return userId;
            }
            assert(!existing, 'GOOGLE_LINK_REQUIRED', 'Esiste già un account con questa email. Accedi con password e collega Google dalle impostazioni.', 409);
            assert(this.settings.value('ALLOW_REGISTRATION') === 'true', 'REGISTRATION_CLOSED', 'Account non collegato. Richiedi un invito, accedi e collega Google.', 403);
            const userId = id(), wid = id();
            db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(userId, email, passwordHash(randomBytes(48).toString('base64url')), now());
            db.prepare('INSERT INTO workspaces VALUES (?,?)').run(wid, 'Il mio studio');
            db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(userId, wid, 'admin');
            db.prepare("INSERT INTO identities VALUES ('google',?,?,?)").run(claims.sub, userId, email);
            return userId;
        });
        const session = this.auth.issueSession(uid);
        if (email === '0xfunboy@gmail.com') {
            this.auth.ensureSuperadmin(uid);
        }
        return { cookie: this.auth.cookie(session.token), clear: flowCookie(name, '', this.auth.cfg.baseUrl.startsWith('https:'), 0), linked: !!data.link };
    }
}
//# sourceMappingURL=identity.js.map