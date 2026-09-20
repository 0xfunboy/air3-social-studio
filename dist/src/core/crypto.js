import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { assert } from './util.js';
export function encrypt(value, key, aad) { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv); c.setAAD(Buffer.from(aad)); const encrypted = Buffer.concat([c.update(JSON.stringify(value)), c.final()]); return [iv, c.getAuthTag(), encrypted].map(b => b.toString('base64url')).join('.'); }
export function decrypt(value, key, aad) { const [iv, tag, data] = value.split('.').map(x => Buffer.from(x, 'base64url')); assert(iv && tag && data, 'CRYPTO', 'Credenziali danneggiate'); const d = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv); d.setAAD(Buffer.from(aad)); d.setAuthTag(tag); return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString()); }
export function passwordHash(password) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); }
export function passwordValid(password, stored) {
    const [salt, h] = stored.split(':');
    if (!salt || !h)
        return false;
    return equal(scryptSync(password, salt, 64).toString('hex'), h);
}
export function equal(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export const hmac = (s, key) => createHmac('sha256', key).update(s).digest('hex');
//# sourceMappingURL=crypto.js.map