/** Original, resolution-independent AIR3 identity. System typography; no font downloads. */
export function icon(name, cls = '') {
    const paths = {
        overview: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
        contents: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2"/>',
        accounts: '<circle cx="5" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 10 7-4m-7 8 7 4"/>',
        assets: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',
        campaigns: '<path d="m3 9 14-5v16L3 15zm14-1 4-3v14l-4-3M5 16l2 6h4l-2-5"/>',
        analytics: '<path d="M4 20V12h4v8m3 0V4h4v16m3 0V8h4v12"/>',
        inbox: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 6 10 8L22 6"/>',
        knowledge: '<path d="M12 5Q7 1 2 4v16q5-3 10 0 5-3 10 0V4q-5-3-10 1v15"/>',
        jobs: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
        settings: '<path d="m10 2 4 0 1 3 3 2 3 0 1 4-2 2-1 3 1 3-4 2-2-2-4 0-2 2-4-2 1-3-1-3-2-2 1-4 3 0 3-2z"/><circle cx="12" cy="12" r="3"/>',
        admin: '<path d="m12 2 9 4v7c0 5-9 9-9 9S3 18 3 13V6z"/><path d="m8 12 3 3 5-6"/>',
        setup: '<path d="m3 21 12-12m-5-5 1-3m7 9 3-1M4 10l-3 1m15-5 1-3m3 13 2 1M7 4l2 2"/><path d="m12 10 2 2"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
        moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
        search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
        arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
        team: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',
        spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3zm7 0 1 2 2 1-2 1-1 2-1-2-2-1 2-1"/>',
        plus: '<path d="M12 4v16M4 12h16"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
        copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
        exit: '<path d="M9 3H3v18h6m0-9h12m-4-4 4 4-4 4"/>',
        menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
        send: '<path d="m2 3 20 9-20 9 4-9zm4 9h16"/>',
        code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
        alert: '<path d="m12 2 10 19H2zm0 6v6m0 3v1"/>',
        link: '<path d="m9 15 6-6m-4-4 2-2a5 5 0 0 1 7 7l-3 3m-4 4-3 3a5 5 0 0 1-7-7l2-2"/>',
    };
    return `<svg class="ui-icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.contents}</svg>`;
}
export function mark(extra = '') { return `<svg viewBox="0 0 110 108" class="brand-mark ${extra}" aria-hidden="true"><g stroke-linejoin="round" stroke-width=".7"><path class="cube teal-top" d="m46 2 36 20-20 12-36-20z"/><path class="cube teal-left" d="m26 14 36 20v27L42 49V33l-16-9z"/><path class="cube cyan-top" d="m82 22 20 11-20 12-20-11z"/><path class="cube blue-right" d="m82 45 20-12v51L82 95z"/><path class="cube blue-left" d="m62 34 20 11v50L62 83z"/><path class="cube cyan-top" d="m26 48 24 14-24 14L2 62z"/><path class="cube violet-left" d="m2 62 24 14v29L2 91z"/><path class="cube blue-right" d="m26 76 24-14v29l-24 14z"/><path class="cube coral-top" d="m82 62 26 15-22 13-26-15z"/><path class="cube coral-right" d="m86 90 22-13v16l-22 13z"/><path class="cube amber-top" d="m60 75 26 15-24 14-26-15z"/><path class="cube amber-left" d="m36 89 26 15v-0L36 90z"/></g></svg>`; }
export function wordmark() { return `<span class="brand-lockup">${mark()}<span class="brand-name">AIR3<span>SOCIAL STUDIO</span></span></span>`; }
export function googleMark() { return '<svg class="ui-icon google-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.2c1.9-1.8 3-4.3 3-7.5"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22"/><path fill="#fbbc05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#ea4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6"/></svg>'; }
const glyphs = { facebook: 'f', instagram: '◎', whatsapp: '◔', threads: '@', tiktok: '♪', x: '𝕏', linkedin: 'in', 'linkedin-page': 'in', telegram: '➤', youtube: '▶', pinterest: 'P', reddit: 'r', mastodon: 'm', bluesky: 'b', discord: '◉', farcaster: 'F', twitch: '▣', slack: '#', messenger: 'ϟ', 'instagram-dm': '◎' };
export function socialMark(name) { const safe = Object.hasOwn(glyphs, name) ? name : 'generic'; return `<span class="social-mark social-${safe}" aria-hidden="true">${glyphs[name] || '↗'}</span>`; }
export function hubArt() {
    const isIt = typeof document !== 'undefined' && document.documentElement?.lang === 'it';
    const topNote = isIt ? 'Uno studio.<br>Ogni canale.' : 'One studio.<br>Every channel.';
    const bottomNote = isIt ? 'Dalle idee<br>all’impatto. ↗' : 'From ideas<br>to impact. ↗';
    const names = ['instagram', 'whatsapp', 'tiktok', 'x', 'pinterest', 'youtube', 'telegram', 'linkedin', 'threads', 'facebook'];
    return `<div class="hub-art" aria-hidden="true"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="orbit-axis"></div><div class="hub-center">${mark()}</div>${names.map((n, i) => `<div class="social-tile tile-${i}">${socialMark(n)}</div>`).join('')}<span class="handwritten art-note">${topNote}<span class="pencil-stroke"></span></span><span class="handwritten art-note bottom">${bottomNote}</span></div>`;
}
