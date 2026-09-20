import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Store } from './store.js';
import type { Config } from './config.js';
import type { Http } from './http.js';
import { jsonRequest } from './http.js';
import type { Principal, Brand, Bag, Media, Entity } from './types.js';
import { assert, id, sha } from './util.js';
import { hmac, equal } from './crypto.js';
const exec = promisify(execFile);
export interface Asset {
    name: string;
    mime: string;
    size: number;
    sha256: string;
    file: string;
    width?: number;
    height?: number;
    duration?: number;
    generated: boolean;
    alt: string;
}
const extensions: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'video/mp4': '.mp4', 'audio/mpeg': '.mp3', 'audio/wav': '.wav' };
export function sniff(buffer: Buffer, mime: string): boolean { if (mime === 'image/png')
    return buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')); if (mime === 'image/jpeg')
    return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255; if (mime === 'image/webp')
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'; if (mime === 'video/mp4')
    return buffer.toString('ascii', 4, 8) === 'ftyp'; if (mime === 'audio/wav')
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE'; if (mime === 'audio/mpeg')
    return buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 255 && ((buffer[1] ?? 0) & 224) === 224); return false; }
export class MediaService {
    readonly directory: string;
    constructor(private store: Store, private cfg: Config, private http: Http) { this.directory = join(cfg.dataDir, 'assets'); }
    async save(p: Principal, brandId: string, buffer: Buffer, mime: string, name: string, generated = false, alt = ''): Promise<Entity<Asset>> {
        this.store.get(p, brandId, 'brand');
        assert(buffer.length > 0 && buffer.length <= 128 * 1024 * 1024, 'MEDIA_SIZE', 'File vuoto o oltre 128 MB');
        assert(extensions[mime] && sniff(buffer, mime), 'MEDIA_TYPE', 'Formato media non valido. Ammessi PNG, JPEG, WebP, MP4, MP3, WAV.');
        const assetId = id(), file = assetId + extensions[mime];
        await mkdir(this.directory, { recursive: true, mode: 0o700 });
        const path = join(this.directory, file);
        await writeFile(path, buffer, { mode: 0o600 });
        let metadata: Bag = {};
        try {
            const { stdout } = await exec(process.env.FFPROBE_PATH ?? 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { timeout: 20000, maxBuffer: 1024 * 1024 });
            const probe = JSON.parse(stdout);
            const stream = probe.streams?.find((x: Bag) => x.codec_type === 'video');
            metadata = { width: stream?.width, height: stream?.height, duration: Number(probe.format?.duration) || undefined };
            assert(!metadata.width || metadata.width * metadata.height <= 40000000, 'MEDIA_PIXELS', 'Immagine oltre 40 megapixel');
            assert(!metadata.duration || metadata.duration <= 900, 'MEDIA_DURATION', 'Durata massima locale 15 minuti');
        }
        catch (e) {
            await rm(path, { force: true });
            throw new Error('Media non decodificabile o ffprobe non disponibile: installare FFmpeg.');
        }
        return this.store.create(p, brandId, 'asset', { name: name.slice(0, 200), mime, size: buffer.length, sha256: sha(buffer), file, ...metadata, generated, alt: alt.slice(0, 2000) }, assetId);
    }
    asset(p: Principal, assetId: string): Entity<Asset> { return this.store.get<Asset>(p, assetId, 'asset'); }
    async bytes(p: Principal, assetId: string): Promise<Buffer> { return readFile(join(this.directory, this.asset(p, assetId).data.file)); }
    path(p: Principal, assetId: string): string { return join(this.directory, this.asset(p, assetId).data.file); }
    url(p: Principal, assetId: string, seconds = 86400): string { const a = this.asset(p, assetId); const expires = Math.floor(Date.now() / 1000) + Math.min(seconds, 604800); const token = hmac(`${a.workspaceId}:${a.brandId}:${assetId}:${expires}`, this.cfg.masterKey); return `${this.cfg.baseUrl}/media/${assetId}?w=${a.workspaceId}&b=${a.brandId}&e=${expires}&s=${token}`; }
    signed(assetId: string, q: URLSearchParams): {
        path: string;
        asset: Entity<Asset>;
    } { const workspaceId = q.get('w') ?? '', brandId = q.get('b') ?? '', expires = Number(q.get('e')); assert(Number.isInteger(expires) && expires >= Date.now() / 1000 && expires <= Date.now() / 1000 + 604800, 'MEDIA_EXPIRED', 'Link media scaduto', 403); assert(equal(q.get('s') ?? '', hmac(`${workspaceId}:${brandId}:${assetId}:${expires}`, this.cfg.masterKey)), 'MEDIA_SIGNATURE', 'Link media non valido', 403); const asset = this.store.get<Asset>({ workspaceId, brandId }, assetId, 'asset'); return { path: join(this.directory, asset.data.file), asset }; }
    async hydrate(p: Principal, media: Media[]): Promise<Media[]> { return media.map(m => { if (!m.id) {
        assert(m.url && /^https:\/\//.test(m.url), 'MEDIA_URL', 'URL media HTTPS richiesta');
        const u = new URL(m.url);
        assert(!u.username && !u.password && !['localhost', '127.0.0.1', '::1'].includes(u.hostname), 'MEDIA_URL', 'URL media non valida');
        return m;
    } const a = this.asset(p, m.id); return { id: m.id, url: this.url(p, m.id), mime: a.data.mime, alt: m.alt ?? a.data.alt, name: a.data.name }; }); }
    async generateBackground(p: Principal, brandId: string, prompt: string, references: Media[] = []): Promise<Entity<Asset>> {
        assert(this.cfg.imageModel && this.cfg.geminiKey, 'IMAGE_MODEL', 'Configurare GEMINI_IMAGE_MODEL e GEMINI_API_KEY.');
        const parts: Bag[] = [{ text: prompt + '\nNo text, no logos, no watermarks.' }];
        for (const ref of references.slice(0, 3))
            if (ref.id && ref.mime.startsWith('image/'))
                parts.push({ inlineData: { mimeType: ref.mime, data: (await this.bytes(p, ref.id)).toString('base64') } });
        const r = await this.http.request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.cfg.imageModel)}:generateContent`, jsonRequest({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }, undefined, { 'x-goog-api-key': this.cfg.geminiKey }));
        const part = r.body.candidates?.[0]?.content?.parts?.find((x: Bag) => x.inlineData?.data)?.inlineData;
        assert(part, 'IMAGE_OUTPUT', 'Nessuna immagine restituita dal modello');
        return this.save(p, brandId, Buffer.from(part.data, 'base64'), part.mimeType, 'AI background', true, prompt.slice(0, 200));
    }
    async render(p: Principal, brandId: string, brand: Brand, headline: string, body: string, options: {
        width?: number;
        height?: number;
        backgroundId?: string;
    } = {}): Promise<Entity<Asset>> {
        const width = options.width ?? 1080, height = options.height ?? 1350;
        assert([720, 1080, 1200].includes(width) && [720, 1080, 1350, 1920].includes(height), 'RENDER_SIZE', 'Dimensioni non consentite');
        const work = join(this.cfg.dataDir, 'tmp', id());
        await mkdir(work, { recursive: true, mode: 0o700 });
        try {
            const layout = templateLayout(headline, body, width, height);
            const files = { brand: join(work, 'brand.txt'), title: join(work, 'title.txt'), body: join(work, 'body.txt') };
            await writeFile(files.brand, wrap(brand.name.toUpperCase(), Math.floor((width - 2 * layout.margin - (brand.logoAssetId ? 170 : 0)) / 28), 2));
            await writeFile(files.title, layout.title);
            await writeFile(files.body, layout.body);
            const color = /^#[0-9a-f]{6}$/i.test(brand.colors[0] ?? '') ? brand.colors[0]! : '#172338';
            const args = ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '1', '-filter_complex_threads', '1'];
            if (options.backgroundId)
                args.push('-i', this.path(p, options.backgroundId));
            else
                args.push('-f', 'lavfi', '-i', `color=c=${color.replace('#', '0x')}:s=${width}x${height}`);
            const logo = brand.logoAssetId ? this.path(p, brand.logoAssetId) : undefined;
            if (logo)
                args.push('-i', logo);
            const esc = (s: string) => s.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
            const base = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},drawbox=x=0:y=0:w=iw:h=ih:color=black@0.30:t=fill,drawbox=x=0:y=${height * 0.35}:w=iw:h=ih:color=black@0.35:t=fill,drawtext=fontfile='${esc(this.cfg.font)}':textfile='${esc(files.brand)}':expansion=none:fontcolor=white:fontsize=28:x=${layout.margin}:y=68,drawtext=fontfile='${esc(this.cfg.font)}':textfile='${esc(files.title)}':expansion=none:fontcolor=white:fontsize=${layout.titleFont}:line_spacing=14:x=${layout.margin}:y=${layout.titleY},drawtext=fontfile='${esc(this.cfg.font)}':textfile='${esc(files.body)}':expansion=none:fontcolor=white:fontsize=${layout.bodyFont}:line_spacing=10:x=${layout.margin}:y=${layout.bodyY}`;
            const filter = logo ? base + '[base];[1:v]scale=140:140:force_original_aspect_ratio=decrease[logo];[base][logo]overlay=W-w-64:50[out]' : base + '[out]';
            const out = join(work, 'render.jpg');
            args.push('-filter_complex', filter, '-map', '[out]', '-frames:v', '1', '-threads', '1', out);
            await exec(this.cfg.ffmpeg, args, { timeout: 60000, maxBuffer: 1024 * 1024 });
            return await this.save(p, brandId, await readFile(out), 'image/jpeg', 'Brand visual.jpg', true, headline);
        }
        finally {
            await rm(work, { recursive: true, force: true });
        }
    }
    async slideshow(p: Principal, brandId: string, assetIds: string[], audioId?: string): Promise<Entity<Asset>> {
        assert(assetIds.length > 0 && assetIds.length <= 10, 'VIDEO', 'Selezionare da 1 a 10 slide');
        const work = join(this.cfg.dataDir, 'tmp', id());
        await mkdir(work, { recursive: true, mode: 0o700 });
        try {
            let concat = '';
            for (let i = 0; i < assetIds.length; i++) {
                await writeFile(join(work, `frame${i}.png`), await this.bytes(p, assetIds[i]!));
                concat += `file 'frame${i}.png'\nduration 4\n`;
            }
            concat += `file 'frame${assetIds.length - 1}.png'\n`;
            await writeFile(join(work, 'frames.txt'), concat);
            const out = join(work, 'video.mp4');
            const args = ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '1', '-filter_threads', '1', '-f', 'concat', '-safe', '1', '-i', join(work, 'frames.txt')];
            if (audioId)
                args.push('-i', this.path(p, audioId));
            else
                args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
            args.push('-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p', '-r', '30', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-c:a', 'aac', '-b:a', '128k', '-t', String(assetIds.length * 4), '-movflags', '+faststart', out);
            await exec(this.cfg.ffmpeg, args, { timeout: 180000, maxBuffer: 1024 * 1024 });
            return this.save(p, brandId, await readFile(out), 'video/mp4', 'Editorial reel.mp4', true, 'Video editoriale da slide approvate');
        }
        finally {
            await rm(work, { recursive: true, force: true });
        }
    }
    async health(): Promise<Bag> { try {
        const { stdout } = await exec(this.cfg.ffmpeg, ['-version'], { timeout: 5000 });
        await stat(this.cfg.font);
        return { ffmpeg: true, font: true, version: stdout.split('\n')[0] };
    }
    catch {
        return { ffmpeg: false, font: false };
    } }
}
export function wrap(input: string, columns: number, maxLines: number): string { const words = input.replace(/[\r\n]+/g, ' ').split(/\s+/); const lines: string[] = []; let line = ''; for (const word of words) {
    if ((line + ' ' + word).trim().length > columns && line) {
        lines.push(line);
        line = '';
    }
    if (word.length > columns) {
        if (line) {
            lines.push(line);
            line = '';
        }
        for (let i = 0; i < word.length; i += columns)
            lines.push(word.slice(i, i + columns));
    }
    else
        line += (line ? ' ' : '') + word;
} if (line)
    lines.push(line); assert(lines.length <= maxLines, 'TEXT_OVERFLOW', `Il testo non entra nel template (${lines.length}/${maxLines} righe). Accorciare headline o testo.`); return lines.join('\n'); }
/** Fit text conservatively before invoking FFmpeg; never crop text silently. */
export function templateLayout(headline: string, body: string, width: number, height: number) {
    const margin = Math.min(64, Math.round(width * 0.06));
    const available = width - 2 * margin;
    const titleY = Math.max(180, Math.round(height * 0.29)), bodyFont = Math.min(30, Math.round(width / 36));
    const bodyText = wrap(body, Math.floor(available / bodyFont), 5);
    const bodyLines = bodyText ? bodyText.split('\n').length : 0;
    const bodyY = height - margin - bodyLines * (bodyFont + 10);
    const titleBottom = bodyLines ? bodyY - 48 : height - margin;
    for (let titleFont = Math.min(64, Math.round(width / 17)); titleFont >= 32; titleFont -= 2) {
        let title: string;
        try {
            title = wrap(headline, Math.floor(available / titleFont), 8);
        }
        catch {
            continue;
        }
        const titleLines = title ? title.split('\n').length : 0;
        if (titleY + titleLines * (titleFont + 14) <= titleBottom)
            return { title, body: bodyText, margin, titleFont, bodyFont, titleY, bodyY };
    }
    assert(false, 'TEXT_OVERFLOW', 'Il testo non entra nel template senza sovrapposizioni. Accorciare headline o corpo.');
}
