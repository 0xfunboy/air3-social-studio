import { writeFileSync, renameSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt } from './crypto.js';
import { assert, object, text, now } from './util.js';
import type { Store } from './store.js';
import type { Config } from './config.js';
import type { Bag, Principal } from './types.js';
import type { Auth } from './auth.js';
/** Installation settings are not workspace settings. A customer admin cannot edit host secrets. */
export const ENV_FIELDS: Record<string, {
    group: string;
    secret?: boolean;
    restart?: boolean;
    help: string;
}> = {
    BASE_URL: { group: 'instance', restart: true, help: 'Origin HTTPS pubblica, senza path. Il cambio richiede riavvio, DNS e configurazione del reverse proxy.' },
    SITE_NAME: { group: 'instance', help: 'Nome pubblico dell’installazione' },
    SUPPORT_EMAIL: { group: 'instance', help: 'Contatto reale del gestore' },
    PRIVACY_URL: { group: 'instance', help: 'Informativa privacy pubblicata dal gestore (HTTPS)' },
    TERMS_URL: { group: 'instance', help: 'Termini di servizio del gestore (HTTPS)' },
    ALLOW_REGISTRATION: { group: 'instance', help: 'true: iscrizione con email verificata o Google. false: solo inviti.' },
    LLM_PROVIDER: { group: 'models', help: 'gemini oppure compatible' },
    LLM_BASE_URL: { group: 'models', help: 'Endpoint del modello' },
    LLM_MODEL: { group: 'models', help: 'Identificativo esatto del modello disponibile sul tuo endpoint' },
    LLM_API_KEY: { group: 'models', secret: true, help: 'Chiave del provider LLM' },
    GEMINI_API_KEY: { group: 'models', secret: true, help: 'Chiave Google per immagini Gemini' },
    GEMINI_IMAGE_MODEL: { group: 'models', help: 'Modello Gemini abilitato alla generazione immagini' },
    EMBEDDING_BASE_URL: { group: 'models', help: 'Endpoint embeddings compatibile' },
    EMBEDDING_MODEL: { group: 'models', help: 'Modello embeddings. Cambiarlo richiede reindicizzazione dei documenti.' },
    EMBEDDING_API_KEY: { group: 'models', secret: true, help: 'Chiave del provider embeddings' },
    GOOGLE_CLIENT_ID: { group: 'login', help: 'Client web Google per l’accesso. Separato dal grant YouTube.' },
    GOOGLE_CLIENT_SECRET: { group: 'login', secret: true, help: 'Client secret Google' },
    RESEND_API_KEY: { group: 'email', secret: true, help: 'Chiave Resend. Richiesta per recupero password e verifica email.' },
    MAIL_FROM: { group: 'email', help: 'Indirizzo mittente su dominio verificato in Resend' },
    META_GRAPH_VERSION: { group: 'platforms', help: 'Versione Graph abilitata sulla tua app, es. vXX.0' },
    LINKEDIN_VERSION: { group: 'platforms', help: 'Versione LinkedIn YYYYMM supportata dalla tua app' },
    OUTBOUND_ORIGINS: { group: 'platforms', help: 'Allowlist di origin fidate per servizi self-hosted. Privilegio installazione.' }
};
for (const role of ['STRATEGIST', 'COPYWRITER', 'CREATIVE', 'REVIEWER', 'ANALYST', 'PLANNER'])
    ENV_FIELDS[`LLM_MODEL_${role}`] = { group: 'models', help: `Override modello ${role.toLowerCase()}` };
export class Settings {
    constructor(readonly store: Store, readonly cfg: Config, readonly auth: Auth) { }
    private persisted(): Bag { const r = this.store.db.prepare("SELECT value FROM installation WHERE key='environment'").get() as Bag | undefined; return r ? decrypt<Bag>(r.value, this.cfg.masterKey, 'installation:environment') : {}; }
    values(): Bag { const v: Bag = { LLM_PROVIDER: this.cfg.llmProvider, LLM_BASE_URL: this.cfg.llmBase, LLM_MODEL: this.cfg.llmModel, LLM_API_KEY: this.cfg.llmKey, GEMINI_API_KEY: this.cfg.geminiKey, GEMINI_IMAGE_MODEL: this.cfg.imageModel, EMBEDDING_BASE_URL: this.cfg.embeddingBase, EMBEDDING_MODEL: this.cfg.embeddingModel, EMBEDDING_API_KEY: this.cfg.embeddingKey, META_GRAPH_VERSION: this.cfg.graphVersion, LINKEDIN_VERSION: this.cfg.linkedinVersion }; for (const k of Object.keys(ENV_FIELDS))
        if (process.env[k] !== undefined)
            v[k] = process.env[k]; return { SITE_NAME: 'AIR3 Social Studio', ALLOW_REGISTRATION: 'false', BASE_URL: this.cfg.baseUrl, ...v, ...this.persisted() }; }
    value(k: string): string { return String(this.values()[k] ?? ''); }
    public(): Bag { return { name: this.value('SITE_NAME'), version: '0.2.0', google: !!(this.value('GOOGLE_CLIENT_ID') && this.value('GOOGLE_CLIENT_SECRET')), registration: this.value('ALLOW_REGISTRATION') === 'true', emailEnabled: this.mailEnabled, supportEmail: this.value('SUPPORT_EMAIL'), privacyUrl: this.value('PRIVACY_URL'), termsUrl: this.value('TERMS_URL') }; }
    get mailEnabled(): boolean { return !!(this.value('RESEND_API_KEY') && this.value('MAIL_FROM')); }
    read(p: Principal): Bag { this.auth.requireSiteAdmin(p); const v = this.values(); return { fields: Object.entries(ENV_FIELDS).map(([key, spec]) => ({ key, ...spec, value: spec.secret ? '' : v[key] ?? '', configured: !!v[key] })), effectiveBaseUrl: this.cfg.baseUrl, pendingRestart: !!v.BASE_URL && v.BASE_URL !== this.cfg.baseUrl, generatedFile: 'DATA_DIR/runtime.generated.env', preview: this.env(false) }; }
    validate(input: Bag): Bag {
        const out: Bag = {};
        for (const [key, raw] of Object.entries(input)) {
            assert(Object.hasOwn(ENV_FIELDS, key), 'ENV_FIELD', 'Variabile non modificabile: ' + key);
            const value = text(raw, key, 10000, true);
            assert(!/[\r\n\0]/.test(value), 'ENV_VALUE', 'Valore multilinea non consentito: ' + key);
            // Empty secret means retain; clearing it is an explicit null action through clear[].
            if (ENV_FIELDS[key]!.secret && !value)
                continue;
            if (key === 'ALLOW_REGISTRATION')
                assert(['true', 'false'].includes(value), 'ENV_VALUE', 'Usare true o false');
            if (key === 'LLM_PROVIDER')
                assert(['gemini', 'compatible'].includes(value), 'ENV_VALUE', 'Provider non valido');
            if (key === 'META_GRAPH_VERSION' && value)
                assert(/^v\d+\.0$/.test(value), 'ENV_VALUE', 'Versione Graph non valida');
            if (key === 'LINKEDIN_VERSION' && value)
                assert(/^20\d{4}$/.test(value), 'ENV_VALUE', 'Versione LinkedIn non valida');
            if (key === 'MAIL_FROM' || key === 'SUPPORT_EMAIL')
                assert(!value || /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value), 'EMAIL', 'Indirizzo email non valido');
            if (key.endsWith('_URL') && value) {
                const u = new URL(value);
                assert(!u.username && !u.password && !u.hash && ['http:', 'https:'].includes(u.protocol), 'URL', 'URL non valida');
                if (key === 'BASE_URL')
                    assert(u.pathname === '/' && !u.search && (u.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)), 'URL', 'BASE_URL: HTTPS oppure localhost');
                if (['PRIVACY_URL', 'TERMS_URL'].includes(key))
                    assert(u.protocol === 'https:', 'URL', 'Usare HTTPS');
            }
            if (key === 'OUTBOUND_ORIGINS')
                for (const o of value.split(',').map(x => x.trim()).filter(Boolean)) {
                    const u = new URL(o);
                    assert(u.origin === o && !u.username && ['http:', 'https:'].includes(u.protocol), 'URL', 'Inserire solo origin, senza path o slash finale');
                }
            out[key] = value;
        }
        return out;
    }
    save(p: Principal, input: Bag): Bag {
        this.auth.requireSiteAdmin(p);
        const patch = this.validate(object(input.values ?? input)), v = { ...this.persisted(), ...patch };
        assert(input.clear === undefined || (Array.isArray(input.clear) && input.clear.length <= Object.keys(ENV_FIELDS).length), 'ENV_FIELD', 'clear deve essere una lista');
        for (const k of input.clear ?? []) {
            assert(!!ENV_FIELDS[k]?.secret, 'ENV_FIELD', 'È possibile cancellare solo segreti dichiarati');
            v[k] = '';
        }
        const effective = { ...this.values(), ...v };
        if (effective.ALLOW_REGISTRATION === 'true')
            assert(effective.RESEND_API_KEY && effective.MAIL_FROM, 'MAIL_REQUIRED', 'Configurare prima l’email transazionale per la registrazione standard');
        const value = encrypt(v, this.cfg.masterKey, 'installation:environment');
        this.store.db.prepare("INSERT INTO installation VALUES ('environment',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(value);
        this.apply(false);
        this.writeGenerated();
        this.store.audit(p, '', 'installation.updated', '', { keys: Object.keys(patch), cleared: input.clear ?? [] });
        return this.read(p);
    }
    apply(startup = false): void {
        const v = this.persisted();
        for (const [key, value] of Object.entries(v))
            if (startup || !ENV_FIELDS[key]?.restart)
                process.env[key] = String(value);
        const map: Record<string, keyof Config> = { BASE_URL: 'baseUrl', LLM_BASE_URL: 'llmBase', LLM_API_KEY: 'llmKey', LLM_MODEL: 'llmModel', LLM_PROVIDER: 'llmProvider', EMBEDDING_BASE_URL: 'embeddingBase', EMBEDDING_API_KEY: 'embeddingKey', EMBEDDING_MODEL: 'embeddingModel', GEMINI_API_KEY: 'geminiKey', GEMINI_IMAGE_MODEL: 'imageModel', META_GRAPH_VERSION: 'graphVersion', LINKEDIN_VERSION: 'linkedinVersion' };
        for (const [k, dest] of Object.entries(map))
            if (v[k] !== undefined && (startup || !ENV_FIELDS[k]?.restart))
                (this.cfg as any)[dest] = String(v[k]).replace(dest.endsWith('Base') || dest === 'baseUrl' ? /\/$/ : /$^/, '');
    }
    env(secrets = false): string { const v = this.values(); return '# Generated by AIR3 Social Studio. Do not commit. Account tokens remain encrypted in SQLite.\n' + Object.keys(ENV_FIELDS).map(k => `${k}=${JSON.stringify(ENV_FIELDS[k]?.secret && !secrets && v[k] ? '[REDACTED]' : v[k] ?? '')}`).join('\n') + '\n'; }
    writeGenerated(): void { mkdirSync(this.cfg.dataDir, { recursive: true, mode: 0o700 }); const target = join(this.cfg.dataDir, 'runtime.generated.env'), tmp = target + '.' + randomBytes(8).toString('hex'); writeFileSync(tmp, this.env(true), { mode: 0o600, flag: 'wx' }); renameSync(tmp, target); chmodSync(target, 0o600); }
    onboarding(p: Principal): Bag { const r = this.store.db.prepare("SELECT value FROM workspace_settings WHERE workspace_id=? AND key='onboarding'").get(p.workspaceId) as Bag | undefined; return r ? JSON.parse(r.value) : { step: 0, completed: false }; }
    saveOnboarding(p: Principal, b: Bag): Bag { assert(p.role === 'admin' && p.via === 'session', 'FORBIDDEN', 'Solo amministratore workspace', 403); const step = Number(b.step ?? 0); assert(Number.isInteger(step) && step >= 0 && step <= 4, 'STEP', 'Step non valido'); const v = { step, completed: b.completed === true, updatedAt: now() }; this.store.db.prepare("INSERT INTO workspace_settings VALUES (?,'onboarding',?) ON CONFLICT(workspace_id,key) DO UPDATE SET value=excluded.value").run(p.workspaceId, JSON.stringify(v)); return v; }
}
