import { icon, mark, wordmark, hubArt, socialMark, googleMark } from './brand.js';
const $ = (q, root = document) => root.querySelector(q);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => {
    try {
        const x = new URL(u, location.origin);
        return ['http:', 'https:'].includes(x.protocol) ? esc(x.href) : '#';
    }
    catch {
        return '#';
    }
};
const state = { me: null, csrf: '', workspace: '', brands: [], brand: null, status: null, view: 'overview', data: {}, month: new Date(), busy: false };
function detectLang() {
    try {
        const stored = localStorage.getItem('air3:lang');
        if (stored === 'it' || stored === 'en') return stored;
        const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
        if (nav.startsWith('it')) return 'it';
    } catch {}
    return 'en';
}
let currentLang = detectLang();
try { document.documentElement.lang = currentLang; } catch {}

const labelsMap = {
    it: { overview: 'Panoramica', contents: 'Contenuti', calendar: 'Calendario', knowledge: 'Conoscenza', accounts: 'Canali', assets: 'Media library', campaigns: 'Campagne', inbox: 'Inbox', analytics: 'Analytics', jobs: 'Attività', settings: 'Impostazioni', setup: 'Configurazione guidata', team: 'Team & accessi', admin: 'Amministrazione' },
    en: { overview: 'Overview', contents: 'Content', calendar: 'Calendar', knowledge: 'Brand Knowledge', accounts: 'Channels', assets: 'Media Library', campaigns: 'Campaigns', inbox: 'Inbox', analytics: 'Analytics', jobs: 'Jobs', settings: 'Settings', setup: 'Guided Setup', team: 'Team & Access', admin: 'Administration' }
};
const labelsBase = { overview: 'Panoramica', contents: 'Contenuti', calendar: 'Calendario', knowledge: 'Conoscenza', accounts: 'Canali', assets: 'Media library', campaigns: 'Campagne', inbox: 'Inbox', analytics: 'Analytics', jobs: 'Attività', settings: 'Impostazioni' };
const labels = new Proxy(labelsBase, {
    get: (_, prop) => (labelsMap[currentLang] || labelsMap.en)[prop] || labelsBase[prop] || prop
});

const icons = { overview: '◈', contents: '▤', calendar: '▦', knowledge: '⌘', accounts: '◎', assets: '▧', campaigns: '⚑', inbox: '✉', analytics: '▥', jobs: '◷', settings: '⚙' };

const statusLabelsMap = {
    it: { DRAFT: 'Bozza', GENERATING: 'Generazione', GENERATED: 'Generato', WAITING_APPROVAL: 'Da approvare', APPROVED: 'Approvato', SCHEDULED: 'Programmato', PUBLISHING: 'Invio', PROCESSING: 'In elaborazione', PUBLISHED: 'Pubblicato / inviato', REVIEW_FAILED: 'Da correggere', REVIEW_REQUIRED: 'Da revisionare', FAILED: 'Fallito', UNCERTAIN: 'Da riconciliare', REJECTED: 'Rifiutato', QUEUED: 'In coda', LEASED: 'In esecuzione', DONE: 'Completato', SUCCESS: 'Riuscito', CANCELLED: 'Annullato', SKIPPED: 'Non disponibile' },
    en: { DRAFT: 'Draft', GENERATING: 'Generating', GENERATED: 'Generated', WAITING_APPROVAL: 'Waiting Approval', APPROVED: 'Approved', SCHEDULED: 'Scheduled', PUBLISHING: 'Publishing', PROCESSING: 'Processing', PUBLISHED: 'Published', REVIEW_FAILED: 'Review Failed', REVIEW_REQUIRED: 'Review Required', FAILED: 'Failed', UNCERTAIN: 'Uncertain / Reconcile', REJECTED: 'Rejected', QUEUED: 'Queued', LEASED: 'Leased', DONE: 'Done', SUCCESS: 'Success', CANCELLED: 'Cancelled', SKIPPED: 'Unavailable' }
};
const statusLabelsBase = { DRAFT: 'Bozza', GENERATING: 'Generazione', GENERATED: 'Generato', WAITING_APPROVAL: 'Da approvare', APPROVED: 'Approvato', SCHEDULED: 'Programmato', PUBLISHING: 'Invio', PROCESSING: 'In elaborazione', PUBLISHED: 'Pubblicato / inviato', REVIEW_FAILED: 'Da correggere', REVIEW_REQUIRED: 'Da revisionare', FAILED: 'Fallito', UNCERTAIN: 'Da riconciliare', REJECTED: 'Rifiutato', QUEUED: 'In coda', LEASED: 'In esecuzione', DONE: 'Completato', SUCCESS: 'Riuscito', CANCELLED: 'Annullato', SKIPPED: 'Non disponibile' };
const statusLabels = new Proxy(statusLabelsBase, {
    get: (_, prop) => (statusLabelsMap[currentLang] || statusLabelsMap.en)[prop] || statusLabelsBase[prop] || prop
});

const dict = {
    it: {
        publicNav: 'Navigazione pubblica',
        navProduct: 'Prodotto',
        navWorkflow: 'Come funziona',
        navIntegrations: 'Integrazioni',
        navLogin: 'Accedi',
        navOpenStudio: 'Apri lo studio',
        heroNote: 'SOCIAL MEDIA. UN NUOVO PUNTO DI VISTA.',
        heroH1: 'Pensa. Crea.<br>Pubblica.<br><span class="accent-underline">Lascia il segno.</span>',
        heroDesc: 'Le tue idee, la voce del tuo brand, tutti i tuoi canali. Uno studio per creare con l’AI, collaborare e pubblicare con il controllo che ti serve.',
        heroEnter: 'Entra nel tuo studio',
        heroExplore: 'Scopri come funziona',
        heroTrust: 'Self-hosted <span>·</span> Multi-brand <span>·</span> Approvazioni umane',
        convEyebrow: 'Le tue conversazioni, in un unico posto',
        convMicro: 'Connessioni native o tramite Postiz. Formati, messaggistica e autorizzazioni variano per piattaforma.',
        wfOver: 'Le idee prendono forma.',
        wfH2: 'Il processo creativo.<br><span class="ink-soft">Senza le parti dispersive.</span>',
        wfDesc: 'Dai documenti del brand alla pubblicazione. Il modello propone; il workflow protegge decisioni, fonti e permessi.',
        wfBtn: 'Configura il tuo workspace',
        wfBoardEyebrow: 'IL TUO FLUSSO EDITORIALE',
        wfBoardBadge: 'Controllo a ogni passaggio',
        closingH2: 'La tecnologia lavora.<br>La voce resta tua.',
        closingDesc: 'Configura modelli e connessioni con il wizard. Conserva dati e credenziali nella tua installazione.',
        closingBtn: 'Apri AIR3 Social Studio',
        welcomeBack: 'Bentornato',
        signInSub: 'Accedi al tuo studio creativo.',
        showPw: 'Mostra password',
        forgotPw: 'Password dimenticata?',
        enterStudio: 'Entra nello studio',
        orDivider: 'oppure',
        googleBtn: 'Continua con Google',
        googleDisabledTitle: 'Accesso Google non configurato dall’amministratore',
        googleDescOn: 'Accedi con il profilo Google già collegato al tuo account.',
        googleDescOff: 'L’amministratore può abilitare Google dalle impostazioni dell’installazione.',
        regOpen: 'Crea un account',
        regInvite: 'Accesso su invito. Contatta il responsabile del workspace.',
        privacy: 'Privacy',
        terms: 'Termini del servizio',
        support: 'Supporto',
        editorialWs: 'WORKSPACE EDITORIALE',
        yourEnv: 'IL TUO AMBIENTE',
        searchPlaceholder: 'Cerca nello studio',
        searchStudio: 'Cerca nello studio',
        sidebarMotto: 'La tua voce.<br>Ovunque conta.',
        signOut: 'Esci',
        footerRule: 'Il tuo brand. Le tue regole.',
        footerChannel: 'Uno studio. Ogni canale. ↗',
        ideasInMotion: 'Le tue idee, in movimento.',
        newContent: 'Nuovo contenuto',
        drafts: 'Bozze',
        draftsSub: 'Idee in lavorazione',
        scheduled: 'Programmati',
        scheduledSub: 'Pronti per il calendario',
        published: 'Pubblicati / inviati',
        publishedSub: 'Esiti confermati',
        waitingApproval: 'Da approvare',
        waitingApprovalSub: 'La tua revisione conta',
        recentContent: 'Contenuti recenti',
        yourChannels: 'I tuoi canali',
        creativeEngine: 'Il tuo motore creativo',
        footerIdeas: 'Le buone idee',
        footerIdeas2: 'vanno più lontano.',
        authNote: 'PIANIFICA → CREA → PUBBLICA → MIGLIORA',
        authH1: 'Gli stessi strumenti.<br><span class="accent-underline">Storie più brillanti.</span>',
        authDesc: 'Pensa e pubblica su ogni canale, con agenti AI che conoscono il tuo brand.',
        authMargin: 'Crea.<br>Connetti.<br>Cresci.',
        navPrivacy: 'Privacy & Dati',
        transEyebrow: 'TRASPARENZA E CONFORMITÀ DATI',
        transH2: 'Trasparenza sui dati, sicurezza e integrazione Google',
        transDesc: 'AIR3 Social Studio protegge la tua privacy. L’integrazione con Google OAuth è progettata con standard rigorosi di sicurezza, riservatezza e piena conformità alle norme Google.',
        transCard1Title: 'Solo Autenticazione',
        transCard1Desc: 'Richiediamo solo openid, email e profilo per verificare in modo sicuro la tua identità di studio. Nessun accesso ad email, Google Drive o file privati.',
        transCard2Title: 'Zero Cessione o Vendita',
        transCard2Desc: 'I tuoi dati personali e i dati utente Google non vengono MAI ceduti, venduti, noleggiati o condivisi con broker pubblicitari o terze parti commerciali.',
        transCard3Title: 'Nessun Addestramento AI',
        transCard3Desc: 'I dati utente ricevuti tramite Google API non vengono mai utilizzati per addestrare o perfezionare modelli di intelligenza artificiale generali.',
        transCard4Title: 'Uso Limitato Google (Limited Use)',
        transCard4Desc: 'L’uso e il trasferimento di informazioni ricevute da Google APIs rispettano rigorosamente le Norme relative ai dati utente dei servizi API di Google.',
        transBtnPrivacy: 'Informativa Privacy',
        transBtnTerms: 'Termini di Servizio',
        transBtnContact: 'Contatta il Supporto'
    },
    en: {
        publicNav: 'Public Navigation',
        navProduct: 'Product',
        navWorkflow: 'How it works',
        navIntegrations: 'Integrations',
        navLogin: 'Sign in',
        navOpenStudio: 'Open Studio',
        heroNote: 'SOCIAL MEDIA. A NEW PERSPECTIVE.',
        heroH1: 'Think. Create.<br>Publish.<br><span class="accent-underline">Leave your mark.</span>',
        heroDesc: 'Your ideas, your brand voice, all your channels. A studio to create with AI, collaborate, and publish with complete control.',
        heroEnter: 'Enter your studio',
        heroExplore: 'Explore how it works',
        heroTrust: 'Self-hosted <span>·</span> Multi-brand <span>·</span> Human approvals',
        convEyebrow: 'Your conversations, all in one place',
        convMicro: 'Native connections or via Postiz. Formats, messaging, and permissions vary by platform.',
        wfOver: 'Ideas take shape.',
        wfH2: 'The creative process.<br><span class="ink-soft">Without friction.</span>',
        wfDesc: 'From brand knowledge to publication. The model suggests; the workflow safeguards decisions, sources, and permissions.',
        wfBtn: 'Configure your workspace',
        wfBoardEyebrow: 'YOUR EDITORIAL WORKFLOW',
        wfBoardBadge: 'Control at every step',
        closingH2: 'Technology works.<br>The voice remains yours.',
        closingDesc: 'Configure models and gateways via wizard. Retain all data and secrets on your infrastructure.',
        closingBtn: 'Open AIR3 Social Studio',
        welcomeBack: 'Welcome Back',
        signInSub: 'Sign in to your creative studio.',
        showPw: 'Show password',
        forgotPw: 'Forgot password?',
        enterStudio: 'Enter Studio',
        orDivider: 'or',
        googleBtn: 'Continue with Google',
        googleDisabledTitle: 'Google login not yet configured by administrator',
        googleDescOn: 'Sign in with the Google profile linked to your account.',
        googleDescOff: 'The administrator can enable Google in installation settings.',
        regOpen: 'Create an account',
        regInvite: 'Invitation-only access. Contact your workspace administrator.',
        privacy: 'Privacy',
        terms: 'Terms of Service',
        support: 'Support',
        editorialWs: 'EDITORIAL WORKSPACE',
        yourEnv: 'YOUR ENVIRONMENT',
        searchPlaceholder: 'Search studio',
        searchStudio: 'Search studio',
        sidebarMotto: 'Your voice.<br>Everywhere it counts.',
        signOut: 'Sign out',
        footerRule: 'Your brand. Your rules.',
        footerChannel: 'One studio. Every channel. ↗',
        ideasInMotion: 'Your ideas, in motion.',
        newContent: 'New Content',
        drafts: 'Drafts',
        draftsSub: 'Ideas in progress',
        scheduled: 'Scheduled',
        scheduledSub: 'Ready for calendar',
        published: 'Published',
        publishedSub: 'Confirmed delivery',
        waitingApproval: 'Needs Approval',
        waitingApprovalSub: 'Your review matters',
        recentContent: 'Recent Content',
        yourChannels: 'Your Channels',
        creativeEngine: 'Your Creative Engine',
        footerIdeas: 'Great ideas',
        footerIdeas2: 'travel further.',
        authNote: 'PLAN → CREATE → PUBLISH → REFINE',
        authH1: 'The same tools.<br><span class="accent-underline">Brighter stories.</span>',
        authDesc: 'Think and publish across every channel, powered by brand-aware AI agents.',
        authMargin: 'Create.<br>Connect.<br>Grow.',
        navPrivacy: 'Privacy & Data',
        transEyebrow: 'DATA PRIVACY & GOOGLE COMPLIANCE',
        transH2: 'Data Transparency, Security & Google Integration',
        transDesc: 'AIR3 Social Studio protects your privacy. Our Google OAuth integration is built with enterprise security, transparency, and strict adherence to Google policies.',
        transCard1Title: 'Authentication Only',
        transCard1Desc: 'We request only openid, email, and basic profile to verify your studio identity. We never access your Gmail, Drive files, or personal contacts.',
        transCard2Title: 'Zero Data Sale',
        transCard2Desc: 'Your personal and Google account data is NEVER sold, rented, leased, or distributed to data brokers, ad networks, or commercial third parties.',
        transCard3Title: 'No AI Model Training',
        transCard3Desc: 'User data obtained via Google APIs is strictly excluded from training, fine-tuning, or improving external AI or machine learning models.',
        transCard4Title: 'Google Limited Use Compliance',
        transCard4Desc: 'Use and transfer of information received from Google APIs adheres strictly to the Google API Services User Data Policy, including Limited Use requirements.',
        transBtnPrivacy: 'Privacy Policy',
        transBtnTerms: 'Terms of Service',
        transBtnContact: 'Contact Support'
    }
};

function t(k, fallback = '') {
    return (dict[currentLang] && dict[currentLang][k]) || (dict.en && dict.en[k]) || (dict.it && dict.it[k]) || fallback || k;
}

function langButton() {
    const isIt = currentLang === 'it';
    const label = isIt ? '🇮🇹 IT' : '🇬🇧 EN';
    const title = isIt ? 'Passa all’inglese / Switch to English' : 'Switch to Italian / Passa all’italiano';
    return `<button class="btn ghost lang-btn" data-action="toggle-lang" aria-label="${title}" title="${title}"><span class="lang-flag">${label}</span></button>`;
}

function setLang(l) {
    currentLang = l === 'it' ? 'it' : 'en';
    try {
        localStorage.setItem('air3:lang', currentLang);
        document.documentElement.lang = currentLang;
    } catch {}
    renderCurrentView();
}

function renderCurrentView() {
    const p = location.pathname;
    if (p === '/') landing();
    else if (['/privacy', '/terms'].includes(p)) legalPage(p);
    else if (p === '/app') {
        if (state.me) refresh();
        else loginView();
    }
    else authRoute(p);
}
let toastTimer;
function toast(message, error = false) { const t = $('#toast'); t.textContent = message; t.className = 'visible' + (error ? ' error' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 6000); }
function may(role) { return ['viewer', 'editor', 'approver', 'admin'].indexOf(state.me?.principal?.role) >= ['viewer', 'editor', 'approver', 'admin'].indexOf(role); }
async function api(path, method = 'GET', body, headers = {}, retryAuth = true) {
    const originalBody = body;
    const h = { 'X-Workspace-Id': state.workspace, ...headers };
    if (method !== 'GET' && method !== 'HEAD')
        h['X-CSRF-Token'] = state.csrf;
    if (body !== undefined && !(body instanceof File) && !(body instanceof Blob)) {
        h['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }
    const r = await fetch(path, { method, headers: h, body, credentials: 'same-origin' });
    let out;
    try {
        out = await r.json();
    }
    catch {
        throw new Error('Risposta server non leggibile');
    }
    if (!r.ok) {
        if (r.status === 401 && out.error?.code === 'AUTH' && state.me) {
            state.me = null;
            loginView();
        }
        if (out.error?.code === 'REAUTH_REQUIRED' && retryAuth && state.me) {
            await confirmIdentity();
            return api(path, method, originalBody, headers, false);
        }
        const err = new Error(out.error?.message || `HTTP ${r.status}`);
        err.code = out.error?.code;
        err.status = r.status;
        throw err;
    }
    return out;
}
const base = () => '/api/brands/' + state.brand.id;
const badge = s => `<span class="badge ${esc(s)}">${esc(statusLabels[s] || s)}</span>`;
const platform = p => `<span class="platform"><span class="picon">${esc(({ instagram: 'IG', facebook: 'f', threads: '@', whatsapp: 'WA', telegram: 'TG', tiktok: 'Tk', linkedin: 'in', 'linkedin-page': 'in', youtube: 'YT', pinterest: 'P', discord: 'D', mastodon: 'M', bluesky: 'B', farcaster: 'F', slack: '#' })[p] || String(p).slice(0, 2).toUpperCase())}</span>${esc(state.status?.platforms?.[p]?.label || p)}</span>`;
const button = (label, action, cls = '', extra = '') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const dataId = id => `data-id="${esc(id)}"`;
const time = v => v ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: state.brand?.data.timezone || 'Europe/Rome' }).format(new Date(v)) : '—';
function head(title, sub, actions = '') { return `<div class="heading"><div><div class="eyebrow">Editorial workspace</div><h1>${esc(title)}</h1><p class="subtle">${sub}</p></div><div class="actions">${actions}</div></div>`; }
function empty(title, sub, action = '') { return `<div class="empty"><strong>${esc(title)}</strong>${esc(sub)}${action ? '<br>' + action : ''}</div>`; }
function modal(title, sub, html) {
    const d = $('#dialog');
    $('#dialog-content').innerHTML = `<div class="dialog-head"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>${button('✕', 'close-modal', 'ghost small', 'aria-label="Chiudi"')}</div>${html}`;
    if (!d.open)
        d.showModal();
}
function closeModal() { $('#dialog').close(); }
function info(title, data) { modal(title, 'Dati restituiti dal sistema', `<pre>${esc(typeof data === 'string' ? data : JSON.stringify(data, null, 2))}</pre>`); }
const field = (name, label, value = '', type = 'text', extra = '') => `<div class="field"><label for="f-${name}">${esc(label)}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
const area = (name, label, value = '', cls = '', rows = 4) => `<div class="field"><label for="f-${name}">${esc(label)}</label><textarea id="f-${name}" name="${name}" class="${cls}" rows="${rows}">${esc(value)}</textarea></div>`;
function select(name, label, options, value = '', extra = '') { return `<div class="field"><label for="f-${name}">${esc(label)}</label><select id="f-${name}" name="${name}" ${extra}>${options.map(x => { const v = typeof x === 'string' ? x : x.value, l = typeof x === 'string' ? x : x.label; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></div>`; }
const check = (name, label, value = false, required = false) => `<label class="check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''} ${required ? 'required' : ''}> <span>${label}</span></label>`;
const lines = v => String(v || '').split(/\n/).map(x => x.trim()).filter(Boolean);
const json = v => {
    try {
        return JSON.parse(v || '{}');
    }
    catch {
        throw new Error('Il campo JSON contiene un errore di sintassi');
    }
};
function form(title, sub, html, onSubmit, label = 'Salva') {
    modal(title, sub, `<form class="form" id="edit-form">${html}<div class="form-error" id="form-error" role="alert"></div><div class="dialog-footer">${button('Annulla', 'close-modal', '', 'type="button"')}<button type="submit" class="btn primary">${label}</button></div></form>`);
    $('#edit-form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = ev.currentTarget, submit = f.querySelector('[type=submit]');
        submit.disabled = true;
        $('#form-error').textContent = '';
        try {
            const fd = new FormData(f);
            const outcome = await onSubmit(Object.fromEntries(fd), fd, f);
            if (outcome !== false)
                closeModal();
            await refresh();
        }
        catch (e) {
            $('#form-error').textContent = e.message;
        }
        finally {
            submit.disabled = false;
        }
    });
}
function legacyLoginView() {
    state.me = null;
    $('#app').innerHTML = `<div class="login"><section class="login-story"><div class="logo">AIR3<small>Social Studio</small></div><div class="login-visual" aria-hidden="true"><i></i><i></i><i></i></div><h1>Un brand.<br>La sua voce.<br><span>Ogni canale.</span></h1><p>Conoscenza, creatività e controllo editoriale. Lo spazio di lavoro per progettare contenuti insieme ai tuoi agenti.</p><div class="footer-note">SELF-HOSTED · HUMAN-IN-THE-LOOP · MULTI-BRAND</div></section><section class="login-form"><div class="eyebrow">Bentornato nello studio</div><h2>Accedi al workspace</h2><p class="subtle">Usa le credenziali create durante il setup o ricevute dall’amministratore.</p><form id="login-form" class="form">${field('email', 'Email', '', 'email', 'required autocomplete="username"')}${field('password', 'Password', '', 'password', 'required autocomplete="current-password"')}<div class="form-error" role="alert" id="login-error"></div><button class="btn primary full" type="submit">Entra nello studio →</button></form><p class="footer-note">Primo accesso? Esegui <span class="help-key">npm run setup</span> nella cartella del progetto. Nessuna password predefinita viene distribuita.</p></section></div>`;
    $('#login-form').onsubmit = async (ev) => {
        ev.preventDefault();
        const f = ev.currentTarget, b = Object.fromEntries(new FormData(f)), btn = f.querySelector('button');
        btn.disabled = true;
        try {
            const r = await api('/api/login', 'POST', b);
            state.csrf = r.csrf;
            state.workspace = r.workspaces[0]?.id || '';
            state.me = await api('/api/me');
            await init();
        }
        catch (e) {
            $('#login-error').textContent = e.message;
        }
        finally {
            btn.disabled = false;
        }
    };
}
async function init() { state.status = await api('/api/status'); state.brands = await api('/api/brands'); state.brand = state.brands.find(x => x.id === state.brand?.id) || state.brands[0] || null; await refresh(); }
function legacyShell(content) {
    $('#app').innerHTML = `<div class="shell"><aside class="sidebar"><div class="logo">AIR3<small>Social Studio</small></div><div class="nav-label">Il tuo studio</div><nav class="nav">${Object.entries(labels).map(([k, l]) => `<a href="#${k}" class="${state.view === k || state.view.startsWith('content/') && k === 'contents' ? 'active' : ''}"><span class="icon" aria-hidden="true">${icons[k]}</span>${l}</a>`).join('')}</nav><div class="sidebar-bottom"><b>Conoscenza → contenuto → impatto</b><br>Revisione umana attiva<br>Release 0.2.0 · Self-hosted</div></aside><main class="main"><header class="topbar"><div class="brand-switch">${button('☰', 'menu', 'ghost mobile-menu', 'aria-label="Menu"')}<div class="brand-avatar">${esc(state.brand?.data.name?.slice(0, 1) || '+')}</div><select id="brand-switch" aria-label="Seleziona brand">${state.brands.length ? state.brands.map(b => `<option value="${b.id}" ${b.id === state.brand?.id ? 'selected' : ''}>${esc(b.data.name)}</option>`).join('') : '<option>Crea il primo brand</option>'}</select>${may('admin') ? button('+', 'new-brand', 'ghost small', 'aria-label="Nuovo brand"') : ''}</div><div class="top-right"><span class="badge">${esc(state.me.principal.role)}</span><span class="member-pill">${esc(state.me.user?.email || state.me.principal.userId)}</span><div class="avatar">${esc(state.me.user?.email?.slice(0, 2).toUpperCase() || 'AI')}</div>${button('Esci', 'logout', 'ghost small')}</div></header><div class="page">${content}</div></main></div>`;
    const b = $('#brand-switch');
    if (b)
        b.onchange = async () => { state.brand = state.brands.find(x => x.id === b.value); state.view = 'overview'; location.hash = 'overview'; await refresh(); };
}
async function loadCollections(keys) { await Promise.all(keys.map(async (k) => { state.data[k] = await api(base() + '/' + k); })); }
async function legacyRefresh() {
    if (!state.me)
        return;
    state.view = location.hash.slice(1) || 'overview';
    if (!labels[state.view] && !/^content\/[a-f0-9]{32}$/.test(state.view))
        state.view = 'overview';
    if (!state.brand) {
        shell(head('Il tuo primo brand', 'Parti dalle regole editoriali, poi collega i canali.') + `<div class="panel">${empty('Benvenuto in AIR3 Social Studio', 'Nessun contenuto dimostrativo o account fittizio. Crea un brand e aggiungi le sue fonti.', may('admin') ? button('Crea brand', 'new-brand', 'primary') : 'Chiedi al tuo amministratore di creare un brand.')}</div>`);
        return;
    }
    if (state.view.startsWith('content/')) {
        await loadCollections(['accounts', 'assets', 'campaigns', 'knowledge']);
        const e = await api('/api/contents/' + state.view.split('/')[1]);
        state.data.current = e;
        shell(contentPage(e));
        return;
    }
    const needs = { overview: ['contents', 'accounts', 'knowledge', 'jobs'], contents: ['contents', 'accounts', 'assets', 'campaigns'], calendar: ['contents', 'accounts', 'plans'], knowledge: ['knowledge'], accounts: ['accounts'], assets: ['assets'], campaigns: ['campaigns'], inbox: ['inbox', 'contacts', 'accounts'], analytics: ['metrics', 'insights', 'contents'], jobs: ['jobs', 'executions'], settings: ['accounts', 'assets', 'prompts'] };
    await loadCollections(needs[state.view] || []);
    const pages = { overview: overviewPage, contents: contentsPage, calendar: calendarPage, knowledge: knowledgePage, accounts: accountsPage, assets: assetsPage, campaigns: campaignsPage, inbox: inboxPage, analytics: analyticsPage, jobs: jobsPage, settings: settingsPage };
    shell(pages[state.view]());
}
function postsTable(rows, compact = false) {
    if (!rows.length)
        return empty('Nessun contenuto da mostrare', 'Le bozze e i contenuti programmati compariranno qui.');
    return `<div class="table-wrap"><table><thead><tr><th>CONTENUTO</th>${compact ? '' : '<th>CANALE</th>'}<th>STATO</th><th>${compact ? 'CANALE' : 'PROGRAMMAZIONE'}</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td><a href="#content/${x.id}"><b class="truncate">${esc(x.data.title || 'Senza titolo')}</b></a><div class="subtle truncate">${esc(x.data.text?.slice(0, 80) || x.data.objective || 'Bozza da sviluppare')}</div></td>${compact ? '' : `<td>${platform(x.data.platform)}</td>`}<td>${badge(x.data.status)}</td><td>${compact ? platform(x.data.platform) : `<span class="subtle">${time(x.data.scheduleAt)}</span>`}</td><td><a class="btn small ghost" href="#content/${x.id}">Apri ↗</a></td></tr>`).join('')}</tbody></table></div>`;
}
function legacyOverviewPage() { const cs = state.data.contents, accounts = state.data.accounts, docs = state.data.knowledge; const count = s => cs.filter(x => s.includes(x.data.status)).length; const stats = [['Da approvare', count(['WAITING_APPROVAL', 'REVIEW_FAILED']), 'Controllo editoriale'], ['Programmati', count(['SCHEDULED', 'PROCESSING']), 'Nella coda di pubblicazione'], ['Pubblicati / inviati', count(['PUBLISHED']), 'Esiti confermati dal provider'], ['Canali configurati', accounts.length, 'Credenziali salvate, non test live']]; const upcoming = cs.filter(x => ['SCHEDULED', 'WAITING_APPROVAL', 'REVIEW_FAILED', 'GENERATING', 'PROCESSING'].includes(x.data.status)).slice(0, 6); return head('Ogni contenuto, sotto controllo.', `Il workspace di <b>${esc(state.brand.data.name)}</b>. Dall’idea alla pubblicazione, con fonti e revisioni tracciate.`, may('editor') ? button('+ Nuovo contenuto', 'new-content', 'primary') : '') + `<div class="cards">${stats.map(([label, n, sub], i) => `<div class="card"><div class="overline">${label}<span class="metric-dot ${i === 2 ? 'green' : ''}"></span></div><div class="metric">${n}</div><div class="caption">${sub}</div></div>`).join('')}</div><div class="split"><div class="panel"><div class="panel-head"><h2>In lavorazione</h2><a href="#contents" class="subtle">Tutti i contenuti ↗</a></div>${postsTable(upcoming, true)}</div><div class="panel"><div class="panel-head"><h2>Il tuo sistema editoriale</h2><span class="badge">${docs.filter(x => x.data.approved).length} fonti</span></div><div class="panel-body steps">${[[true, 'Identità del brand', 'Tono, obiettivi e vincoli sempre nel contesto.'], [docs.some(x => x.data.approved), 'Conoscenza verificata', 'Carica le fonti e approvale per abilitarne il recupero.'], [accounts.length > 0, 'Canali e autorizzazioni', 'Collega gli account con API ufficiali o Postiz.'], [state.status.model.configured, 'Agenti specializzati', state.status.model.configured ? 'Modello: ' + state.status.model.name : 'Configura provider e modello nel file .env.']].map(([done, title, sub], i) => `<div class="step"><div class="step-num ${done ? 'done' : ''}">${done ? '✓' : i + 1}</div><div><h3>${title}</h3><p>${esc(sub)}</p></div></div>`).join('')}<div class="status-strip"><span>Storage locale</span><span>${state.status.embeddings.configured ? 'Retrieval ibrido' : 'Retrieval lessicale'}</span></div></div></div></div><div class="callout section-space">Gli agenti preparano i contenuti. I permessi, le approvazioni e l’invio sono gestiti dal backend. La pubblicazione automatica è ${state.brand.data.policy.autoPublish ? 'abilitata solo per la policy testuale limitata del brand' : 'disattivata'}.</div>`; }
function contentsPage() { return head('Contenuti', 'Brief, copy, visual e approvazioni. Ogni versione ha una propria traccia.', may('editor') ? button('+ Nuovo contenuto', 'new-content', 'primary') : '') + `<div class="toolbar"><input id="content-search" class="filter" aria-label="Cerca contenuti" placeholder="Cerca per titolo o testo"><select id="status-filter" class="filter" aria-label="Filtra stato"><option value="">Tutti gli stati</option>${Object.entries(statusLabels).slice(0, 15).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div><div class="panel" id="content-table">${postsTable(state.data.contents)}</div><p class="footer-note">Una bozza può essere adattata a più canali. Ogni destinazione richiede la propria revisione e approvazione.</p>`; }
function contentPage(e) {
    const d = e.data, mutable = ['DRAFT', 'GENERATED', 'REVIEW_FAILED', 'REVIEW_REQUIRED', 'WAITING_APPROVAL', 'APPROVED', 'FAILED', 'REJECTED'].includes(d.status);
    let actions = '';
    if (may('editor') && mutable)
        actions += button('Modifica', 'edit-content', '', dataId(e.id)) + button('Genera con AI', 'generate', 'primary', dataId(e.id));
    if (may('editor') && mutable)
        actions += button('Revisiona', 'review', '', dataId(e.id));
    if (may('approver') && mutable && d.review)
        actions += button('Approva', 'approve', 'dark', dataId(e.id));
    if (d.status === 'APPROVED' && may('editor'))
        actions += button('Programma', 'schedule', 'primary', dataId(e.id));
    if (d.status === 'SCHEDULED' && may('editor'))
        actions += button('Annulla programmazione', 'cancel-content', 'danger', dataId(e.id));
    if (['UNCERTAIN', 'PROCESSING'].includes(d.status) && may('admin'))
        actions += button('Riconcilia esito', 'reconcile', 'danger', dataId(e.id));
    return head(d.title || 'Bozza senza titolo', `${platform(d.platform)} &nbsp; ${badge(d.status)} &nbsp; <span class="subtle">Versione ${e.revision} · ${time(e.updatedAt)}</span>`, actions) + `<div class="detail-grid"><div class="stack"><div class="panel"><div class="panel-head"><h2>Anteprima editoriale</h2><span class="badge">${esc(d.format)}</span></div><div class="panel-body"><div class="preview">${esc(d.text || 'Il testo non è ancora stato scritto.')}</div><div class="tag-list">${d.hashtags.map(h => `<span class="badge">${esc(h.startsWith('#') ? h : '#' + h)}</span>`).join('')}</div><div class="preview-media">${d.media.map(m => m.mime.startsWith('video/') ? `<video src="${safeUrl(m.url)}" controls preload="metadata"></video>` : `<img src="${safeUrl(m.url)}" alt="${esc(m.alt || d.title)}">`).join('')}</div></div></div>${d.strategy ? `<div class="panel"><div class="panel-head"><h2>Brief strategico</h2></div><div class="panel-body"><div class="preview subtle">${esc(d.strategy.rationale || '')}</div><div class="tag-list"><span class="badge">${esc(d.strategy.target || '')}</span><span class="badge">${esc(d.strategy.angle || '')}</span></div></div></div>` : ''}${d.options.videoScript || d.options.voiceoverScript ? `<div class="panel"><div class="panel-head"><h2>Script e voiceover</h2></div><div class="panel-body"><div class="preview subtle">${esc(d.options.videoScript || '')}\n\n${esc(d.options.voiceoverScript || '')}</div></div></div>` : ''}</div><aside class="detail-side"><div class="panel"><div class="panel-head"><h2>Controllo qualità</h2>${d.review ? `<span class="badge">${d.review.score}/100</span>` : ''}</div><div class="panel-body">${d.review ? `<div class="subtle">${d.review.passed ? 'Controlli automatici superati' : 'Sono presenti segnalazioni'}</div><ul class="checklist">${d.review.issues.map(i => `<li>${esc(i)}</li>`).join('') || '<li>Nessuna segnalazione automatica.</li>'}</ul><p class="footer-note">${esc(d.review.version)} · Lo score non è una probabilità di correttezza.</p>` : empty('Revisione da eseguire', 'Salva o genera il contenuto, quindi avvia i controlli.')}</div></div><div class="panel"><div class="panel-head"><h2>Fonti e destinazione</h2></div><div class="panel-body"><div class="kicker">Obiettivo</div><p class="subtle">${esc(d.objective || 'Non specificato')}</p><div class="kicker">Account</div><p class="subtle">${esc(state.data.accounts.find(a => a.id === d.accountId)?.data.name || d.accountId)}</p><div class="kicker">Fonti recuperate</div><p class="subtle">${new Set(d.sourceIds.map(x => x.split(':')[0])).size} documenti · ${d.claims.length} claim tracciati</p>${button('Ispeziona fonti e metadati', 'inspect-content', 'small', dataId(e.id))}</div></div>${d.approval ? `<div class="callout">Approvato da <b>${esc(d.approval.userId)}</b><br>${time(d.approval.at)}<br>La firma lega contenuto, fonti, brand e account.</div>` : ''}${d.publication ? `<div class="panel"><div class="panel-head"><h2>Ricevuta provider</h2></div><div class="panel-body"><p class="id-code">${esc(d.publication.externalId)}</p>${badge(d.publication.state)}${d.publication.details?.delivery ? `<p class="subtle">Consegna: ${esc(d.publication.details.delivery)}</p>` : ''}${d.publication.url ? `<p><a href="${safeUrl(d.publication.url)}" target="_blank" rel="noopener noreferrer">Apri sul social ↗</a></p>` : ''}</div></div>` : ''}<div class="actions">${may('editor') ? button('Adatta ad altri canali', 'adapt', 'small', dataId(e.id)) : ''}${may('approver') && mutable ? button('Rifiuta', 'reject-content', 'small danger', dataId(e.id)) : ''}${may('editor') && mutable ? button('Solo copy', 'generate-copy', 'small', dataId(e.id)) + button('Solo visual', 'generate-visual', 'small', dataId(e.id)) : ''}</div><div class="footer-note">${e.history.length} versioni precedenti conservate. Nessuna pubblicazione viene cancellata dal social attraverso questa schermata.</div></aside></div>`;
}
function calendarPage() { const y = state.month.getFullYear(), m = state.month.getMonth(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, start = new Date(y, m, 1 - offset), today = new Date().toDateString(); const cs = state.data.contents.filter(x => x.data.scheduleAt); const title = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(first); return head('Calendario editoriale', `Orari visualizzati in ${esc(state.brand.data.timezone)}. Le idee del planner restano proposte.`, may('editor') ? button('Genera piano settimanale', 'plan', 'primary') : '') + `<div class="toolbar">${button('←', 'prev-month', 'small')}${button('Oggi', 'today-month', 'small')}<b>${esc(title)}</b>${button('→', 'next-month', 'small')}<div class="actions">${button('Esporta .ics', 'export-calendar', 'small')}</div></div><div class="table-wrap"><div class="calendar">${['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map(x => `<div class="weekday">${x}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); const events = cs.filter(c => new Intl.DateTimeFormat('en-CA', { timeZone: state.brand.data.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(c.data.scheduleAt)) === key); return `<div class="day ${date.getMonth() !== m ? 'out' : ''} ${date.toDateString() === today ? 'today' : ''}"><div class="date">${date.getDate()}</div>${events.map(e => `<a class="event" href="#content/${e.id}" title="${esc(e.data.title)}">${esc(e.data.platform)} · ${esc(e.data.title)}</a>`).join('')}</div>`; }).join('')}</div></div><div class="section-title"><h2>Proposte editoriali</h2><span class="subtle">Nessun invio automatico dal piano</span></div>${state.data.plans.length ? `<div class="grid">${state.data.plans.map(e => `<div class="card"><div class="card-header"><b>Piano del ${time(e.createdAt)}</b><span class="badge">${esc(e.data.status)}</span></div><div class="card-body">${e.data.ideas.map(i => `<p>${esc(i.topic)}<br><small>${esc(i.format)} · ${time(i.suggestedAt)}</small></p>`).join('')}</div>${may('editor') && e.data.status === 'PROPOSED' ? button('Crea le bozze', 'plan-drafts', 'small', dataId(e.id)) : ''}</div>`).join('')}</div>` : `<div class="panel">${empty('Nessun piano proposto', 'Il planner usa obiettivi, campagne e storico per suggerire fino a sette idee.')}</div>`}`; }
function knowledgePage() { return head('La conoscenza del brand', 'Fonti approvate, recupero selettivo e contesto specifico per ogni agente.', may('editor') ? button('+ Aggiungi documento', 'new-knowledge', 'primary') : '') + `<div class="callout">Le regole obbligatorie del brand vengono sempre fornite agli agenti. Il retrieval aggiunge soltanto i frammenti pertinenti delle fonti approvate. Modalità: <b>${state.status.embeddings.configured ? 'ibrida, con fallback lessicale' : 'lessicale; embeddings non configurati'}</b>.</div><div class="toolbar"><input class="filter" id="rag-query" placeholder="Es. risparmio per i pendolari" aria-label="Query RAG"><select id="rag-role" class="filter" aria-label="Ruolo RAG">${['copywriter', 'strategist', 'creative', 'reviewer', 'analyst'].map(x => `<option>${x}</option>`).join('')}</select>${button('Prova retrieval', 'test-rag', 'small')}</div><div id="rag-results"></div>${state.data.knowledge.length ? `<div class="grid">${state.data.knowledge.map(e => `<div class="card"><div class="card-header"><span class="badge">${esc(e.data.type)}</span>${badge(e.data.approved ? 'APPROVED' : 'DRAFT')}</div><h3>${esc(e.data.title)}</h3><div class="card-body">${esc(e.data.text.slice(0, 180))}${e.data.text.length > 180 ? '…' : ''}</div><div class="tag-list">${e.data.roles.map(r => `<span class="badge">${esc(r)}</span>`).join('')}</div><p class="id-code">${e.data.chunkCount} frammenti · v${e.revision} · ${e.data.embeddingModel ? 'vettori + testo' : 'testo'}</p><div class="card-footer">${may('editor') ? button('Modifica', 'edit-knowledge', 'small', dataId(e.id)) : ''}${may('approver') ? button(e.data.approved ? 'Revoca approvazione' : 'Approva fonte', 'approve-knowledge', 'small', dataId(e.id)) + button('Elimina', 'delete-knowledge', 'small danger', dataId(e.id)) : ''}</div></div>`).join('')}</div>` : `<div class="panel">${empty('Nessuna fonte caricata', 'Aggiungi linee guida, FAQ, caratteristiche prodotto, claim documentati ed esempi di post.')}</div>`}`; }
function legacyAccountsPage() { const connected = state.data.accounts; return head('Tutti i tuoi canali', 'API ufficiali, credenziali cifrate e una destinazione esplicita per ogni account.', may('admin') ? button('+ Collega canale', 'new-account', 'primary') : '') + `<div class="callout warning">“Configurato” indica che le credenziali sono state salvate. Accessi, scope, audit e formati dipendono dal provider. Il prodotto non aggira approvazioni delle app o limitazioni delle piattaforme.</div>${connected.length ? `<div class="grid">${connected.map(e => `<div class="card"><div class="card-header">${platform(e.data.platform)}<span class="badge ${e.data.enabled ? 'APPROVED' : 'FAILED'}">${e.data.enabled ? 'Configurato' : 'Disabilitato'}</span></div><h3>${esc(e.data.name)}</h3><p class="id-code">${esc(e.data.targetId)}</p><div class="card-body">Trasporto: <b>${esc(e.data.transport)}</b><br>${esc(state.status.platforms[e.data.platform].notes)}</div><div class="card-footer">${may('admin') ? button('Configura', 'edit-account', 'small', dataId(e.id)) : ''}${may('admin') && e.data.transport === 'postiz' ? button('OAuth', 'account-connect', 'small', dataId(e.id)) + button('Elenco canali', 'postiz-integrations', 'small', dataId(e.id)) : ''}${may('admin') && e.data.platform === 'telegram' && e.data.transport === 'direct' ? button('Installa webhook', 'install-webhook', 'small', dataId(e.id)) : ''}${e.data.platform === 'tiktok' && e.data.transport === 'direct' ? button('Creator info', 'creator-info', 'small', dataId(e.id)) : ''}</div></div>`).join('')}</div>` : `<div class="panel">${empty('Nessun canale collegato', 'Aggiungi un account diretto o una destinazione gestita da Postiz.')}</div>`}<div class="section-title"><h2>Catalogo integrazioni</h2><span class="subtle">${Object.keys(state.status.platforms).length} tipi di canale</span></div><div class="grid">${Object.entries(state.status.platforms).map(([k, c]) => `<div class="card"><div class="card-header">${platform(k)}</div><div class="card-body">${esc(c.notes)}</div><div class="tag-list">${c.native.length ? '<span class="badge">Client diretto</span>' : ''}${c.postiz ? '<span class="badge">Postiz</span>' : ''}</div><p class="footer-note">Formati diretti: ${esc(c.native.join(', ') || 'nessuno; usare Postiz')}</p></div>`).join('')}</div>`; }
function assetsPage() { return head('Media library', 'Asset del brand, template deterministici e video editoriali da slide.', may('editor') ? button('Crea visual', 'render', '') + button('Crea video', 'video', '') + button('↑ Carica media', 'upload', 'primary') : '') + `<input type="file" id="media-upload" accept="image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav" multiple hidden>${state.data.assets.length ? `<div class="grid">${state.data.assets.map(e => `<div class="card">${e.data.mime.startsWith('image/') ? `<img class="asset-cover" src="${safeUrl(e.data.url)}" alt="${esc(e.data.alt || e.data.name)}" loading="lazy">` : `<div class="asset-cover video">${e.data.mime.startsWith('video/') ? '▶' : '♫'}</div>`}<h3>${esc(e.data.name)}</h3><div class="card-body">${esc(e.data.mime)} · ${(e.data.size / 1024 / 1024).toFixed(2)} MB<br>${e.data.width ? `${e.data.width} × ${e.data.height}` : ''}${e.data.duration ? ` · ${Math.round(e.data.duration)} s` : ''}</div><div class="card-footer"><a class="btn small" href="${safeUrl(e.data.url)}" target="_blank" rel="noopener noreferrer">Apri asset ↗</a>${button('Copia ID', 'copy-id', 'small', dataId(e.id))}</div></div>`).join('')}</div>` : `<div class="panel">${empty('La libreria è pronta', 'Carica immagini, video, audio o crea un visual con logo, headline e colori del brand.')}</div>`}<p class="footer-note">File verificati con FFmpeg. Massimo 128 MB, 40 megapixel o 15 minuti per asset locale. I limiti dei social possono essere inferiori.</p>`; }
function campaignsPage() { return head('Campagne', 'Obiettivi e vincoli commerciali con un intervallo di validità esplicito.', may('editor') ? button('+ Nuova campagna', 'new-campaign', 'primary') : '') + (state.data.campaigns.length ? `<div class="grid">${state.data.campaigns.map(e => `<div class="card"><div class="card-header"><h3>${esc(e.data.name)}</h3>${badge(e.data.active ? 'APPROVED' : 'DRAFT')}</div><p class="card-body">${esc(e.data.objective)}</p><p class="card-body">${esc(e.data.brief)}</p><p class="subtle">${time(e.data.startAt)}<br>${time(e.data.endAt)}</p>${may('editor') ? button('Modifica', 'edit-campaign', 'small', dataId(e.id)) : ''}</div>`).join('')}</div>` : `<div class="panel">${empty('Nessuna campagna attiva', 'Crea una campagna per guidare strategia, calendario e generazione.')}</div>`); }
function inboxPage() { return head('Inbox e conversazioni', 'Messaggi ricevuti tramite webhook verificati. Le risposte passano dal workflow editoriale.', may('admin') ? button('+ Registra contatto', 'new-contact', 'primary') : '') + `<div class="callout">WhatsApp, Messenger e Instagram Direct usano una finestra di risposta registrata dal webhook, non dichiarata dall’AI. Fuori finestra WhatsApp richiede un template e un consenso registrato.</div><div class="panel">${state.data.inbox.length ? `<table><thead><tr><th>CONVERSAZIONE</th><th>CANALE</th><th>RICEVUTO</th><th></th></tr></thead><tbody>${state.data.inbox.map(e => `<tr><td><b>${esc(e.data.recipient)}</b><div class="subtle preview">${esc(e.data.text.slice(0, 1000))}</div></td><td>${platform(e.data.platform)}<br><span class="badge">${esc(e.data.status)}</span></td><td>${time(e.data.at)}</td><td>${may('editor') ? button('Prepara risposta', 'reply-draft', 'small', dataId(e.id)) + button('Chiudi', 'close-inbox', 'small ghost', dataId(e.id)) : ''}</td></tr>`).join('')}</tbody></table>` : empty('Nessun messaggio ricevuto', 'Configura le sottoscrizioni webhook del provider e la verifica della firma.')}</div><div class="section-title"><h2>Rubrica autorizzata</h2></div><div class="panel">${state.data.contacts.length ? `<table><thead><tr><th>CONTATTO</th><th>CONSENSO TEMPLATE</th><th>ULTIMO INBOUND</th></tr></thead><tbody>${state.data.contacts.map(e => `<tr><td><b>${esc(e.data.name)}</b><div class="id-code">${esc(e.data.recipient)}</div></td><td>${e.data.optIn ? 'Registrato' : 'Non registrato'}</td><td>${time(e.data.lastInboundAt)}</td></tr>`).join('')}</tbody></table>` : empty('Rubrica vuota', 'I messaggi in ingresso registrano la conversazione, ma non inventano un consenso marketing.')}</div>`; }
function analyticsPage() {
    const metrics = state.data.metrics, latest = new Map();
    for (const m of metrics) {
        const old = latest.get(m.data.contentId);
        if (!old || old.data.collectedAt < m.data.collectedAt)
            latest.set(m.data.contentId, m);
    }
    const actual = [...latest.values()];
    return head('Dai risultati, nuove domande.', 'Osservazioni reali, provenienza esplicita e insight da validare prima di inserirli nella memoria.', may('editor') ? button('Importa metriche', 'import-metrics', '') + button('Analizza con AI', 'analyze', 'primary') : '') + `<div class="cards"><div class="card"><div class="overline">Contenuti misurati</div><div class="metric">${actual.length}</div><div class="caption">Una sola osservazione più recente per post</div></div><div class="card"><div class="overline">Snapshot conservati</div><div class="metric">${metrics.length}</div><div class="caption">Finestre e fonti registrate</div></div><div class="card"><div class="overline">Insight proposti</div><div class="metric">${state.data.insights.filter(x => !x.data.accepted).length}</div><div class="caption">In attesa di validazione</div></div><div class="card"><div class="overline">Insight accettati</div><div class="metric">${state.data.insights.filter(x => x.data.accepted).length}</div><div class="caption">Disponibili nel RAG del brand</div></div></div><div class="panel"><div class="panel-head"><h2>Ultime osservazioni per contenuto</h2></div>${actual.length ? `<div class="table-wrap"><table><thead><tr><th>CONTENUTO</th><th>VALORI RESTITUITI</th><th>FONTE</th><th>OSSERVATO</th><th></th></tr></thead><tbody>${actual.map(e => `<tr><td><a href="#content/${e.data.contentId}">${esc(state.data.contents.find(c => c.id === e.data.contentId)?.data.title || e.data.contentId)}</a></td><td>${Object.entries(e.data.values).map(([k, v]) => `<span class="badge">${esc(k)}: ${esc(v)}</span>`).join(' ')}</td><td class="subtle">${esc(e.data.source)}</td><td>${time(e.data.collectedAt)}</td><td>${may('editor') ? button('Aggiorna', 'collect-metrics', 'small', dataId(e.data.contentId)) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('Non ci sono ancora metriche', 'Il worker raccoglie osservazioni a 24 e 72 ore, quando il client e il provider le rendono disponibili.')}</div><div class="section-title"><h2>Insight e ipotesi</h2></div><div class="grid">${state.data.insights.map(e => `<div class="card"><div class="card-header"><span class="badge">n = ${e.data.sampleSize} post</span>${badge(e.data.accepted ? 'APPROVED' : 'WAITING_APPROVAL')}</div><h3>${esc(e.data.summary)}</h3><div class="card-body">${e.data.hypotheses.map(x => `<p>${esc(x)}</p>`).join('')}<b>Limiti</b>${e.data.limitations.map(x => `<p>${esc(x)}</p>`).join('')}</div><div class="card-footer">${may('approver') && !e.data.accepted ? button('Accetta nella memoria', 'accept-insight', 'small', dataId(e.id)) : ''}${button('Dati completi', 'inspect-insight', 'small', dataId(e.id))}</div></div>`).join('')}</div><p class="footer-note">Mancanza di una metrica ≠ zero. Valori di social, obiettivi e finestre diversi non vengono aggregati in un punteggio universale.</p>`;
}
function jobsPage() { return head('Attività e audit degli agenti', 'Job persistenti, retry controllati e traccia delle esecuzioni. Nessun esito esterno viene inventato.', may('approver') ? button('Apri audit', 'show-audit', '') : '') + `<div class="panel"><div class="panel-head"><h2>Coda operativa</h2><span class="badge">${state.status.workerEnabled ? 'Worker attivo' : 'Worker disabilitato'}</span></div>${state.data.jobs.length ? `<div class="table-wrap"><table><thead><tr><th>TIPO</th><th>STATO</th><th>TENTATIVI</th><th>DATA</th><th>ESITO / ERRORE</th></tr></thead><tbody>${state.data.jobs.map(j => `<tr><td><b>${esc(j.kind)}</b><div class="id-code">${j.entityId}</div></td><td>${badge(j.state)}</td><td>${j.attempts}</td><td>${time(j.dueAt)}</td><td class="subtle">${esc(j.error || '—')}</td></tr>`).join('')}</tbody></table></div>` : empty('Coda vuota', 'Generazioni e pubblicazioni vengono accodate qui.')}</div><div class="section-title"><h2>Esecuzioni AI</h2></div><div class="panel">${state.data.executions.length ? `<table><thead><tr><th>AGENTE</th><th>PROMPT</th><th>MODELLO</th><th>STATO</th><th></th></tr></thead><tbody>${state.data.executions.map(e => `<tr><td>${esc(e.data.role)}</td><td>${esc(e.data.promptVersion)}</td><td>${esc(e.data.model)}</td><td>${badge(e.data.status)}</td><td>${button('Input / output', 'inspect-execution', 'small', dataId(e.id))}</td></tr>`).join('')}</tbody></table>` : empty('Nessuna esecuzione', 'Ogni chiamata registra versione del prompt, modello, input e risultato.')}</div>`; }
function legacySettingsPage() { const b = state.brand.data; return head('Impostazioni del workspace', 'Identità del brand, ruoli umani, prompt versionati e accesso degli strumenti.') + `<div class="two-col"><div class="panel"><div class="panel-head"><h2>Identità di ${esc(b.name)}</h2>${may('admin') ? button('Modifica', 'edit-brand', 'small') : ''}</div><div class="panel-body"><div class="kicker">Descrizione</div><p class="subtle">${esc(b.description || 'Non specificata')}</p><div class="kicker">Tone of voice</div><div class="tag-list">${b.tone.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><div class="kicker">Lingua e calendario</div><p class="subtle">${esc(b.language)} · ${esc(b.timezone)}</p><div class="kicker">Policy</div><p class="subtle">Auto-publish: ${b.policy.autoPublish ? 'policy testuale limitata' : 'disattivato'}<br>Massimo ${b.policy.maxAutoRevisions} correzioni automatiche<br>Soglia review: ${b.policy.minReviewScore}</p></div></div><div class="panel"><div class="panel-head"><h2>Infrastruttura AI</h2></div><div class="panel-body"><div class="kicker">Generazione</div><p class="subtle">${esc(state.status.model.name || 'Modello non configurato')} · ${esc(state.status.model.provider)}</p><div class="kicker">Embeddings</div><p class="subtle">${esc(state.status.embeddings.model || 'Non configurati: retrieval lessicale')}</p><div class="kicker">Visual</div><p class="subtle">Modello immagine: ${esc(state.status.imageModel || 'non configurato')}<br>FFmpeg: ${state.status.renderer.ffmpeg ? 'disponibile' : 'non disponibile'}</p><p class="footer-note">Provider e segreti infrastrutturali si configurano in .env. Non vengono esposti nella dashboard.</p></div></div></div>${may('admin') ? `<div class="section-title"><h2>Controllo degli accessi</h2></div><div class="actions">${button('Utenti e ruoli', 'users')}${button('Aggiungi utente', 'new-user')}${button('Nuovo workspace', 'new-workspace')}${button('Token MCP / API', 'tokens')}${button('Prompt degli agenti', 'prompts')}</div>` : ''}<div class="section-title"><h2>Sessione</h2></div><div class="actions">${button('Cambia password', 'password')}${state.me.workspaces?.length > 1 ? select('workspace', 'Workspace', state.me.workspaces.map(w => ({ value: w.id, label: w.name })), state.workspace) : ''}</div><div class="callout section-space">MCP endpoint: <span class="help-key">${esc(state.status.baseUrl)}/mcp</span><br>I token sono limitati a un brand e non possono approvare contenuti. n8n può creare bozze, accodare generazioni e programmare versioni già approvate usando la stessa API.</div><p class="footer-note">Prima di un utilizzo pubblico: HTTPS, backup cifrati della configurazione, revisione delle autorizzazioni dei provider e collaudi sugli account reali. Questa release non include SSO o un servizio di fatturazione.</p>`; }
async function brandForm(edit = false) {
    const e = edit ? state.brand : null, b = e?.data || { name: '', description: '', industry: '', mission: '', target: [], tone: ['Chiaro', 'Diretto'], objectives: [], colors: ['#172338'], language: 'it', timezone: 'Europe/Rome', bannedWords: [], requiredPhrases: [], approvedClaims: [], policy: { autoPublish: false, maxAutoRevisions: 2, minReviewScore: 90 } };
    if (edit)
        await loadCollections(['assets']);
    form(edit ? 'Modifica brand' : 'Crea il tuo brand', 'L’identità e le policy sono sempre incluse nel contesto degli agenti.', `${field('name', 'Nome', b.name, 'text', 'required maxlength="100"')}<div class="form-row">${field('industry', 'Settore', b.industry)}${field('language', 'Lingua', b.language)}</div>${area('description', 'Descrizione', b.description)}${area('mission', 'Mission', b.mission)}<div class="form-row">${area('target', 'Segmenti target, uno per riga', b.target.join('\n'))}${area('tone', 'Tone of voice, uno per riga', b.tone.join('\n'))}</div>${area('objectives', 'Obiettivi, uno per riga', b.objectives.join('\n'))}<div class="form-row">${field('colors', 'Colori #RRGGBB separati da virgole', b.colors.join(', '))}${field('timezone', 'Timezone IANA', b.timezone)}</div>${edit ? select('logoAssetId', 'Logo dalla libreria', [{ value: '', label: 'Nessun logo' }, ...state.data.assets.filter(a => a.data.mime.startsWith('image/')).map(a => ({ value: a.id, label: a.data.name }))], b.logoAssetId || '') : ''}<details><summary>Regole obbligatorie e pubblicazione automatica</summary><div class="form">${area('bannedWords', 'Termini vietati, uno per riga', b.bannedWords.join('\n'))}${area('requiredPhrases', 'Frasi obbligatorie in ogni contenuto', b.requiredPhrases.join('\n'))}${area('approvedClaims', 'Claim approvati esplicitamente dal brand', b.approvedClaims.join('\n'))}<div class="form-row">${field('maxAutoRevisions', 'Revisioni automatiche (0–2)', b.policy.maxAutoRevisions, 'number', 'min="0" max="2"')}${field('minReviewScore', 'Soglia review (70–100)', b.policy.minReviewScore, 'number', 'min="70" max="100"')}</div>${check('autoPublish', 'Autorizzo la policy automatica limitata: solo testo, review ≥ 90, nessun claim dichiarato, nessun numero o link. Non abilita messaggi, video o TikTok.', b.policy.autoPublish)}</div></details>`, async (f) => { const body = { ...f, revision: e?.revision, target: lines(f.target), tone: lines(f.tone), objectives: lines(f.objectives), colors: f.colors.split(',').map(x => x.trim()), bannedWords: lines(f.bannedWords), requiredPhrases: lines(f.requiredPhrases), approvedClaims: lines(f.approvedClaims), policy: { autoPublish: !!f.autoPublish, maxAutoRevisions: Number(f.maxAutoRevisions), minReviewScore: Number(f.minReviewScore) } }; state.brand = await api(e ? '/api/brands/' + e.id : '/api/brands', e ? 'PUT' : 'POST', body); state.brands = await api('/api/brands'); toast('Brand salvato'); });
}
async function accountForm(accountId) {
    const e = accountId ? await api('/api/accounts/' + accountId) : null, d = e?.data || { name: '', platform: 'instagram', transport: 'direct', targetId: '', options: { accountType: 'BUSINESS', login: 'facebook' }, enabled: true };
    form(e ? 'Configura canale' : 'Collega un canale', 'I segreti vengono cifrati nel backend. Nessun test di pubblicazione viene eseguito durante il salvataggio.', `${field('name', 'Nome leggibile dell’account', d.name, 'text', 'required')}<div class="form-row">${select('platform', 'Piattaforma', Object.entries(state.status.platforms).map(([k, c]) => ({ value: k, label: c.label })), d.platform)}${select('transport', 'Trasporto', ['direct', 'postiz'], d.transport)}</div><div class="callout" id="account-help">${esc(state.status.platforms[d.platform].notes)}</div>${field('targetId', 'ID destinazione / integrazione Postiz', d.targetId, 'text', 'required')}${area('credentials', e ? 'Nuove credenziali JSON (lascia vuoto per conservarle)' : 'Credenziali JSON (cifrate)', e ? '' : JSON.stringify({ accessToken: '' }, null, 2), 'code')}<div class="subtle" id="credential-help"></div><details open><summary>Opzioni del canale</summary>${area('options', 'Opzioni JSON pubbliche, senza segreti', JSON.stringify(d.options, null, 2), 'code')}<p class="footer-note">Telegram: approvalChatId e approvers {"TELEGRAM_USER_ID":"APP_USER_ID"}. Postiz: settings per il provider, con ID board/subreddit/canale quando richiesti.</p></details>${check('enabled', 'Account abilitato', d.enabled)}`, async (f) => {
        const body = { name: f.name, platform: f.platform, transport: f.transport, targetId: f.targetId, options: json(f.options), enabled: !!f.enabled, revision: e?.revision };
        if (f.credentials.trim())
            body.credentials = json(f.credentials);
        await api(e ? '/api/accounts/' + e.id : base() + '/accounts', e ? 'PUT' : 'POST', body);
        toast('Credenziali salvate. Collauda le autorizzazioni prima di pubblicare.');
    });
    const update = () => {
        const p = $('#f-platform').value, t = $('#f-transport').value, c = state.status.platforms[p];
        $('#account-help').textContent = c.notes;
        let example = { accessToken: 'TOKEN_UTENTE_AUTORIZZATO' };
        if (t === 'postiz')
            example = { apiKey: 'CHIAVE_POSTIZ', baseUrl: 'https://api.postiz.com/public/v1' };
        else if (p === 'telegram')
            example = { botToken: 'TOKEN_BOTFATHER', webhookSecret: 'SEGRETO_LUNGO_CASUALE' };
        else if (p === 'discord')
            example = { botToken: 'TOKEN_BOT_DISCORD' };
        else if (p === 'farcaster')
            example = { apiKey: 'CHIAVE_NEYNAR', signerUuid: 'SIGNER_APPROVATO' };
        else if (p === 'twitch')
            example = { accessToken: 'TOKEN_TWITCH', clientId: 'CLIENT_ID', senderId: 'ID_BOT' };
        else if (p === 'mastodon')
            example = { accessToken: 'TOKEN_UTENTE', instance: 'https://LA_TUA_ISTANZA' };
        else if (p === 'bluesky')
            example = { accessToken: 'ACCESS_JWT', did: 'did:plc:IDENTIFICATORE', pds: 'https://bsky.social' };
        else if (['whatsapp', 'messenger', 'instagram-dm'].includes(p))
            example = { accessToken: 'TOKEN_META', appSecret: 'APP_SECRET_META', webhookVerifyToken: 'SEGRETO_VERIFICA' };
        $('#credential-help').innerHTML = `Formato atteso: <pre>${esc(JSON.stringify(example, null, 2))}</pre>${!c.native.length && t === 'direct' ? '<b>Scegli Postiz: questo social non ha un client diretto in questa release.</b>' : ''}`;
    };
    $('#f-platform').onchange = update;
    $('#f-transport').onchange = update;
    update();
}
async function contentForm(contentId) {
    await loadCollections(['accounts', 'assets', 'campaigns']);
    if (!state.data.accounts.length) {
        toast('Collega prima un canale', true);
        return;
    }
    const e = contentId ? await api('/api/contents/' + contentId) : null, d = e?.data || { title: '', text: '', objective: '', hashtags: [], format: 'text', accountId: state.data.accounts[0].id, media: [], claims: [], sourceIds: [], options: { generateVisual: true, useAiBackground: false } };
    const medias = state.data.assets.map(a => ({ value: a.id, label: a.data.name + ' · ' + a.data.mime }));
    form(e ? 'Modifica contenuto' : 'Nuovo contenuto', 'Definisci un brief, scrivi manualmente o usa gli agenti. Salvare non pubblica.', `${field('title', 'Titolo / argomento del brief', d.title, 'text', 'required maxlength="300"')}<div class="form-row">${select('accountId', 'Canale di destinazione', state.data.accounts.map(a => ({ value: a.id, label: a.data.name + ' · ' + a.data.platform })), d.accountId)}${select('format', 'Formato', ['text', 'image', 'carousel', 'video', 'reel', 'story', 'message', 'template'], d.format)}</div>${area('objective', 'Obiettivo editoriale', d.objective)}${area('text', 'Testo / caption', d.text, '', 7)}${area('hashtags', 'Hashtag, uno per riga', d.hashtags.join('\n'), '', 2)}${select('campaignId', 'Campagna', [{ value: '', label: 'Nessuna campagna' }, ...state.data.campaigns.map(c => ({ value: c.id, label: c.data.name }))], d.campaignId || '')}<div class="field"><label for="f-mediaIds">Asset dalla libreria (Ctrl/Cmd per selezione multipla)</label><select id="f-mediaIds" name="mediaIds" multiple size="5">${medias.map(a => `<option value="${a.value}" ${d.media.some(m => m.id === a.value) ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select><small>I link esterni esistenti vengono mantenuti; per sostituirli usa le opzioni avanzate.</small></div><div class="form-row">${check('generateVisual', 'Genera visual con il template del brand', d.options.generateVisual !== false)}${check('useAiBackground', 'Genera anche lo sfondo con Gemini (API a consumo)', d.options.useAiBackground === true)}</div><div id="platform-fields"></div><details><summary>Fonti, claim e opzioni avanzate</summary><div class="form">${area('claims', 'Claim JSON con sourceIds dei frammenti', JSON.stringify(d.claims, null, 2), 'code')}${area('sourceIds', 'Source IDs, uno per riga', d.sourceIds.join('\n'), '', 2)}${area('options', 'Opzioni JSON del provider e della generazione', JSON.stringify(d.options, null, 2), 'code')}${area('externalMedia', 'Media esterni JSON [{url,mime,alt}]', JSON.stringify(d.media.filter(m => !m.id), null, 2), 'code')}</div></details>`, async (f, fd) => {
        const options = { ...json(f.options), generateVisual: !!f.generateVisual, useAiBackground: !!f.useAiBackground };
        const a = state.data.accounts.find(x => x.id === f.accountId);
        if (a.data.platform === 'tiktok')
            Object.assign(options, { privacyLevel: f.privacyLevel, brandContent: f.brandContent === 'yes', brandOrganic: f.brandOrganic === 'yes', allowComments: !!f.allowComments, allowDuet: !!f.allowDuet, allowStitch: !!f.allowStitch, isAigc: !!f.isAigc, consent: false });
        if (a.data.platform === 'youtube') {
            options.privacy = f.privacy;
            if (f.madeForKids)
                options.madeForKids = f.madeForKids === 'yes';
            else
                delete options.madeForKids;
        }
        if (['whatsapp', 'messenger', 'instagram-dm'].includes(a.data.platform))
            options.recipient = f.recipient;
        const media = [...fd.getAll('mediaIds').map(id => ({ id })), ...json(f.externalMedia || '[]')];
        const body = { title: f.title, text: f.text, objective: f.objective, hashtags: lines(f.hashtags), format: f.format, accountId: f.accountId, media, campaignId: f.campaignId, claims: json(f.claims || '[]'), sourceIds: lines(f.sourceIds), options, revision: e?.revision };
        const out = await api(e ? '/api/contents/' + e.id : base() + '/contents', e ? 'PUT' : 'POST', body);
        location.hash = 'content/' + out.id;
        toast('Bozza salvata. Approvazioni precedenti invalidate.');
    });
    const fields = () => {
        const a = state.data.accounts.find(x => x.id === $('#f-accountId').value), p = a.data.platform, o = d.options;
        let html = '';
        if (p === 'tiktok')
            html = `<div class="callout warning">TikTok: seleziona privacy e dichiarazioni. Il consenso riguarda la versione finale e verrà richiesto durante l’approvazione.</div>${select('privacyLevel', 'Privacy (nessuna scelta predefinita)', [{ value: '', label: 'Scegli esplicitamente' }, ...['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR']], o.privacyLevel || '', 'required')}<div class="form-row">${select('brandContent', 'Partnership a pagamento / branded content', [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Sì' }], o.brandContent ? 'yes' : 'no')}${select('brandOrganic', 'Promuove il proprio brand', [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Sì' }], o.brandOrganic ? 'yes' : 'no')}</div>${check('allowComments', 'Abilita commenti', o.allowComments)}${check('allowDuet', 'Abilita duet (video)', o.allowDuet)}${check('allowStitch', 'Abilita stitch (video)', o.allowStitch)}${check('isAigc', 'Contenuto generato con AI (video)', o.isAigc)}${a.data.transport === 'direct' ? button('Aggiorna opzioni creator', 'form-creator-info', 'small', `type="button" ${dataId(a.id)}`) : '<p class="footer-note">Con Postiz, controllare anche i requisiti del creator nella sua interfaccia.</p>'}`;
        else if (p === 'youtube')
            html = `<div class="form-row">${select('privacy', 'Visibilità', [{ value: '', label: 'Scegli' }, 'public', 'private', 'unlisted'], o.privacy || '', 'required')}${select('madeForKids', 'Destinato ai bambini', [{ value: '', label: 'Scegli' }, { value: 'yes', label: 'Sì' }, { value: 'no', label: 'No' }], typeof o.madeForKids === 'boolean' ? o.madeForKids ? 'yes' : 'no' : '', 'required')}</div>`;
        else if (['whatsapp', 'messenger', 'instagram-dm'].includes(p))
            html = field('recipient', 'ID destinatario / numero WhatsApp autorizzato', o.recipient || '', 'text', 'required') + '<p class="footer-note">Per template WhatsApp inserire options.template con name, language.code e componenti approvati.</p>';
        $('#platform-fields').innerHTML = html;
    };
    $('#f-accountId').onchange = fields;
    fields();
}
async function knowledgeForm(documentId) {
    const e = documentId ? await api('/api/knowledge/' + documentId) : null, d = e?.data || { title: '', text: '', type: 'knowledge', source: 'Documento fornito dal responsabile', platform: '*', roles: ['strategist', 'copywriter', 'creative', 'reviewer', 'analyst'], approved: false };
    form(e ? 'Modifica fonte' : 'Aggiungi una fonte', 'Carica testo verificato. I file MD/TXT/JSON vengono letti localmente dal browser.', `${field('title', 'Titolo del documento', d.title, 'text', 'required')}<div class="field"><label for="document-file">Importa testo da file</label><input id="document-file" type="file" accept=".md,.txt,.json,.csv"></div>${area('text', 'Testo del documento', d.text, '', 10)}<div class="form-row">${field('type', 'Categoria', d.type)}${field('platform', 'Filtro piattaforma (* = tutte)', d.platform)}</div>${field('source', 'Fonte / riferimento verificabile', d.source)}${field('roles', 'Ruoli autorizzati, separati da virgole', d.roles.join(', '))}<div class="form-row">${field('validFrom', 'Valido da (ISO con timezone)', d.validFrom || '')}${field('validUntil', 'Scade il (ISO con timezone)', d.validUntil || '')}</div>${may('approver') ? check('approved', 'Confermo la fonte e la abilito nel RAG', d.approved) : '<p class="subtle">La fonte sarà salvata come bozza e dovrà essere approvata.</p>'}`, async (f) => { await api(e ? '/api/knowledge/' + e.id : base() + '/knowledge', e ? 'PUT' : 'POST', { ...f, roles: f.roles.split(',').map(x => x.trim()), approved: !!f.approved, revision: e?.revision }); toast('Fonte indicizzata e salvata'); });
    $('#document-file').onchange = async (ev) => {
        const f = ev.target.files[0];
        if (!f)
            return;
        if (f.size > 1000000) {
            toast('File di testo massimo 1 MB', true);
            return;
        }
        $('#f-text').value = await f.text();
        if (!$('#f-title').value)
            $('#f-title').value = f.name;
    };
}
async function campaignForm(cid) { const e = cid ? await api('/api/campaigns/' + cid) : null, d = e?.data || { name: '', objective: '', brief: '', startAt: new Date().toISOString(), endAt: new Date(Date.now() + 30 * 86400000).toISOString(), active: true }; form(e ? 'Modifica campagna' : 'Nuova campagna', 'Intervalli ISO 8601 con timezone esplicita.', `${field('name', 'Nome campagna', d.name, 'text', 'required')}${area('objective', 'Obiettivo', d.objective)}${area('brief', 'Brief e vincoli', d.brief)}<div class="form-row">${field('startAt', 'Inizio (ISO)', d.startAt, 'text', 'required')}${field('endAt', 'Fine (ISO)', d.endAt, 'text', 'required')}</div>${check('active', 'Campagna abilitata', d.active)}`, async (f) => { await api(e ? '/api/campaigns/' + e.id : base() + '/campaigns', e ? 'PUT' : 'POST', { ...f, active: !!f.active, revision: e?.revision }); toast('Campagna salvata'); }); }
async function approvalForm(e) { form('Approva questa versione', `Versione ${e.revision}. L’approvazione non esegue l’invio: la programmazione è un’azione separata.`, `<div class="callout">${esc(e.data.title)} · ${esc(e.data.platform)}</div>${check('confirmed', 'Ho letto il testo finale e verificato le affermazioni, le fonti e la destinazione.', false, true)}${e.data.media.length ? check('visualConfirmed', 'Ho aperto e verificato immagini o video finali, inclusi testo, logo e contenuti audio.', false, true) : ''}${e.data.platform === 'tiktok' ? check('consent', 'Acconsento alla pubblicazione di questa specifica versione su TikTok con la privacy e le dichiarazioni selezionate.', false, true) : ''}${area('reason', 'Motivazione di deroga (obbligatoria se review insufficiente)', '', '', 3)}`, async (f) => { await api('/api/contents/' + e.id + '/approve', 'POST', { revision: e.revision, reason: f.reason, consent: !!f.consent, visualConfirmed: !!f.visualConfirmed }); toast('Versione approvata'); }, 'Approva versione'); }
async function scheduleForm(e) { const local = new Date(Date.now() + 3600000); local.setMinutes(local.getMinutes() - local.getTimezoneOffset()); form('Programma pubblicazione', `Orario locale del browser: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Il server salva in UTC.`, `${field('at', 'Data e ora', local.toISOString().slice(0, 16), 'datetime-local', 'required')}${check('confirmed', 'Confermo l’invio del contenuto approvato all’account selezionato.', false, true)}`, async (f) => { await api('/api/contents/' + e.id + '/schedule', 'POST', { revision: e.revision, at: new Date(f.at).toISOString() }); toast('Pubblicazione programmata'); }, 'Programma'); }
async function renderForm() { await loadCollections(['assets']); form('Crea visual del brand', 'Template JPEG con headline, colori e logo. Lo sfondo AI si abilita nella generazione di un contenuto.', `${field('headline', 'Headline', '', 'text', 'required maxlength="140"')}${area('body', 'Testo breve', '', '', 3)}<div class="form-row">${select('width', 'Larghezza', ['1080', '1200', '720'], '1080')}${select('height', 'Altezza', ['1350', '1920', '1080', '720'], '1350')}</div>${select('backgroundId', 'Sfondo dalla libreria', [{ value: '', label: 'Colore del brand' }, ...state.data.assets.filter(x => x.data.mime.startsWith('image/')).map(x => ({ value: x.id, label: x.data.name }))])}`, async (f) => { await api(base() + '/render', 'POST', { headline: f.headline, body: f.body, options: { width: Number(f.width), height: Number(f.height), backgroundId: f.backgroundId || undefined } }); toast('Visual creato nella libreria'); }, 'Renderizza'); }
async function videoForm() { await loadCollections(['assets']); const imgs = state.data.assets.filter(x => x.data.mime.startsWith('image/')); form('Video editoriale da slide', 'Ogni slide dura 4 secondi. Uscita MP4 H.264 verticale 1080×1920, con audio opzionale.', `<div class="field"><label for="video-slides">Scegli da 1 a 10 immagini (ordine della libreria)</label><select id="video-slides" name="slides" multiple size="8" required>${imgs.map(x => `<option value="${x.id}">${esc(x.data.name)}</option>`).join('')}</select></div>${select('audioId', 'Audio della libreria', [{ value: '', label: 'Traccia silenziosa' }, ...state.data.assets.filter(x => x.data.mime.startsWith('audio/')).map(x => ({ value: x.id, label: x.data.name }))])}`, async (f, fd) => { await api(base() + '/video', 'POST', { assetIds: fd.getAll('slides'), audioId: f.audioId || undefined }); toast('Video creato nella libreria'); }, 'Crea video'); }
async function userForm() { form('Aggiungi utente al workspace', 'Gli utenti appartengono al workspace selezionato. Non condividere password tramite canali pubblici.', `${field('email', 'Email', '', 'email', 'required')}${field('password', 'Password iniziale (minimo 16 caratteri)', '', 'password', 'required minlength="16" autocomplete="new-password"')}${select('role', 'Ruolo', ['viewer', 'editor', 'approver', 'admin'], 'editor')}`, async (f) => { await api('/api/admin/users', 'POST', f); toast('Utente aggiunto'); }); }
async function tokenForm() { form('Token per MCP o automazioni', 'Il token sarà mostrato una sola volta e potrà accedere soltanto a questo brand.', `${field('name', 'Nome integrazione', '', 'text', 'required')}${select('role', 'Permessi', ['viewer', 'editor'], 'viewer')}${field('days', 'Scadenza in giorni', 30, 'number', 'min="1" max="365"')}`, async (f) => { const r = await api(base() + '/tokens', 'POST', { ...f, days: Number(f.days) }); modal('Conserva il token', 'Non verrà mostrato di nuovo. Non inserirlo in prompt, repository o messaggi.', `${area('token', 'Token API', r.token, 'code', 3)}<p class="subtle">Endpoint MCP: <span class="help-key">${esc(state.status.baseUrl)}/mcp</span></p>`); return false; }, 'Crea token'); }
async function contactForm() { await loadCollections(['accounts']); form('Registra contatto autorizzato', 'La finestra di risposta viene aggiornata esclusivamente da messaggi in ingresso verificati.', `${select('accountId', 'Account', state.data.accounts.map(a => ({ value: a.id, label: a.data.name + ' · ' + a.data.platform })))}${field('recipient', 'Numero / ID destinatario', '', 'text', 'required')}${field('name', 'Nome contatto', '', 'text', 'required')}${check('optIn', 'Consenso disponibile per inviare template WhatsApp')}${area('consentEvidence', 'Evidenza del consenso (fonte, data, finalità)')}`, async (f) => { await api(base() + '/contacts', 'POST', { ...f, optIn: !!f.optIn }); toast('Contatto registrato'); }); }
async function promptForm() { const contracts = await api('/api/prompts'); await loadCollections(['prompts']); const defaults = contracts.strategist, existing = state.data.prompts.find(x => x.data.role === 'strategist'); form('Prompt versionato', 'Il contratto JSON e i controlli di sicurezza del backend rimangono obbligatori.', `${select('role', 'Agente', Object.keys(contracts), 'strategist')}${field('version', 'Versione univoca', existing?.data.version || defaults.version + '-custom')}${area('system', 'Istruzione di ruolo', existing?.data.system || defaults.system, '', 12)}`, async (f) => { const old = state.data.prompts.find(x => x.data.role === f.role); await api(base() + '/prompts', 'POST', { ...f, revision: old?.revision }); toast('Prompt salvato'); }); $('#f-role').onchange = () => { const role = $('#f-role').value, old = state.data.prompts.find(x => x.data.role === role), c = contracts[role]; $('#f-version').value = old?.data.version || c.version + '-custom'; $('#f-system').value = old?.data.system || c.system; }; }
function download(name, mime, body) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: mime })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
async function legacyAction(name, idValue, buttonEl) {
    if (name === 'close-modal') {
        closeModal();
        return;
    }
    if (name === 'menu') {
        $('.shell').classList.toggle('menu-open');
        return;
    }
    if (name === 'logout') {
        await api('/api/logout', 'POST', {});
        state.brand = null;
        loginView();
        return;
    }
    if (name === 'new-brand')
        return brandForm();
    if (name === 'edit-brand')
        return brandForm(true);
    if (name === 'new-account')
        return accountForm();
    if (name === 'edit-account')
        return accountForm(idValue);
    if (name === 'new-content')
        return contentForm();
    if (name === 'edit-content')
        return contentForm(idValue);
    if (name === 'new-knowledge')
        return knowledgeForm();
    if (name === 'edit-knowledge')
        return knowledgeForm(idValue);
    if (name === 'new-campaign')
        return campaignForm();
    if (name === 'edit-campaign')
        return campaignForm(idValue);
    if (name === 'render')
        return renderForm();
    if (name === 'video')
        return videoForm();
    if (name === 'new-user')
        return userForm();
    if (name === 'new-token')
        return tokenForm();
    if (name === 'new-contact')
        return contactForm();
    if (name === 'prompts')
        return promptForm();
    if (['generate', 'generate-copy', 'generate-visual', 'review', 'approve', 'schedule', 'cancel-content', 'reject-content', 'reconcile', 'adapt', 'inspect-content'].includes(name)) {
        const e = await api('/api/contents/' + idValue);
        if (name.startsWith('generate')) {
            await api('/api/contents/' + e.id + '/generate', 'POST', { revision: e.revision, mode: name === 'generate-copy' ? 'copy' : name === 'generate-visual' ? 'visual' : 'all' });
            toast('Generazione accodata');
        }
        if (name === 'review') {
            await api('/api/contents/' + e.id + '/review', 'POST', {});
            toast('Revisione completata');
        }
        if (name === 'approve')
            return approvalForm(e);
        if (name === 'schedule')
            return scheduleForm(e);
        if (name === 'cancel-content') {
            await api('/api/contents/' + e.id + '/cancel', 'POST', { revision: e.revision });
            toast('Programmazione annullata');
        }
        if (name === 'reject-content')
            return form('Rifiuta contenuto', 'La bozza resterà disponibile per le modifiche.', area('reason', 'Motivo del rifiuto'), async (f) => { await api('/api/contents/' + e.id + '/reject', 'POST', { revision: e.revision, reason: f.reason }); toast('Contenuto rifiutato'); }, 'Rifiuta');
        if (name === 'reconcile')
            return form('Riconcilia esito esterno', 'Controlla prima il social. Non riprovare un invio incerto senza verificare se è già avvenuto.', `${select('published', 'Esito verificato', [{ value: 'yes', label: 'È stato pubblicato / inviato' }, { value: 'no', label: 'Ho verificato: non è stato pubblicato' }])}${field('externalId', 'ID effettivo del post / messaggio')}${field('url', 'Link alla pubblicazione')}${area('evidence', 'Evidenza e modalità della verifica')}${check('confirmed', 'Ho effettuato la verifica direttamente sul provider.', false, true)}`, async (f) => { await api('/api/contents/' + e.id + '/reconcile', 'POST', { ...f, revision: e.revision, published: f.published === 'yes' }); toast('Esito riconciliato'); }, 'Registra esito');
        if (name === 'adapt') {
            await loadCollections(['accounts']);
            return form('Adatta ad altri canali', 'Crea copie separate da revisionare. La generazione “Solo copy” adatta il tono e la lunghezza.', `<div class="field"><label>Destinazioni</label><select name="accountIds" multiple size="7" required>${state.data.accounts.filter(a => a.id !== e.data.accountId).map(a => `<option value="${a.id}">${esc(a.data.name + ' · ' + a.data.platform)}</option>`).join('')}</select></div>`, async (f, fd) => { await api('/api/contents/' + e.id + '/adapt', 'POST', { accountIds: fd.getAll('accountIds') }); toast('Bozze adattate create'); }, 'Crea bozze');
        }
        if (name === 'inspect-content') {
            const docs = await Promise.all([...new Set(e.data.sourceIds.map(s => s.split(':')[0]))].map(id => api('/api/knowledge/' + id).then(x => ({ id: x.id, title: x.data.title, source: x.data.source, text: x.data.text })).catch(() => ({ id, status: 'non più disponibile' }))));
            return info('Fonti, claim e versioni', { sources: docs, claims: e.data.claims, creative: e.data.creative, approval: e.data.approval, history: e.history });
        }
        await refresh();
        return;
    }
    if (name === 'approve-knowledge') {
        const e = await api('/api/knowledge/' + idValue);
        await api('/api/knowledge/' + e.id + '/approve', 'POST', { revision: e.revision, approved: !e.data.approved });
        toast(e.data.approved ? 'Approvazione revocata' : 'Fonte approvata');
    }
    else if (name === 'delete-knowledge') {
        return form('Elimina fonte', 'Le approvazioni che dipendono da questa fonte non saranno più valide.', check('confirmed', 'Confermo l’eliminazione del documento dal RAG.', false, true), async () => { await api('/api/knowledge/' + idValue, 'DELETE'); toast('Fonte eliminata'); }, 'Elimina');
    }
    else if (name === 'test-rag') {
        const r = await api(base() + '/rag', 'POST', { query: $('#rag-query').value, role: $('#rag-role').value, platform: '*' });
        $('#rag-results').innerHTML = `<div class="panel section-space"><div class="panel-head"><h2>${r.hits.length} risultati · ${esc(r.mode)}</h2></div><div class="panel-body">${r.hits.map(x => `<h3>${esc(x.title)} <span class="badge">score ${x.score.toFixed(3)}</span></h3><p class="subtle preview">${esc(x.text)}</p><p class="id-code">${esc(x.id)} · ${esc(x.source)}</p>`).join('') || '<p class="subtle">Nessun frammento approvato pertinente per il ruolo selezionato.</p>'}</div></div>`;
        return;
    }
    else if (name === 'creator-info') {
        return info('TikTok creator info', await api('/api/accounts/' + idValue + '/creator-info'));
    }
    else if (name === 'form-creator-info') {
        const r = await api('/api/accounts/' + idValue + '/creator-info'), previous = $('#f-privacyLevel').value;
        $('#f-privacyLevel').innerHTML = `<option value="">Scegli esplicitamente</option>${(r.privacy_level_options || []).map(x => `<option value="${esc(x)}" ${x === previous ? 'selected' : ''}>${esc(x)}</option>`).join('')}`;
        if (r.comment_disabled) {
            $('input[name=allowComments]').checked = false;
            $('input[name=allowComments]').disabled = true;
        }
        if (r.duet_disabled) {
            $('input[name=allowDuet]').checked = false;
            $('input[name=allowDuet]').disabled = true;
        }
        if (r.stitch_disabled) {
            $('input[name=allowStitch]').checked = false;
            $('input[name=allowStitch]').disabled = true;
        }
        toast('Creator: ' + (r.creator_nickname || r.creator_username || 'verificato'));
        return;
    }
    else if (name === 'account-connect') {
        const r = await api('/api/accounts/' + idValue + '/connect', 'POST', {});
        modal('Autorizza il canale', 'Completa OAuth in Postiz, poi associa l’ID dell’integrazione restituita al brand.', `<a href="${safeUrl(r.url)}" class="btn primary" target="_blank" rel="noopener noreferrer">Apri autorizzazione OAuth ↗</a>`);
        return;
    }
    else if (name === 'postiz-integrations')
        return info('Integrazioni disponibili in Postiz', await api('/api/accounts/' + idValue + '/postiz-integrations'));
    else if (name === 'install-webhook') {
        await api('/api/accounts/' + idValue + '/install-webhook', 'POST', {});
        toast('Webhook Telegram registrato');
    }
    else if (name === 'upload') {
        $('#media-upload').click();
        return;
    }
    else if (name === 'copy-id') {
        await navigator.clipboard.writeText(idValue);
        toast('ID copiato');
        return;
    }
    else if (name === 'plan')
        return form('Proponi il piano settimanale', 'Il planner crea idee, non autorizzazioni di pubblicazione.', area('objective', 'Obiettivo della settimana', state.brand.data.objectives.join('\n')), async (f) => { await api(base() + '/plan', 'POST', f); toast('Pianificazione accodata'); }, 'Genera piano');
    else if (name === 'plan-drafts') {
        await api('/api/plans/' + idValue + '/drafts', 'POST', {});
        toast('Bozze create dal piano');
    }
    else if (name === 'prev-month' || name === 'next-month' || name === 'today-month') {
        if (name === 'today-month')
            state.month = new Date();
        else
            state.month = new Date(state.month.getFullYear(), state.month.getMonth() + (name === 'next-month' ? 1 : -1), 1);
    }
    else if (name === 'export-calendar') {
        const q = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'), dt = s => new Date(s).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z');
        const rows = state.data.contents.filter(c => c.data.scheduleAt && ['SCHEDULED', 'PUBLISHED', 'PROCESSING'].includes(c.data.status));
        const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AIR3//Social Studio//IT', ...rows.flatMap(c => ['BEGIN:VEVENT', 'UID:' + c.id + '@air3-social-studio', 'DTSTAMP:' + dt(new Date()), 'DTSTART:' + dt(c.data.scheduleAt), 'SUMMARY:' + q(c.data.title), 'DESCRIPTION:' + q(c.data.platform + ' · ' + c.data.status), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
        download('calendario-editoriale.ics', 'text/calendar', body);
        return;
    }
    else if (name === 'reply-draft') {
        const e = await api('/api/inbox/' + idValue + '/reply-draft', 'POST', {});
        location.hash = 'content/' + e.id;
        toast('Bozza di risposta creata');
    }
    else if (name === 'close-inbox') {
        const e = await api('/api/inbox/' + idValue);
        await api('/api/inbox/' + idValue + '/close', 'POST', { revision: e.revision });
        toast('Conversazione chiusa');
    }
    else if (name === 'analyze') {
        await api(base() + '/analyze', 'POST', {});
        toast('Analisi accodata');
    }
    else if (name === 'accept-insight') {
        const e = await api('/api/insights/' + idValue);
        await api('/api/insights/' + idValue + '/accept', 'POST', { revision: e.revision });
        toast('Insight inserito nella memoria approvata');
    }
    else if (name === 'inspect-insight')
        return info('Insight e riferimenti', await api('/api/insights/' + idValue));
    else if (name === 'inspect-execution')
        return info('Esecuzione agente', await api('/api/executions/' + idValue));
    else if (name === 'collect-metrics') {
        await api('/api/contents/' + idValue + '/collect-metrics', 'POST', {});
        toast('Raccolta metriche accodata');
    }
    else if (name === 'import-metrics') {
        await loadCollections(['contents']);
        return form('Importa osservazione metrica', 'Registra valori reali e la relativa fonte. Non usare stime come se fossero dati del provider.', `${select('contentId', 'Contenuto pubblicato', state.data.contents.filter(x => x.data.status === 'PUBLISHED').map(x => ({ value: x.id, label: x.data.title })))}${area('values', 'Valori JSON, ad esempio {"likes":42,"clicks":7}', '{}', 'code')}${field('source', 'Fonte / esportazione da cui provengono i valori', '', 'text', 'required')}${field('collectedAt', 'Data osservazione ISO', new Date().toISOString(), 'text', 'required')}`, async (f) => { await api('/api/contents/' + f.contentId + '/metrics', 'POST', { values: json(f.values), source: f.source, collectedAt: f.collectedAt }); toast('Osservazione importata'); });
    }
    else if (name === 'show-audit')
        return info('Audit del brand', await api(base() + '/audit'));
    else if (name === 'users')
        return info('Utenti nel workspace', await api('/api/admin/users'));
    else if (name === 'new-workspace')
        return form('Nuovo workspace', 'Crea un ambiente separato con te come amministratore.', field('name', 'Nome workspace', '', 'text', 'required'), async (f) => { const r = await api('/api/admin/workspaces', 'POST', f); state.workspace = r.id; state.me = await api('/api/me'); state.brand = null; state.brands = await api('/api/brands'); toast('Workspace creato'); });
    else if (name === 'tokens') {
        const rows = await api(base() + '/tokens');
        modal('Token di accesso', 'Nessun token ha permessi di approvazione. Revoca quelli inutilizzati.', `<div class="actions">${button('+ Nuovo token', 'new-token', 'primary')}</div><div class="section-space">${rows.map(t => `<div class="step"><div><h3>${esc(t.name)} · ${esc(t.role)}</h3><p>Scadenza ${time(t.expires)}</p>${button('Revoca', 'revoke-token', 'small danger', dataId(t.id))}</div></div>`).join('') || '<p class="subtle">Nessun token attivo.</p>'}</div>`);
        return;
    }
    else if (name === 'revoke-token') {
        await api(base() + '/tokens/' + idValue, 'DELETE');
        toast('Token revocato');
        closeModal();
    }
    else if (name === 'password')
        return form('Cambia password', 'Tutte le sessioni verranno chiuse dopo il cambio.', `${field('current', 'Password attuale', '', 'password', 'required autocomplete="current-password"')}${field('password', 'Nuova password (minimo 16 caratteri)', '', 'password', 'required minlength="16" autocomplete="new-password"')}`, async (f) => { await api('/api/password', 'POST', f); loginView(); toast('Password aggiornata. Accedi di nuovo.'); });
    await refresh();
}
// Single delegated listener, with HTML escaped at every data boundary.
document.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled)
        return;
    ev.preventDefault();
    const name = el.dataset.action;
    try {
        el.disabled = true;
        state.busy = true;
        await action(name, el.dataset.id, el);
    }
    catch (e) {
        toast(e.message, true);
    }
    finally {
        el.disabled = false;
        state.busy = false;
    }
});
document.addEventListener('input', ev => {
    if (['content-search', 'status-filter'].includes(ev.target.id)) {
        const query = ($('#content-search')?.value || '').toLowerCase(), filter = $('#status-filter')?.value || '';
        $('#content-table').innerHTML = postsTable(state.data.contents.filter(x => (!filter || x.data.status === filter) && (!query || (x.data.title + ' ' + x.data.text).toLowerCase().includes(query))));
    }
});
document.addEventListener('change', async (ev) => {
    if (ev.target.id === 'f-workspace') {
        state.workspace = ev.target.value;
        state.me = await api('/api/me');
        state.brand = null;
        await init();
    }
    if (ev.target.id === 'media-upload') {
        const files = [...ev.target.files];
        if (files.length > 10) {
            toast('Carica al massimo 10 file per volta', true);
            return;
        }
        state.busy = true;
        try {
            for (const f of files) {
                if (f.size > 128 * 1024 * 1024)
                    throw new Error('File oltre 128 MB: ' + f.name);
                await api(base() + '/assets?' + new URLSearchParams({ name: f.name }), 'POST', f, { 'Content-Type': f.type });
                toast('Caricato: ' + f.name);
            }
            await refresh();
        }
        catch (e) {
            toast(e.message, true);
        }
        finally {
            state.busy = false;
        }
    }
});
window.addEventListener('hashchange', () => {
    if (state.me)
        refresh().catch(e => toast(e.message, true));
});
// Do not replace forms or selections while a user is editing.
setInterval(() => {
    if (state.me && !state.busy && !$('#dialog').open && ['overview', 'jobs'].includes(state.view))
        refresh().catch(() => { });
    if (state.me && !state.busy && !$('#dialog').open && state.view.startsWith('content/') && ['GENERATING', 'PROCESSING', 'PUBLISHING', 'SCHEDULED'].includes(state.data.current?.data.status))
        refresh().catch(() => { });
}, 7000);
// ── Product experience, account onboarding and installation administration ──
let publicConfig = { name: 'AIR3 Social Studio', google: true, registration: false, emailEnabled: false, supportEmail: '0xfunboy@gmail.com', privacyUrl: '/privacy', termsUrl: '/terms' };
let onboarding = { step: 0, completed: false };
let oauthApps = [];
let globalOAuthApps = [];
let installation = null;
let connections = [];
let teamData = [];
let invitationData = [];
let siteData = null;
let installGroup = 'instance';
let rendering = 0;
const groups = { instance: 'Installazione', models: 'Modelli AI', login: 'Accesso Google', email: 'Email', platforms: 'API & rete', oauth: 'App social condivise' };
const friendly = { BASE_URL: 'URL pubblica', SITE_NAME: 'Nome del prodotto', SUPPORT_EMAIL: 'Email di supporto', PRIVACY_URL: 'Informativa privacy', TERMS_URL: 'Termini di servizio', ALLOW_REGISTRATION: 'Registrazione pubblica', LLM_PROVIDER: 'Provider AI', LLM_BASE_URL: 'Endpoint del modello', LLM_MODEL: 'Modello principale', LLM_API_KEY: 'Chiave API LLM', GEMINI_API_KEY: 'Chiave Gemini immagini', GEMINI_IMAGE_MODEL: 'Modello per immagini', EMBEDDING_BASE_URL: 'Endpoint embeddings', EMBEDDING_MODEL: 'Modello embeddings', EMBEDDING_API_KEY: 'Chiave embeddings', GOOGLE_CLIENT_ID: 'Google Client ID', GOOGLE_CLIENT_SECRET: 'Google Client secret', RESEND_API_KEY: 'Resend API key', MAIL_FROM: 'Email mittente verificata', META_GRAPH_VERSION: 'Versione Meta Graph', LINKEDIN_VERSION: 'Versione LinkedIn', OUTBOUND_ORIGINS: 'Origin esterne autorizzate' };
const theme = () => document.documentElement.dataset.theme || 'light';
function applyTheme(t) { document.documentElement.dataset.theme = t; try {
    localStorage.setItem('air3:theme', t);
}
catch { } document.querySelectorAll('[data-action="theme"]').forEach(b => { b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', t === 'dark' ? 'Attiva tema carta chiara' : 'Attiva tema grafite scura'); }); }
function themeButton() { return button(icon(theme() === 'dark' ? 'sun' : 'moon'), 'theme', 'ghost icon-btn', 'aria-label="Cambia tema" title="Carta / grafite"'); }
function downloadText(filename, content, type = 'text/plain') { const u = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = u; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
function pageTitle(s) { document.title = s + ' · AIR3 Social Studio'; }
function publicHeader() { return `<header class="public-nav"><a class="brand-home" href="/" aria-label="AIR3 Social Studio, homepage">${wordmark()}</a><nav aria-label="${t('publicNav')}"><a href="/#product">${t('navProduct')}</a><a href="/#workflow">${t('navWorkflow')}</a><a href="/#integrations">${t('navIntegrations')}</a><a href="/#privacy-transparency">${t('navPrivacy')}</a></nav><div class="actions">${langButton()}${themeButton()}<a href="/login" class="nav-login">${t('navLogin')}</a><a class="btn primary" href="/app">${t('navOpenStudio')} ${icon('arrow')}</a></div></header>`; }
function publicFooter() { return `<footer class="public-footer"><a href="/" class="brand-home">${wordmark()}</a><div><a href="/privacy">${t('privacy')}</a><a href="/terms">${t('terms')}</a><a href="mailto:0xfunboy@gmail.com">${t('support')} (0xfunboy@gmail.com)</a><span>© ${new Date().getFullYear()} AIR3 Social Studio · eeess.cyou</span></div><span class="handwritten">${t('footerIdeas')}<br>${t('footerIdeas2')} ↗</span></footer>`; }
function landing() { pageTitle(currentLang === 'it' ? 'Il tuo studio creativo, connesso' : 'Your connected creative studio'); $('#app').innerHTML = `<div class="public-site">${publicHeader()}<main id="main-content"><section class="hero"><div class="hero-copy"><div class="handwritten upper-note">${t('heroNote')}<span class="pencil-stroke"></span></div><h1>${t('heroH1')}</h1><p>${t('heroDesc')}</p><div class="hero-actions"><a class="btn primary large" href="/app">${t('heroEnter')} ${icon('arrow')}</a><a class="btn large" href="#workflow">${icon('eye')} ${t('heroExplore')}</a></div><div class="trust-note">${icon('admin')} ${t('heroTrust')}</div></div>${hubArt()}</section><section class="platform-strip" id="integrations"><div class="eyebrow">${t('convEyebrow')}</div><div class="social-strip">${['instagram', 'facebook', 'whatsapp', 'threads', 'tiktok', 'x', 'linkedin', 'telegram', 'youtube', 'pinterest'].map(p => `<span>${socialMark(p)}${esc(({ instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', threads: 'Threads', tiktok: 'TikTok', x: 'X', linkedin: 'LinkedIn', telegram: 'Telegram', youtube: 'YouTube', pinterest: 'Pinterest' })[p])}</span>`).join('')}</div><p class="microcopy">${t('convMicro')}</p></section><section class="feature-grid" id="product">${(currentLang === 'it' ? [['spark', 'violet', 'Idee con un contesto', 'Agenti specializzati lavorano sulle fonti approvate, sul tono e sugli obiettivi del tuo brand.'], ['calendar', 'blue', 'Una squadra allineata', 'Bozze, revisioni e un calendario condiviso. Ogni versione ha una storia e un responsabile.'], ['send', 'teal', 'Ogni canale, al suo posto', 'Adatta i contenuti alle piattaforme e programma solo ciò che è stato approvato.'], ['analytics', 'amber', 'Risultati, non intuizioni', 'Raccogli le metriche disponibili e trasforma i dati verificati in indicazioni editoriali.'], ['team', 'coral', 'Più brand. Meno caos.', 'Workspace separati, ruoli espliciti e credenziali cifrate. Nessuna voce si mescola alle altre.']] : [['spark', 'violet', 'Context-aware ideas', 'Specialized agents operate on approved knowledge, tone, and brand objectives.'], ['calendar', 'blue', 'An aligned team', 'Drafts, reviews, and a shared calendar. Every version has clear history and ownership.'], ['send', 'teal', 'Every channel in place', 'Adapt content to platforms and publish only what has been formally approved.'], ['analytics', 'amber', 'Results, not guesswork', 'Aggregate metrics and convert verified performance into editorial guidance.'], ['team', 'coral', 'Multiple brands, zero chaos', 'Isolated workspaces, explicit roles, and encrypted secrets. No cross-brand voice mixing.']]).map(([i, c, t, d]) => `<article class="feature-card"><span class="feature-icon tint-${c}">${icon(i)}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</section><section class="workflow-section" id="workflow"><div><span class="handwritten">${t('wfOver')}<span class="pencil-stroke"></span></span><h2>${t('wfH2')}</h2><p>${t('wfDesc')}</p><a class="btn primary" href="/app#setup">${t('wfBtn')} ${icon('arrow')}</a></div><div class="workflow-board"><div class="board-top"><span class="eyebrow">${t('wfBoardEyebrow')}</span><span class="badge">${t('wfBoardBadge')}</span></div>${(currentLang === 'it' ? [['01', 'knowledge', 'La tua conoscenza', 'Linee guida, prodotti, esempi e fonti approvate.'], ['02', 'spark', 'Il lavoro degli agenti', 'Strategia, copy e visual con contesto specifico.'], ['03', 'admin', 'La tua approvazione', 'Controlli automatici, revisione umana e versioni.'], ['04', 'send', 'Pubblicazione e feedback', 'Invii tracciati e insight basati sui dati raccolti.']] : [['01', 'knowledge', 'Your Knowledge', 'Guidelines, products, examples, and approved sources.'], ['02', 'spark', 'Agent Execution', 'Strategy, copy, and visuals tailored to brand context.'], ['03', 'admin', 'Human Approvals', 'Automated guardrails, human review, and immutable audit logs.'], ['04', 'send', 'Publishing & Insights', 'Tracked dispatching and insights grounded in collected performance.']]).map(([n, i, t, d]) => `<div class="workflow-line"><span class="workflow-number">${n}</span><span class="feature-icon tint-teal">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div>${icon('arrow')}</div>`).join('')}</div></section><section class="transparency-section" id="privacy-transparency"><div class="transparency-header"><div class="eyebrow">${t('transEyebrow')}</div><h2>${t('transH2')}</h2><p>${t('transDesc')}</p></div><div class="transparency-grid"><article class="transparency-card"><span class="feature-icon tint-teal">${icon('lock')}</span><h3>${t('transCard1Title')}</h3><p>${t('transCard1Desc')}</p></article><article class="transparency-card"><span class="feature-icon tint-blue">${icon('admin')}</span><h3>${t('transCard2Title')}</h3><p>${t('transCard2Desc')}</p></article><article class="transparency-card"><span class="feature-icon tint-violet">${icon('spark')}</span><h3>${t('transCard3Title')}</h3><p>${t('transCard3Desc')}</p></article><article class="transparency-card"><span class="feature-icon tint-coral">${icon('check')}</span><h3>${t('transCard4Title')}</h3><p>${t('transCard4Desc')}</p></article></div><div class="transparency-actions"><a class="btn primary" href="/privacy">${t('transBtnPrivacy')} ${icon('arrow')}</a><a class="btn" href="/terms">${t('transBtnTerms')}</a><a class="btn ghost" href="mailto:0xfunboy@gmail.com">${t('transBtnContact')} (0xfunboy@gmail.com)</a></div></section><section class="closing-note"><div class="handwritten">${t('footerChannel')}</div><h2>${t('closingH2')}</h2><p>${t('closingDesc')}</p><a class="btn primary large" href="/app">${t('closingBtn')} ${icon('arrow')}</a></section></main>${publicFooter()}</div>`; }

function authLayout(title, subtitle, inside) { pageTitle(title); $('#app').innerHTML = `<div class="auth-page"><header class="auth-nav"><a href="/" class="brand-home">${wordmark()}</a><div style="display:flex;gap:6px;align-items:center;">${langButton()}${themeButton()}</div></header><main class="auth-grid" id="main-content"><section class="auth-story"><span class="handwritten upper-note">${t('authNote')}</span><h1>${t('authH1')}</h1><p>${t('authDesc')}</p>${hubArt()}<div class="auth-benefits">${[['admin', currentLang === 'it' ? 'Controllo editoriale' : 'Editorial Control', currentLang === 'it' ? 'Approvazioni e versioni.' : 'Approvals and versions.'], ['lock', currentLang === 'it' ? 'Credenziali cifrate' : 'Encrypted Credentials', currentLang === 'it' ? 'Segreti solo lato server.' : 'Server-side secrets only.'], ['team', currentLang === 'it' ? 'Workspace separati' : 'Separate Workspaces', currentLang === 'it' ? 'Ogni brand, la sua voce.' : 'Every brand, its voice.']].map(([i, t, d]) => `<div>${icon(i)}<b>${t}</b><small>${d}</small></div>`).join('')}</div></section><section class="auth-card"><span class="handwritten auth-margin">${t('authMargin')} ↗</span><div class="auth-brand">${wordmark()}</div><h2>${esc(title)}</h2><p class="subtle auth-subtitle">${esc(subtitle)}</p>${inside}</section></main>${publicFooter()}</div>`; }
function authFormBind(fn) { $('#auth-form').onsubmit = async (ev) => { ev.preventDefault(); const f = ev.currentTarget, b = f.querySelector('[type="submit"]'); b.disabled = true; $('#auth-error').textContent = ''; try {
    await fn(Object.fromEntries(new FormData(f)), f);
}
catch (e) {
    $('#auth-error').textContent = e.message;
}
finally {
    b.disabled = false;
} }; }
const authError = '<div class="form-error" id="auth-error" role="alert"></div>';
function loginView() { state.me = null; if (location.pathname === '/app')
    history.replaceState({}, '', '/login'); const err = new URLSearchParams(location.search).get('error'); authLayout(t('welcomeBack'), t('signInSub'), `<form id="auth-form" class="form">${field('email', 'Email', '', 'email', 'required autocomplete="username"')}${field('password', 'Password', '', 'password', 'required autocomplete="current-password"')}<div class="login-links"><label class="check"><input type="checkbox" data-password-toggle>${t('showPw')}</label><a href="/forgot">${t('forgotPw')}</a></div>${authError}<button class="btn primary full large" type="submit">${t('enterStudio')} ${icon('arrow')}</button></form><div class="divider"><span>${t('orDivider')}</span></div>${button(googleMark() + ' ' + t('googleBtn'), 'google-login', 'full google-btn', !publicConfig.google ? 'disabled title="' + esc(t('googleDisabledTitle')) + '"' : '')}<p class="microcopy">${publicConfig.google ? t('googleDescOn') : t('googleDescOff')}</p><p class="auth-bottom">${publicConfig.registration ? '<a href="/register">' + t('regOpen') + '</a>' : t('regInvite')}</p><p class="microcopy"><a href="/privacy">' + t('privacy') + '</a> · <a href="/terms">' + t('terms') + '</a></p>`); if (err)
    $('#auth-error').textContent = oauthError(err); authFormBind(async (f) => { const r = await api('/api/login', 'POST', f); state.csrf = r.csrf; state.workspace = r.workspaces[0]?.id || ''; state.me = await api('/api/me'); location.assign('/app'); }); }
function oauthError(code) { return ({ GOOGLE_LINK_REQUIRED: 'Esiste già un account con questa email. Accedi con password e collega Google dalle impostazioni.', GOOGLE_NOT_CONFIGURED: 'Google non configurato dal gestore.', OAUTH_DENIED: 'Autorizzazione non concessa. Nessun account è stato collegato.', OAUTH_SCOPE: 'Il provider non ha concesso tutti i permessi richiesti.', REGISTRATION_CLOSED: 'Account Google non collegato. Richiedi un invito, accedi e collega Google dalle impostazioni.', ACCOUNT_EXISTS: 'Questo indirizzo ha già un account. Accedi con la password e collega Google da Impostazioni.', GOOGLE_DISABLED: 'L’accesso Google non è ancora configurato.', OAUTH_CANCELLED: 'Autorizzazione annullata. Nessun account è stato collegato.', OAUTH_STATE: 'La sessione di collegamento è scaduta o non appartiene a questo browser. Riparti dal pulsante Collega.', OAUTH_SCOPES: 'Il provider non ha concesso tutti i permessi richiesti.', REAUTH_REQUIRED: 'Per questa operazione è necessario confermare nuovamente la tua identità.' })[code] || 'Collegamento non completato (' + String(code).slice(0, 80) + '). Ripeti la connessione oppure controlla la configurazione dell’app.'; }
function authRoute(path) {
    const token = new URLSearchParams(location.hash.slice(1)).get('token') || location.hash.slice(1);
    if (path === '/login') {
        loginView();
        return;
    }
    if (path === '/register' && !publicConfig.registration) {
        authLayout('Accesso su invito', 'La registrazione pubblica non è abilitata.', `<a href="/login" class="btn primary full">Torna all’accesso ${icon('arrow')}</a>`);
        return;
    }
    const spec = {
        '/register': ['Crea il tuo studio', 'Il tuo primo workspace, con il tuo brand.', field('email', 'Email di lavoro', '', 'email', 'required autocomplete="email"') + field('name', 'Nome del workspace', '', 'text', 'required maxlength="100"') + field('password', 'Password (almeno 16 caratteri)', '', 'password', 'required minlength="16" autocomplete="new-password"'), 'Crea account', 'signup'],
        '/forgot': ['Recupera l’accesso', 'Ti invieremo un link monouso per reimpostare la password.', field('email', 'Email', '', 'email', 'required autocomplete="email"'), 'Invia il link', 'forgot'],
        '/reset': ['Una nuova password', 'Scegli una password unica, di almeno 16 caratteri.', field('password', 'Nuova password', '', 'password', 'required minlength="16" autocomplete="new-password"'), 'Salva password', 'reset'],
        '/verify': ['Verifica la tua email', 'Conferma l’indirizzo per attivare il tuo account.', '', 'Conferma email', 'verify'],
        '/invite': ['Il tuo invito è pronto', 'Se hai già un account, usa la sua password. Altrimenti creane una di almeno 16 caratteri.', field('password', 'Password', '', 'password', 'required autocomplete="new-password"'), 'Accetta invito', 'invite']
    }[path];
    if (!spec)
        return landing();
    const [title, sub, fields, label, endpoint] = spec;
    const noEmail = path === '/forgot' && !publicConfig.emailEnabled;
    authLayout(title, sub, noEmail ? `<div class="callout warning">Il gestore non ha ancora configurato l’email transazionale. Contatta l’amministratore dell’installazione per recuperare l’accesso.</div><a href="/login">Torna all’accesso</a>` : `<form id="auth-form" class="form">${fields}${authError}<button type="submit" class="btn primary full large">${label} ${icon('arrow')}</button></form><p class="auth-bottom"><a href="/login">Torna all’accesso</a></p>${path === '/verify' ? button('Reinvia email di verifica', 'resend-email', 'ghost full') : ''}`);
    if (noEmail)
        return;
    authFormBind(async (f) => { const r = await api('/api/auth/' + endpoint, 'POST', { ...f, token }); history.replaceState({}, '', location.pathname); authLayout('Tutto pronto', r.message || 'Operazione completata. Puoi accedere al tuo workspace.', `<span class="success-orb">${icon('check')}</span><a class="btn primary full" href="/login">Vai all’accesso ${icon('arrow')}</a>`); });
}
function legalPage(path) {
    const privacy = path === '/privacy';
    const isIt = currentLang === 'it';
    pageTitle(privacy ? (isIt ? 'Informativa sulla Privacy' : 'Privacy Policy') : (isIt ? 'Termini di Servizio' : 'Terms of Service'));

    const content = privacy ? `
        <div class="legal-header">
            <div class="eyebrow">${isIt ? 'INFORMATIVA LEGALE E PRIVACY' : 'LEGAL & COMPLIANCE'}</div>
            <h1>${isIt ? 'Informativa sulla Privacy e Trattamento Dati Google API' : 'Privacy Policy & Google API User Data Disclosure'}</h1>
            <div class="legal-meta-strip">
                <span><strong>${isIt ? 'Versione' : 'Version'}:</strong> 2.0</span>
                <span>•</span>
                <span><strong>${isIt ? 'Data di efficacia' : 'Effective Date'}:</strong> 21 Settembre 2026</span>
                <span>•</span>
                <span><strong>${isIt ? 'Applicazione' : 'Application'}:</strong> AIR3 Social Studio</span>
            </div>
            <div class="legal-nav-tabs">
                <a href="/privacy" class="active">${isIt ? 'Informativa Privacy' : 'Privacy Policy'}</a>
                <a href="/terms">${isIt ? 'Termini di Servizio' : 'Terms of Service'}</a>
            </div>
        </div>

        <div class="legal-meta-box">
            <div>
                <small>${isIt ? 'Titolare del Trattamento' : 'Data Controller'}</small>
                <b>AIR3 Social Studio</b>
            </div>
            <div>
                <small>${isIt ? 'Dominio Verificato' : 'Verified Domain'}</small>
                <b><a href="https://smair.eeess.cyou">https://smair.eeess.cyou</a></b>
            </div>
            <div>
                <small>${isIt ? 'Contatto Privacy & Supporto' : 'Privacy & Support Contact'}</small>
                <b><a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a></b>
            </div>
        </div>

        <div class="legal-highlight-box">
            <h3>${icon('lock')} ${isIt ? 'Conformità alle Norme relative ai dati utente dei servizi API di Google' : 'Google API Services User Data Policy Compliance (Limited Use)'}</h3>
            <p>${isIt ? 
                'L’uso e il trasferimento a qualsiasi altra app da parte di AIR3 Social Studio delle informazioni ricevute dalle API di Google sono conformi alle <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Norme relative ai dati utente dei servizi API di Google (Google API Services User Data Policy)</a>, inclusi i requisiti di utilizzo limitato (Limited Use requirements).' : 
                'AIR3 Social Studio’s use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.'
            }</p>
        </div>

        <article class="legal-section">
            <h2>1. ${isIt ? 'Panoramica e Titolare del Trattamento' : 'Overview & Data Controller'}</h2>
            <p>${isIt ? 
                'AIR3 Social Studio ("noi", "nostro", la "Piattaforma") è una soluzione integrata self-hosted dedicata alla pianificazione editoriale, generazione assistita da intelligenza artificiale, revisione collaborativa e pubblicazione multicanale sui social media. La presente informativa illustra le modalità con cui raccogliamo, conserviamo, proteggiamo ed elaboriamo i dati personali, con particolare attenzione all’accesso tramite autenticazione Google OAuth 2.0 e all’integrazione con i servizi Google.' : 
                'AIR3 Social Studio ("we", "our", the "Platform") is a dedicated self-hosted workspace for editorial planning, AI-assisted content generation, human collaborative review, and multi-channel social media publishing. This Privacy Policy details how we collect, store, protect, and process user personal data, with specific focus on Google OAuth 2.0 Single Sign-On and Google API service integrations.'
            }</p>
            <p>${isIt ? 
                'Il Titolare del trattamento per questa installazione è il gestore dello studio, contattabile direttamente all’indirizzo email: <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.' : 
                'The Data Controller and responsible operator for this deployment is reachable at: <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>2. ${isIt ? 'Dati Utente Raccolti tramite Google OAuth 2.0' : 'Google User Data Accessed via Google OAuth 2.0'}</h2>
            <p>${isIt ? 
                'Quando l’utente sceglie di autenticarsi tramite Google ("Continua con Google" o collegamento del profilo Google nelle impostazioni), richiediamo esclusivamente i seguenti permessi minimi indispensabili (Minimal Scopes):' : 
                'When a user opts to authenticate using Google ("Continue with Google" or links their Google account in settings), we request only the minimal necessary OAuth 2.0 scopes:'
            }</p>
            <div class="scope-badge-list">
                <span class="scope-badge">openid</span>
                <span class="scope-badge">https://www.googleapis.com/auth/userinfo.email</span>
                <span class="scope-badge">https://www.googleapis.com/auth/userinfo.profile</span>
            </div>
            <ul>
                <li><strong>openid:</strong> ${isIt ? 'Utilizzato per la verifica crittografica dell’identità dell’utente tramite lo standard OpenID Connect.' : 'Used for cryptographic user identity authentication via OpenID Connect.'}</li>
                <li><strong>userinfo.email (email):</strong> ${isIt ? 'Utilizzato per acquisire l’indirizzo email verificato dell’account Google, impiegato per identificare univocamente l’utente nel workspace e per le comunicazioni di servizio.' : 'Used to retrieve your verified Google account email address, serving as your unique workspace identity and for essential operational notifications.'}</li>
                <li><strong>userinfo.profile (profile):</strong> ${isIt ? 'Utilizzato unicamente per leggere il nome visualizzato e la foto del profilo Google, visualizzati nell’interfaccia dello studio a supporto della collaborazione interna al team.' : 'Used solely to read your Google public display name and avatar picture, displayed within the studio interface for team collaboration.'}</li>
            </ul>
            <p><strong>${isIt ? 'Dati NON Richiesti né Consultati:' : 'Data NEVER Accessed:'}</strong> ${isIt ? 
                'L’applicazione NON richiede, NON consulta e NON ha accesso ad email personali in Gmail, messaggi privati, file Google Drive, elenchi di contatti personali, calendari privati o cronologia del browser.' : 
                'The platform DOES NOT request, read, or access private Gmail messages, Google Drive documents, personal contacts, private Google Calendars, or browser history.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>3. ${isIt ? 'Finalità del Trattamento' : 'Purposes of Data Processing'}</h2>
            <p>${isIt ? 'I dati raccolti tramite Google OAuth sono trattati unicamente per le seguenti finalità legittime:' : 'Google user data is processed strictly for the following legitimate purposes:'}</p>
            <ul>
                <li>${isIt ? 'Autenticare in sicurezza l’accesso dell’utente al workspace di AIR3 Social Studio.' : 'Securely authenticating user access and maintaining active sessions in AIR3 Social Studio.'}</li>
                <li>${isIt ? 'Assegnare e verificare i ruoli di sicurezza e permessi (Admin, Editor, Approver, Viewer) in base all’identità accertata.' : 'Assigning and enforcing role-based permissions (Admin, Editor, Approver, Viewer) mapped to the verified identity.'}</li>
                <li>${isIt ? 'Tenere traccia delle revisioni, creazioni e approvazioni umane nel log di audit editoriale a tutela della conformità del brand.' : 'Recording author identity for content drafting, revisions, and mandatory human approvals in the workspace audit log.'}</li>
                <li>${isIt ? 'Collegare canali social abilitati esplicitamente (come YouTube) solo previa autorizzazione aggiuntiva dell’utente per la pubblicazione di contenuti multimediali.' : 'Managing explicitly granted third-party publishing channels (e.g. YouTube) solely upon affirmative user consent for dispatching approved media.'}</li>
            </ul>
        </article>

        <article class="legal-section">
            <h2>4. ${isIt ? 'Divieto di Vendita e Condivisione dei Dati' : 'Zero Data Sale & Transfer Prohibitions'}</h2>
            <p>${isIt ? 
                '<strong>Nessuna vendita di dati:</strong> AIR3 Social Studio NON vende, NON affitta, NON noleggia e NON commercializza in alcuna forma i dati personali degli utenti o le informazioni ottenute tramite Google APIs.' : 
                '<strong>Zero Sale of Personal Data:</strong> AIR3 Social Studio does NOT sell, rent, lease, monetize, or commercialize user personal data or information retrieved from Google APIs under any circumstance.'
            }</p>
            <p>${isIt ? 
                'I dati utente non vengono trasferiti a broker pubblicitari, agenzie di marketing, piattaforme di data mining o altri soggetti terzi. Il frontend non include pixel pubblicitari, Google Analytics, script di tracciamento o tracker di terze parti.' : 
                'User data is never transferred to data brokers, advertising networks, data mining aggregators, or unauthorized third parties. The web interface operates without tracking pixels, commercial analytics, or third-party behavioral cookies.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>5. ${isIt ? 'Esclusione da Addestramento di Modelli AI' : 'No AI Model Training on User Data'}</h2>
            <p>${isIt ? 
                'I dati personali, i dati di profilo e le informazioni provenienti da Google APIs <strong>NON vengono mai utilizzati per addestrare, riaddestrare o affinare (fine-tuning) modelli di intelligenza artificiale</strong> o reti neurali generiche, commerciali o di terze parti.' : 
                'User personal data, profile information, and Google API data <strong>are NEVER used to train, retrain, or fine-tune generalized, commercial, or third-party artificial intelligence / machine learning models</strong>.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>6. ${isIt ? 'Sicurezza e Archiviazione delle Credenziali' : 'Security, Storage & Cryptographic Protections'}</h2>
            <p>${isIt ? 
                'Adottiamo rigorosi standard di sicurezza tecnica e organizzativa per garantire la riservatezza e l’integrità dei dati:' : 
                'We enforce enterprise-grade technical and organizational safeguards to ensure data confidentiality and integrity:'
            }</p>
            <ul>
                <li><strong>Crittografia in transito:</strong> ${isIt ? 'Tutte le comunicazioni avvengono esclusivamente su canali cifrati HTTPS / TLS.' : 'All traffic is strictly enforced over encrypted HTTPS / TLS transport.'}</li>
                <li><strong>Crittografia at-rest:</strong> ${isIt ? 'I token OAuth, le chiavi API e i segreti di configurazione sono cifrati a riposo con algoritmo standard AES-256-GCM.' : 'OAuth refresh tokens, API keys, and sensitive secrets are encrypted at rest using AES-256-GCM.'}</li>
                <li><strong>Protezione password:</strong> ${isIt ? 'Le password locali sono protette con derivazione crittografica scrypt ad alta sicurezza.' : 'Local account credentials are protected using high-iteration scrypt cryptographic hashing.'}</li>
                <li><strong>Archiviazione isolata:</strong> ${isIt ? 'I dati sono conservati in un database dedicato SQLite con Write-Ahead Logging (WAL) su server isolato.' : 'Data is stored locally in a dedicated SQLite database with Write-Ahead Logging (WAL) on an isolated host.'}</li>
                <li><strong>Backup automatizzati:</strong> ${isIt ? 'Backup online regolari con snapshot crittografati e rotazione a 7 giorni.' : 'Automated online backups with encrypted snapshots and 7-day rolling retention.'}</li>
            </ul>
        </article>

        <article class="legal-section">
            <h2>7. ${isIt ? 'Conservazione dei Dati e Diritto di Cancellazione' : 'Data Retention & User Data Deletion Rights'}</h2>
            <p>${isIt ? 
                'I dati utente Google vengono conservati esclusivamente fino a quando l’account utente rimane attivo nel workspace. L’utente dispone di pieno controllo e dei seguenti meccanismi di revoca e cancellazione:' : 
                'Google user data is retained strictly as long as the user maintains an active account within the workspace. Users have immediate, self-service mechanisms to revoke access and request deletion:'
            }</p>
            <ul>
                <li><strong>${isIt ? 'Revoca dell’accesso Google:' : 'Revoking Google Access:'}</strong> ${isIt ? 
                    'Puoi revocare l’autorizzazione concessa ad AIR3 Social Studio in qualsiasi momento accedendo alla pagina ufficiale di Google: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Permessi Account Google</a>.' : 
                    'You can instantly revoke AIR3 Social Studio’s access at any time via your official <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Permissions Page</a>.'
                }</li>
                <li><strong>${isIt ? 'Scollegamento profilo in Studio:' : 'Unlinking in Studio Settings:'}</strong> ${isIt ? 
                    'Puoi scollegare il tuo profilo Google in autonomia dalla scheda Impostazioni all’interno dello studio.' : 
                    'You can unlink your Google profile directly from the Settings page inside the application.'
                }</li>
                <li><strong>${isIt ? 'Richiesta di cancellazione totale:' : 'Complete Data Deletion Request:'}</strong> ${isIt ? 
                    'Puoi richiedere la cancellazione totale e permanente del tuo account, delle credenziali e di tutti i contenuti associati inviando un’email al responsabile all’indirizzo <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>. Tutti i record associati verranno definitivamente rimossi entro 30 giorni.' : 
                    'You may request complete and irreversible deletion of your user account, stored credentials, and associated workspace records by emailing <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>. All personal records will be permanently purged within 30 days.'
                }</li>
            </ul>
        </article>

        <article class="legal-section">
            <h2>8. ${isIt ? 'Diritti dell’Interessato (GDPR)' : 'Data Subject Rights (GDPR & International Regulations)'}</h2>
            <p>${isIt ? 
                'In conformità agli articoli 15-22 del Regolamento UE 2016/679 (GDPR), gli utenti possono esercitare in qualsiasi momento i diritti di accesso, rettifica, cancellazione (diritto all’oblio), limitazione del trattamento, portabilità dei dati e opposizione, contattando il Titolare all’indirizzo email: <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.' : 
                'In accordance with Articles 15-22 of EU Regulation 2016/679 (GDPR) and applicable privacy laws, users have the right to access, rectify, delete, restrict processing, request data portability, and object to the processing of their personal data by contacting the operator at: <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>9. ${isIt ? 'Contatti Ufficiali' : 'Official Contact Information'}</h2>
            <p>${isIt ? 
                'Per qualsiasi richiesta di chiarimento, segnalazione o esercizio dei diritti in merito alla presente Informativa sulla Privacy o all’integrazione Google OAuth, puoi scrivere a:' : 
                'For any inquiries, requests, or privacy questions concerning this Policy or Google OAuth integration, please contact:'
            }</p>
            <p><strong>Email:</strong> <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a><br>
            <strong>Dominio:</strong> <a href="https://smair.eeess.cyou">https://smair.eeess.cyou</a></p>
        </article>
    ` : `
        <div class="legal-header">
            <div class="eyebrow">${isIt ? 'TERMINI E CONDIZIONI' : 'TERMS & CONDITIONS'}</div>
            <h1>${isIt ? 'Termini di Servizio' : 'Terms of Service'}</h1>
            <div class="legal-meta-strip">
                <span><strong>${isIt ? 'Versione' : 'Version'}:</strong> 2.0</span>
                <span>•</span>
                <span><strong>${isIt ? 'Data di efficacia' : 'Effective Date'}:</strong> 21 Settembre 2026</span>
                <span>•</span>
                <span><strong>${isIt ? 'Applicazione' : 'Application'}:</strong> AIR3 Social Studio</span>
            </div>
            <div class="legal-nav-tabs">
                <a href="/privacy">${isIt ? 'Informativa Privacy' : 'Privacy Policy'}</a>
                <a href="/terms" class="active">${isIt ? 'Termini di Servizio' : 'Terms of Service'}</a>
            </div>
        </div>

        <div class="legal-meta-box">
            <div>
                <small>${isIt ? 'Fornitore del Servizio' : 'Service Operator'}</small>
                <b>AIR3 Social Studio</b>
            </div>
            <div>
                <small>${isIt ? 'URL di Servizio' : 'Service URL'}</small>
                <b><a href="https://smair.eeess.cyou">https://smair.eeess.cyou</a></b>
            </div>
            <div>
                <small>${isIt ? 'Contatto di Supporto' : 'Support Contact'}</small>
                <b><a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a></b>
            </div>
        </div>

        <article class="legal-section">
            <h2>1. ${isIt ? 'Accettazione dei Termini' : 'Acceptance of Terms'}</h2>
            <p>${isIt ? 
                'L’accesso e l’utilizzo della piattaforma AIR3 Social Studio ("il Servizio") sono subordinati all’accettazione integrale dei presenti Termini di Servizio. Registrandoti, accedendo o utilizzando in qualsiasi modo il Servizio, accetti di essere vincolato dai presenti Termini. Se non concordi con essi, ti invitiamo a non accedere né utilizzare il Servizio.' : 
                'Access to and use of AIR3 Social Studio ("the Service") is subject to complete acceptance of these Terms of Service. By registering, logging in, or using the Service in any manner, you agree to be bound by these Terms. If you do not agree, you must not use the platform.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>2. ${isIt ? 'Descrizione del Servizio' : 'Description of the Service'}</h2>
            <p>${isIt ? 
                'AIR3 Social Studio è un ambiente di lavoro digitale e collaborativo progettato per la gestione della presenza social di brand e creator. Include funzionalità per la stesura assistita da intelligenza artificiale, organizzazione del calendario editoriale, revisione collaborativa con approvazione umana vincolante e pubblicazione programmata su canali social abilitati.' : 
                'AIR3 Social Studio is a collaborative digital workspace designed for managing brand and creator social media operations. Features include AI-assisted drafting, shared editorial calendars, collaborative reviews with mandatory human approval guardrails, and scheduled publishing to connected channels.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>3. ${isIt ? 'Account Utente e Autenticazione Google OAuth' : 'User Accounts & Google OAuth Authentication'}</h2>
            <p>${isIt ? 
                'Gli utenti possono autenticarsi mediante credenziali locali o tramite Single Sign-On con Google OAuth 2.0. L’utente è responsabile della custodia e della riservatezza delle proprie credenziali e risponde di qualsiasi attività svolta tramite il proprio account. In caso di sospetta violazione o accesso non autorizzato, è obbligo dell’utente darne tempestiva notifica all’amministratore all’indirizzo <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.' : 
                'Users can authenticate via local email/password credentials or Google OAuth 2.0 Single Sign-On. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. In case of suspected unauthorized access, you must notify the administrator immediately at <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>4. ${isIt ? 'Proprietà Intellettuale e Titolarità dei Contenuti' : 'Intellectual Property & Content Ownership'}</h2>
            <p>${isIt ? 
                '<strong>I tuoi contenuti rimangono tuoi:</strong> L’utente conserva la piena ed esclusiva titolarità, i diritti d’autore e qualsiasi diritto di proprietà intellettuale su tutti i testi, file multimediali, grafiche, strategie e bozze creati o pubblicati tramite il Servizio. AIR3 Social Studio non rivendica alcun diritto di proprietà sui contenuti dell’utente.' : 
                '<strong>You retain 100% ownership:</strong> You retain complete and exclusive ownership, copyright, and all intellectual property rights to all texts, media assets, graphics, strategies, and drafts created, scheduled, or published through the Service. AIR3 Social Studio claims no ownership over user content.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>5. ${isIt ? 'Integrazioni di Terze Parti e Norme Google' : 'Third-Party Integrations & Google Policies'}</h2>
            <p>${isIt ? 
                'Il Servizio consente l’integrazione con piattaforme di terze parti (tra cui Google, YouTube, Meta, X, LinkedIn, Telegram). L’utilizzo di tali funzionalità è soggetto anche ai termini di servizio e alle norme sulla privacy dei rispettivi fornitori terzi. Per le funzionalità collegate a Google, il Servizio si conforma rigorosamente alle Norme relative ai dati utente dei servizi API di Google (Google API Services User Data Policy).' : 
                'The Service supports integrations with third-party networks (including Google, YouTube, Meta, X, LinkedIn, Telegram). Your use of such integrations is also governed by the terms of service and privacy policies of each respective provider. For Google-connected features, the Service strictly adheres to the Google API Services User Data Policy.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>6. ${isIt ? 'Uso Consentito e Condotta dell’Utente' : 'Acceptable Use & User Conduct'}</h2>
            <p>${isIt ? 'È fatto espresso divieto di utilizzare il Servizio per:' : 'You agree not to use the Service to:'}</p>
            <ul>
                <li>${isIt ? 'Pubblicare o diffondere contenuti illeciti, diffamatori, osceni, ingannevoli o incitanti all’odio.' : 'Publish or transmit illegal, defamatory, obscene, fraudulent, or hateful content.'}</li>
                <li>${isIt ? 'Generare o inviare comunicazioni massive non richieste (spam) in violazione delle policy delle piattaforme.' : 'Generate or distribute bulk unsolicited messaging (spam) violating social platform policies.'}</li>
                <li>${isIt ? 'Violare diritti d’autore, brevetti, marchi registrati o segreti commerciali di terzi.' : 'Infringe upon copyright, patent, trademark, trade secret, or privacy rights of any party.'}</li>
                <li>${isIt ? 'Tentare accessi non autorizzati, manomissioni del codice sorgente o azioni volte a degradare la sicurezza del server.' : 'Attempt unauthorized access, penetration, code tampering, or interference with server security.'}</li>
            </ul>
        </article>

        <article class="legal-section">
            <h2>7. ${isIt ? 'Limitazione di Responsabilità' : 'Disclaimers & Limitation of Liability'}</h2>
            <p>${isIt ? 
                'Il Servizio è fornito "nello stato in cui si trova" ("as is") e "come disponibile". Sebbene la piattaforma sia sviluppata con architettura SQLite WAL resiliente e backup programmati, l’amministratore non garantisce l’assenza di interruzioni impreviste derivanti da provider terzi o problemi di rete esterna, declinando ogni responsabilità per danni indiretti nei limiti consentiti dalla legge.' : 
                'The Service is provided on an "as is" and "as available" basis. While built on resilient SQLite WAL persistence and regular backup routines, the operator does not guarantee uninterrupted operation caused by third-party API changes or network disruptions, and disclaims indirect liability to the fullest extent permitted by law.'
            }</p>
        </article>

        <article class="legal-section">
            <h2>8. ${isIt ? 'Modifiche e Contatti' : 'Modifications & Contact'}</h2>
            <p>${isIt ? 
                'I presenti Termini possono essere aggiornati periodicamente per riflettere adeguamenti normativi o evoluzioni tecniche del Servizio. Per qualsiasi richiesta relativa ai presenti Termini di Servizio, è possibile contattare l’amministratore a: <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.' : 
                'These Terms may be updated periodically to reflect regulatory adjustments or technological improvements. For any inquiries regarding these Terms of Service, please contact the operator at: <a href="mailto:0xfunboy@gmail.com">0xfunboy@gmail.com</a>.'
            }</p>
        </article>
    `;

    $('#app').innerHTML = `
        <div class="public-site">
            ${publicHeader()}
            <main class="legal-container" id="main-content">
                ${content}
                <div class="legal-footer-nav">
                    <a class="btn" href="/app">${isIt ? 'Accedi allo Studio' : 'Enter Studio'} ${icon('arrow')}</a>
                    <div style="display:flex;gap:12px;align-items:center;">
                        <a class="btn ghost" href="${privacy ? '/terms' : '/privacy'}">${privacy ? (isIt ? 'Leggi i Termini di Servizio' : 'Read Terms of Service') : (isIt ? 'Leggi l’Informativa Privacy' : 'Read Privacy Policy')}</a>
                        <a class="btn ghost" href="mailto:0xfunboy@gmail.com">${isIt ? 'Contatta il Supporto' : 'Contact Support'}</a>
                    </div>
                </div>
            </main>
            ${publicFooter()}
        </div>
    `;
}
function shell(content) { pageTitle(labels[state.view] || 'Studio'); const nav = Object.entries(labels).filter(([k]) => !['setup', 'admin', 'team'].includes(k)); $('#app').innerHTML = `<div class="shell"><button class="menu-scrim" data-action="menu" aria-label="Chiudi menu"></button><aside class="sidebar"><a href="/" class="brand-home">${wordmark()}</a><div class="handwritten sidebar-motto">${t('sidebarMotto')}</div><div class="nav-label">${t('editorialWs')}</div><nav class="nav" aria-label="Studio">${nav.map(([k, l]) => `<a href="#${k}" class="${state.view === k || state.view.startsWith('content/') && k === 'contents' ? 'active' : ''}" ${state.view === k ? 'aria-current="page"' : ''}>${icon(k)}${l}</a>`).join('')}</nav>${may('admin') ? `<div class="nav-label nav-label-bottom">${t('yourEnv')}</div><nav class="nav" aria-label="Amministrazione"><a href="#setup" class="${state.view === 'setup' ? 'active' : ''}">${icon('setup')}${labelsMap[currentLang]?.setup || 'Configurazione guidata'}</a><a href="#team" class="${state.view === 'team' ? 'active' : ''}">${icon('team')}${labelsMap[currentLang]?.team || 'Team & accessi'}</a>${state.me.siteAdmin ? `<a href="#admin" class="${state.view === 'admin' ? 'active' : ''}">${icon('admin')}${labelsMap[currentLang]?.admin || 'Amministrazione'}</a>` : ''}</nav>` : ''}<div class="sidebar-bottom"><span class="handwritten">Pensa → crea → pubblica<span class="pencil-stroke"></span></span><small>AIR3 Social Studio · 0.2.0</small></div></aside><main class="main" id="main-content"><header class="topbar"><div class="brand-switch">${button(icon('menu'), 'menu', 'ghost mobile-menu icon-btn', 'aria-label="Menu"')}<span class="brand-avatar">${esc(state.brand?.data.name?.slice(0, 1) || '+')}</span><select id="brand-switch" aria-label="Seleziona brand">${state.brands.length ? state.brands.map(b => `<option value="${b.id}" ${state.brand?.id === b.id ? 'selected' : ''}>${esc(b.data.name)}</option>`).join('') : '<option>Il tuo primo brand</option>'}</select>${may('admin') ? button(icon('plus'), 'new-brand', 'ghost icon-btn', 'aria-label="Crea brand"') : ''}</div>${button(icon('search') + ' <span>' + t('searchStudio') + '</span><kbd>⌘ K</kbd>', 'command', 'search-button')}<div class="top-right">${langButton()}${themeButton()}<span class="avatar">${esc(state.me.user?.email?.slice(0, 2).toUpperCase() || 'AI')}</span><div class="profile-name"><b>${esc(state.me.user?.email?.split('@')[0] || 'Workspace')}</b><small>${esc(state.me.principal.role)}</small></div>${button(icon('exit'), 'logout', 'ghost icon-btn', 'aria-label="' + esc(t('signOut')) + '" title="' + esc(t('signOut')) + '"')}</div></header><div class="page">${content}</div><footer class="studio-footer"><span>${t('footerRule')}</span><span class="handwritten">${t('footerChannel')}</span></footer></main></div>`; const bs = $('#brand-switch'); bs.onchange = async () => { state.brand = state.brands.find(x => x.id === bs.value); state.data = {}; location.hash = 'overview'; await refresh(); }; bindExperience(); }
function newOverview() { const c = state.data.contents || [], a = state.data.accounts || [], docs = state.data.knowledge || [], jobs = state.data.jobs || []; const cnt = ss => c.filter(x => ss.includes(x.data.status)).length; const stats = [['contents', 'blue', t('drafts'), cnt(['DRAFT', 'GENERATED', 'REVIEW_REQUIRED']), t('draftsSub')], ['calendar', 'teal', t('scheduled'), cnt(['SCHEDULED']), t('scheduledSub')], ['send', 'violet', t('published'), cnt(['PUBLISHED']), t('publishedSub')], ['admin', 'amber', t('waitingApproval'), cnt(['WAITING_APPROVAL', 'REVIEW_FAILED']), t('waitingApprovalSub')]]; const approval = c.filter(x => ['WAITING_APPROVAL', 'REVIEW_FAILED'].includes(x.data.status)).slice(0, 4); const future = c.filter(x => x.data.status === 'SCHEDULED').sort((x, y) => String(x.data.scheduleAt).localeCompare(String(y.data.scheduleAt))).slice(0, 4); const enabled = a.filter(x => x.data.enabled); return head(t('ideasInMotion'), `${currentLang === 'it' ? 'Ciao' : 'Hello'} ${esc(state.me.user?.email?.split('@')[0] || 'creator')}. ${currentLang === 'it' ? 'Ecco cosa succede nello studio di' : 'Here is what is happening in the studio of'} <b>${esc(state.brand.data.name)}</b>.`, may('editor') ? button(icon('plus') + ' ' + t('newContent'), 'new-content', 'primary') : '') + `<div class="cards metric-cards">${stats.map(([i, col, t, n, sub]) => `<article class="card metric-card"><div class="metric-head"><span class="feature-icon tint-${col}">${icon(i)}</span><span>${t}</span></div><div class="metric">${n}</div><span class="caption">${sub}</span><span class="metric-pencil pencil-${col}"></span></article>`).join('')}</div><div class="overview-grid"><section class="panel performance-panel"><div class="panel-head"><h2>${currentLang === 'it' ? 'Pubblicazioni per canale' : 'Publications by Channel'}</h2><span class="microcopy">${currentLang === 'it' ? 'Nel brand · esiti confermati' : 'In brand · confirmed results'}</span></div><div class="panel-body">${publicationChart(c)}<div class="chart-footnote">${icon('analytics')}${currentLang === 'it' ? 'Le metriche di reach sono disponibili in Analytics dopo la raccolta dal provider.' : 'Reach metrics are available in Analytics once retrieved from provider.'}</div></div></section><section class="panel"><div class="panel-head"><h2>${t('yourChannels')}</h2><a href="#accounts">${currentLang === 'it' ? 'Gestisci' : 'Manage'} ${icon('arrow')}</a></div><div class="channel-health">${enabled.slice(0, 7).map(x => `<a class="health-line" href="#accounts">${socialMark(x.data.platform)}<span><b>${esc(x.data.name)}</b><small>${esc(x.data.platform)}</small></span><span class="status-dot"></span><small>${currentLang === 'it' ? 'Configurato' : 'Configured'}</small></a>`).join('') || empty(currentLang === 'it' ? 'Ogni storia trova il suo canale' : 'Every story finds its channel', currentLang === 'it' ? 'Collega il primo account per iniziare.' : 'Connect your first account to begin.', may('admin') ? button(currentLang === 'it' ? 'Collega un canale' : 'Connect a channel', 'go-channels', 'primary small') : '')}<p class="microcopy">${currentLang === 'it' ? 'I permessi live si controllano dalla pagina Canali.' : 'Live permissions are verified from Channels page.'}</p></div></section></div><div class="dashboard-bottom"><section class="panel"><div class="panel-head"><h2>${t('recentContent')}</h2><a href="#contents">${currentLang === 'it' ? 'Tutti' : 'All'} ${icon('arrow')}</a></div>${contentMini(c.slice(0, 5))}</section><section class="panel"><div class="panel-head"><h2>${t('waitingApproval')}</h2>${badge(String(approval.length))}</div>${contentMini(approval, currentLang === 'it' ? 'Controllo editoriale in ordine' : 'Editorial review up to date', currentLang === 'it' ? 'I contenuti da rivedere compariranno qui.' : 'Content awaiting review will appear here.')}</section><section class="panel"><div class="panel-head"><h2>${currentLang === 'it' ? 'In calendario' : 'Scheduled in Calendar'}</h2><a href="#calendar">${currentLang === 'it' ? 'Apri' : 'Open'} ${icon('arrow')}</a></div>${future.length ? `<div class="upcoming-list">${future.map(x => `<a href="#content/${x.id}"><span class="date-tile"><small>${new Date(x.data.scheduleAt).toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', { month: 'short', timeZone: state.brand?.data.timezone || 'Europe/Rome' })}</small><b>${new Date(x.data.scheduleAt).toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', { day: 'numeric', timeZone: state.brand?.data.timezone || 'Europe/Rome' })}</b></span><span><strong>${esc(x.data.title)}</strong><small>${time(x.data.scheduleAt)}</small></span>${socialMark(x.data.platform)}</a>`).join('')}</div>` : empty(currentLang === 'it' ? 'Spazio alle prossime idee' : 'Room for upcoming ideas', currentLang === 'it' ? 'Quando programmi un contenuto approvato, lo trovi qui.' : 'When you schedule approved content, it appears here.')}</section></div><section class="panel section-space"><div class="panel-head"><h2>${icon('spark')} ${t('creativeEngine')}</h2><a href="#jobs">${labels.jobs || 'Jobs'} ${icon('arrow')}</a></div><div class="engine-strip">${[[ 'knowledge', docs.filter(d => d.data.approved).length + (currentLang === 'it' ? ' fonti approvate' : ' approved sources'), currentLang === 'it' ? 'Conoscenza selezionata per il brand' : 'Curated brand knowledge'], ['spark', state.status.model.configured ? (currentLang === 'it' ? 'Modello configurato' : 'Model configured') : (currentLang === 'it' ? 'Scegli un modello' : 'Choose a model'), state.status.model.name || (currentLang === 'it' ? 'Il wizard ti guida nella configurazione' : 'Wizard guides configuration')], ['jobs', jobs.filter(j => j.state === 'QUEUED').length + (currentLang === 'it' ? ' attività in coda' : ' queued jobs'), currentLang === 'it' ? 'Esecuzioni persistenti e tracciate' : 'Persistent, tracked executions'], ['admin', currentLang === 'it' ? 'Revisione umana' : 'Human review', state.brand.data.policy.autoPublish ? (currentLang === 'it' ? 'Policy automatica limitata abilitata' : 'Limited auto-publish policy enabled') : (currentLang === 'it' ? 'Invio solo dopo approvazione' : 'Publish only after human approval')]].map(([i, t, d]) => `<div>${icon(i)}<span><b>${esc(t)}</b><small>${esc(d)}</small></span></div>`).join('')}</div></section>`; }
function contentMini(cs, title = 'La prima idea parte da qui', sub = 'Crea un brief o scrivi una bozza. Gli agenti ti aiuteranno a svilupparla.') { return cs.length ? `<div class="content-mini">${cs.map(x => `<a href="#content/${x.id}">${socialMark(x.data.platform)}<span><strong>${esc(x.data.title || 'Senza titolo')}</strong><small>${esc(x.data.platform)} · ${time(x.updatedAt)}</small></span>${badge(x.data.status)}</a>`).join('')}</div>` : empty(title, sub); }
function publicationChart(cs) { const counts = {}; for (const c of cs)
    if (c.data.status === 'PUBLISHED')
        counts[c.data.platform] = (counts[c.data.platform] || 0) + 1; const items = Object.entries(counts); if (!items.length)
    return `<div class="chart-empty"><div class="empty-chart-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><b>I risultati iniziano dalle tue pubblicazioni.</b><p>Nessun invio confermato, ancora. Il grafico si popolerà con i dati del brand.</p></div>`; const max = Math.max(...items.map(x => x[1])), w = 600, h = 190, step = w / items.length; return `<svg class="data-chart" viewBox="0 0 660 250" role="img" aria-label="Pubblicazioni confermate per piattaforma"><path class="chart-grid" d="M30 20h610M30 80h610M30 140h610M30 200h610"/>${items.map(([p, n], i) => `<g><rect class="chart-bar bar-${i % 4}" x="${35 + i * step}" y="${200 - (n / max) * h}" width="${Math.max(12, step - 26)}" height="${n / max * h}" rx="3"/><text x="${35 + i * step + (step - 26) / 2}" y="${190 - n / max * h}" text-anchor="middle">${n}</text><text x="${35 + i * step + (step - 26) / 2}" y="230" text-anchor="middle">${esc(p)}</text></g>`).join('')}</svg>`; }
function connectionBadge(c) { const s = c?.state || 'UNVERIFIED'; return `<span class="connection-state ${['CONNECTED'].includes(s) ? 'ok' : ['EXPIRED', 'CHECK_FAILED', 'RECONNECT_REQUIRED'].includes(s) ? 'warn' : ''}"><i></i>${esc(({ CONNECTED: 'Verificato', DISABLED: 'Disattivato', UNVERIFIED: 'Da verificare', EXPIRED: 'Scaduto', CHECK_FAILED: 'Verifica fallita', RECONNECT_REQUIRED: 'Ricollega' })[s] || s)}</span>`; }
function channelCatalog(compact = false) { const catalog = state.status?.platforms || {}; const keys = compact ? ['facebook', 'instagram', 'whatsapp', 'threads', 'tiktok', 'x', 'linkedin', 'linkedin-page', 'telegram', 'youtube'] : Object.keys(catalog); return `<div class="connection-grid ${compact ? 'compact' : ''}">${keys.filter(p => catalog[p]).map(p => { const app = oauthApps.find(a => a.platforms.includes(p)); const n = connections.filter(c => c.data.platform === p && c.data.enabled).length; return `<article class="connection-card"><div class="connection-title">${socialMark(p)}<span><h3>${esc(catalog[p].label)}</h3><small>${app ? 'OAuth · ' + esc(app.label) : p === 'telegram' ? 'Bot e canale verificati' : 'Credenziali / Postiz'}</small></span>${n ? `<span class="count-pill">${n}</span>` : ''}</div><p>${esc(catalog[p].notes)}</p><div class="connection-actions">${may('admin') ? app ? button(icon('link') + ' ' + (app.configured ? 'Collega' : 'Configura OAuth'), app.configured ? 'connect-oauth' : 'configure-oauth', app.configured ? 'primary small' : 'small', dataId(app.configured ? p : app.provider)) + (app.configured ? button(icon('settings'), 'configure-oauth', 'ghost icon-btn', dataId(app.provider) + ' aria-label="Configura app ' + esc(app.label) + '"') : '') : button(p === 'telegram' ? 'Collega bot' : 'Configura', p === 'telegram' ? 'telegram-connect' : 'new-account', 'small', dataId(p)) : '<small>Collegamento riservato agli amministratori</small>'}</div></article>`; }).join('')}</div>`; }
function accountsPage() { return head('Connetti il tuo mondo.', 'Account, consensi e destinazioni. I token restano cifrati nel backend.', may('admin') ? button(icon('setup') + ' Wizard', 'go-setup') + button('Credenziali / Postiz', 'new-account', 'primary') : '') + `<div class="connection-summary"><span>${icon('accounts')} <b>${connections.filter(c => c.data.enabled).length}</b> account abilitati</span><span>${icon('admin')} <b>${connections.filter(c => c.connection?.state === 'CONNECTED').length}</b> connessioni verificate</span><span class="handwritten">Meno passaggi. Più connessioni. ↗</span></div>${connections.length ? `<section class="panel section-space"><div class="panel-head"><h2>Account del brand</h2><span class="microcopy">Un controllo non pubblica contenuti</span></div>${connections.map(a => `<div class="connected-row">${socialMark(a.data.platform)}<div class="connected-identity"><b>${esc(a.data.name)}</b><small>${esc(a.data.platform)} · ${esc(a.data.targetId)}</small><small>${esc(a.connection.detail)}</small>${a.connection.expiresAt ? `<small>Scadenza: ${time(new Date(a.connection.expiresAt).toISOString())}</small>` : ''}</div>${connectionBadge(a.connection)}<div class="actions">${may('admin') ? button('Verifica', 'connection-check', 'small', dataId(a.id)) + button(icon('settings'), 'edit-account', 'ghost icon-btn', dataId(a.id) + ' aria-label="Modifica credenziali"') + (a.data.transport === 'postiz' ? button('Account Postiz', 'postiz-integrations', 'small', dataId(a.id)) + button('Collega OAuth', 'account-connect', 'small', dataId(a.id)) : button(icon('inbox'), 'webhook', 'ghost icon-btn', dataId(a.id) + ' aria-label="Configura webhook"')) + button(icon('exit'), 'connection-disconnect', 'ghost icon-btn', dataId(a.id) + ' aria-label="Scollega account"') : ''}</div></div>`).join('')}</section>` : ''}<div class="section-title"><h2>Trova il tuo prossimo canale</h2><span class="microcopy">API ufficiali · permessi espliciti</span></div>${channelCatalog()}<div class="callout section-space">${icon('lock')} Il wizard completa URL, account e token dopo il consenso. La creazione dell’app developer, l’app review e gli eventuali accessi commerciali rimangono a carico del gestore. Telegram usa BotFather, non un finto login OAuth.</div>`; }
function wizardPage() {
    const step = onboarding.step || 0, names = ['Workspace', 'Identità del brand', 'Modelli AI', 'Connessioni', 'Revisione'];
    let body = '';
    if (step === 0)
        body = `<div class="wizard-intro"><span class="feature-icon tint-teal">${icon('team')}</span><h2>Ogni buona idea merita il suo spazio.</h2><p>Il workspace riunisce persone, brand e autorizzazioni. Potrai invitare il team quando vuoi.</p></div><form id="workspace-form" class="form">${field('name', 'Nome del workspace', state.me.workspaces.find(w => w.id === state.workspace)?.name || 'Il mio studio', 'text', 'required maxlength="100"')}<div>${button(icon('team') + ' Invita il team', 'go-team', '', 'type="button"')}</div><button type="submit" class="btn primary">Salva workspace ${icon('check')}</button><div class="form-error" role="alert"></div></form>`;
    if (step === 1)
        body = `<div class="wizard-intro"><span class="feature-icon tint-violet">${icon('knowledge')}</span><h2>Prima di scrivere, conosciamo il tuo brand.</h2><p>Tono, pubblico, obiettivi e regole: il contesto che rende il lavoro degli agenti davvero tuo.</p></div>${state.brand ? `<div class="brand-profile-preview"><span class="brand-avatar">${esc(state.brand.data.name.slice(0, 1))}</span><div><h3>${esc(state.brand.data.name)}</h3><p>${esc(state.brand.data.description || 'Aggiungi una descrizione per gli agenti.')}</p><div class="tag-list">${state.brand.data.tone.map(t => badge(t)).join('')}</div></div></div><div class="actions">${button('Modifica identità', 'edit-brand', 'primary')}${button('Aggiungi fonti', 'go-knowledge')}</div>` : button(icon('plus') + ' Crea il primo brand', 'new-brand', 'primary')}<p class="microcopy">Le fonti devono essere approvate prima di entrare nel recupero RAG. Loghi e media si caricano dalla libreria.</p>`;
    if (step === 2)
        body = `<div class="wizard-intro"><span class="feature-icon tint-cyan">${icon('spark')}</span><h2>Un team AI. Lo stack che scegli tu.</h2><p>Configura Gemini o un endpoint compatibile. Gli embeddings sono separati dal modello generativo.</p></div>${state.me.siteAdmin ? envForm('models', true) : `<div class="callout">La configurazione del modello è riservata all’amministratore dell’installazione. ${state.status.model.configured ? 'Il modello è già configurato.' : 'Chiedi al gestore di abilitarlo prima di generare contenuti.'}</div>`}`;
    if (step === 3)
        body = `<div class="wizard-intro"><span class="feature-icon tint-teal">${icon('accounts')}</span><h2>Ogni canale, con il tuo consenso.</h2><p>Collega un profilo, scegli le destinazioni autorizzate e lascia al backend la gestione dei token.</p></div>${state.brand ? channelCatalog(true) : '<div class="callout warning">Crea prima il brand allo step 2.</div>'}<p class="microcopy">Tutti gli altri canali e i trasporti Postiz sono disponibili nella sezione Canali.</p>`;
    if (step === 4) {
        const checks = [[!!state.brand, 'Identità del brand', state.brand?.data.name || 'Da creare'], [state.status.model.configured, 'Modello generativo', state.status.model.name || 'Da configurare'], [connections.some(c => c.data.enabled), 'Canali abilitati', connections.filter(c => c.data.enabled).length + ' account'], [(state.data.knowledge || []).some(d => d.data.approved), 'Fonti approvate', 'Conoscenza pronta per gli agenti'], [state.status.baseUrl.startsWith('https://'), 'HTTPS pubblico', 'Necessario per OAuth remoto, webhook e media'], [state.status.renderer.ffmpeg, 'Rendering FFmpeg', 'Immagini e video nel tuo ambiente']];
        body = `<div class="wizard-intro"><span class="feature-icon tint-teal">${icon('admin')}</span><h2>Il tuo studio prende forma.</h2><p>Controlla cosa è già configurato e cosa richiede ancora un passaggio. Completare il wizard non avvia pubblicazioni.</p></div><div class="readiness-list">${checks.map(([ok, t, d]) => `<div><span class="readiness-icon ${ok ? 'ready' : ''}">${icon(ok ? 'check' : 'alert')}</span><span><b>${t}</b><small>${esc(d)}</small></span><span class="badge">${ok ? 'Configurato' : 'Da completare'}</span></div>`).join('')}</div><div class="callout section-space">Prima del lancio pubblico servono anche documenti privacy/termini del gestore, collaudi con account reali e verifica dei backup. Nessuna API viene considerata collaudata soltanto perché è configurata.</div>`;
    }
    return head('Dai forma al tuo studio.', 'Un percorso guidato, dal primo workspace alle connessioni.', `<span class="handwritten">Le buone idee<br>partono da qui. ↗</span>`) + `<ol class="wizard-steps">${names.map((n, i) => `<li class="${i === step ? 'current' : i < step ? 'complete' : ''}"><button data-action="wizard-jump" data-id="${i}" ${i === step ? 'aria-current="step"' : ''}><span>${i < step ? icon('check') : i + 1}</span><b>${n}</b></button></li>`).join('')}</ol><div class="wizard-layout"><section class="panel wizard-panel"><div class="eyebrow">PASSAGGIO ${step + 1} DI 5</div>${body}<div class="wizard-footer">${step ? button('← Indietro', 'wizard-back') : '<a href="#overview">Esplora lo studio</a>'}${button(step === 4 ? 'Completa configurazione ' + icon('check') : 'Continua ' + icon('arrow'), step === 4 ? 'wizard-complete' : 'wizard-next', 'primary')}</div></section><aside class="wizard-side"><div class="panel"><div class="panel-head"><h2>${icon('settings')} Configurazione automatica</h2></div><div class="panel-body"><p>Il server genera callback e configurazione locale. Le credenziali dei social vengono cifrate, mai copiate nel frontend.</p><div class="small-checks"><span>${icon('check')} Callback generate</span><span>${icon('check')} State e sessione verificati</span><span>${icon('check')} Selezione account autorizzati</span><span>${icon('check')} Segreti separati per workspace</span></div><div class="code-label">ORIGIN ATTIVA</div><code class="wrap-code">${esc(state.status.baseUrl)}</code><div class="code-label">FILE GENERATO</div><code>DATA_DIR/runtime.generated.env</code><p class="microcopy">Scritto automaticamente quando salvi l’installazione. I token dei social restano nel database.</p>${state.me.siteAdmin ? button(icon('code') + ' Anteprima .env', 'env-preview', 'small') : ''}</div></div><span class="handwritten wizard-note">Meno lavoro manuale.<br>Più spazio per creare.<span class="pencil-stroke"></span></span></aside></div>`;
}
function envForm(group, compact = false) { if (!installation)
    return '<p>Configurazione non disponibile.</p>'; let fs = installation.fields.filter(f => f.group === group); if (compact)
    fs = fs.filter(f => !f.key.startsWith('LLM_MODEL_')); return `<form class="form env-form" id="environment-form"><input type="hidden" name="group" value="${group}"><div class="form-row">${fs.map(f => { let control; if (f.key === 'ALLOW_REGISTRATION')
    control = select(f.key, friendly[f.key], [{ value: 'false', label: 'Solo su invito' }, { value: 'true', label: 'Aperta, con email verificata' }], f.value || 'false');
else if (f.key === 'LLM_PROVIDER')
    control = select(f.key, friendly[f.key], [{ value: 'gemini', label: 'Google Gemini' }, { value: 'compatible', label: 'API compatibile / modello locale' }], f.value || state.status?.model?.provider || 'gemini');
else
    control = field(f.key, friendly[f.key] || f.key, f.value, f.secret ? 'password' : 'text', `autocomplete="off" spellcheck="false" ${f.secret ? 'placeholder="' + (f.configured ? 'Già salvato · lascia vuoto per conservarlo' : 'Inserisci il segreto') + '"' : ''}`); return `<div class="setting-field">${control}<small>${esc(f.help)}</small>${f.secret && f.configured ? check('clear:' + f.key, 'Rimuovi il segreto salvato') : ''}</div>`; }).join('')}</div>${group === 'login' ? `<div class="callback-box"><span>${icon('link')} URI di redirect da registrare in Google Cloud</span><code>${esc(state.status.baseUrl)}/oauth/google/callback</code>${button(icon('copy') + ' Copia callback', 'copy-text', 'small', 'type="button" data-text="' + esc(state.status.baseUrl + '/oauth/google/callback') + '"')}</div><p class="microcopy">Accesso Google e accesso YouTube sono consensi diversi. I grant non vengono condivisi.</p>` : ''}${group === 'models' ? '<p class="microcopy">Il salvataggio non esegue chiamate al modello. “Test connessione” effettua una richiesta reale, che può essere a consumo. Cambiando modello embeddings, salva di nuovo le fonti per reindicizzarle.</p>' : ''}${group === 'email' ? '<p class="microcopy">Usiamo l’API HTTPS di Resend. Verifica il dominio mittente prima di attivare recupero password e registrazione.</p>' : ''}<div class="form-error" role="alert"></div><div class="actions"><button class="btn primary" type="submit">${icon('check')} Salva configurazione</button>${group === 'models' ? button('Test connessione', 'test-model', '', 'type="button"') : group === 'email' ? button('Invia email di test', 'test-email', '', 'type="button"') : ''}</div></form>`; }
function sharedAppsPage() { return `<div class="callout">Configura una sola volta le app developer dell’installazione. I clienti vedranno «Collega» e autorizzeranno i propri account. Il client secret rimane sul server; un workspace può scegliere un’app propria.</div><div class="platform-grid">${globalOAuthApps.map(a => `<article class="connection-card"><div class="connection-title">${socialMark(a.platforms[0])}<span><h3>${esc(a.label)}</h3><small>${a.configured ? 'App condivisa configurata' : 'Da configurare'}</small></span></div><p>${esc(a.platforms.map(p => state.status.platforms[p]?.label || p).join(' · '))}</p><div class="connection-actions">${button(icon('settings') + ' Configura', 'configure-shared-oauth', 'small', dataId(a.provider))}${a.provider === 'meta' && a.configured ? button('Webhook', 'shared-meta-webhook', 'small') : ''}</div></article>`).join('')}</div>`; }
function adminPage() { return head('Il centro di controllo.', 'Configurazione dell’installazione. Accessibile solo agli amministratori del servizio.', button(icon('code') + ' Anteprima .env', 'env-preview') + button(icon('download') + ' Esporta .env', 'env-export')) + (installation?.pendingRestart ? '<div class="callout warning">La URL pubblica è stata modificata. Riavvia il servizio per attivarla e aggiorna i redirect autorizzati nei provider.</div>' : '') + `<div class="admin-metrics"><span>${icon('team')}<b>${siteData?.users?.length || 0}</b> utenti</span><span>${icon('accounts')}<b>${siteData?.counts?.workspaces || 0}</b> workspace</span><span>${icon('knowledge')}<b>${siteData?.counts?.brands || 0}</b> brand</span><span>${icon('lock')} Segreti cifrati a riposo</span></div><div class="settings-tabs" role="tablist" aria-label="Impostazioni installazione">${Object.entries(groups).map(([k, t]) => `<button class="${installGroup === k ? 'active' : ''}" role="tab" aria-selected="${installGroup === k}" data-action="env-group" data-id="${k}">${t}</button>`).join('')}</div><section class="panel admin-config"><div class="panel-head"><h2>${groups[installGroup]}</h2><span class="badge">Installazione</span></div><div class="panel-body">${installGroup === 'oauth' ? sharedAppsPage() : envForm(installGroup)}</div></section><section class="panel section-space"><div class="panel-head"><h2>Utenti del servizio</h2><a href="#team">Gestisci il team ${icon('arrow')}</a></div><div class="table-wrap"><table><thead><tr><th>Email</th><th>Verifica</th><th>Accesso</th><th></th></tr></thead><tbody>${(siteData?.users || []).map(u => `<tr><td><b>${esc(u.email)}</b>${u.site_admin ? ' <span class="badge">Site admin</span>' : ''}</td><td>${u.verified ? 'Email verificata' : 'In attesa'}</td><td>${u.disabled ? 'Disabilitato' : 'Attivo'}</td><td>${!u.site_admin ? button(u.disabled ? 'Riabilita' : 'Disabilita', 'site-user', u.disabled ? 'small' : 'small danger', dataId(u.id) + ' data-disabled="' + u.disabled + '"') : ''}</td></tr>`).join('')}</tbody></table></div></section><section class="panel section-space"><div class="panel-head"><h2>Audit amministrativo</h2><span class="microcopy">Ultime 100 operazioni dell’installazione</span></div>${siteData?.audit?.length ? `<div class="audit-list">${siteData.audit.slice(0, 15).map(e => `<div>${icon('jobs')}<b>${esc(e.action)}</b><span>${time(e.at)}</span></div>`).join('')}</div>` : empty('Nessuna operazione amministrativa', 'Le modifiche di configurazione verranno registrate qui.')}</section>`; }
function teamPage() { return head('Le persone, al centro.', 'Ruoli espliciti. Inviti monouso. Ogni membro accede solo ai propri workspace.', button(icon('plus') + ' Invita una persona', 'invite-user', 'primary')) + `<div class="two-col"><section class="panel"><div class="panel-head"><h2>Il tuo team</h2><span class="badge">${teamData.length} membri</span></div><div class="team-list">${teamData.map(u => `<div><span class="avatar">${esc(u.email.slice(0, 2).toUpperCase())}</span><span><b>${esc(u.email)}</b><small>${esc(u.role)}${u.id === state.me.principal.userId ? ' · tu' : ''}</small></span><div class="actions">${button('Ruolo', 'member-role', 'small', dataId(u.id))}${u.id !== state.me.principal.userId ? button('Rimuovi', 'member-remove', 'small danger', dataId(u.id)) : ''}</div></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Inviti in attesa</h2><span class="badge">${invitationData.length}</span></div>${invitationData.length ? `<div class="invite-list">${invitationData.map(x => `<div><span><b>${esc(x.email)}</b><small>${esc(x.role)} · scade ${time(new Date(x.expires).toISOString())}</small></span>${button('Revoca', 'invite-revoke', 'small danger', dataId(x.id))}</div>`).join('')}</div>` : empty('Il team può crescere', 'Invita una persona via email o condividi il link monouso in modo sicuro.')}</section></div><section class="role-grid section-space">${[['viewer', 'Osserva', 'Legge i contenuti del workspace.'], ['editor', 'Crea', 'Scrive, genera e programma versioni già approvate.'], ['approver', 'Valida', 'Revisiona e approva, oltre a creare contenuti.'], ['admin', 'Gestisce', 'Gestisce brand, team, account e app OAuth.']].map(([r, t, d]) => `<article class="feature-card"><span class="badge">${r}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</section><div class="callout section-space">Un amministratore di workspace non può leggere o modificare i segreti dell’installazione. I privilegi di site admin sono assegnati dall’operatore sul server.</div>`; }
function settingsPage() { return legacySettingsPage().replace('Provider e segreti infrastrutturali si configurano in .env. Non vengono esposti nella dashboard.', 'Provider e segreti infrastrutturali si configurano nel pannello Amministrazione, riservato al gestore.').replace('Questa release non include SSO o un servizio di fatturazione.', 'Google OIDC è disponibile se configurato. Il prodotto non include fatturazione o SAML.') + `<section class="panel section-space"><div class="panel-head"><h2>${googleMark()} Accesso Google</h2><span class="badge">${state.me.googleLinked ? 'Collegato' : 'Non collegato'}</span></div><div class="panel-body"><p class="subtle">Collega il tuo profilo Google dopo aver effettuato l’accesso standard. Un indirizzo email uguale non basta a collegare automaticamente due identità.</p>${state.me.googleLinked ? '<p class="callout">Puoi usare Continua con Google nella schermata di accesso.</p>' : button(googleMark() + ' Collega Google', 'google-link', '', !publicConfig.google ? 'disabled' : '')}</div></section>`; }
async function refresh() { if (!state.me)
    return; const serial = ++rendering; state.view = location.hash.slice(1) || 'overview'; if (state.view === 'setup') {
    if (!may('admin'))
        throw new Error('Configurazione riservata agli amministratori');
    onboarding = await api('/api/onboarding');
    await experienceData();
    if (state.brand)
        await loadCollections(['knowledge']);
    shell(wizardPage());
    return;
} if (state.view === 'admin') {
    if (!state.me.siteAdmin) {
        shell(head('Accesso riservato', 'Solo l’amministratore dell’installazione può modificare questa configurazione.'));
        return;
    }
    [installation, siteData, globalOAuthApps] = await Promise.all([api('/api/admin/installation'), api('/api/admin/site'), api('/api/admin/oauth/apps')]);
    shell(adminPage());
    return;
} if (state.view === 'team') {
    if (!may('admin'))
        throw new Error('Accesso riservato agli amministratori');
    [teamData, invitationData] = await Promise.all([api('/api/admin/users'), api('/api/admin/invitations')]);
    shell(teamPage());
    return;
} if (!state.brand) {
    shell(head('Il tuo studio sta per nascere.', 'Configura il primo brand per dare voce alle tue idee.', may('admin') ? button(icon('setup') + ' Inizia dal wizard', 'go-setup', 'primary') : '') + `<section class="first-brand"><div>${hubArt()}</div><div><span class="handwritten">Una pagina bianca.<br>Infinite possibilità.</span><h2>Cominciamo dal tuo brand.</h2><p class="subtle">Niente dati fittizi: fonti, contenuti e canali si popoleranno con il tuo lavoro.</p>${may('admin') ? button(icon('plus') + ' Crea un brand', 'new-brand', 'primary') : ''}</div></section>`);
    return;
} if (state.view === 'accounts')
    await experienceData(); if (serial !== rendering)
    return; await legacyRefresh(); }
async function experienceData() { const result = await Promise.all([may('admin') ? api('/api/oauth/apps') : [], state.brand ? api(base() + '/connections') : [], state.me.siteAdmin ? api('/api/admin/installation') : null]); [oauthApps, connections, installation] = result; }
function bindExperience() { const env = $('#environment-form'); if (env)
    env.onsubmit = async (ev) => { ev.preventDefault(); const b = env.querySelector('[type=submit]'); b.disabled = true; try {
        const f = Object.fromEntries(new FormData(env)), values = {}, clear = [];
        for (const [k, v] of Object.entries(f)) {
            if (k === 'group')
                continue;
            if (k.startsWith('clear:'))
                clear.push(k.slice(6));
            else
                values[k] = v;
        }
        installation = await api('/api/admin/installation', 'PUT', { values, clear });
        state.status = await api('/api/status');
        const pc = await api('/api/public');
        publicConfig = { ...publicConfig, ...pc, google: true, supportEmail: pc.supportEmail || '0xfunboy@gmail.com', privacyUrl: pc.privacyUrl || '/privacy', termsUrl: pc.termsUrl || '/terms' };
        toast('Configurazione salvata. Il file .env è stato generato nel DATA_DIR.');
        await refresh();
    }
    catch (e) {
        $('.form-error', env).textContent = e.message;
    }
    finally {
        b.disabled = false;
    } }; const wf = $('#workspace-form'); if (wf)
    wf.onsubmit = async (ev) => { ev.preventDefault(); try {
        await api('/api/admin/workspace', 'PUT', Object.fromEntries(new FormData(wf)));
        state.me = await api('/api/me');
        toast('Workspace salvato');
    }
    catch (e) {
        $('.form-error', wf).textContent = e.message;
    } }; }
async function configureOAuth(provider, global = false) { await experienceData(); if (global)
    globalOAuthApps = await api('/api/admin/oauth/apps'); const a = (global ? globalOAuthApps : oauthApps).find(x => x.provider === provider); if (!a)
    throw new Error('Provider non disponibile'); form((global ? 'App condivisa · ' : 'Collega ') + a.label, global ? 'App del gestore: i workspace autorizzano solo i propri account, senza ricevere il client secret.' : 'App specifica del workspace, oppure app condivisa del gestore. I grant restano separati per brand.', `${a.inherited ? '<div class="callout warning">Stai usando l’app del gestore. Salvando qui crei un override: devi fornire il secret della tua app, non viene copiato quello condiviso.</div>' : ''}<div class="callout">1. Crea o apri la tua app nel portale ufficiale.<br>2. Registra la callback qui sotto e abilita i prodotti necessari.<br>3. Salva Client ID e secret, poi scegli Collega per il consenso.</div><a class="btn small" href="${safeUrl(a.docs)}" target="_blank" rel="noopener noreferrer">Apri la documentazione ufficiale ↗</a><div class="callback-box"><span>URI DI REDIRECT</span><code>${esc(a.redirectUri)}</code>${button(icon('copy') + ' Copia', 'copy-text', 'small', 'type="button" data-text="' + esc(a.redirectUri) + '"')}</div>${field('clientId', provider === 'tiktok' ? 'Client key' : 'Client ID', a.clientId, 'text', 'required autocomplete="off"')}${field('clientSecret', 'Client secret', '', 'password', 'autocomplete="off" placeholder="' + (a.hasSecret && !a.inherited ? 'Salvato · lascia vuoto per conservarlo' : 'Inserisci il secret della tua app') + '"')}${provider === 'meta' ? field('configId', 'Facebook Login for Business configuration ID (opzionale)', a.configId) + field('businessId', 'Business ID per discovery WhatsApp (opzionale)', a.businessId) : ''}${provider === 'discord' ? field('botToken', 'Token del bot Discord', '', 'password', 'autocomplete="off" placeholder="' + (a.hasBotToken ? 'Già salvato' : 'Richiesto per leggere i canali del bot') + '"') : ''}${provider === 'mastodon' ? field('instance', 'Origin della tua istanza HTTPS', a.instance, 'url', 'required') + '<p class="microcopy">L’origin deve anche essere autorizzata dal gestore in API & rete.</p>' : ''}${check('enabled', 'App abilitata', a.enabled)}${!global && !a.inherited && a.clientId ? button('Rimuovi override e usa app del gestore', 'use-shared-oauth', 'ghost small', 'type="button" data-id="' + esc(provider) + '"') : ''}<details><summary>Permessi di riferimento</summary><p class="wrap-code">${esc(a.scopes.join(' '))}</p><p class="microcopy">La richiesta effettiva usa solo gli scope necessari al canale scelto. I permessi dipendono dai prodotti approvati dal provider.</p></details>`, async (f) => { await api((global ? '/api/admin/oauth/apps/' : '/api/oauth/apps/') + provider, 'PUT', { ...f, enabled: !!f.enabled }); toast('App configurata. Ora collega il canale con OAuth.'); }); }
async function grantDialog(id) { const g = await api('/api/oauth/grants/' + id); const b = state.brands.find(x => x.id === g.brandId); if (b)
    state.brand = b; await refresh(); form('Scegli gli account da collegare', 'Destinazioni restituite dal provider. Nessun invio verrà eseguito.', `<div class="grant-list">${g.candidates.map((c, i) => `<label class="grant-option"><input type="checkbox" name="targets" value="${esc(c.key)}">${socialMark(c.platform)}<span><b>${esc(c.name)}</b><small>${esc(c.platform)} · ${esc(c.targetId)}</small></span></label>`).join('')}</div><p class="microcopy">${g.scopeStatus === 'not-reported' ? 'Il provider non restituisce un elenco completo degli scope. Verifica i permessi prima della pubblicazione.' : 'Permessi restituiti: ' + esc(g.scopes.join(', '))}</p>`, async (f, fd) => { const keys = fd.getAll('targets'); if (!keys.length)
    throw new Error('Seleziona almeno una destinazione'); await api('/api/oauth/grants/' + id, 'POST', { keys }); history.replaceState({}, '', '/app#accounts'); toast('Account collegati. Puoi controllare i permessi dalla pagina Canali.'); }, 'Collega gli account selezionati'); }
async function commandPalette() { modal(currentLang === 'it' ? 'Dove vuoi andare?' : 'Where do you want to go?', currentLang === 'it' ? 'Cerca una sezione, un contenuto o un canale del brand.' : 'Search for a section, content, or brand channel.', `<input id="command-search" class="command-input" type="search" aria-label="${esc(t('searchStudio'))}" placeholder="${currentLang === 'it' ? 'Calendario, un titolo, un canale…' : 'Calendar, title, channel…'}" autofocus><div class="command-results" id="command-results"></div>`); let items = Object.entries(labels).filter(([k]) => !['team', 'setup'].includes(k) || may('admin')).filter(([k]) => k !== 'admin' || state.me.siteAdmin).map(([id, label]) => ({ label, id, icon: id })); const draw = q => { $('#command-results').innerHTML = items.filter(x => x.label.toLowerCase().includes(q.toLowerCase()) || (labelsMap.it[x.id] && labelsMap.it[x.id].toLowerCase().includes(q.toLowerCase())) || (labelsMap.en[x.id] && labelsMap.en[x.id].toLowerCase().includes(q.toLowerCase()))).slice(0, 15).map(x => `<a href="#${esc(x.id)}" data-action="command-go" data-id="${esc(x.id)}">${icon(x.icon || 'contents')}<span>${esc(x.label)}</span>${icon('arrow')}</a>`).join('') || `<p class="subtle">${currentLang === 'it' ? 'Nessun risultato.' : 'No results.'}</p>`; }; draw(''); $('#command-search').oninput = ev => draw(ev.target.value); $('#command-search').focus(); if (state.brand) {
    const c = await api(base() + '/contents');
    items.push(...c.map(x => ({ label: x.data.title || (currentLang === 'it' ? 'Senza titolo' : 'Untitled'), id: 'content/' + x.id, icon: 'contents' })));
    if ($('#command-search'))
        draw($('#command-search').value);
} }
async function action(name, idValue, el) {
    if (name === 'theme') {
        applyTheme(theme() === 'dark' ? 'light' : 'dark');
        return;
    }
    if (name === 'toggle-lang') {
        setLang(currentLang === 'it' ? 'en' : 'it');
        return;
    }
    if (name === 'logout') {
        await api('/api/logout', 'POST', {});
        location.assign('/login');
        return;
    }
    if (name === 'google-login' || name === 'google-link') {
        const r = await api('/api/auth/google/start', 'POST', { link: name === 'google-link' });
        location.assign(r.url);
        return;
    }
    if (name === 'copy-text') {
        await navigator.clipboard.writeText(el.dataset.text);
        toast('Copiato');
        return;
    }
    if (name === 'go-setup' || name === 'go-channels' || name === 'go-knowledge' || name === 'go-team') {
        location.hash = ({ 'go-setup': 'setup', 'go-channels': 'accounts', 'go-knowledge': 'knowledge', 'go-team': 'team' })[name];
        return;
    }
    if (name === 'command')
        return commandPalette();
    if (name === 'command-go') {
        closeModal();
        location.hash = idValue;
        return;
    }
    if (name.startsWith('wizard-')) {
        let s = onboarding.step;
        if (name === 'wizard-next')
            s = Math.min(4, s + 1);
        if (name === 'wizard-back')
            s = Math.max(0, s - 1);
        if (name === 'wizard-jump')
            s = Number(idValue);
        if (name === 'wizard-complete') {
            onboarding = await api('/api/onboarding', 'PUT', { step: 4, completed: true });
            location.hash = 'overview';
            toast('Wizard completato. Nessuna pubblicazione è stata avviata.');
            return;
        }
        onboarding = await api('/api/onboarding', 'PUT', { step: s });
        await refresh();
        return;
    }
    if (name === 'webhook') {
        const e = connections.find(a => a.id === idValue) || state.data.accounts.find(a => a.id === idValue);
        if (!e)
            return;
        if (e.data.platform === 'telegram')
            return form('Attiva webhook Telegram', 'Questo sostituisce il webhook esistente del bot. Usa un bot distinto per ogni canale con inbox. Non vengono inviati post.', check('confirm', 'Confermo di impostare il webhook di questo bot', false, true), async () => { await api('/api/accounts/' + idValue + '/install-webhook', 'POST', {}); toast('Webhook registrato presso Telegram.'); }, 'Attiva webhook');
        if (e.connection?.provider === 'meta') {
            const w = await api('/api/oauth/meta/webhook');
            modal('Configura webhook Meta', 'Registra questa callback nella console developer della tua app. Il token di verifica non è un access token.', `<div class="callback-box"><b>Callback URL</b><code>${esc(w.url)}</code>${button(icon('copy') + ' Copia URL', 'copy-text', 'small', 'data-text="' + esc(w.url) + '"')}</div>${!w.managed ? `<div class="callback-box"><b>Verify token</b><code>${esc(w.verifyToken)}</code>${button(icon('copy') + ' Copia token', 'copy-text', 'small', 'data-text="' + esc(w.verifyToken) + '"')}</div>` : ''}<p class="microcopy">${esc(w.configuration)}</p>`);
            return;
        }
        return info('Webhook e ricezione', 'Per questo canale la ricezione guidata non è disponibile. I webhook di token Meta manuali si configurano nelle opzioni avanzate usando appSecret e webhookVerifyToken.');
    }
    if (name === 'configure-shared-oauth')
        return configureOAuth(idValue, true);
    if (name === 'shared-meta-webhook') {
        const w = await api('/api/admin/oauth/meta/webhook');
        return modal('Webhook Meta dell’installazione', 'Una callback per tutti i workspace che usano l’app del gestore.', `<div class="callback-box"><b>Callback</b><code>${esc(w.url)}</code>${button('Copia URL', 'copy-text', 'small', 'data-text="' + esc(w.url) + '"')}</div><div class="callback-box"><b>Verify token</b><code>${esc(w.verifyToken)}</code>${button('Copia token', 'copy-text', 'small', 'data-text="' + esc(w.verifyToken) + '"')}</div><p>${esc(w.configuration)}</p>`);
    }
    if (name === 'use-shared-oauth')
        return form('Rimuovi override del workspace', 'Verrà usata l’app condivisa del gestore, se configurata. Gli account autorizzati con un’altra app dovranno essere riconnessi.', check('confirm', 'Confermo la rimozione della configurazione locale', false, true), async () => { await api('/api/oauth/apps/' + idValue, 'DELETE'); toast('Override rimosso. Verifica e riconnetti gli account interessati.'); }, 'Usa app del gestore');
    if (name === 'configure-oauth')
        return configureOAuth(idValue);
    if (name === 'connect-oauth') {
        const r = await api(base() + '/oauth/' + idValue + '/start', 'POST', {});
        location.assign(r.url);
        return;
    }
    if (name === 'telegram-connect')
        return form('Collega Telegram', 'Aggiungi il bot al canale come amministratore. Verifichiamo bot, chat e permessi senza inviare messaggi.', `${field('botToken', 'Token da @BotFather', '', 'password', 'required autocomplete="off"')}${field('targetId', 'ID chat o @nomecanale', '', 'text', 'required')}<p class="microcopy">Per ricevere messaggi e approvazioni, configura il webhook dopo la connessione. Un bot può avere un solo webhook attivo.</p>`, async (f) => { await api(base() + '/connect-telegram', 'POST', f); toast('Bot e permessi verificati. Canale collegato.'); }, 'Verifica e collega');
    if (name === 'connection-check') {
        await api('/api/accounts/' + idValue + '/check', 'POST', {});
        toast('Verifica completata senza pubblicare contenuti.');
        await refresh();
        return;
    }
    if (name === 'connection-disconnect')
        return form('Scollegare questo account?', 'Il canale viene disabilitato e i token locali rimossi. I contenuti già pubblicati restano online. I grant remoti vanno revocati sul provider.', check('confirm', 'Confermo la disconnessione', false, true), async () => { await api('/api/accounts/' + idValue + '/disconnect', 'POST', {}); toast('Account scollegato localmente.'); }, 'Scollega account');
    if (name === 'env-group') {
        installGroup = idValue;
        await refresh();
        return;
    }
    if (name === 'env-preview') {
        installation = await api('/api/admin/installation');
        modal('Il tuo ambiente, senza segreti', 'Anteprima del file generato nel DATA_DIR. I token account rimangono cifrati nel database.', `<pre>${esc(installation.preview)}</pre><div class="actions">${button(icon('copy') + ' Copia versione oscurata', 'copy-text', '', `data-text="${esc(installation.preview)}"`)}${button('Chiudi', 'close-modal', 'primary')}</div>`);
        return;
    }
    if (name === 'env-export')
        return form('Esporta configurazione riservata', 'Il file contiene segreti infrastrutturali. Non condividerlo, non caricarlo nel repository e proteggilo come una password.', check('confirm', 'Confermo il download dei segreti sul dispositivo attuale', false, true), async () => { const r = await api('/api/admin/installation/export', 'POST', { includeSecrets: true }); downloadText(r.filename, r.content); toast('Esportazione eseguita e registrata nell’audit.'); }, 'Esporta .env con segreti');
    if (name === 'test-model' || name === 'test-email') {
        const r = await api('/api/admin/installation/' + name, 'POST', {});
        if (!r.ok)
            throw new Error('Il test non ha restituito un esito positivo.');
        toast(name === 'test-model' ? 'Il modello ha risposto correttamente.' : 'Email di test inviata al tuo indirizzo.');
        return;
    }
    if (name === 'invite-user')
        return form('Invita una persona', 'L’invito è monouso e scade dopo 72 ore. Con email configurata viene anche inviato al destinatario.', `${field('email', 'Email', '', 'email', 'required')}${select('role', 'Ruolo', ['viewer', 'editor', 'approver', 'admin'], 'editor')}`, async (f) => { const r = await api('/api/admin/invitations', 'POST', f); closeModal(); modal('Invito creato', r.delivered ? 'Email inviata. Puoi anche condividere il link in modo sicuro.' : 'Email non configurata: condividi questo link con il destinatario.', `<div class="callback-box"><code>${esc(r.url)}</code>${button(icon('copy') + ' Copia link', 'copy-text', 'primary', `data-text="${esc(r.url)}"`)}</div><p class="microcopy">Il link non sarà più mostrato dopo la chiusura.</p>${button('Chiudi', 'close-modal')}`); return false; }, 'Crea invito');
    if (name === 'invite-revoke') {
        await api('/api/admin/invitations/' + idValue, 'DELETE');
        await refresh();
        return;
    }
    if (name === 'member-role') {
        const u = teamData.find(x => x.id === idValue);
        return form('Ruolo nel workspace', u.email, select('role', 'Ruolo', ['viewer', 'editor', 'approver', 'admin'], u.role), async (f) => { await api('/api/admin/members/' + idValue, 'PUT', f); state.me = await api('/api/me'); toast('Ruolo aggiornato'); });
    }
    if (name === 'member-remove')
        return form('Rimuovi dal workspace', 'L’account personale rimane esistente. Rimuoviamo solo l’appartenenza a questo workspace.', check('confirm', 'Confermo la rimozione', false, true), async () => { await api('/api/admin/members/' + idValue, 'DELETE'); toast('Membro rimosso'); }, 'Rimuovi');
    if (name === 'site-user') {
        const disabled = el.dataset.disabled === '0';
        return form(disabled ? 'Disabilita accesso' : 'Riabilita accesso', 'La modifica riguarda l’intera installazione e invalida le sessioni esistenti.', check('confirm', 'Confermo la modifica', false, true), async () => { await api('/api/admin/site/users/' + idValue, 'PUT', { disabled }); toast('Accesso aggiornato'); });
    }
    if (name === 'resend-email')
        return form('Reinvia verifica', 'Riceverai un’email se il tuo indirizzo deve ancora essere verificato.', field('email', 'Email', '', 'email', 'required'), async (f) => { await api('/api/auth/resend', 'POST', f); toast('Richiesta inoltrata'); }, 'Invia');
    return legacyAction(name, idValue, el);
}
async function confirmIdentity() { return new Promise((resolve, reject) => { const d = $('#reauth-dialog'); d.innerHTML = `<form class="form" id="reauth-form"><div><span class="feature-icon tint-teal">${icon('lock')}</span><h2>Conferma la tua identità</h2><p class="subtle">Stai modificando una configurazione sensibile. La conferma vale per 15 minuti.</p></div>${field('reauthPassword', 'Password attuale', '', 'password', 'required autocomplete="current-password"')}<div class="form-error" role="alert"></div><div class="actions"><button type="button" id="reauth-cancel" class="btn">Annulla</button><button type="submit" class="btn primary">Conferma</button></div><p class="microcopy">Con un account solo Google, esci e accedi nuovamente con Google per una sessione recente; poi ripeti l’operazione.</p></form>`; const cancel = () => { d.close(); reject(new Error('Operazione annullata. Nessuna modifica applicata.')); }; d.oncancel = ev => { ev.preventDefault(); cancel(); }; $('#reauth-cancel').onclick = cancel; $('#reauth-form').onsubmit = async (ev) => { ev.preventDefault(); const f = ev.currentTarget, b = f.querySelector('[type=submit]'); b.disabled = true; try {
    await api('/api/auth/reauth', 'POST', { password: new FormData(f).get('reauthPassword') });
    d.close();
    resolve();
}
catch (e) {
    $('.form-error', f).textContent = e.message;
}
finally {
    b.disabled = false;
} }; d.showModal(); }); }
Object.assign(labels, { setup: 'Configurazione guidata', team: 'Team & accessi', admin: 'Amministrazione' });
function overviewPage() { return newOverview(); }
document.addEventListener('change', ev => { if (ev.target.matches('[data-password-toggle]')) {
    const p = $('#f-password');
    if (p)
        p.type = ev.target.checked ? 'text' : 'password';
} });
document.addEventListener('keydown', ev => { if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k' && state.me) {
    ev.preventDefault();
    commandPalette().catch(e => toast(e.message, true));
} });
try {
    applyTheme(localStorage.getItem('air3:theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}
catch {
    applyTheme('light');
}
try {
    const pc = await api('/api/public');
    publicConfig = { ...publicConfig, ...pc, google: true, supportEmail: pc.supportEmail || '0xfunboy@gmail.com', privacyUrl: pc.privacyUrl || '/privacy', termsUrl: pc.termsUrl || '/terms' };
}
catch { }
const path = location.pathname;
if (path === '/')
    landing();
else if (['/privacy', '/terms'].includes(path))
    legalPage(path);
else if (path === '/app') {
    try {
        const params = new URLSearchParams(location.search);
        if (params.has('workspace'))
            state.workspace = params.get('workspace');
        state.me = await api('/api/me');
        state.csrf = state.me.csrf;
        state.workspace = state.me.principal.workspaceId;
        onboarding = await api('/api/onboarding');
        if (!location.hash && !onboarding.completed && may('admin'))
            history.replaceState({}, '', '/app#setup');
        await init();
        if (params.has('grant'))
            await grantDialog(params.get('grant'));
        if (params.has('oauth_error'))
            toast(oauthError(params.get('oauth_error')), true);
        if (params.has('linked'))
            toast('Identità Google collegata al tuo account.');
    }
    catch (e) {
        if (state.me) {
            shell(head('Qualcosa non è andato a buon fine', esc(e.message), '<a class="btn" href="/app#overview">Torna allo studio</a>'));
        }
        else
            loginView();
    }
}
else
    authRoute(path);
