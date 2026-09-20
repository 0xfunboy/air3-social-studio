import { createHash, randomBytes } from 'node:crypto';
export class AppError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
}
export function fail(code: string, message: string, status = 400): never { throw new AppError(status, code, message); }
export function assert(value: unknown, code: string, message: string, status = 400): asserts value {
    if (!value)
        fail(code, message, status);
}
export const id = () => randomBytes(16).toString('hex');
export const now = () => new Date().toISOString();
export const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export function stable(value: unknown): string {
    if (Array.isArray(value))
        return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}';
    return JSON.stringify(value) ?? 'null';
}
export function text(v: unknown, name: string, max = 20000, empty = false): string { assert(typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0), 'VALIDATION', `${name}: testo richiesto, massimo ${max} caratteri`); return v; }
export function strings(v: unknown, name: string, max = 100): string[] { assert(Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string' && x.length <= 4000), 'VALIDATION', `${name}: lista di stringhe non valida`); return v as string[]; }
export function object(v: unknown): Record<string, any> { assert(v && typeof v === 'object' && !Array.isArray(v), 'VALIDATION', 'Oggetto JSON richiesto'); return v as Record<string, any>; }
export function timestamp(v: unknown): number { const s = text(v, 'data', 50); const n = Date.parse(s); assert(Number.isFinite(n) && /(?:Z|[+-]\d\d:\d\d)$/.test(s), 'DATE', 'Usare ISO 8601 con timezone esplicita'); return n; }
export function safeError(e: unknown): string { const s = e instanceof Error ? e.message : String(e); return s.replace(/(?:Bearer\s+)[\w.\-]+/gi, 'Bearer [redacted]').replace(/(access_token|api_key|token|client_secret)=([^&\s]+)/gi, '$1=[redacted]').replace(/bot\d+:[\w-]+/g, 'bot[redacted]').slice(0, 600); }
export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
