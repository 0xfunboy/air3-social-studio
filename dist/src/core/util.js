import { createHash, randomBytes } from 'node:crypto';
export class AppError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
export function fail(code, message, status = 400) { throw new AppError(status, code, message); }
export function assert(value, code, message, status = 400) {
    if (!value)
        fail(code, message, status);
}
export const id = () => randomBytes(16).toString('hex');
export const now = () => new Date().toISOString();
export const sha = (s) => createHash('sha256').update(s).digest('hex');
export function stable(value) {
    if (Array.isArray(value))
        return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}';
    return JSON.stringify(value) ?? 'null';
}
export function text(v, name, max = 20000, empty = false) { assert(typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0), 'VALIDATION', `${name}: testo richiesto, massimo ${max} caratteri`); return v; }
export function strings(v, name, max = 100) { assert(Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string' && x.length <= 4000), 'VALIDATION', `${name}: lista di stringhe non valida`); return v; }
export function object(v) { assert(v && typeof v === 'object' && !Array.isArray(v), 'VALIDATION', 'Oggetto JSON richiesto'); return v; }
export function timestamp(v) { const s = text(v, 'data', 50); const n = Date.parse(s); assert(Number.isFinite(n) && /(?:Z|[+-]\d\d:\d\d)$/.test(s), 'DATE', 'Usare ISO 8601 con timezone esplicita'); return n; }
export function safeError(e) { const s = e instanceof Error ? e.message : String(e); return s.replace(/(?:Bearer\s+)[\w.\-]+/gi, 'Bearer [redacted]').replace(/(access_token|api_key|token|client_secret)=([^&\s]+)/gi, '$1=[redacted]').replace(/bot\d+:[\w-]+/g, 'bot[redacted]').slice(0, 600); }
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
//# sourceMappingURL=util.js.map