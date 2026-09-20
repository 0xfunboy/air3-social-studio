import type { Platform, Account, SocialPost } from '../core/types.js';
import { assert } from '../core/util.js';
export interface Capability {
    label: string;
    postiz?: string;
    native: string[];
    limit: number;
    notes: string;
}
export const CAPABILITIES: Record<Platform, Capability> = {
    facebook: { label: 'Facebook Pages', postiz: 'facebook', native: ['text', 'image', 'video'], limit: 63206, notes: 'Pagine gestite, non profili personali. Reels e formati estesi attraverso Postiz.' },
    instagram: { label: 'Instagram Professional', postiz: 'instagram', native: ['image', 'carousel', 'reel', 'story', 'video'], limit: 2200, notes: 'Account professionale; Stories richiedono account idoneo. Upload e publishing sono due fasi distinte.' },
    threads: { label: 'Threads', postiz: 'threads', native: ['text', 'image', 'video', 'carousel'], limit: 500, notes: 'Account Threads e permessi di pubblicazione.' },
    whatsapp: { label: 'WhatsApp Business', native: ['message', 'image', 'video', 'template'], limit: 4096, notes: 'Cloud API: messaggi a contatti autorizzati, finestra 24h o template approvato. Nessun client WhatsApp Web, Status o Channels.' },
    messenger: { label: 'Facebook Messenger', native: ['message', 'image', 'video'], limit: 2000, notes: 'Conversazioni avviate dal destinatario; risposta entro 24h. Non un feed di post.' },
    'instagram-dm': { label: 'Instagram Direct', native: ['message', 'image', 'video'], limit: 1000, notes: 'Inbox professionale, conversazione avviata dal destinatario; finestra verificata dal backend.' },
    tiktok: { label: 'TikTok', postiz: 'tiktok', native: ['video', 'reel', 'image', 'carousel'], limit: 2200, notes: 'Consenso sul contenuto, privacy scelta dall’utente, creator info e app audit. URL media con dominio verificato.' },
    linkedin: { label: 'LinkedIn Member', postiz: 'linkedin', native: ['text'], limit: 3000, notes: 'Media attraverso Postiz. Native: Posts API versionata, w_member_social.' },
    'linkedin-page': { label: 'LinkedIn Page', postiz: 'linkedin-page', native: ['text'], limit: 3000, notes: 'Media attraverso Postiz. Native: w_organization_social e ruolo sulla pagina.' },
    x: { label: 'X', postiz: 'x', native: ['text'], limit: 280, notes: 'Media attraverso Postiz. Limite conservativo, URL pesati 23 caratteri; piano API autorizzato.' },
    telegram: { label: 'Telegram', postiz: 'telegram', native: ['text', 'message', 'image', 'carousel', 'video'], limit: 4096, notes: 'Bot API: bot amministratore nei canali, permessi nei gruppi. Caption media massimo 1024.' },
    youtube: { label: 'YouTube / Shorts', postiz: 'youtube', native: [], limit: 5000, notes: 'Video tramite Postiz con titolo, visibilità e dichiarazione made-for-kids. Shorts classificati da YouTube.' },
    pinterest: { label: 'Pinterest', postiz: 'pinterest', native: ['image'], limit: 500, notes: 'Board autorizzata e immagine. Video attraverso Postiz.' },
    reddit: { label: 'Reddit', postiz: 'reddit', native: ['text'], limit: 40000, notes: 'Subreddit e titolo espliciti. Media e formati estesi attraverso Postiz.' },
    bluesky: { label: 'Bluesky', postiz: 'bluesky', native: ['text'], limit: 300, notes: 'Native: sessione AT Protocol. Media attraverso Postiz.' },
    mastodon: { label: 'Mastodon', postiz: 'mastodon', native: ['text'], limit: 500, notes: 'Origin dell’istanza autorizzata lato server. Media attraverso Postiz.' },
    discord: { label: 'Discord', postiz: 'discord', native: ['text', 'message', 'image', 'video'], limit: 2000, notes: 'Bot in un canale autorizzato, menzioni di massa disattivate.' },
    farcaster: { label: 'Farcaster', postiz: 'warpcast', native: ['text', 'image'], limit: 320, notes: 'Native: Neynar con signer approvato. Pubblicazione nei canali secondo autorizzazioni.' },
    twitch: { label: 'Twitch chat', postiz: 'twitch', native: ['message', 'text'], limit: 500, notes: 'Messaggi chat, non pubblicazione di video o avvio stream.' },
    slack: { label: 'Slack', postiz: 'slack', native: ['message', 'text'], limit: 4000, notes: 'Messaggi a canali autorizzati del workspace.' }
};
export function weightedX(text: string): number { const compact = text.replace(/https?:\/\/\S+/g, 'x'.repeat(23)); let count = 0; for (const c of compact) {
    const cp = c.codePointAt(0)!;
    count += cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037) ? 1 : 2;
} return count; }
export function validatePost(a: Account, p: SocialPost): void {
    const c = CAPABILITIES[a.platform];
    assert(a.enabled, 'ACCOUNT_DISABLED', 'Account disabilitato');
    assert(c, 'PLATFORM', 'Piattaforma non supportata');
    assert(p.text.trim() || p.media.length || p.format === 'template', 'EMPTY_POST', 'Contenuto vuoto');
    if (a.transport === 'direct')
        assert(c.native.includes(p.format), 'FORMAT', `${c.label}: formato ${p.format} non disponibile nel client diretto; usare Postiz dove indicato.`);
    else
        assert(c.postiz, 'TRANSPORT', 'Questa piattaforma richiede il client diretto');
    if (['text', 'message'].includes(p.format))
        assert(!p.media.length, 'FORMAT_MEDIA', 'Formato testo/messaggio: scegliere image o video per allegare media');
    if (p.format === 'image')
        assert(p.media.length === 1 && p.media[0]!.mime.startsWith('image/'), 'IMAGE_REQUIRED', 'Richiesta una singola immagine');
    if (p.format === 'story')
        assert(p.media.length === 1, 'STORY_MEDIA', 'Una storia deve contenere un singolo media');
    if (a.platform === 'youtube')
        assert(['video', 'reel'].includes(p.format) && p.media.length === 1 && p.title.length >= 2 && p.title.length <= 100, 'YOUTUBE_VIDEO', 'YouTube richiede un video e un titolo di 2–100 caratteri');
    if (a.platform === 'instagram')
        assert(!['text', 'message'].includes(p.format), 'INSTAGRAM_MEDIA', 'Instagram non supporta post solo testo');
    if (a.platform === 'tiktok')
        assert(['video', 'reel', 'image', 'carousel'].includes(p.format), 'TIKTOK_MEDIA', 'TikTok richiede foto o video');
    const length = a.platform === 'x' ? weightedX(p.text) : a.platform === 'bluesky' ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(p.text)].length : p.text.length;
    assert(length <= c.limit, 'TEXT_LENGTH', `${c.label}: testo oltre il limite locale di ${c.limit}`);
    if (['image', 'carousel', 'video', 'reel', 'story'].includes(p.format))
        assert(p.media.length > 0, 'MEDIA_REQUIRED', 'Il formato richiede un media reale');
    if (['video', 'reel'].includes(p.format))
        assert(p.media.length === 1 && p.media[0]!.mime.startsWith('video/'), 'VIDEO_REQUIRED', 'Richiesto un singolo video');
    if (p.format === 'carousel')
        assert(p.media.length >= 2 && p.media.length <= 10, 'CAROUSEL', 'Usare da 2 a 10 media');
    if (a.platform === 'instagram') {
        assert(p.media.every(m => m.mime === 'image/jpeg' || m.mime === 'video/mp4'), 'INSTAGRAM_MEDIA', 'Instagram: convertire le immagini in JPEG o usare video MP4');
        if (p.format === 'story')
            assert(a.options.accountType === 'BUSINESS', 'INSTAGRAM_STORY', 'Per Stories impostare accountType BUSINESS dopo verifica dell’account');
    }
    if (a.transport === 'direct' && ['messenger', 'instagram-dm'].includes(a.platform) && p.media.length)
        assert(!p.text.trim(), 'ATTACHMENT_CAPTION', 'Questo endpoint invia un allegato senza caption: creare un messaggio testuale separato o svuotare il testo');
    if (a.platform === 'whatsapp' && p.media.length)
        assert(p.text.length <= 1024, 'CAPTION_LENGTH', 'WhatsApp: caption media massimo 1024 caratteri');
    if (a.transport === 'direct' && ['instagram', 'threads', 'tiktok'].includes(a.platform) && p.format === 'carousel')
        assert(p.media.every(m => m.mime.startsWith('image/')), 'CAROUSEL_FORMAT', 'Il carousel diretto implementato accetta solo immagini. Per formati misti usare un adapter idoneo.');
    if (a.platform === 'telegram' && p.media.length)
        assert(p.text.length <= 1024, 'CAPTION_LENGTH', 'Telegram: caption media massimo 1024 caratteri');
    if (a.platform === 'tiktok') {
        assert(p.options.consent === true, 'TIKTOK_CONSENT', 'Serve consenso esplicito per questa versione del contenuto');
        assert(typeof p.options.privacyLevel === 'string' && p.options.privacyLevel.length > 0, 'TIKTOK_PRIVACY', 'Scegliere esplicitamente la privacy TikTok');
        assert(typeof p.options.brandContent === 'boolean' && typeof p.options.brandOrganic === 'boolean', 'TIKTOK_DISCLOSURE', 'Compilare le dichiarazioni commerciali TikTok');
    }
    if (['whatsapp', 'messenger', 'instagram-dm'].includes(a.platform))
        assert(typeof p.options.recipient === 'string' && p.options.recipient.length > 0, 'RECIPIENT', 'Destinatario obbligatorio');
    if (a.platform === 'youtube') {
        assert(typeof p.options.madeForKids === 'boolean', 'YOUTUBE_DISCLOSURE', 'Indicare madeForKids');
        assert(['public', 'private', 'unlisted'].includes(p.options.privacy), 'YOUTUBE_PRIVACY', 'Scegliere la visibilità YouTube');
    }
}
