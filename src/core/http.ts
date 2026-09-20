import { AppError, assert } from './util.js';
import type { Bag } from './types.js';
export class ProviderError extends AppError {
    constructor(public provider: string, public retryable: boolean, public ambiguous: boolean, public retryAfterMs: number, message: string, status = 502) { super(status, 'PROVIDER', message); }
}
export interface HttpResult {
    status: number;
    headers: Headers;
    body: any;
}
export interface Http {
    request(url: string, init?: RequestInit): Promise<HttpResult>;
}
export class Network implements Http {
    constructor(private extraOrigins: string[] = []) { }
    setExtraOrigins(origins: string[]): void { this.extraOrigins = origins; }
    async request(url: string, init: RequestInit = {}): Promise<HttpResult> {
        const u = new URL(url);
        assert(!u.username && !u.password, 'URL', 'Credenziali nella URL non consentite');
        const known = ['https://accounts.google.com', 'https://www.linkedin.com', 'https://api.instagram.com', 'https://id.twitch.tv', 'https://api.resend.com', 'https://graph.facebook.com', 'https://graph.instagram.com', 'https://graph.threads.net', 'https://api.telegram.org', 'https://open.tiktokapis.com', 'https://api.x.com', 'https://api.twitter.com', 'https://upload.twitter.com', 'https://api.linkedin.com', 'https://oauth.reddit.com', 'https://www.reddit.com', 'https://api.pinterest.com', 'https://www.googleapis.com', 'https://youtubeanalytics.googleapis.com', 'https://oauth2.googleapis.com', 'https://discord.com', 'https://slack.com', 'https://api.twitch.tv', 'https://api.neynar.com', 'https://bsky.social', 'https://api.bsky.app', 'https://api.postiz.com', 'https://generativelanguage.googleapis.com', 'https://api.openai.com'];
        assert(known.includes(u.origin) || this.extraOrigins.includes(u.origin), 'EGRESS', 'Origin esterna non autorizzata. Configurarla lato server in OUTBOUND_ORIGINS.', 403);
        const mutating = !['GET', 'HEAD'].includes(init.method ?? 'GET');
        let r: Response;
        try {
            r = await fetch(u, { ...init, redirect: 'error', signal: init.signal ?? AbortSignal.timeout(90000) });
        }
        catch {
            throw new ProviderError(u.hostname, true, mutating, 0, `Connessione ${u.hostname} interrotta; esito ${mutating ? 'da riconciliare' : 'non disponibile'}`);
        }
        const reader = r.body?.getReader();
        let size = 0;
        const chunks: Uint8Array[] = [];
        if (reader)
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                size += value.byteLength;
                if (size > 20 * 1024 * 1024) {
                    await reader.cancel();
                    throw new ProviderError(u.hostname, false, mutating, 0, 'Risposta provider troppo grande');
                }
                chunks.push(value);
            }
        const raw = Buffer.concat(chunks).toString();
        let body: any;
        try {
            body = raw ? JSON.parse(raw) : {};
        }
        catch {
            body = { text: raw.slice(0, 2000) };
        }
        if (!r.ok) {
            const after = r.headers.get('retry-after') ?? '0';
            const delay = /^\d+$/.test(after) ? Number(after) * 1000 : Math.max(0, Date.parse(after) - Date.now());
            throw new ProviderError(u.hostname, r.status === 429 || r.status >= 500, mutating && r.status >= 500, delay, `${u.hostname}: HTTP ${r.status}${body?.error?.code ? ' (codice ' + String(body.error.code).slice(0, 80) + ')' : ''}`, r.status === 429 ? 429 : 502);
        }
        return { status: r.status, headers: r.headers, body };
    }
}
export const jsonRequest = (body: unknown, token?: string, headers: Record<string, string> = {}): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) });
export function apiSuccess(body: Bag, provider: string): void {
    if (body.error && body.error.code && body.error.code !== 'ok')
        throw new ProviderError(provider, false, false, 0, `${provider}: ${String(body.error.code).slice(0, 100)}`);
    if (body.ok === false)
        throw new ProviderError(provider, body.error_code === 429, false, (body.parameters?.retry_after ?? 0) * 1000, `${provider}: ${body.error_code ?? 'API_ERROR'}`);
}
