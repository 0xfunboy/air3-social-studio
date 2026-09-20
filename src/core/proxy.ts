import { isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';
const normalize = (s: string) => s.startsWith('::ffff:') && isIP(s.slice(7)) === 4 ? s.slice(7) : s;
/** Only an explicitly trusted immediate peer may supply X-Real-IP. Never trust arbitrary XFF. */
export function clientIp(req: IncomingMessage, trusted = process.env.TRUST_PROXY_IPS ?? ''): string {
    const peer = normalize(req.socket.remoteAddress ?? 'local');
    const proxies = trusted.split(',').map(x => normalize(x.trim())).filter(x => isIP(x));
    if (!proxies.includes(peer))
        return peer;
    const forwarded = req.headers['x-real-ip'];
    return typeof forwarded === 'string' && isIP(forwarded) ? normalize(forwarded) : peer;
}
