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
const labelsBase = { overview: 'Panoramica', contents: 'Contenuti', calendar: 'Calendario', knowledge: 'Conoscenza', accounts: 'Canali', assets: 'Media library', campaigns: 'Campagne', inbox: 'Inbox', analytics: 'Analytics', jobs: 'Attività', settings: 'Impostazioni', setup: 'Configurazione guidata', team: 'Team & accessi', admin: 'Amministrazione' };
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
        throw new Error(currentLang === 'it' ? 'Risposta server non leggibile' : 'Unreadable server response');
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
const time = v => v ? new Intl.DateTimeFormat(currentLang === 'it' ? 'it-IT' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: state.brand?.data.timezone || 'Europe/Rome' }).format(new Date(v)) : '—';
function head(title, sub, actions = '') { return `<div class="heading"><div><div class="eyebrow">Editorial workspace</div><h1>${esc(title)}</h1><p class="subtle">${sub}</p></div><div class="actions">${actions}</div></div>`; }
function empty(title, sub, action = '') { return `<div class="empty"><strong>${esc(title)}</strong>${esc(sub)}${action ? '<br>' + action : ''}</div>`; }
function modal(title, sub, html) {
    const d = $('#dialog');
    $('#dialog-content').innerHTML = `<div class="dialog-head"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>${button('✕', 'close-modal', 'ghost small', 'aria-label="' + (currentLang === 'it' ? 'Chiudi' : 'Close') + '"')}</div>${html}`;
    if (!d.open)
        d.showModal();
}
function closeModal() { $('#dialog').close(); }
function info(title, data) { modal(title, currentLang === 'it' ? 'Dati restituiti dal sistema' : 'System output data', `<pre>${esc(typeof data === 'string' ? data : JSON.stringify(data, null, 2))}</pre>`); }
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
        throw new Error(currentLang === 'it' ? 'Il campo JSON contiene un errore di sintassi' : 'JSON field syntax error');
    }
};
function form(title, sub, html, onSubmit, label = (currentLang === 'it' ? 'Salva' : 'Save')) {
    const cancelLabel = currentLang === 'it' ? 'Annulla' : 'Cancel';
    const submitLabel = (label === 'Salva' && currentLang !== 'it') ? 'Save' : label;
    modal(title, sub, `<form class="form" id="edit-form">${html}<div class="form-error" id="form-error" role="alert"></div><div class="dialog-footer">${button(cancelLabel, 'close-modal', '', 'type="button"')}<button type="submit" class="btn primary">${submitLabel}</button></div></form>`);
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
    const isIt = currentLang === 'it';
    if (!rows.length)
        return empty(isIt ? 'Nessun contenuto da mostrare' : 'No content to display', isIt ? 'Le bozze e i contenuti programmati compariranno qui.' : 'Drafts and scheduled content will appear here.');
    return `<div class="table-wrap"><table><thead><tr><th>${isIt ? 'CONTENUTO' : 'CONTENT'}</th>${compact ? '' : `<th>${isIt ? 'CANALE' : 'CHANNEL'}</th>`}<th>${isIt ? 'STATO' : 'STATUS'}</th><th>${compact ? (isIt ? 'CANALE' : 'CHANNEL') : (isIt ? 'PROGRAMMAZIONE' : 'SCHEDULE')}</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td><a href="#content/${x.id}"><b class="truncate">${esc(x.data.title || (isIt ? 'Senza titolo' : 'Untitled'))}</b></a><div class="subtle truncate">${esc(x.data.text?.slice(0, 80) || x.data.objective || (isIt ? 'Bozza da sviluppare' : 'Draft to develop'))}</div></td>${compact ? '' : `<td>${platform(x.data.platform)}</td>`}<td>${badge(x.data.status)}</td><td>${compact ? platform(x.data.platform) : `<span class="subtle">${time(x.data.scheduleAt)}</span>`}</td><td><a class="btn small ghost" href="#content/${x.id}">${isIt ? 'Apri ↗' : 'Open ↗'}</a></td></tr>`).join('')}</tbody></table></div>`;
}
function legacyOverviewPage() { const cs = state.data.contents, accounts = state.data.accounts, docs = state.data.knowledge; const count = s => cs.filter(x => s.includes(x.data.status)).length; const stats = [['Da approvare', count(['WAITING_APPROVAL', 'REVIEW_FAILED']), 'Controllo editoriale'], ['Programmati', count(['SCHEDULED', 'PROCESSING']), 'Nella coda di pubblicazione'], ['Pubblicati / inviati', count(['PUBLISHED']), 'Esiti confermati dal provider'], ['Canali configurati', accounts.length, 'Credenziali salvate, non test live']]; const upcoming = cs.filter(x => ['SCHEDULED', 'WAITING_APPROVAL', 'REVIEW_FAILED', 'GENERATING', 'PROCESSING'].includes(x.data.status)).slice(0, 6); return head('Ogni contenuto, sotto controllo.', `Il workspace di <b>${esc(state.brand.data.name)}</b>. Dall’idea alla pubblicazione, con fonti e revisioni tracciate.`, may('editor') ? button('+ Nuovo contenuto', 'new-content', 'primary') : '') + `<div class="cards">${stats.map(([label, n, sub], i) => `<div class="card"><div class="overline">${label}<span class="metric-dot ${i === 2 ? 'green' : ''}"></span></div><div class="metric">${n}</div><div class="caption">${sub}</div></div>`).join('')}</div><div class="split"><div class="panel"><div class="panel-head"><h2>In lavorazione</h2><a href="#contents" class="subtle">Tutti i contenuti ↗</a></div>${postsTable(upcoming, true)}</div><div class="panel"><div class="panel-head"><h2>Il tuo sistema editoriale</h2><span class="badge">${docs.filter(x => x.data.approved).length} fonti</span></div><div class="panel-body steps">${[[true, 'Identità del brand', 'Tono, obiettivi e vincoli sempre nel contesto.'], [docs.some(x => x.data.approved), 'Conoscenza verificata', 'Carica le fonti e approvale per abilitarne il recupero.'], [accounts.length > 0, 'Canali e autorizzazioni', 'Collega gli account con API ufficiali o Postiz.'], [state.status.model.configured, 'Agenti specializzati', state.status.model.configured ? 'Modello: ' + state.status.model.name : 'Configura provider e modello nel file .env.']].map(([done, title, sub], i) => `<div class="step"><div class="step-num ${done ? 'done' : ''}">${done ? '✓' : i + 1}</div><div><h3>${title}</h3><p>${esc(sub)}</p></div></div>`).join('')}<div class="status-strip"><span>Storage locale</span><span>${state.status.embeddings.configured ? 'Retrieval ibrido' : 'Retrieval lessicale'}</span></div></div></div></div><div class="callout section-space">Gli agenti preparano i contenuti. I permessi, le approvazioni e l’invio sono gestiti dal backend. La pubblicazione automatica è ${state.brand.data.policy.autoPublish ? 'abilitata solo per la policy testuale limitata del brand' : 'disattivata'}.</div>`; }
function contentsPage() {
    const isIt = currentLang === 'it';
    return head(labels.contents || 'Content', isIt ? 'Brief, copy, visual e approvazioni. Ogni versione ha una propria traccia.' : 'Briefs, copy, visuals, and approvals. Every version has an audit trail.', may('editor') ? button('+ ' + (isIt ? 'Nuovo contenuto' : 'New Content'), 'new-content', 'primary') : '') + `<div class="toolbar"><input id="content-search" class="filter" aria-label="${isIt ? 'Cerca contenuti' : 'Search content'}" placeholder="${isIt ? 'Cerca per titolo o testo' : 'Search by title or text'}"><select id="status-filter" class="filter" aria-label="${isIt ? 'Filtra stato' : 'Filter status'}"><option value="">${isIt ? 'Tutti gli stati' : 'All statuses'}</option>${Object.entries(statusLabels).slice(0, 15).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div><div class="panel" id="content-table">${postsTable(state.data.contents)}</div><p class="footer-note">${isIt ? 'Una bozza può essere adattata a più canali. Ogni destinazione richiede la propria revisione e approvazione.' : 'A single draft can be adapted across multiple channels. Every target requires independent review and approval.'}</p>`;
}
function contentPage(e) {
    const isIt = currentLang === 'it';
    const d = e.data, mutable = ['DRAFT', 'GENERATED', 'REVIEW_FAILED', 'REVIEW_REQUIRED', 'WAITING_APPROVAL', 'APPROVED', 'FAILED', 'REJECTED'].includes(d.status);
    let actions = '';
    if (may('editor') && mutable)
        actions += button(isIt ? 'Modifica' : 'Edit', 'edit-content', '', dataId(e.id)) + button(isIt ? 'Genera con AI' : 'Generate with AI', 'generate', 'primary', dataId(e.id));
    if (may('editor') && mutable)
        actions += button(isIt ? 'Revisiona' : 'Review', 'review', '', dataId(e.id));
    if (may('approver') && mutable && d.review)
        actions += button(isIt ? 'Approva' : 'Approve', 'approve', 'dark', dataId(e.id));
    if (d.status === 'APPROVED' && may('editor'))
        actions += button(isIt ? 'Programma' : 'Schedule', 'schedule', 'primary', dataId(e.id));
    if (d.status === 'SCHEDULED' && may('editor'))
        actions += button(isIt ? 'Annulla programmazione' : 'Cancel schedule', 'cancel-content', 'danger', dataId(e.id));
    if (['UNCERTAIN', 'PROCESSING'].includes(d.status) && may('admin'))
        actions += button(isIt ? 'Riconcilia esito' : 'Reconcile status', 'reconcile', 'danger', dataId(e.id));
    return head(d.title || (isIt ? 'Bozza senza titolo' : 'Untitled draft'), `${platform(d.platform)} &nbsp; ${badge(d.status)} &nbsp; <span class="subtle">${isIt ? 'Versione' : 'Version'} ${e.revision} · ${time(e.updatedAt)}</span>`, actions) + `<div class="detail-grid"><div class="stack"><div class="panel"><div class="panel-head"><h2>${isIt ? 'Anteprima editoriale' : 'Editorial Preview'}</h2><span class="badge">${esc(d.format)}</span></div><div class="panel-body"><div class="preview">${esc(d.text || (isIt ? 'Il testo non è ancora stato scritto.' : 'Text has not been written yet.'))}</div><div class="tag-list">${d.hashtags.map(h => `<span class="badge">${esc(h.startsWith('#') ? h : '#' + h)}</span>`).join('')}</div><div class="preview-media">${d.media.map(m => m.mime.startsWith('video/') ? `<video src="${safeUrl(m.url)}" controls preload="metadata"></video>` : `<img src="${safeUrl(m.url)}" alt="${esc(m.alt || d.title)}">`).join('')}</div></div></div>${d.strategy ? `<div class="panel"><div class="panel-head"><h2>${isIt ? 'Brief strategico' : 'Strategic Brief'}</h2></div><div class="panel-body"><div class="preview subtle">${esc(d.strategy.rationale || '')}</div><div class="tag-list"><span class="badge">${esc(d.strategy.target || '')}</span><span class="badge">${esc(d.strategy.angle || '')}</span></div></div></div>` : ''}${d.options.videoScript || d.options.voiceoverScript ? `<div class="panel"><div class="panel-head"><h2>${isIt ? 'Script e voiceover' : 'Script & Voiceover'}</h2></div><div class="panel-body"><div class="preview subtle">${esc(d.options.videoScript || '')}\n\n${esc(d.options.voiceoverScript || '')}</div></div></div>` : ''}</div><aside class="detail-side"><div class="panel"><div class="panel-head"><h2>${isIt ? 'Controllo qualità' : 'Quality Guardrails'}</h2>${d.review ? `<span class="badge">${d.review.score}/100</span>` : ''}</div><div class="panel-body">${d.review ? `<div class="subtle">${d.review.passed ? (isIt ? 'Controlli automatici superati' : 'Automated checks passed') : (isIt ? 'Sono presenti segnalazioni' : 'Issues detected')}</div><ul class="checklist">${d.review.issues.map(i => `<li>${esc(i)}</li>`).join('') || `<li>${isIt ? 'Nessuna segnalazione automatica.' : 'No automated issues.'}</li>`}</ul><p class="footer-note">${esc(d.review.version)} · ${isIt ? 'Lo score non è una probabilità di correttezza.' : 'Score does not reflect absolute factual accuracy.'}</p>` : empty(isIt ? 'Revisione da eseguire' : 'Review pending', isIt ? 'Salva o genera il contenuto, quindi avvia i controlli.' : 'Save or generate content, then run guardrail checks.')}</div></div><div class="panel"><div class="panel-head"><h2>${isIt ? 'Fonti e destinazione' : 'Sources & Target'}</h2></div><div class="panel-body"><div class="kicker">${isIt ? 'Obiettivo' : 'Objective'}</div><p class="subtle">${esc(d.objective || (isIt ? 'Non specificato' : 'Unspecified'))}</p><div class="kicker">${isIt ? 'Account' : 'Channel'}</div><p class="subtle">${esc(state.data.accounts.find(a => a.id === d.accountId)?.data.name || d.accountId)}</p><div class="kicker">${isIt ? 'Fonti recuperate' : 'Retrieved sources'}</div><p class="subtle">${new Set(d.sourceIds.map(x => x.split(':')[0])).size} ${isIt ? 'documenti' : 'documents'} · ${d.claims.length} ${isIt ? 'claim tracciati' : 'tracked claims'}</p>${button(isIt ? 'Ispeziona fonti e metadati' : 'Inspect sources & metadata', 'inspect-content', 'small', dataId(e.id))}</div></div>${d.approval ? `<div class="callout">${isIt ? 'Approvato da' : 'Approved by'} <b>${esc(d.approval.userId)}</b><br>${time(d.approval.at)}<br>${isIt ? 'La firma lega contenuto, fonti, brand e account.' : 'Cryptographic signature binds content, sources, brand, and target account.'}</div>` : ''}${d.publication ? `<div class="panel"><div class="panel-head"><h2>${isIt ? 'Ricevuta provider' : 'Provider Receipt'}</h2></div><div class="panel-body"><p class="id-code">${esc(d.publication.externalId)}</p>${badge(d.publication.state)}${d.publication.details?.delivery ? `<p class="subtle">${isIt ? 'Consegna:' : 'Delivery:'} ${esc(d.publication.details.delivery)}</p>` : ''}${d.publication.url ? `<p><a href="${safeUrl(d.publication.url)}" target="_blank" rel="noopener noreferrer">${isIt ? 'Apri sul social ↗' : 'Open on platform ↗'}</a></p>` : ''}</div></div>` : ''}<div class="actions">${may('editor') ? button(isIt ? 'Adatta ad altri canali' : 'Adapt to other channels', 'adapt', 'small', dataId(e.id)) : ''}${may('approver') && mutable ? button(isIt ? 'Rifiuta' : 'Reject', 'reject-content', 'small danger', dataId(e.id)) : ''}${may('editor') && mutable ? button(isIt ? 'Solo copy' : 'Copy only', 'generate-copy', 'small', dataId(e.id)) + button(isIt ? 'Solo visual' : 'Visual only', 'generate-visual', 'small', dataId(e.id)) : ''}</div><div class="footer-note">${e.history.length} ${isIt ? 'versioni precedenti conservate. Nessuna pubblicazione viene cancellata dal social attraverso questa schermata.' : 'previous versions preserved. No live network publication is deleted via this interface.'}</div></aside></div>`;
}
function calendarPage() {
    const isIt = currentLang === 'it';
    const y = state.month.getFullYear(), m = state.month.getMonth(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, start = new Date(y, m, 1 - offset), today = new Date().toDateString();
    const cs = state.data.contents.filter(x => x.data.scheduleAt);
    const title = new Intl.DateTimeFormat(isIt ? 'it-IT' : 'en-US', { month: 'long', year: 'numeric' }).format(first);
    const weekdays = isIt ? ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return head(labels.calendar || 'Calendar', isIt ? `Orari visualizzati in ${esc(state.brand.data.timezone)}. Le idee del planner restano proposte.` : `Times shown in ${esc(state.brand.data.timezone)}. Planner ideas remain proposals.`, may('editor') ? button(isIt ? 'Genera piano settimanale' : 'Generate weekly plan', 'plan', 'primary') : '') + `<div class="toolbar">${button('←', 'prev-month', 'small')}${button(isIt ? 'Oggi' : 'Today', 'today-month', 'small')}<b>${esc(title)}</b>${button('→', 'next-month', 'small')}<div class="actions">${button(isIt ? 'Esporta .ics' : 'Export .ics', 'export-calendar', 'small')}</div></div><div class="table-wrap"><div class="calendar">${weekdays.map(x => `<div class="weekday">${x}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); const events = cs.filter(c => new Intl.DateTimeFormat('en-CA', { timeZone: state.brand.data.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(c.data.scheduleAt)) === key); return `<div class="day ${date.getMonth() !== m ? 'out' : ''} ${date.toDateString() === today ? 'today' : ''}"><div class="date">${date.getDate()}</div>${events.map(e => `<a class="event" href="#content/${e.id}" title="${esc(e.data.title)}">${esc(e.data.platform)} · ${esc(e.data.title)}</a>`).join('')}</div>`; }).join('')}</div></div><div class="section-title"><h2>${isIt ? 'Proposte editoriali' : 'Editorial Proposals'}</h2><span class="subtle">${isIt ? 'Nessun invio automatico dal piano' : 'No automated publishing from plan'}</span></div>${state.data.plans.length ? `<div class="grid">${state.data.plans.map(e => `<div class="card"><div class="card-header"><b>${isIt ? 'Piano del' : 'Plan from'} ${time(e.createdAt)}</b><span class="badge">${esc(e.data.status)}</span></div><div class="card-body">${e.data.ideas.map(i => `<p>${esc(i.topic)}<br><small>${esc(i.format)} · ${time(i.suggestedAt)}</small></p>`).join('')}</div>${may('editor') && e.data.status === 'PROPOSED' ? button(isIt ? 'Crea le bozze' : 'Create drafts', 'plan-drafts', 'small', dataId(e.id)) : ''}</div>`).join('')}</div>` : `<div class="panel">${empty(isIt ? 'Nessun piano proposto' : 'No plans proposed', isIt ? 'Il planner usa obiettivi, campagne e storico per suggerire fino a sette idee.' : 'The planner leverages goals, campaigns, and history to suggest up to seven ideas.')}</div>`}`;
}
function knowledgePage() {
    const isIt = currentLang === 'it';
    return head(labels.knowledge || 'Brand Knowledge', isIt ? 'Fonti approvate, recupero selettivo e contesto specifico per ogni agente.' : 'Approved sources, selective retrieval, and agent-specific context.', may('editor') ? button('+ ' + (isIt ? 'Aggiungi documento' : 'Add Document'), 'new-knowledge', 'primary') : '') + `<div class="callout">${isIt ? 'Le regole obbligatorie del brand vengono sempre fornite agli agenti. Il retrieval aggiunge soltanto i frammenti pertinenti delle fonti approvate. Modalità:' : 'Mandatory brand guidelines are always provided to agents. Retrieval injects only relevant excerpts from approved sources. Mode:'} <b>${state.status.embeddings.configured ? (isIt ? 'ibrida, con fallback lessicale' : 'hybrid, with lexical fallback') : (isIt ? 'lessicale; embeddings non configurati' : 'lexical; embeddings not configured')}</b>.</div><div class="toolbar"><input class="filter" id="rag-query" placeholder="${isIt ? 'Es. risparmio per i pendolari' : 'e.g. commuter savings'}" aria-label="Query RAG"><select id="rag-role" class="filter" aria-label="Ruolo RAG">${['copywriter', 'strategist', 'creative', 'reviewer', 'analyst'].map(x => `<option>${x}</option>`).join('')}</select>${button(isIt ? 'Prova retrieval' : 'Test retrieval', 'test-rag', 'small')}</div><div id="rag-results"></div>${state.data.knowledge.length ? `<div class="grid">${state.data.knowledge.map(e => `<div class="card"><div class="card-header"><span class="badge">${esc(e.data.type)}</span>${badge(e.data.approved ? 'APPROVED' : 'DRAFT')}</div><h3>${esc(e.data.title)}</h3><div class="card-body">${esc(e.data.text.slice(0, 180))}${e.data.text.length > 180 ? '…' : ''}</div><div class="tag-list">${e.data.roles.map(r => `<span class="badge">${esc(r)}</span>`).join('')}</div><p class="id-code">${e.data.chunkCount} ${isIt ? 'frammenti' : 'chunks'} · v${e.revision} · ${e.data.embeddingModel ? (isIt ? 'vettori + testo' : 'vectors + text') : (isIt ? 'testo' : 'text')}</p><div class="card-footer">${may('editor') ? button(isIt ? 'Modifica' : 'Edit', 'edit-knowledge', 'small', dataId(e.id)) : ''}${may('approver') ? button(e.data.approved ? (isIt ? 'Revoca approvazione' : 'Revoke approval') : (isIt ? 'Approva fonte' : 'Approve source'), 'approve-knowledge', 'small', dataId(e.id)) + button(isIt ? 'Elimina' : 'Delete', 'delete-knowledge', 'small danger', dataId(e.id)) : ''}</div></div>`).join('')}</div>` : `<div class="panel">${empty(isIt ? 'Nessuna fonte caricata' : 'No sources uploaded', isIt ? 'Aggiungi linee guida, FAQ, caratteristiche prodotto, claim documentati ed esempi di post.' : 'Add guidelines, FAQs, product specs, documented claims, and reference posts.')}</div>`}`;
}
function legacyAccountsPage() {
    const isIt = currentLang === 'it';
    const connected = state.data.accounts;
    return head(labels.accounts || 'Channels', isIt ? 'API ufficiali, credenziali cifrate e una destinazione esplicita per ogni account.' : 'Official APIs, encrypted secrets, and an explicit destination for each account.', may('admin') ? button('+ ' + (isIt ? 'Collega canale' : 'Connect Channel'), 'new-account', 'primary') : '') + `<div class="callout warning">${isIt ? '“Configurato” indica che le credenziali sono state salvate. Accessi, scope, audit e formati dipendono dal provider. Il prodotto non aggira approvazioni delle app o limitazioni delle piattaforme.' : '“Configured” indicates credentials are saved. Access, scopes, and formats depend on providers. The platform does not bypass provider approval policies.'}</div>${connected.length ? `<div class="grid">${connected.map(e => `<div class="card"><div class="card-header">${platform(e.data.platform)}<span class="badge ${e.data.enabled ? 'APPROVED' : 'FAILED'}">${e.data.enabled ? (isIt ? 'Configurato' : 'Configured') : (isIt ? 'Disabilitato' : 'Disabled')}</span></div><h3>${esc(e.data.name)}</h3><p class="id-code">${esc(e.data.targetId)}</p><div class="card-body">${isIt ? 'Trasporto:' : 'Transport:'} <b>${esc(e.data.transport)}</b><br>${esc(state.status.platforms[e.data.platform].notes)}</div><div class="card-footer">${may('admin') ? button(isIt ? 'Configura' : 'Configure', 'edit-account', 'small', dataId(e.id)) : ''}${may('admin') && e.data.transport === 'postiz' ? button('OAuth', 'account-connect', 'small', dataId(e.id)) + button(isIt ? 'Elenco canali' : 'Channel list', 'postiz-integrations', 'small', dataId(e.id)) : ''}${may('admin') && e.data.platform === 'telegram' && e.data.transport === 'direct' ? button(isIt ? 'Installa webhook' : 'Install webhook', 'install-webhook', 'small', dataId(e.id)) : ''}${e.data.platform === 'tiktok' && e.data.transport === 'direct' ? button('Creator info', 'creator-info', 'small', dataId(e.id)) : ''}</div></div>`).join('')}</div>` : `<div class="panel">${empty(isIt ? 'Nessun canale collegato' : 'No channels connected', isIt ? 'Aggiungi un account diretto o una destinazione gestita da Postiz.' : 'Add a direct account or a Postiz-managed destination.')}</div>`}<div class="section-title"><h2>${isIt ? 'Catalogo integrazioni' : 'Integrations Catalog'}</h2><span class="subtle">${Object.keys(state.status.platforms).length} ${isIt ? 'tipi di canale' : 'channel types'}</span></div><div class="grid">${Object.entries(state.status.platforms).map(([k, c]) => `<div class="card"><div class="card-header">${platform(k)}</div><div class="card-body">${esc(c.notes)}</div><div class="tag-list">${c.native.length ? `<span class="badge">${isIt ? 'Client diretto' : 'Direct client'}</span>` : ''}${c.postiz ? '<span class="badge">Postiz</span>' : ''}</div><p class="footer-note">${isIt ? 'Formati diretti:' : 'Direct formats:'} ${esc(c.native.join(', ') || (isIt ? 'nessuno; usare Postiz' : 'none; use Postiz'))}</p></div>`).join('')}</div>`;
}
function assetsPage() {
    const isIt = currentLang === 'it';
    return head(labels.assets || 'Media Library', isIt ? 'Asset del brand, template deterministici e video editoriali da slide.' : 'Brand assets, deterministic templates, and slide-based editorial videos.', may('editor') ? button(isIt ? 'Crea visual' : 'Create visual', 'render', '') + button(isIt ? 'Crea video' : 'Create video', 'video', '') + button('↑ ' + (isIt ? 'Carica media' : 'Upload media'), 'upload', 'primary') : '') + `<input type="file" id="media-upload" accept="image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav" multiple hidden>${state.data.assets.length ? `<div class="grid">${state.data.assets.map(e => `<div class="card">${e.data.mime.startsWith('image/') ? `<img class="asset-cover" src="${safeUrl(e.data.url)}" alt="${esc(e.data.alt || e.data.name)}" loading="lazy">` : `<div class="asset-cover video">${e.data.mime.startsWith('video/') ? '▶' : '♫'}</div>`}<h3>${esc(e.data.name)}</h3><div class="card-body">${esc(e.data.mime)} · ${(e.data.size / 1024 / 1024).toFixed(2)} MB<br>${e.data.width ? `${e.data.width} × ${e.data.height}` : ''}${e.data.duration ? ` · ${Math.round(e.data.duration)} s` : ''}</div><div class="card-footer"><a class="btn small" href="${safeUrl(e.data.url)}" target="_blank" rel="noopener noreferrer">${isIt ? 'Apri asset ↗' : 'Open asset ↗'}</a>${button(isIt ? 'Copia ID' : 'Copy ID', 'copy-id', 'small', dataId(e.id))}</div></div>`).join('')}</div>` : `<div class="panel">${empty(isIt ? 'La libreria è pronta' : 'Library is ready', isIt ? 'Carica immagini, video, audio o crea un visual con logo, headline e colori del brand.' : 'Upload images, video, audio, or generate a branded visual with logo and headline.')}</div>`}<p class="footer-note">${isIt ? 'File verificati con FFmpeg. Massimo 128 MB, 40 megapixel o 15 minuti per asset locale. I limiti dei social possono essere inferiori.' : 'Files verified via FFmpeg. Up to 128 MB, 40 MP, or 15 min per local asset. Platform limits may be lower.'}</p>`;
}
function campaignsPage() {
    const isIt = currentLang === 'it';
    return head(labels.campaigns || 'Campaigns', isIt ? 'Obiettivi e vincoli commerciali con un intervallo di validità esplicito.' : 'Commercial objectives and constraints with explicit timeframe boundaries.', may('editor') ? button('+ ' + (isIt ? 'Nuova campagna' : 'New Campaign'), 'new-campaign', 'primary') : '') + (state.data.campaigns.length ? `<div class="grid">${state.data.campaigns.map(e => `<div class="card"><div class="card-header"><h3>${esc(e.data.name)}</h3>${badge(e.data.active ? 'APPROVED' : 'DRAFT')}</div><p class="card-body">${esc(e.data.objective)}</p><p class="card-body">${esc(e.data.brief)}</p><p class="subtle">${time(e.data.startAt)}<br>${time(e.data.endAt)}</p>${may('editor') ? button(isIt ? 'Modifica' : 'Edit', 'edit-campaign', 'small', dataId(e.id)) : ''}</div>`).join('')}</div>` : `<div class="panel">${empty(isIt ? 'Nessuna campagna attiva' : 'No active campaigns', isIt ? 'Crea una campagna per guidare strategia, calendario e generazione.' : 'Create a campaign to steer strategy, calendar, and AI generation.')}</div>`);
}
function inboxPage() {
    const isIt = currentLang === 'it';
    return head(labels.inbox || 'Inbox', isIt ? 'Messaggi ricevuti tramite webhook verificati. Le risposte passano dal workflow editoriale.' : 'Inbound messages received via verified webhooks. Replies route through the editorial workflow.', may('admin') ? button('+ ' + (isIt ? 'Registra contatto' : 'Register Contact'), 'new-contact', 'primary') : '') + `<div class="callout">${isIt ? 'WhatsApp, Messenger e Instagram Direct usano una finestra di risposta registrata dal webhook, non dichiarata dall’AI. Fuori finestra WhatsApp richiede un template e un consenso registrato.' : 'WhatsApp, Messenger, and Instagram Direct enforce a 24-hour response window tracked via webhook. Outside the window, WhatsApp requires pre-approved templates and recorded opt-in.'}</div><div class="panel">${state.data.inbox.length ? `<table><thead><tr><th>${isIt ? 'CONVERSAZIONE' : 'CONVERSATION'}</th><th>${isIt ? 'CANALE' : 'CHANNEL'}</th><th>${isIt ? 'RICEVUTO' : 'RECEIVED'}</th><th></th></tr></thead><tbody>${state.data.inbox.map(e => `<tr><td><b>${esc(e.data.recipient)}</b><div class="subtle preview">${esc(e.data.text.slice(0, 1000))}</div></td><td>${platform(e.data.platform)}<br><span class="badge">${esc(e.data.status)}</span></td><td>${time(e.data.at)}</td><td>${may('editor') ? button(isIt ? 'Prepara risposta' : 'Draft reply', 'reply-draft', 'small', dataId(e.id)) + button(isIt ? 'Chiudi' : 'Close', 'close-inbox', 'small ghost', dataId(e.id)) : ''}</td></tr>`).join('')}</tbody></table>` : empty(isIt ? 'Nessun messaggio ricevuto' : 'No messages received', isIt ? 'Configura le sottoscrizioni webhook del provider e la verifica della firma.' : 'Configure provider webhook subscriptions and signature verification.')}</div><div class="section-title"><h2>${isIt ? 'Rubrica autorizzata' : 'Authorized Contacts'}</h2></div><div class="panel">${state.data.contacts.length ? `<table><thead><tr><th>${isIt ? 'CONTATTO' : 'CONTACT'}</th><th>${isIt ? 'CONSENSO TEMPLATE' : 'TEMPLATE CONSENT'}</th><th>${isIt ? 'ULTIMO INBOUND' : 'LAST INBOUND'}</th></tr></thead><tbody>${state.data.contacts.map(e => `<tr><td><b>${esc(e.data.name)}</b><div class="id-code">${esc(e.data.recipient)}</div></td><td>${e.data.optIn ? (isIt ? 'Registrato' : 'Opted-in') : (isIt ? 'Non registrato' : 'Not opted-in')}</td><td>${time(e.data.lastInboundAt)}</td></tr>`).join('')}</tbody></table>` : empty(isIt ? 'Rubrica vuota' : 'Contact book empty', isIt ? 'I messaggi in ingresso registrano la conversazione, ma non inventano un consenso marketing.' : 'Inbound messages track conversations, but do not imply marketing consent.')}</div>`;
}
function analyticsPage() {
    const isIt = currentLang === 'it';
    const metrics = state.data.metrics, latest = new Map();
    for (const m of metrics) {
        const old = latest.get(m.data.contentId);
        if (!old || old.data.collectedAt < m.data.collectedAt)
            latest.set(m.data.contentId, m);
    }
    const actual = [...latest.values()];
    return head(isIt ? 'Dai risultati, nuove domande.' : 'From results, new questions.', isIt ? 'Osservazioni reali, provenienza esplicita e insight da validare prima di inserirli nella memoria.' : 'Real observations, explicit provenance, and insights validated before entering memory.', may('editor') ? button(isIt ? 'Importa metriche' : 'Import metrics', 'import-metrics', '') + button(isIt ? 'Analizza con AI' : 'Analyze with AI', 'analyze', 'primary') : '') + `<div class="cards"><div class="card"><div class="overline">${isIt ? 'Contenuti misurati' : 'Measured Posts'}</div><div class="metric">${actual.length}</div><div class="caption">${isIt ? 'Una sola osservazione più recente per post' : 'Single latest observation per post'}</div></div><div class="card"><div class="overline">${isIt ? 'Snapshot conservati' : 'Stored Snapshots'}</div><div class="metric">${metrics.length}</div><div class="caption">${isIt ? 'Finestre e fonti registrate' : 'Recorded windows and sources'}</div></div><div class="card"><div class="overline">${isIt ? 'Insight proposti' : 'Proposed Insights'}</div><div class="metric">${state.data.insights.filter(x => !x.data.accepted).length}</div><div class="caption">${isIt ? 'In attesa di validazione' : 'Awaiting validation'}</div></div><div class="card"><div class="overline">${isIt ? 'Insight accettati' : 'Accepted Insights'}</div><div class="metric">${state.data.insights.filter(x => x.data.accepted).length}</div><div class="caption">${isIt ? 'Disponibili nel RAG del brand' : 'Available in brand RAG'}</div></div></div><div class="panel"><div class="panel-head"><h2>${isIt ? 'Ultime osservazioni per contenuto' : 'Latest observations per content'}</h2></div>${actual.length ? `<div class="table-wrap"><table><thead><tr><th>${isIt ? 'CONTENUTO' : 'CONTENT'}</th><th>${isIt ? 'VALORI RESTITUITI' : 'RETURNED VALUES'}</th><th>${isIt ? 'FONTE' : 'SOURCE'}</th><th>${isIt ? 'OSSERVATO' : 'OBSERVED'}</th><th></th></tr></thead><tbody>${actual.map(e => `<tr><td><a href="#content/${e.data.contentId}">${esc(state.data.contents.find(c => c.id === e.data.contentId)?.data.title || e.data.contentId)}</a></td><td>${Object.entries(e.data.values).map(([k, v]) => `<span class="badge">${esc(k)}: ${esc(v)}</span>`).join(' ')}</td><td class="subtle">${esc(e.data.source)}</td><td>${time(e.data.collectedAt)}</td><td>${may('editor') ? button(isIt ? 'Aggiorna' : 'Refresh', 'collect-metrics', 'small', dataId(e.data.contentId)) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty(isIt ? 'Non ci sono ancora metriche' : 'No metrics yet', isIt ? 'Il worker raccoglie osservazioni a 24 e 72 ore, quando il client e il provider le rendono disponibili.' : 'Worker gathers observations at 24h and 72h when available from provider.')}</div><div class="section-title"><h2>${isIt ? 'Insight e ipotesi' : 'Insights & Hypotheses'}</h2></div><div class="grid">${state.data.insights.map(e => `<div class="card"><div class="card-header"><span class="badge">n = ${e.data.sampleSize} post</span>${badge(e.data.accepted ? 'APPROVED' : 'WAITING_APPROVAL')}</div><h3>${esc(e.data.summary)}</h3><div class="card-body">${e.data.hypotheses.map(x => `<p>${esc(x)}</p>`).join('')}<b>${isIt ? 'Limiti' : 'Limitations'}</b>${e.data.limitations.map(x => `<p>${esc(x)}</p>`).join('')}</div><div class="card-footer">${may('approver') && !e.data.accepted ? button(isIt ? 'Accetta nella memoria' : 'Accept into memory', 'accept-insight', 'small', dataId(e.id)) : ''}${button(isIt ? 'Dati completi' : 'Full data', 'inspect-insight', 'small', dataId(e.id))}</div></div>`).join('')}</div><p class="footer-note">${isIt ? 'Mancanza di una metrica ≠ zero. Valori di social, obiettivi e finestre diversi non vengono aggregati in un punteggio universale.' : 'Missing metric ≠ zero. Disparate networks, objectives, and windows are not combined into a misleading composite score.'}</p>`;
}
function jobsPage() {
    const isIt = currentLang === 'it';
    return head(labels.jobs || 'Jobs', isIt ? 'Job persistenti, retry controllati e traccia delle esecuzioni. Nessun esito esterno viene inventato.' : 'Persistent background jobs, controlled retries, and execution audit trails. No external results are fabricated.', may('approver') ? button(isIt ? 'Apri audit' : 'View audit', 'show-audit', '') : '') + `<div class="panel"><div class="panel-head"><h2>${isIt ? 'Coda operativa' : 'Operational Queue'}</h2><span class="badge">${state.status.workerEnabled ? (isIt ? 'Worker attivo' : 'Worker active') : (isIt ? 'Worker disabilitato' : 'Worker disabled')}</span></div>${state.data.jobs.length ? `<div class="table-wrap"><table><thead><tr><th>${isIt ? 'TIPO' : 'KIND'}</th><th>${isIt ? 'STATO' : 'STATUS'}</th><th>${isIt ? 'TENTATIVI' : 'ATTEMPTS'}</th><th>${isIt ? 'DATA' : 'DATE'}</th><th>${isIt ? 'ESITO / ERRORE' : 'RESULT / ERROR'}</th></tr></thead><tbody>${state.data.jobs.map(j => `<tr><td><b>${esc(j.kind)}</b><div class="id-code">${j.entityId}</div></td><td>${badge(j.state)}</td><td>${j.attempts}</td><td>${time(j.dueAt)}</td><td class="subtle">${esc(j.error || '—')}</td></tr>`).join('')}</tbody></table></div>` : empty(isIt ? 'Coda vuota' : 'Queue is empty', isIt ? 'Generazioni e pubblicazioni vengono accodate qui.' : 'Generations and publications are queued here.')}</div><div class="section-title"><h2>${isIt ? 'Esecuzioni AI' : 'AI Executions'}</h2></div><div class="panel">${state.data.executions.length ? `<table><thead><tr><th>${isIt ? 'AGENTE' : 'AGENT'}</th><th>${isIt ? 'PROMPT' : 'PROMPT'}</th><th>${isIt ? 'MODELLO' : 'MODEL'}</th><th>${isIt ? 'STATO' : 'STATUS'}</th><th></th></tr></thead><tbody>${state.data.executions.map(e => `<tr><td>${esc(e.data.role)}</td><td>${esc(e.data.promptVersion)}</td><td>${esc(e.data.model)}</td><td>${badge(e.data.status)}</td><td>${button('Input / output', 'inspect-execution', 'small', dataId(e.id))}</td></tr>`).join('')}</tbody></table>` : empty(isIt ? 'Nessuna esecuzione' : 'No executions', isIt ? 'Ogni chiamata registra versione del prompt, modello, input e risultato.' : 'Every call records prompt version, model, input, and output.')}</div>`;
}
function legacySettingsPage() {
    const isIt = currentLang === 'it';
    const b = state.brand.data;
    return head(labels.settings || 'Settings', isIt ? 'Identità del brand, ruoli umani, prompt versionati e accesso degli strumenti.' : 'Brand identity, human roles, versioned prompts, and tool access.') + `<div class="two-col"><div class="panel"><div class="panel-head"><h2>${isIt ? 'Identità di' : 'Identity of'} ${esc(b.name)}</h2>${may('admin') ? button(isIt ? 'Modifica' : 'Edit', 'edit-brand', 'small') : ''}</div><div class="panel-body"><div class="kicker">${isIt ? 'Descrizione' : 'Description'}</div><p class="subtle">${esc(b.description || (isIt ? 'Non specificata' : 'Unspecified'))}</p><div class="kicker">Tone of voice</div><div class="tag-list">${b.tone.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><div class="kicker">${isIt ? 'Lingua e calendario' : 'Language & Timezone'}</div><p class="subtle">${esc(b.language)} · ${esc(b.timezone)}</p><div class="kicker">Policy</div><p class="subtle">Auto-publish: ${b.policy.autoPublish ? (isIt ? 'policy testuale limitata' : 'limited text-only policy') : (isIt ? 'disattivato' : 'disabled')}<br>${isIt ? 'Massimo' : 'Maximum'} ${b.policy.maxAutoRevisions} ${isIt ? 'correzioni automatiche' : 'automatic revisions'}<br>${isIt ? 'Soglia review:' : 'Review threshold:'} ${b.policy.minReviewScore}</p></div></div><div class="panel"><div class="panel-head"><h2>${isIt ? 'Infrastruttura AI' : 'AI Infrastructure'}</h2></div><div class="panel-body"><div class="kicker">${isIt ? 'Generazione' : 'Generation'}</div><p class="subtle">${esc(state.status.model.name || (isIt ? 'Modello non configurato' : 'Model not configured'))} · ${esc(state.status.model.provider)}</p><div class="kicker">Embeddings</div><p class="subtle">${esc(state.status.embeddings.model || (isIt ? 'Non configurati: retrieval lessicale' : 'Not configured: lexical retrieval'))}</p><div class="kicker">${isIt ? 'Visual' : 'Visuals'}</div><p class="subtle">${isIt ? 'Modello immagine:' : 'Image model:'} ${esc(state.status.imageModel || (isIt ? 'non configurato' : 'not configured'))}<br>FFmpeg: ${state.status.renderer.ffmpeg ? (isIt ? 'disponibile' : 'available') : (isIt ? 'non disponibile' : 'unavailable')}</p><p class="footer-note">${isIt ? 'Provider e segreti infrastrutturali si configurano in .env. Non vengono esposti nella dashboard.' : 'Providers and infrastructure secrets are configured in .env. Never exposed in dashboard.'}</p></div></div></div>${may('admin') ? `<div class="section-title"><h2>${isIt ? 'Controllo degli accessi' : 'Access Control'}</h2></div><div class="actions">${button(isIt ? 'Utenti e ruoli' : 'Users & roles', 'users')}${button(isIt ? 'Aggiungi utente' : 'Add user', 'new-user')}${button(isIt ? 'Nuovo workspace' : 'New workspace', 'new-workspace')}${button(isIt ? 'Token MCP / API' : 'MCP / API tokens', 'tokens')}${button(isIt ? 'Prompt degli agenti' : 'Agent prompts', 'prompts')}</div>` : ''}<div class="section-title"><h2>${isIt ? 'Sessione' : 'Session'}</h2></div><div class="actions">${button(isIt ? 'Cambia password' : 'Change password', 'password')}${state.me.workspaces?.length > 1 ? select('workspace', 'Workspace', state.me.workspaces.map(w => ({ value: w.id, label: w.name })), state.workspace) : ''}</div><div class="callout section-space">MCP endpoint: <span class="help-key">${esc(state.status.baseUrl)}/mcp</span><br>${isIt ? 'I token sono limitati a un brand e non possono approvare contenuti. n8n può creare bozze, accodare generazioni e programmare versioni già approvate usando la stessa API.' : 'Tokens are scoped to a single brand and cannot approve content. n8n can draft, enqueue generations, and schedule approved versions using the same API.'}</div><p class="footer-note">${isIt ? 'Prima di un utilizzo pubblico: HTTPS, backup cifrati della configurazione, revisione delle autorizzazioni dei provider e collaudi sugli account reali. Questa release non include SSO o un servizio di fatturazione.' : 'Before public usage: ensure HTTPS, encrypted configuration backups, verified provider scopes, and live account testing. This release does not include SSO or billing.'}</p>`;
}
async function brandForm(edit = false) {
    const isIt = currentLang === 'it';
    const e = edit ? state.brand : null, b = e?.data || { name: '', description: '', industry: '', mission: '', target: [], tone: [isIt ? 'Chiaro' : 'Clear', isIt ? 'Diretto' : 'Direct'], objectives: [], colors: ['#172338'], language: isIt ? 'it' : 'en', timezone: 'Europe/Rome', bannedWords: [], requiredPhrases: [], approvedClaims: [], policy: { autoPublish: false, maxAutoRevisions: 2, minReviewScore: 90 } };
    if (edit)
        await loadCollections(['assets']);
    form(edit ? (isIt ? 'Modifica brand' : 'Edit brand') : (isIt ? 'Crea il tuo brand' : 'Create your brand'), isIt ? 'L’identità e le policy sono sempre incluse nel contesto degli agenti.' : 'Identity and policies are always included in agent context.', `${field('name', isIt ? 'Nome' : 'Name', b.name, 'text', 'required maxlength="100"')}<div class="form-row">${field('industry', isIt ? 'Settore' : 'Industry', b.industry)}${field('language', isIt ? 'Lingua' : 'Language', b.language)}</div>${area('description', isIt ? 'Descrizione' : 'Description', b.description)}${area('mission', isIt ? 'Mission' : 'Mission', b.mission)}<div class="form-row">${area('target', isIt ? 'Segmenti target, uno per riga' : 'Target segments, one per line', b.target.join('\n'))}${area('tone', isIt ? 'Tone of voice, uno per riga' : 'Tone of voice, one per line', b.tone.join('\n'))}</div>${area('objectives', isIt ? 'Obiettivi, uno per riga' : 'Objectives, one per line', b.objectives.join('\n'))}<div class="form-row">${field('colors', isIt ? 'Colori #RRGGBB separati da virgole' : '#RRGGBB colors, comma separated', b.colors.join(', '))}${field('timezone', isIt ? 'Timezone IANA' : 'IANA Timezone', b.timezone)}</div>${edit ? select('logoAssetId', isIt ? 'Logo dalla libreria' : 'Logo from library', [{ value: '', label: isIt ? 'Nessun logo' : 'No logo' }, ...state.data.assets.filter(a => a.data.mime.startsWith('image/')).map(a => ({ value: a.id, label: a.data.name }))], b.logoAssetId || '') : ''}<details><summary>${isIt ? 'Regole obbligatorie e pubblicazione automatica' : 'Mandatory rules and auto-publish'}</summary><div class="form">${area('bannedWords', isIt ? 'Termini vietati, uno per riga' : 'Banned terms, one per line', b.bannedWords.join('\n'))}${area('requiredPhrases', isIt ? 'Frasi obbligatorie in ogni contenuto' : 'Required phrases in every post', b.requiredPhrases.join('\n'))}${area('approvedClaims', isIt ? 'Claim approvati esplicitamente dal brand' : 'Claims explicitly approved by brand', b.approvedClaims.join('\n'))}<div class="form-row">${field('maxAutoRevisions', isIt ? 'Revisioni automatiche (0–2)' : 'Auto revisions (0–2)', b.policy.maxAutoRevisions, 'number', 'min="0" max="2"')}${field('minReviewScore', isIt ? 'Soglia review (70–100)' : 'Review threshold (70–100)', b.policy.minReviewScore, 'number', 'min="70" max="100"')}</div>${check('autoPublish', isIt ? 'Autorizzo la policy automatica limitata: solo testo, review ≥ 90, nessun claim dichiarato, nessun numero o link. Non abilita messaggi, video o TikTok.' : 'Authorize limited auto-publish policy: text-only, review ≥ 90, no unverified claims, no numbers or links. Does not enable messages, video or TikTok.', b.policy.autoPublish)}</div></details>`, async (f) => { const body = { ...f, revision: e?.revision, target: lines(f.target), tone: lines(f.tone), objectives: lines(f.objectives), colors: f.colors.split(',').map(x => x.trim()), bannedWords: lines(f.bannedWords), requiredPhrases: lines(f.requiredPhrases), approvedClaims: lines(f.approvedClaims), policy: { autoPublish: !!f.autoPublish, maxAutoRevisions: Number(f.maxAutoRevisions), minReviewScore: Number(f.minReviewScore) } }; state.brand = await api(e ? '/api/brands/' + e.id : '/api/brands', e ? 'PUT' : 'POST', body); state.brands = await api('/api/brands'); toast(isIt ? 'Brand salvato' : 'Brand saved'); });
}
async function accountForm(accountId) {
    const isIt = currentLang === 'it';
    const e = accountId ? await api('/api/accounts/' + accountId) : null, d = e?.data || { name: '', platform: 'instagram', transport: 'direct', targetId: '', options: { accountType: 'BUSINESS', login: 'facebook' }, enabled: true };
    form(e ? (isIt ? 'Configura canale' : 'Configure channel') : (isIt ? 'Collega un canale' : 'Connect a channel'), isIt ? 'I segreti vengono cifrati nel backend. Nessun test di pubblicazione viene eseguito durante il salvataggio.' : 'Secrets are encrypted in backend. No publishing test is performed upon saving.', `${field('name', isIt ? 'Nome leggibile dell’account' : 'Readable account name', d.name, 'text', 'required')}<div class="form-row">${select('platform', isIt ? 'Piattaforma' : 'Platform', Object.entries(state.status.platforms).map(([k, c]) => ({ value: k, label: c.label })), d.platform)}${select('transport', isIt ? 'Trasporto' : 'Transport', ['direct', 'postiz'], d.transport)}</div><div class="callout" id="account-help">${esc(state.status.platforms[d.platform].notes)}</div>${field('targetId', isIt ? 'ID destinazione / integrazione Postiz' : 'Destination ID / Postiz integration ID', d.targetId, 'text', 'required')}${area('credentials', e ? (isIt ? 'Nuove credenziali JSON (lascia vuoto per conservarle)' : 'New JSON credentials (leave empty to keep)') : (isIt ? 'Credenziali JSON (cifrate)' : 'JSON credentials (encrypted)'), e ? '' : JSON.stringify({ accessToken: '' }, null, 2), 'code')}<div class="subtle" id="credential-help"></div><details open><summary>${isIt ? 'Opzioni del canale' : 'Channel options'}</summary>${area('options', isIt ? 'Opzioni JSON pubbliche, senza segreti' : 'Public JSON options, without secrets', JSON.stringify(d.options, null, 2), 'code')}<p class="footer-note">${isIt ? 'Telegram: approvalChatId e approvers {"TELEGRAM_USER_ID":"APP_USER_ID"}. Postiz: settings per il provider, con ID board/subreddit/canale quando richiesti.' : 'Telegram: approvalChatId and approvers {"TELEGRAM_USER_ID":"APP_USER_ID"}. Postiz: provider settings, with board/subreddit/channel IDs when required.'}</p></details>${check('enabled', isIt ? 'Account abilitato' : 'Account enabled', d.enabled)}`, async (f) => {
        const body = { name: f.name, platform: f.platform, transport: f.transport, targetId: f.targetId, options: json(f.options), enabled: !!f.enabled, revision: e?.revision };
        if (f.credentials.trim())
            body.credentials = json(f.credentials);
        await api(e ? '/api/accounts/' + e.id : base() + '/accounts', e ? 'PUT' : 'POST', body);
        toast(isIt ? 'Credenziali salvate. Collauda le autorizzazioni prima di pubblicare.' : 'Credentials saved. Test permissions before publishing.');
    });
    const update = () => {
        const p = $('#f-platform').value, t = $('#f-transport').value, c = state.status.platforms[p];
        $('#account-help').textContent = c.notes;
        let example = { accessToken: 'AUTHORIZED_USER_TOKEN' };
        if (t === 'postiz')
            example = { apiKey: 'POSTIZ_KEY', baseUrl: 'https://api.postiz.com/public/v1' };
        else if (p === 'telegram')
            example = { botToken: 'BOTFATHER_TOKEN', webhookSecret: 'RANDOM_LONG_SECRET' };
        else if (p === 'discord')
            example = { botToken: 'DISCORD_BOT_TOKEN' };
        else if (p === 'farcaster')
            example = { apiKey: 'NEYNAR_KEY', signerUuid: 'APPROVED_SIGNER' };
        else if (p === 'twitch')
            example = { accessToken: 'TWITCH_TOKEN', clientId: 'CLIENT_ID', senderId: 'BOT_ID' };
        else if (p === 'mastodon')
            example = { accessToken: 'USER_TOKEN', instance: 'https://YOUR_INSTANCE' };
        else if (p === 'bluesky')
            example = { accessToken: 'ACCESS_JWT', did: 'did:plc:IDENTIFIER', pds: 'https://bsky.social' };
        else if (['whatsapp', 'messenger', 'instagram-dm'].includes(p))
            example = { accessToken: 'META_TOKEN', appSecret: 'META_APP_SECRET', webhookVerifyToken: 'VERIFY_SECRET' };
        $('#credential-help').innerHTML = `${isIt ? 'Formato atteso:' : 'Expected format:'} <pre>${esc(JSON.stringify(example, null, 2))}</pre>${!c.native.length && t === 'direct' ? (isIt ? '<b>Scegli Postiz: questo social non ha un client diretto in questa release.</b>' : '<b>Select Postiz: this platform does not have a direct client in this release.</b>') : ''}`;
    };
    $('#f-platform').onchange = update;
    $('#f-transport').onchange = update;
    update();
}
async function contentForm(contentId) {
    const isIt = currentLang === 'it';
    await loadCollections(['accounts', 'assets', 'campaigns']);
    if (!state.data.accounts.length) {
        toast(isIt ? 'Collega prima un canale' : 'Connect a channel first', true);
        return;
    }
    const e = contentId ? await api('/api/contents/' + contentId) : null, d = e?.data || { title: '', text: '', objective: '', hashtags: [], format: 'text', accountId: state.data.accounts[0].id, media: [], claims: [], sourceIds: [], options: { generateVisual: true, useAiBackground: false } };
    const medias = state.data.assets.map(a => ({ value: a.id, label: a.data.name + ' · ' + a.data.mime }));
    form(e ? (isIt ? 'Modifica contenuto' : 'Edit content') : (isIt ? 'Nuovo contenuto' : 'New content'), isIt ? 'Definisci un brief, scrivi manualmente o usa gli agenti. Salvare non pubblica.' : 'Define a brief, write manually, or use agents. Saving does not publish.', `${field('title', isIt ? 'Titolo / argomento del brief' : 'Title / Brief topic', d.title, 'text', 'required maxlength="300"')}<div class="form-row">${select('accountId', isIt ? 'Canale di destinazione' : 'Destination channel', state.data.accounts.map(a => ({ value: a.id, label: a.data.name + ' · ' + a.data.platform })), d.accountId)}${select('format', isIt ? 'Formato' : 'Format', ['text', 'image', 'carousel', 'video', 'reel', 'story', 'message', 'template'], d.format)}</div>${area('objective', isIt ? 'Obiettivo editoriale' : 'Editorial objective', d.objective)}${area('text', isIt ? 'Testo / caption' : 'Text / Caption', d.text, '', 7)}${area('hashtags', isIt ? 'Hashtag, uno per riga' : 'Hashtags, one per line', d.hashtags.join('\n'), '', 2)}${select('campaignId', isIt ? 'Campagna' : 'Campaign', [{ value: '', label: isIt ? 'Nessuna campagna' : 'No campaign' }, ...state.data.campaigns.map(c => ({ value: c.id, label: c.data.name }))], d.campaignId || '')}<div class="field"><label for="f-mediaIds">${isIt ? 'Asset dalla libreria (Ctrl/Cmd per selezione multipla)' : 'Library assets (Ctrl/Cmd for multi-select)'}</label><select id="f-mediaIds" name="mediaIds" multiple size="5">${medias.map(a => `<option value="${a.value}" ${d.media.some(m => m.id === a.value) ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select><small>${isIt ? 'I link esterni esistenti vengono mantenuti; per sostituirli usa le opzioni avanzate.' : 'Existing external links are kept; use advanced options to replace them.'}</small></div><div class="form-row">${check('generateVisual', isIt ? 'Genera visual con il template del brand' : 'Generate visual with brand template', d.options.generateVisual !== false)}${check('useAiBackground', isIt ? 'Genera anche lo sfondo con Gemini (API a consumo)' : 'Generate background with Gemini (metered API)', d.options.useAiBackground === true)}</div><div id="platform-fields"></div><details><summary>${isIt ? 'Fonti, claim e opzioni avanzate' : 'Sources, claims & advanced options'}</summary><div class="form">${area('claims', isIt ? 'Claim JSON con sourceIds dei frammenti' : 'JSON claims with sourceIds of snippets', JSON.stringify(d.claims, null, 2), 'code')}${area('sourceIds', isIt ? 'Source IDs, uno per riga' : 'Source IDs, one per line', d.sourceIds.join('\n'), '', 2)}${area('options', isIt ? 'Opzioni JSON del provider e della generazione' : 'JSON options for provider and generation', JSON.stringify(d.options, null, 2), 'code')}${area('externalMedia', isIt ? 'Media esterni JSON [{url,mime,alt}]' : 'External JSON media [{url,mime,alt}]', JSON.stringify(d.media.filter(m => !m.id), null, 2), 'code')}</div></details>`, async (f, fd) => {
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
        toast(isIt ? 'Bozza salvata. Approvazioni precedenti invalidate.' : 'Draft saved. Prior approvals invalidated.');
    });
    const fields = () => {
        const a = state.data.accounts.find(x => x.id === $('#f-accountId').value), p = a.data.platform, o = d.options;
        let html = '';
        if (p === 'tiktok')
            html = `<div class="callout warning">${isIt ? 'TikTok: seleziona privacy e dichiarazioni. Il consenso riguarda la versione finale e verrà richiesto durante l’approvazione.' : 'TikTok: select privacy and disclosures. Consent pertains to the final version and will be required during approval.'}</div>${select('privacyLevel', isIt ? 'Privacy (nessuna scelta predefinita)' : 'Privacy (no default choice)', [{ value: '', label: isIt ? 'Scegli esplicitamente' : 'Select explicitly' }, ...['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR']], o.privacyLevel || '', 'required')}<div class="form-row">${select('brandContent', isIt ? 'Partnership a pagamento / branded content' : 'Paid partnership / branded content', [{ value: 'no', label: isIt ? 'No' : 'No' }, { value: 'yes', label: isIt ? 'Sì' : 'Yes' }], o.brandContent ? 'yes' : 'no')}${select('brandOrganic', isIt ? 'Promuove il proprio brand' : 'Promoting own brand', [{ value: 'no', label: isIt ? 'No' : 'No' }, { value: 'yes', label: isIt ? 'Sì' : 'Yes' }], o.brandOrganic ? 'yes' : 'no')}</div>${check('allowComments', isIt ? 'Abilita commenti' : 'Allow comments', o.allowComments)}${check('allowDuet', isIt ? 'Abilita duet (video)' : 'Allow duet (video)', o.allowDuet)}${check('allowStitch', isIt ? 'Abilita stitch (video)' : 'Allow stitch (video)', o.allowStitch)}${check('isAigc', isIt ? 'Contenuto generato con AI (video)' : 'AI-generated content (video)', o.isAigc)}${a.data.transport === 'direct' ? button(isIt ? 'Aggiorna opzioni creator' : 'Refresh creator options', 'form-creator-info', 'small', `type="button" ${dataId(a.id)}`) : `<p class="footer-note">${isIt ? 'Con Postiz, controllare anche i requisiti del creator nella sua interfaccia.' : 'With Postiz, verify creator requirements in its interface.'}</p>`}`;
        else if (p === 'youtube')
            html = `<div class="form-row">${select('privacy', isIt ? 'Visibilità' : 'Visibility', [{ value: '', label: isIt ? 'Scegli' : 'Select' }, 'public', 'private', 'unlisted'], o.privacy || '', 'required')}${select('madeForKids', isIt ? 'Destinato ai bambini' : 'Made for kids', [{ value: '', label: isIt ? 'Scegli' : 'Select' }, { value: 'yes', label: isIt ? 'Sì' : 'Yes' }, { value: 'no', label: 'No' }], typeof o.madeForKids === 'boolean' ? o.madeForKids ? 'yes' : 'no' : '', 'required')}</div>`;
        else if (['whatsapp', 'messenger', 'instagram-dm'].includes(p))
            html = field('recipient', isIt ? 'ID destinatario / numero WhatsApp autorizzato' : 'Recipient ID / Authorized WhatsApp number', o.recipient || '', 'text', 'required') + `<p class="footer-note">${isIt ? 'Per template WhatsApp inserire options.template con name, language.code e componenti approvati.' : 'For WhatsApp templates enter options.template with name, language.code and approved components.'}</p>`;
        $('#platform-fields').innerHTML = html;
    };
    $('#f-accountId').onchange = fields;
    fields();
}
async function knowledgeForm(documentId) {
    const isIt = currentLang === 'it';
    const e = documentId ? await api('/api/knowledge/' + documentId) : null, d = e?.data || { title: '', text: '', type: 'knowledge', source: isIt ? 'Documento fornito dal responsabile' : 'Document provided by operator', platform: '*', roles: ['strategist', 'copywriter', 'creative', 'reviewer', 'analyst'], approved: false };
    form(e ? (isIt ? 'Modifica fonte' : 'Edit source') : (isIt ? 'Aggiungi una fonte' : 'Add a source'), isIt ? 'Carica testo verificato. I file MD/TXT/JSON vengono letti localmente dal browser.' : 'Upload verified text. MD/TXT/JSON files are parsed locally in the browser.', `${field('title', isIt ? 'Titolo del documento' : 'Document title', d.title, 'text', 'required')}<div class="field"><label for="document-file">${isIt ? 'Importa testo da file' : 'Import text from file'}</label><input id="document-file" type="file" accept=".md,.txt,.json,.csv"></div>${area('text', isIt ? 'Testo del documento' : 'Document text', d.text, '', 10)}<div class="form-row">${field('type', isIt ? 'Categoria' : 'Category', d.type)}${field('platform', isIt ? 'Filtro piattaforma (* = tutte)' : 'Platform filter (* = all)', d.platform)}</div>${field('source', isIt ? 'Fonte / riferimento verificabile' : 'Source / Verifiable reference', d.source)}${field('roles', isIt ? 'Ruoli autorizzati, separati da virgole' : 'Authorized roles, comma separated', d.roles.join(', '))}<div class="form-row">${field('validFrom', isIt ? 'Valido da (ISO con timezone)' : 'Valid from (ISO with timezone)', d.validFrom || '')}${field('validUntil', isIt ? 'Scade il (ISO con timezone)' : 'Expires on (ISO with timezone)', d.validUntil || '')}</div>${may('approver') ? check('approved', isIt ? 'Confermo la fonte e la abilito nel RAG' : 'Confirm source and enable in RAG', d.approved) : `<p class="subtle">${isIt ? 'La fonte sarà salvata come bozza e dovrà essere approvata.' : 'Source will be saved as draft and must be approved.'}</p>`}`, async (f) => { await api(e ? '/api/knowledge/' + e.id : base() + '/knowledge', e ? 'PUT' : 'POST', { ...f, roles: f.roles.split(',').map(x => x.trim()), approved: !!f.approved, revision: e?.revision }); toast(isIt ? 'Fonte indicizzata e salvata' : 'Source indexed and saved'); });
    $('#document-file').onchange = async (ev) => {
        const f = ev.target.files[0];
        if (!f)
            return;
        if (f.size > 1000000) {
            toast(isIt ? 'File di testo massimo 1 MB' : 'Text file maximum 1 MB', true);
            return;
        }
        $('#f-text').value = await f.text();
        if (!$('#f-title').value)
            $('#f-title').value = f.name;
    };
}
async function campaignForm(cid) { const isIt = currentLang === 'it'; const e = cid ? await api('/api/campaigns/' + cid) : null, d = e?.data || { name: '', objective: '', brief: '', startAt: new Date().toISOString(), endAt: new Date(Date.now() + 30 * 86400000).toISOString(), active: true }; form(e ? (isIt ? 'Modifica campagna' : 'Edit campaign') : (isIt ? 'Nuova campagna' : 'New campaign'), isIt ? 'Intervalli ISO 8601 con timezone esplicita.' : 'ISO 8601 intervals with explicit timezone.', `${field('name', isIt ? 'Nome campagna' : 'Campaign name', d.name, 'text', 'required')}${area('objective', isIt ? 'Obiettivo' : 'Objective', d.objective)}${area('brief', isIt ? 'Brief e vincoli' : 'Brief & constraints', d.brief)}<div class="form-row">${field('startAt', isIt ? 'Inizio (ISO)' : 'Start (ISO)', d.startAt, 'text', 'required')}${field('endAt', isIt ? 'Fine (ISO)' : 'End (ISO)', d.endAt, 'text', 'required')}</div>${check('active', isIt ? 'Campagna abilitata' : 'Campaign enabled', d.active)}`, async (f) => { await api(e ? '/api/campaigns/' + e.id : base() + '/campaigns', e ? 'PUT' : 'POST', { ...f, active: !!f.active, revision: e?.revision }); toast(isIt ? 'Campagna salvata' : 'Campaign saved'); }); }
async function approvalForm(e) { const isIt = currentLang === 'it'; form(isIt ? 'Approva questa versione' : 'Approve this version', `${isIt ? 'Versione' : 'Version'} ${e.revision}. ${isIt ? 'L’approvazione non esegue l’invio: la programmazione è un’azione separata.' : 'Approval does not dispatch: scheduling is a separate action.'}`, `<div class="callout">${esc(e.data.title)} · ${esc(e.data.platform)}</div>${check('confirmed', isIt ? 'Ho letto il testo finale e verificato le affermazioni, le fonti e la destinazione.' : 'I have read the final text and verified claims, sources, and destination.', false, true)}${e.data.media.length ? check('visualConfirmed', isIt ? 'Ho aperto e verificato immagini o video finali, inclusi testo, logo e contenuti audio.' : 'I have opened and verified final visuals/videos, including text, logo, and audio.', false, true) : ''}${e.data.platform === 'tiktok' ? check('consent', isIt ? 'Acconsento alla pubblicazione di questa specifica versione su TikTok con la privacy e le dichiarazioni selezionate.' : 'I consent to publishing this specific version to TikTok with selected privacy and disclosures.', false, true) : ''}${area('reason', isIt ? 'Motivazione di deroga (obbligatoria se review insufficiente)' : 'Override rationale (mandatory if review score is below threshold)', '', '', 3)}`, async (f) => { await api('/api/contents/' + e.id + '/approve', 'POST', { revision: e.revision, reason: f.reason, consent: !!f.consent, visualConfirmed: !!f.visualConfirmed }); toast(isIt ? 'Versione approvata' : 'Version approved'); }, isIt ? 'Approva versione' : 'Approve version'); }
async function scheduleForm(e) { const isIt = currentLang === 'it'; const local = new Date(Date.now() + 3600000); local.setMinutes(local.getMinutes() - local.getTimezoneOffset()); form(isIt ? 'Programma pubblicazione' : 'Schedule publication', `${isIt ? 'Orario locale del browser:' : 'Browser local time:'} ${Intl.DateTimeFormat().resolvedOptions().timeZone}. ${isIt ? 'Il server salva in UTC.' : 'Server saves in UTC.'}`, `${field('at', isIt ? 'Data e ora' : 'Date & time', local.toISOString().slice(0, 16), 'datetime-local', 'required')}${check('confirmed', isIt ? 'Confermo l’invio del contenuto approvato all’account selezionato.' : 'I confirm dispatch of approved content to the selected account.', false, true)}`, async (f) => { await api('/api/contents/' + e.id + '/schedule', 'POST', { revision: e.revision, at: new Date(f.at).toISOString() }); toast(isIt ? 'Pubblicazione programmata' : 'Publication scheduled'); }, isIt ? 'Programma' : 'Schedule'); }
async function renderForm() { const isIt = currentLang === 'it'; await loadCollections(['assets']); form(isIt ? 'Crea visual del brand' : 'Create brand visual', isIt ? 'Template JPEG con headline, colori e logo. Lo sfondo AI si abilita nella generazione di un contenuto.' : 'JPEG template with headline, colors, and logo. AI background is enabled when generating content.', `${field('headline', isIt ? 'Headline' : 'Headline', '', 'text', 'required maxlength="140"')}${area('body', isIt ? 'Testo breve' : 'Short body text', '', '', 3)}<div class="form-row">${select('width', isIt ? 'Larghezza' : 'Width', ['1080', '1200', '720'], '1080')}${select('height', isIt ? 'Altezza' : 'Height', ['1350', '1920', '1080', '720'], '1350')}</div>${select('backgroundId', isIt ? 'Sfondo dalla libreria' : 'Library background', [{ value: '', label: isIt ? 'Colore del brand' : 'Brand color' }, ...state.data.assets.filter(x => x.data.mime.startsWith('image/')).map(x => ({ value: x.id, label: x.data.name }))])}`, async (f) => { await api(base() + '/render', 'POST', { headline: f.headline, body: f.body, options: { width: Number(f.width), height: Number(f.height), backgroundId: f.backgroundId || undefined } }); toast(isIt ? 'Visual creato nella libreria' : 'Visual created in library'); }, isIt ? 'Renderizza' : 'Render'); }
async function videoForm() { const isIt = currentLang === 'it'; await loadCollections(['assets']); const imgs = state.data.assets.filter(x => x.data.mime.startsWith('image/')); form(isIt ? 'Video editoriale da slide' : 'Editorial video slideshow', isIt ? 'Ogni slide dura 4 secondi. Uscita MP4 H.264 verticale 1080×1920, con audio opzionale.' : 'Each slide displays for 4 seconds. Output MP4 H.264 vertical 1080×1920 with optional audio.', `<div class="field"><label for="video-slides">${isIt ? 'Scegli da 1 a 10 immagini (ordine della libreria)' : 'Select 1 to 10 images (library order)'}</label><select id="video-slides" name="slides" multiple size="8" required>${imgs.map(x => `<option value="${x.id}">${esc(x.data.name)}</option>`).join('')}</select></div>${select('audioId', isIt ? 'Audio della libreria' : 'Library audio track', [{ value: '', label: isIt ? 'Traccia silenziosa' : 'Silent track' }, ...state.data.assets.filter(x => x.data.mime.startsWith('audio/')).map(x => ({ value: x.id, label: x.data.name }))])}`, async (f, fd) => { await api(base() + '/video', 'POST', { assetIds: fd.getAll('slides'), audioId: f.audioId || undefined }); toast(isIt ? 'Video creato nella libreria' : 'Video created in library'); }, isIt ? 'Crea video' : 'Create video'); }
async function userForm() { const isIt = currentLang === 'it'; form(isIt ? 'Aggiungi utente al workspace' : 'Add user to workspace', isIt ? 'Gli utenti appartengono al workspace selezionato. Non condividere password tramite canali pubblici.' : 'Users belong to the selected workspace. Never share passwords via public channels.', `${field('email', 'Email', '', 'email', 'required')}${field('password', isIt ? 'Password iniziale (minimo 16 caratteri)' : 'Initial password (min 16 chars)', '', 'password', 'required minlength="16" autocomplete="new-password"')}${select('role', isIt ? 'Ruolo' : 'Role', ['viewer', 'editor', 'approver', 'admin'], 'editor')}`, async (f) => { await api('/api/admin/users', 'POST', f); toast(isIt ? 'Utente aggiunto' : 'User added'); }); }
async function tokenForm() { const isIt = currentLang === 'it'; form(isIt ? 'Token per MCP o automazioni' : 'Token for MCP or automations', isIt ? 'Il token sarà mostrato una sola volta e potrà accedere soltanto a questo brand.' : 'Token will be displayed only once and can only access this brand.', `${field('name', isIt ? 'Nome integrazione' : 'Integration name', '', 'text', 'required')}${select('role', isIt ? 'Permessi' : 'Permissions', ['viewer', 'editor'], 'viewer')}${field('days', isIt ? 'Scadenza in giorni' : 'Expiration in days', 30, 'number', 'min="1" max="365"')}`, async (f) => { const r = await api(base() + '/tokens', 'POST', { ...f, days: Number(f.days) }); modal(isIt ? 'Conserva il token' : 'Save your token', isIt ? 'Non verrà mostrato di nuovo. Non inserirlo in prompt, repository o messaggi.' : 'It will not be displayed again. Never put it into prompts, repos, or messages.', `${area('token', isIt ? 'Token API' : 'API Token', r.token, 'code', 3)}<p class="subtle">MCP Endpoint: <span class="help-key">${esc(state.status.baseUrl)}/mcp</span></p>`); return false; }, isIt ? 'Crea token' : 'Create token'); }
async function contactForm() { const isIt = currentLang === 'it'; await loadCollections(['accounts']); form(isIt ? 'Registra contatto autorizzato' : 'Register authorized contact', isIt ? 'La finestra di risposta viene aggiornata esclusivamente da messaggi in ingresso verificati.' : 'The response window is refreshed exclusively by verified incoming messages.', `${select('accountId', isIt ? 'Account' : 'Account', state.data.accounts.map(a => ({ value: a.id, label: a.data.name + ' · ' + a.data.platform })))}${field('recipient', isIt ? 'Numero / ID destinatario' : 'Recipient Number / ID', '', 'text', 'required')}${field('name', isIt ? 'Nome contatto' : 'Contact name', '', 'text', 'required')}${check('optIn', isIt ? 'Consenso disponibile per inviare template WhatsApp' : 'Consent available to send WhatsApp templates')}${area('consentEvidence', isIt ? 'Evidenza del consenso (fonte, data, finalità)' : 'Consent evidence (source, date, purpose)')}`, async (f) => { await api(base() + '/contacts', 'POST', { ...f, optIn: !!f.optIn }); toast(isIt ? 'Contatto registrato' : 'Contact registered'); }); }
async function promptForm() { const isIt = currentLang === 'it'; const contracts = await api('/api/prompts'); await loadCollections(['prompts']); const defaults = contracts.strategist, existing = state.data.prompts.find(x => x.data.role === 'strategist'); form(isIt ? 'Prompt versionato' : 'Versioned prompt', isIt ? 'Il contratto JSON e i controlli di sicurezza del backend rimangono obbligatori.' : 'JSON contract and backend security guardrails remain mandatory.', `${select('role', isIt ? 'Agente' : 'Agent', Object.keys(contracts), 'strategist')}${field('version', isIt ? 'Versione univoca' : 'Unique version', existing?.data.version || defaults.version + '-custom')}${area('system', isIt ? 'Istruzione di ruolo' : 'Role instruction', existing?.data.system || defaults.system, '', 12)}`, async (f) => { const old = state.data.prompts.find(x => x.data.role === f.role); await api(base() + '/prompts', 'POST', { ...f, revision: old?.revision }); toast(isIt ? 'Prompt salvato' : 'Prompt saved'); }); $('#f-role').onchange = () => { const role = $('#f-role').value, old = state.data.prompts.find(x => x.data.role === role), c = contracts[role]; $('#f-version').value = old?.data.version || c.version + '-custom'; $('#f-system').value = old?.data.system || c.system; }; }
function download(name, mime, body) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: mime })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
async function legacyAction(name, idValue, buttonEl) {
    const isIt = currentLang === 'it';
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
            toast(isIt ? 'Generazione accodata' : 'Generation enqueued');
        }
        if (name === 'review') {
            await api('/api/contents/' + e.id + '/review', 'POST', {});
            toast(isIt ? 'Revisione completata' : 'Review completed');
        }
        if (name === 'approve')
            return approvalForm(e);
        if (name === 'schedule')
            return scheduleForm(e);
        if (name === 'cancel-content') {
            await api('/api/contents/' + e.id + '/cancel', 'POST', { revision: e.revision });
            toast(isIt ? 'Programmazione annullata' : 'Schedule cancelled');
        }
        if (name === 'reject-content')
            return form(isIt ? 'Rifiuta contenuto' : 'Reject content', isIt ? 'La bozza resterà disponibile per le modifiche.' : 'Draft will remain available for editing.', area('reason', isIt ? 'Motivo del rifiuto' : 'Rejection reason'), async (f) => { await api('/api/contents/' + e.id + '/reject', 'POST', { revision: e.revision, reason: f.reason }); toast(isIt ? 'Contenuto rifiutato' : 'Content rejected'); }, isIt ? 'Rifiuta' : 'Reject');
        if (name === 'reconcile')
            return form(isIt ? 'Riconcilia esito esterno' : 'Reconcile external result', isIt ? 'Controlla prima il social. Non riprovare un invio incerto senza verificare se è già avvenuto.' : 'Check the social network first. Do not retry uncertain dispatches without checking if already published.', `${select('published', isIt ? 'Esito verificato' : 'Verified outcome', [{ value: 'yes', label: isIt ? 'È stato pubblicato / inviato' : 'Published / Sent' }, { value: 'no', label: isIt ? 'Ho verificato: non è stato pubblicato' : 'Verified: not published' }])}${field('externalId', isIt ? 'ID effettivo del post / messaggio' : 'Actual post / message ID')}${field('url', isIt ? 'Link alla pubblicazione' : 'Publication link')}${area('evidence', isIt ? 'Evidenza e modalità della verifica' : 'Verification evidence & details')}${check('confirmed', isIt ? 'Ho effettuato la verifica direttamente sul provider.' : 'I verified directly on the provider.', false, true)}`, async (f) => { await api('/api/contents/' + e.id + '/reconcile', 'POST', { ...f, revision: e.revision, published: f.published === 'yes' }); toast(isIt ? 'Esito riconciliato' : 'Result reconciled'); }, isIt ? 'Registra esito' : 'Record result');
        if (name === 'adapt') {
            await loadCollections(['accounts']);
            return form(isIt ? 'Adatta ad altri canali' : 'Adapt to other channels', isIt ? 'Crea copie separate da revisionare. La generazione “Solo copy” adatta il tono e la lunghezza.' : 'Creates separate copies for review. "Copy only" generation adapts tone and length.', `<div class="field"><label>${isIt ? 'Destinazioni' : 'Destinations'}</label><select name="accountIds" multiple size="7" required>${state.data.accounts.filter(a => a.id !== e.data.accountId).map(a => `<option value="${a.id}">${esc(a.data.name + ' · ' + a.data.platform)}</option>`).join('')}</select></div>`, async (f, fd) => { await api('/api/contents/' + e.id + '/adapt', 'POST', { accountIds: fd.getAll('accountIds') }); toast(isIt ? 'Bozze adattate create' : 'Adapted drafts created'); }, isIt ? 'Crea bozze' : 'Create drafts');
        }
        if (name === 'inspect-content') {
            const docs = await Promise.all([...new Set(e.data.sourceIds.map(s => s.split(':')[0]))].map(id => api('/api/knowledge/' + id).then(x => ({ id: x.id, title: x.data.title, source: x.data.source, text: x.data.text })).catch(() => ({ id, status: isIt ? 'non più disponibile' : 'no longer available' }))));
            return info(isIt ? 'Fonti, claim e versioni' : 'Sources, claims & versions', { sources: docs, claims: e.data.claims, creative: e.data.creative, approval: e.data.approval, history: e.history });
        }
        await refresh();
        return;
    }
    if (name === 'approve-knowledge') {
        const e = await api('/api/knowledge/' + idValue);
        await api('/api/knowledge/' + e.id + '/approve', 'POST', { revision: e.revision, approved: !e.data.approved });
        toast(e.data.approved ? (isIt ? 'Approvazione revocata' : 'Approval revoked') : (isIt ? 'Fonte approvata' : 'Source approved'));
    }
    else if (name === 'delete-knowledge') {
        return form(isIt ? 'Elimina fonte' : 'Delete source', isIt ? 'Le approvazioni che dipendono da questa fonte non saranno più valide.' : 'Approvals dependent on this source will no longer be valid.', check('confirmed', isIt ? 'Confermo l’eliminazione del documento dal RAG.' : 'I confirm deletion of document from RAG.', false, true), async () => { await api('/api/knowledge/' + idValue, 'DELETE'); toast(isIt ? 'Fonte eliminata' : 'Source deleted'); }, isIt ? 'Elimina' : 'Delete');
    }
    else if (name === 'test-rag') {
        const r = await api(base() + '/rag', 'POST', { query: $('#rag-query').value, role: $('#rag-role').value, platform: '*' });
        $('#rag-results').innerHTML = `<div class="panel section-space"><div class="panel-head"><h2>${r.hits.length} ${isIt ? 'risultati' : 'results'} · ${esc(r.mode)}</h2></div><div class="panel-body">${r.hits.map(x => `<h3>${esc(x.title)} <span class="badge">score ${x.score.toFixed(3)}</span></h3><p class="subtle preview">${esc(x.text)}</p><p class="id-code">${esc(x.id)} · ${esc(x.source)}</p>`).join('') || `<p class="subtle">${isIt ? 'Nessun frammento approvato pertinente per il ruolo selezionato.' : 'No approved snippets relevant for selected role.'}</p>`}</div></div>`;
        return;
    }
    else if (name === 'creator-info') {
        return info('TikTok creator info', await api('/api/accounts/' + idValue + '/creator-info'));
    }
    else if (name === 'form-creator-info') {
        const r = await api('/api/accounts/' + idValue + '/creator-info'), previous = $('#f-privacyLevel').value;
        $('#f-privacyLevel').innerHTML = `<option value="">${isIt ? 'Scegli esplicitamente' : 'Select explicitly'}</option>${(r.privacy_level_options || []).map(x => `<option value="${esc(x)}" ${x === previous ? 'selected' : ''}>${esc(x)}</option>`).join('')}`;
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
        toast((isIt ? 'Creator: ' : 'Creator: ') + (r.creator_nickname || r.creator_username || (isIt ? 'verificato' : 'verified')));
        return;
    }
    else if (name === 'account-connect') {
        const r = await api('/api/accounts/' + idValue + '/connect', 'POST', {});
        modal(isIt ? 'Autorizza il canale' : 'Authorize channel', isIt ? 'Completa OAuth in Postiz, poi associa l’ID dell’integrazione restituita al brand.' : 'Complete OAuth in Postiz, then associate the returned integration ID with the brand.', `<a href="${safeUrl(r.url)}" class="btn primary" target="_blank" rel="noopener noreferrer">${isIt ? 'Apri autorizzazione OAuth ↗' : 'Open OAuth authorization ↗'}</a>`);
        return;
    }
    else if (name === 'postiz-integrations')
        return info(isIt ? 'Integrazioni disponibili in Postiz' : 'Available Postiz integrations', await api('/api/accounts/' + idValue + '/postiz-integrations'));
    else if (name === 'install-webhook') {
        await api('/api/accounts/' + idValue + '/install-webhook', 'POST', {});
        toast(isIt ? 'Webhook Telegram registrato' : 'Telegram webhook registered');
    }
    else if (name === 'upload') {
        $('#media-upload').click();
        return;
    }
    else if (name === 'copy-id') {
        await navigator.clipboard.writeText(idValue);
        toast(isIt ? 'ID copiato' : 'ID copied');
        return;
    }
    else if (name === 'plan')
        return form(isIt ? 'Proponi il piano settimanale' : 'Propose weekly plan', isIt ? 'Il planner crea idee, non autorizzazioni di pubblicazione.' : 'Planner generates ideas, not publishing permissions.', area('objective', isIt ? 'Obiettivo della settimana' : 'Weekly objective', state.brand.data.objectives.join('\n')), async (f) => { await api(base() + '/plan', 'POST', f); toast(isIt ? 'Pianificazione accodata' : 'Planning enqueued'); }, isIt ? 'Genera piano' : 'Generate plan');
    else if (name === 'plan-drafts') {
        await api('/api/plans/' + idValue + '/drafts', 'POST', {});
        toast(isIt ? 'Bozze create dal piano' : 'Drafts created from plan');
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
        const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AIR3//Social Studio//EN', ...rows.flatMap(c => ['BEGIN:VEVENT', 'UID:' + c.id + '@air3-social-studio', 'DTSTAMP:' + dt(new Date()), 'DTSTART:' + dt(c.data.scheduleAt), 'SUMMARY:' + q(c.data.title), 'DESCRIPTION:' + q(c.data.platform + ' · ' + c.data.status), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
        download('editorial-calendar.ics', 'text/calendar', body);
        return;
    }
    else if (name === 'reply-draft') {
        const e = await api('/api/inbox/' + idValue + '/reply-draft', 'POST', {});
        location.hash = 'content/' + e.id;
        toast(isIt ? 'Bozza di risposta creata' : 'Reply draft created');
    }
    else if (name === 'close-inbox') {
        const e = await api('/api/inbox/' + idValue);
        await api('/api/inbox/' + idValue + '/close', 'POST', { revision: e.revision });
        toast(isIt ? 'Conversazione chiusa' : 'Conversation closed');
    }
    else if (name === 'analyze') {
        await api(base() + '/analyze', 'POST', {});
        toast(isIt ? 'Analisi accodata' : 'Analysis enqueued');
    }
    else if (name === 'accept-insight') {
        const e = await api('/api/insights/' + idValue);
        await api('/api/insights/' + idValue + '/accept', 'POST', { revision: e.revision });
        toast(isIt ? 'Insight inserito nella memoria approvata' : 'Insight added to approved memory');
    }
    else if (name === 'inspect-insight')
        return info(isIt ? 'Insight e riferimenti' : 'Insight & references', await api('/api/insights/' + idValue));
    else if (name === 'inspect-execution')
        return info(isIt ? 'Esecuzione agente' : 'Agent execution', await api('/api/executions/' + idValue));
    else if (name === 'collect-metrics') {
        await api('/api/contents/' + idValue + '/collect-metrics', 'POST', {});
        toast(isIt ? 'Raccolta metriche accodata' : 'Metrics collection enqueued');
    }
    else if (name === 'import-metrics') {
        await loadCollections(['contents']);
        return form(isIt ? 'Importa osservazione metrica' : 'Import metric observation', isIt ? 'Registra valori reali e la relativa fonte. Non usare stime come se fossero dati del provider.' : 'Record actual values and source. Do not use estimates as provider data.', `${select('contentId', isIt ? 'Contenuto pubblicato' : 'Published content', state.data.contents.filter(x => x.data.status === 'PUBLISHED').map(x => ({ value: x.id, label: x.data.title })))}${area('values', isIt ? 'Valori JSON, ad esempio {"likes":42,"clicks":7}' : 'JSON values, e.g. {"likes":42,"clicks":7}', '{}', 'code')}${field('source', isIt ? 'Fonte / esportazione da cui provengono i valori' : 'Source / Export origin', '', 'text', 'required')}${field('collectedAt', isIt ? 'Data osservazione ISO' : 'Observation date ISO', new Date().toISOString(), 'text', 'required')}`, async (f) => { await api('/api/contents/' + f.contentId + '/metrics', 'POST', { values: json(f.values), source: f.source, collectedAt: f.collectedAt }); toast(isIt ? 'Osservazione importata' : 'Observation imported'); });
    }
    else if (name === 'show-audit')
        return info(isIt ? 'Audit del brand' : 'Brand audit', await api(base() + '/audit'));
    else if (name === 'users')
        return info(isIt ? 'Utenti nel workspace' : 'Workspace users', await api('/api/admin/users'));
    else if (name === 'new-workspace')
        return form(isIt ? 'Nuovo workspace' : 'New workspace', isIt ? 'Crea un ambiente separato con te come amministratore.' : 'Create an isolated environment with you as administrator.', field('name', isIt ? 'Nome workspace' : 'Workspace name', '', 'text', 'required'), async (f) => { const r = await api('/api/admin/workspaces', 'POST', f); state.workspace = r.id; state.me = await api('/api/me'); state.brand = null; state.brands = await api('/api/brands'); toast(isIt ? 'Workspace creato' : 'Workspace created'); });
    else if (name === 'tokens') {
        const rows = await api(base() + '/tokens');
        modal(isIt ? 'Token di accesso' : 'Access tokens', isIt ? 'Nessun token ha permessi di approvazione. Revoca quelli inutilizzati.' : 'No token has approval permissions. Revoke unused ones.', `<div class="actions">${button(isIt ? '+ Nuovo token' : '+ New token', 'new-token', 'primary')}</div><div class="section-space">${rows.map(t => `<div class="step"><div><h3>${esc(t.name)} · ${esc(t.role)}</h3><p>${isIt ? 'Scadenza' : 'Expires'} ${time(t.expires)}</p>${button(isIt ? 'Revoca' : 'Revoke', 'revoke-token', 'small danger', dataId(t.id))}</div></div>`).join('') || `<p class="subtle">${isIt ? 'Nessun token attivo.' : 'No active tokens.'}</p>`}</div>`);
        return;
    }
    else if (name === 'revoke-token') {
        await api(base() + '/tokens/' + idValue, 'DELETE');
        toast(isIt ? 'Token revocato' : 'Token revoked');
        closeModal();
    }
    else if (name === 'password')
        return form(isIt ? 'Cambia password' : 'Change password', isIt ? 'Tutte le sessioni verranno chiuse dopo il cambio.' : 'All sessions will be terminated upon change.', `${field('current', isIt ? 'Password attuale' : 'Current password', '', 'password', 'required autocomplete="current-password"')}${field('password', isIt ? 'Nuova password (minimo 16 caratteri)' : 'New password (min 16 chars)', '', 'password', 'required minlength="16" autocomplete="new-password"')}`, async (f) => { await api('/api/password', 'POST', f); loginView(); toast(isIt ? 'Password aggiornata. Accedi di nuovo.' : 'Password updated. Please log in again.'); });
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
            toast(currentLang === 'it' ? 'Carica al massimo 10 file per volta' : 'Upload at most 10 files at once', true);
            return;
        }
        state.busy = true;
        try {
            for (const f of files) {
                if (f.size > 128 * 1024 * 1024)
                    throw new Error((currentLang === 'it' ? 'File oltre 128 MB: ' : 'File exceeds 128 MB: ') + f.name);
                await api(base() + '/assets?' + new URLSearchParams({ name: f.name }), 'POST', f, { 'Content-Type': f.type });
                toast((currentLang === 'it' ? 'Caricato: ' : 'Uploaded: ') + f.name);
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
let publicConfig = { name: 'AIR3 Social Studio', google: true, registration: false, emailEnabled: false, supportEmail: '', privacyUrl: '/privacy', termsUrl: '/terms' };
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
const groupsMap = {
    it: { instance: 'Installazione', models: 'Modelli AI', login: 'Accesso Google', email: 'Email', platforms: 'API & rete', oauth: 'App social condivise' },
    en: { instance: 'Deployment', models: 'AI Models', login: 'Google Sign-In', email: 'Email', platforms: 'API & Network', oauth: 'Shared Social Apps' }
};
const groups = new Proxy({}, { get: (_, k) => (groupsMap[currentLang] || groupsMap.en)[k] || k });
const friendlyMap = {
    it: { BASE_URL: 'URL pubblica', SITE_NAME: 'Nome del prodotto', SUPPORT_EMAIL: 'Email di supporto', PRIVACY_URL: 'Informativa privacy', TERMS_URL: 'Termini di servizio', ALLOW_REGISTRATION: 'Registrazione pubblica', LLM_PROVIDER: 'Provider AI', LLM_BASE_URL: 'Endpoint del modello', LLM_MODEL: 'Modello principale', LLM_API_KEY: 'Chiave API LLM', GEMINI_API_KEY: 'Chiave Gemini immagini', GEMINI_IMAGE_MODEL: 'Modello per immagini', EMBEDDING_BASE_URL: 'Endpoint embeddings', EMBEDDING_MODEL: 'Modello embeddings', EMBEDDING_API_KEY: 'Chiave embeddings', GOOGLE_CLIENT_ID: 'Google Client ID', GOOGLE_CLIENT_SECRET: 'Google Client secret', RESEND_API_KEY: 'Resend API key', MAIL_FROM: 'Email mittente verificata', META_GRAPH_VERSION: 'Versione Meta Graph', LINKEDIN_VERSION: 'Versione LinkedIn', OUTBOUND_ORIGINS: 'Origin esterne autorizzate' },
    en: { BASE_URL: 'Public URL', SITE_NAME: 'Product Name', SUPPORT_EMAIL: 'Support Email', PRIVACY_URL: 'Privacy Policy URL', TERMS_URL: 'Terms of Service URL', ALLOW_REGISTRATION: 'Public Registration', LLM_PROVIDER: 'AI Provider', LLM_BASE_URL: 'Model Endpoint', LLM_MODEL: 'Main Model', LLM_API_KEY: 'LLM API Key', GEMINI_API_KEY: 'Gemini Image Key', GEMINI_IMAGE_MODEL: 'Image Model', EMBEDDING_BASE_URL: 'Embeddings Endpoint', EMBEDDING_MODEL: 'Embeddings Model', EMBEDDING_API_KEY: 'Embeddings Key', GOOGLE_CLIENT_ID: 'Google Client ID', GOOGLE_CLIENT_SECRET: 'Google Client Secret', RESEND_API_KEY: 'Resend API Key', MAIL_FROM: 'Verified Sender Email', META_GRAPH_VERSION: 'Meta Graph Version', LINKEDIN_VERSION: 'LinkedIn Version', OUTBOUND_ORIGINS: 'Authorized Outbound Origins' }
};
const friendly = new Proxy({}, { get: (_, k) => (friendlyMap[currentLang] || friendlyMap.en)[k] || k });
const theme = () => document.documentElement.dataset.theme || 'light';
function applyTheme(t) { document.documentElement.dataset.theme = t; try {
    localStorage.setItem('air3:theme', t);
}
catch { } document.querySelectorAll('[data-action="theme"]').forEach(b => { b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', t === 'dark' ? (currentLang === 'it' ? 'Attiva tema carta chiara' : 'Switch to light paper theme') : (currentLang === 'it' ? 'Attiva tema grafite scura' : 'Switch to dark graphite theme')); }); }
function themeButton() { return button(icon(theme() === 'dark' ? 'sun' : 'moon'), 'theme', 'ghost icon-btn', `aria-label="${currentLang === 'it' ? 'Cambia tema' : 'Toggle theme'}" title="${currentLang === 'it' ? 'Carta / grafite' : 'Paper / graphite'}"`); }
function downloadText(filename, content, type = 'text/plain') { const u = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a'); a.href = u; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
function pageTitle(s) { document.title = s + ' · AIR3 Social Studio'; }
function publicHeader() { return `<header class="public-nav"><a class="brand-home" href="/" aria-label="AIR3 Social Studio, homepage">${wordmark()}</a><nav aria-label="${t('publicNav')}"><a href="/#product">${t('navProduct')}</a><a href="/#workflow">${t('navWorkflow')}</a><a href="/#integrations">${t('navIntegrations')}</a><a href="/#privacy-transparency">${t('navPrivacy')}</a></nav><div class="actions">${langButton()}${themeButton()}<a href="/login" class="nav-login">${t('navLogin')}</a><a class="btn primary" href="/app">${t('navOpenStudio')} ${icon('arrow')}</a></div></header>`; }
function publicFooter() {
    const supp = publicConfig.supportEmail || ('support@' + (window.location.hostname || 'yourdomain.com'));
    const host = window.location.hostname || 'studio';
    return `<footer class="public-footer"><a href="/" class="brand-home">${wordmark()}</a><div><a href="/privacy">${t('privacy')}</a><a href="/terms">${t('terms')}</a><a href="mailto:${esc(supp)}">${t('support')}${publicConfig.supportEmail ? ' (' + esc(supp) + ')' : ''}</a><span>© ${new Date().getFullYear()} AIR3 Social Studio · ${esc(host)}</span></div><span class="handwritten">${t('footerIdeas')}<br>${t('footerIdeas2')} ↗</span></footer>`;
}
function landing() {
    pageTitle(currentLang === 'it' ? 'Il tuo studio creativo, connesso' : 'Your connected creative studio');
    const supp = publicConfig.supportEmail || ('support@' + (window.location.hostname || 'yourdomain.com'));
    $('#app').innerHTML = `<div class="public-site">${publicHeader()}<main id="main-content"><section class="hero"><div class="hero-copy"><div class="handwritten upper-note">${t('heroNote')}<span class="pencil-stroke"></span></div><h1>${t('heroH1')}</h1><p>${t('heroDesc')}</p><div class="hero-actions"><a class="btn primary large" href="/app">${t('heroEnter')} ${icon('arrow')}</a><a class="btn large" href="#workflow">${icon('eye')} ${t('heroExplore')}</a></div><div class="trust-note">${icon('admin')} ${t('heroTrust')}</div></div>${hubArt()}</section><section class="platform-strip" id="integrations"><div class="eyebrow">${t('convEyebrow')}</div><div class="social-strip">${['instagram', 'facebook', 'whatsapp', 'threads', 'tiktok', 'x', 'linkedin', 'telegram', 'youtube', 'pinterest'].map(p => `<span>${socialMark(p)}${esc(({ instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', threads: 'Threads', tiktok: 'TikTok', x: 'X', linkedin: 'LinkedIn', telegram: 'Telegram', youtube: 'YouTube', pinterest: 'Pinterest' })[p])}</span>`).join('')}</div><p class="microcopy">${t('convMicro')}</p></section><section class="feature-grid" id="product">${(currentLang === 'it' ? [['spark', 'violet', 'Idee con un contesto', 'Agenti specializzati lavorano sulle fonti approvate, sul tono e sugli obiettivi del tuo brand.'], ['calendar', 'blue', 'Una squadra allineata', 'Bozze, revisioni e un calendario condiviso. Ogni versione ha una storia e un responsabile.'], ['send', 'teal', 'Ogni canale, al suo posto', 'Adatta i contenuti alle piattaforme e programma solo ciò che è stato approvato.'], ['analytics', 'amber', 'Risultati, non intuizioni', 'Raccogli le metriche disponibili e trasforma i dati verificati in indicazioni editoriali.'], ['team', 'coral', 'Più brand. Meno caos.', 'Workspace separati, ruoli espliciti e credenziali cifrate. Nessuna voce si mescola alle altre.']] : [['spark', 'violet', 'Context-aware ideas', 'Specialized agents operate on approved knowledge, tone, and brand objectives.'], ['calendar', 'blue', 'An aligned team', 'Drafts, reviews, and a shared calendar. Every version has clear history and ownership.'], ['send', 'teal', 'Every channel in place', 'Adapt content to platforms and publish only what has been formally approved.'], ['analytics', 'amber', 'Results, not guesswork', 'Aggregate metrics and convert verified performance into editorial guidance.'], ['team', 'coral', 'Multiple brands, zero chaos', 'Isolated workspaces, explicit roles, and encrypted secrets. No cross-brand voice mixing.']]).map(([i, c, t, d]) => `<article class="feature-card"><span class="feature-icon tint-${c}">${icon(i)}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</section><section class="workflow-section" id="workflow"><div><span class="handwritten">${t('wfOver')}<span class="pencil-stroke"></span></span><h2>${t('wfH2')}</h2><p>${t('wfDesc')}</p><a class="btn primary" href="/app#setup">${t('wfBtn')} ${icon('arrow')}</a></div><div class="workflow-board"><div class="board-top"><span class="eyebrow">${t('wfBoardEyebrow')}</span><span class="badge">${t('wfBoardBadge')}</span></div>${(currentLang === 'it' ? [['01', 'knowledge', 'La tua conoscenza', 'Linee guida, prodotti, esempi e fonti approvate.'], ['02', 'spark', 'Il lavoro degli agenti', 'Strategia, copy e visual con contesto specifico.'], ['03', 'admin', 'La tua approvazione', 'Controlli automatici, revisione umana e versioni.'], ['04', 'send', 'Pubblicazione e feedback', 'Invii tracciati e insight basati sui dati raccolti.']] : [['01', 'knowledge', 'Your Knowledge', 'Guidelines, products, examples, and approved sources.'], ['02', 'spark', 'Agent Execution', 'Strategy, copy, and visuals tailored to brand context.'], ['03', 'admin', 'Human Approvals', 'Automated guardrails, human review, and immutable audit logs.'], ['04', 'send', 'Publishing & Insights', 'Tracked dispatching and insights grounded in collected performance.']]).map(([n, i, t, d]) => `<div class="workflow-line"><span class="workflow-number">${n}</span><span class="feature-icon tint-teal">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div>${icon('arrow')}</div>`).join('')}</div></section><section class="transparency-section" id="privacy-transparency"><div class="transparency-header"><div class="eyebrow">${t('transEyebrow')}</div><h2>${t('transH2')}</h2><p>${t('transDesc')}</p></div><div class="transparency-grid"><article class="transparency-card"><span class="feature-icon tint-teal">${icon('lock')}</span><h3>${t('transCard1Title')}</h3><p>${t('transCard1Desc')}</p></article><article class="transparency-card"><span class="feature-icon tint-blue">${icon('admin')}</span><h3>${t('transCard2Title')}</h3><p>${t('transCard2Desc')}</p></article><article class="transparency-card"><span class="feature-icon tint-violet">${icon('spark')}</span><h3>${t('transCard3Title')}</h3><p>${t('transCard3Desc')}</p></article><article class="transparency-card"><span class="feature-icon tint-coral">${icon('check')}</span><h3>${t('transCard4Title')}</h3><p>${t('transCard4Desc')}</p></article></div><div class="transparency-actions"><a class="btn primary" href="/privacy">${t('transBtnPrivacy')} ${icon('arrow')}</a><a class="btn" href="/terms">${t('transBtnTerms')}</a><a class="btn ghost" href="mailto:${esc(supp)}">${t('transBtnContact')}${publicConfig.supportEmail ? ' (' + esc(supp) + ')' : ''}</a></div></section><section class="closing-note"><div class="handwritten">${t('footerChannel')}</div><h2>${t('closingH2')}</h2><p>${t('closingDesc')}</p><a class="btn primary large" href="/app">${t('closingBtn')} ${icon('arrow')}</a></section></main>${publicFooter()}</div>`;
}

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
function oauthError(code) {
    const isIt = currentLang === 'it';
    const errorsIt = {
        GOOGLE_LINK_REQUIRED: 'Esiste già un account con questa email. Accedi con password e collega Google dalle impostazioni.',
        GOOGLE_NOT_CONFIGURED: 'Google non configurato dal gestore.',
        OAUTH_DENIED: 'Autorizzazione non concessa. Nessun account è stato collegato.',
        OAUTH_SCOPE: 'Il provider non ha concesso tutti i permessi richiesti.',
        REGISTRATION_CLOSED: 'Account Google non collegato. Richiedi un invito, accedi e collega Google dalle impostazioni.',
        ACCOUNT_EXISTS: 'Questo indirizzo ha già un account. Accedi con la password e collega Google da Impostazioni.',
        GOOGLE_DISABLED: 'L’accesso Google non è ancora configurato.',
        OAUTH_CANCELLED: 'Autorizzazione annullata. Nessun account è stato collegato.',
        OAUTH_STATE: 'La sessione di collegamento è scaduta o non appartiene a questo browser. Riparti dal pulsante Collega.',
        OAUTH_SCOPES: 'Il provider non ha concesso tutti i permessi richiesti.',
        REAUTH_REQUIRED: 'Per questa operazione è necessario confermare nuovamente la tua identità.'
    };
    const errorsEn = {
        GOOGLE_LINK_REQUIRED: 'An account already exists with this email. Log in with password and link Google in Settings.',
        GOOGLE_NOT_CONFIGURED: 'Google Sign-In has not been configured by the operator.',
        OAUTH_DENIED: 'Authorization was not granted. No account was connected.',
        OAUTH_SCOPE: 'The provider did not grant all required permissions.',
        REGISTRATION_CLOSED: 'Google account not linked. Request an invitation, log in, and link Google in Settings.',
        ACCOUNT_EXISTS: 'This email address already has an account. Sign in with password and link Google in Settings.',
        GOOGLE_DISABLED: 'Google Sign-In is not yet configured.',
        OAUTH_CANCELLED: 'Authorization cancelled. No account was connected.',
        OAUTH_STATE: 'Connection state expired or does not match this browser session. Please try connecting again.',
        OAUTH_SCOPES: 'The provider did not grant all required scopes.',
        REAUTH_REQUIRED: 'Confirming your identity is required for this sensitive operation.'
    };
    const map = isIt ? errorsIt : errorsEn;
    return map[code] || (isIt ? 'Collegamento non completato (' + String(code).slice(0, 80) + '). Ripeti la connessione oppure controlla la configurazione dell’app.' : 'Connection incomplete (' + String(code).slice(0, 80) + '). Please retry or check app configuration.');
}
function authRoute(path) {
    const isIt = currentLang === 'it';
    const token = new URLSearchParams(location.hash.slice(1)).get('token') || location.hash.slice(1);
    if (path === '/login') {
        loginView();
        return;
    }
    if (path === '/register' && !publicConfig.registration) {
        authLayout(isIt ? 'Accesso su invito' : 'Invite-only access', isIt ? 'La registrazione pubblica non è abilitata.' : 'Public registration is not enabled.', `<a href="/login" class="btn primary full">${isIt ? 'Torna all’accesso' : 'Back to login'} ${icon('arrow')}</a>`);
        return;
    }
    const spec = {
        '/register': [isIt ? 'Crea il tuo studio' : 'Create your studio', isIt ? 'Il tuo primo workspace, con il tuo brand.' : 'Your first workspace, with your brand.', field('email', isIt ? 'Email di lavoro' : 'Work email', '', 'email', 'required autocomplete="email"') + field('name', isIt ? 'Nome del workspace' : 'Workspace name', '', 'text', 'required maxlength="100"') + field('password', isIt ? 'Password (almeno 16 caratteri)' : 'Password (min 16 chars)', '', 'password', 'required minlength="16" autocomplete="new-password"'), isIt ? 'Crea account' : 'Create account', 'signup'],
        '/forgot': [isIt ? 'Recupera l’accesso' : 'Recover access', isIt ? 'Ti invieremo un link monouso per reimpostare la password.' : 'We will send a one-time link to reset your password.', field('email', 'Email', '', 'email', 'required autocomplete="email"'), isIt ? 'Invia il link' : 'Send link', 'forgot'],
        '/reset': [isIt ? 'Una nuova password' : 'A new password', isIt ? 'Scegli una password unica, di almeno 16 caratteri.' : 'Choose a unique password of at least 16 characters.', field('password', isIt ? 'Nuova password' : 'New password', '', 'password', 'required minlength="16" autocomplete="new-password"'), isIt ? 'Salva password' : 'Save password', 'reset'],
        '/verify': [isIt ? 'Verifica la tua email' : 'Verify your email', isIt ? 'Conferma l’indirizzo per attivare il tuo account.' : 'Confirm address to activate your account.', '', isIt ? 'Conferma email' : 'Confirm email', 'verify'],
        '/invite': [isIt ? 'Il tuo invito è pronto' : 'Your invite is ready', isIt ? 'Se hai già un account, usa la sua password. Altrimenti creane una di almeno 16 caratteri.' : 'If you already have an account, use its password. Otherwise create a password of at least 16 characters.', field('password', 'Password', '', 'password', 'required autocomplete="new-password"'), isIt ? 'Accetta invito' : 'Accept invite', 'invite']
    }[path];
    if (!spec)
        return landing();
    const [title, sub, fields, label, endpoint] = spec;
    const noEmail = path === '/forgot' && !publicConfig.emailEnabled;
    authLayout(title, sub, noEmail ? `<div class="callout warning">${isIt ? 'Il gestore non ha ancora configurato l’email transazionale. Contatta l’amministratore dell’installazione per recuperare l’accesso.' : 'Transactional email is not configured. Contact the deployment administrator to recover access.'}</div><a href="/login">${isIt ? 'Torna all’accesso' : 'Back to login'}</a>` : `<form id="auth-form" class="form">${fields}${authError}<button type="submit" class="btn primary full large">${label} ${icon('arrow')}</button></form><p class="auth-bottom"><a href="/login">${isIt ? 'Torna all’accesso' : 'Back to login'}</a></p>${path === '/verify' ? button(isIt ? 'Reinvia email di verifica' : 'Resend verification email', 'resend-email', 'ghost full') : ''}`);
    if (noEmail)
        return;
    authFormBind(async (f) => { const r = await api('/api/auth/' + endpoint, 'POST', { ...f, token }); history.replaceState({}, '', location.pathname); authLayout(isIt ? 'Tutto pronto' : 'All set', r.message || (isIt ? 'Operazione completata. Puoi accedere al tuo workspace.' : 'Operation completed. You can now access your workspace.'), `<span class="success-orb">${icon('check')}</span><a class="btn primary full" href="/login">${isIt ? 'Vai all’accesso' : 'Go to login'} ${icon('arrow')}</a>`); });
}
function legalPage(path) {
    const privacy = path === '/privacy';
    const isIt = currentLang === 'it';
    const domain = publicConfig.baseUrl || window.location.origin;
    const supp = publicConfig.supportEmail || ('support@' + (window.location.hostname || 'yourdomain.com'));
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
                <b><a href="${esc(domain)}">${esc(domain)}</a></b>
            </div>
            <div>
                <small>${isIt ? 'Contatto Privacy & Supporto' : 'Privacy & Support Contact'}</small>
                <b><a href="mailto:${esc(supp)}">${esc(supp)}</a></b>
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
                `Il Titolare del trattamento per questa installazione è il gestore dello studio, contattabile direttamente all’indirizzo email: <a href="mailto:${esc(supp)}">${esc(supp)}</a>.` : 
                `The Data Controller and responsible operator for this deployment is reachable at: <a href="mailto:${esc(supp)}">${esc(supp)}</a>.`
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
                    `Puoi richiedere la cancellazione totale e permanente del tuo account, delle credenziali e di tutti i contenuti associati inviando un’email al responsabile all’indirizzo <a href="mailto:${esc(supp)}">${esc(supp)}</a>. Tutti i record associati verranno definitivamente rimossi entro 30 giorni.` : 
                    `You may request complete and irreversible deletion of your user account, stored credentials, and associated workspace records by emailing <a href="mailto:${esc(supp)}">${esc(supp)}</a>. All personal records will be permanently purged within 30 days.`
                }</li>
            </ul>
        </article>

        <article class="legal-section">
            <h2>8. ${isIt ? 'Diritti dell’Interessato (GDPR)' : 'Data Subject Rights (GDPR & International Regulations)'}</h2>
            <p>${isIt ? 
                `In conformità agli articoli 15-22 del Regolamento UE 2016/679 (GDPR), gli utenti possono esercitare in qualsiasi momento i diritti di accesso, rettifica, cancellazione (diritto all’oblio), limitazione del trattamento, portabilità dei dati e opposizione, contattando il Titolare all’indirizzo email: <a href="mailto:${esc(supp)}">${esc(supp)}</a>.` : 
                `In accordance with Articles 15-22 of EU Regulation 2016/679 (GDPR) and applicable privacy laws, users have the right to access, rectify, delete, restrict processing, request data portability, and object to the processing of their personal data by contacting the operator at: <a href="mailto:${esc(supp)}">${esc(supp)}</a>.`
            }</p>
        </article>

        <article class="legal-section">
            <h2>9. ${isIt ? 'Contatti Ufficiali' : 'Official Contact Information'}</h2>
            <p>${isIt ? 
                'Per qualsiasi richiesta di chiarimento, segnalazione o esercizio dei diritti in merito alla presente Informativa sulla Privacy o all’integrazione Google OAuth, puoi scrivere a:' : 
                'For any inquiries, requests, or privacy questions concerning this Policy or Google OAuth integration, please contact:'
            }</p>
            <p><strong>Email:</strong> <a href="mailto:${esc(supp)}">${esc(supp)}</a><br>
            <strong>${isIt ? 'Dominio:' : 'Domain:'}</strong> <a href="${esc(domain)}">${esc(domain)}</a></p>
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
                <b><a href="${esc(domain)}">${esc(domain)}</a></b>
            </div>
            <div>
                <small>${isIt ? 'Contatto di Supporto' : 'Support Contact'}</small>
                <b><a href="mailto:${esc(supp)}">${esc(supp)}</a></b>
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
                `Gli utenti possono autenticarsi mediante credenziali locali o tramite Single Sign-On con Google OAuth 2.0. L’utente è responsabile della custodia e della riservatezza delle proprie credenziali e risponde di qualsiasi attività svolta tramite il proprio account. In caso di sospetta violazione o accesso non autorizzato, è obbligo dell’utente darne tempestiva notifica all’amministratore all’indirizzo <a href="mailto:${esc(supp)}">${esc(supp)}</a>.` : 
                `Users can authenticate via local email/password credentials or Google OAuth 2.0 Single Sign-On. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. In case of suspected unauthorized access, you must notify the administrator immediately at <a href="mailto:${esc(supp)}">${esc(supp)}</a>.`
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
                `I presenti Termini possono essere aggiornati periodicamente per riflettere adeguamenti normativi o evoluzioni tecniche del Servizio. Per qualsiasi richiesta relativa ai presenti Termini di Servizio, è possibile contattare l’amministratore a: <a href="mailto:${esc(supp)}">${esc(supp)}</a>.` : 
                `These Terms may be updated periodically to reflect regulatory adjustments or technological improvements. For any inquiries regarding these Terms of Service, please contact the operator at: <a href="mailto:${esc(supp)}">${esc(supp)}</a>.`
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
                        <a class="btn ghost" href="mailto:${esc(supp)}">${isIt ? 'Contatta il Supporto' : 'Contact Support'}</a>
                    </div>
                </div>
            </main>
            ${publicFooter()}
        </div>
    `;
}
function shell(content) {
    const isIt = currentLang === 'it';
    pageTitle(labels[state.view] || 'Studio');
    const nav = Object.entries(labels).filter(([k]) => !['setup', 'admin', 'team'].includes(k));
    $('#app').innerHTML = `<div class="shell"><button class="menu-scrim" data-action="menu" aria-label="${isIt ? 'Chiudi menu' : 'Close menu'}"></button><aside class="sidebar"><a href="/" class="brand-home">${wordmark()}</a><div class="handwritten sidebar-motto">${t('sidebarMotto')}</div><div class="nav-label">${t('editorialWs')}</div><nav class="nav" aria-label="Studio">${nav.map(([k, l]) => `<a href="#${k}" class="${state.view === k || state.view.startsWith('content/') && k === 'contents' ? 'active' : ''}" ${state.view === k ? 'aria-current="page"' : ''}>${icon(k)}${l}</a>`).join('')}</nav>${may('admin') ? `<div class="nav-label nav-label-bottom">${t('yourEnv')}</div><nav class="nav" aria-label="${isIt ? 'Amministrazione' : 'Administration'}"><a href="#setup" class="${state.view === 'setup' ? 'active' : ''}">${icon('setup')}${labelsMap[currentLang]?.setup || (isIt ? 'Configurazione guidata' : 'Guided setup')}</a><a href="#team" class="${state.view === 'team' ? 'active' : ''}">${icon('team')}${labelsMap[currentLang]?.team || (isIt ? 'Team & accessi' : 'Team & access')}</a>${state.me.siteAdmin ? `<a href="#admin" class="${state.view === 'admin' ? 'active' : ''}">${icon('admin')}${labelsMap[currentLang]?.admin || (isIt ? 'Amministrazione' : 'Administration')}</a>` : ''}</nav>` : ''}<div class="sidebar-bottom"><span class="handwritten">${isIt ? 'Pensa → crea → pubblica' : 'Think → create → publish'}<span class="pencil-stroke"></span></span><small>AIR3 Social Studio · 0.2.0</small></div></aside><main class="main" id="main-content"><header class="topbar"><div class="brand-switch">${button(icon('menu'), 'menu', 'ghost mobile-menu icon-btn', 'aria-label="Menu"')}<span class="brand-avatar">${esc(state.brand?.data.name?.slice(0, 1) || '+')}</span><select id="brand-switch" aria-label="${isIt ? 'Seleziona brand' : 'Select brand'}">${state.brands.length ? state.brands.map(b => `<option value="${b.id}" ${state.brand?.id === b.id ? 'selected' : ''}>${esc(b.data.name)}</option>`).join('') : `<option>${isIt ? 'Il tuo primo brand' : 'Your first brand'}</option>`}</select>${may('admin') ? button(icon('plus'), 'new-brand', 'ghost icon-btn', 'aria-label="' + (isIt ? 'Crea brand' : 'Create brand') + '"') : ''}</div>${button(icon('search') + ' <span>' + t('searchStudio') + '</span><kbd>⌘ K</kbd>', 'command', 'search-button')}<div class="top-right">${langButton()}${themeButton()}<span class="avatar">${esc(state.me.user?.email?.slice(0, 2).toUpperCase() || 'AI')}</span><div class="profile-name"><b>${esc(state.me.user?.email?.split('@')[0] || 'Workspace')}</b><small>${esc(state.me.principal.role)}</small></div>${button(icon('exit'), 'logout', 'ghost icon-btn', 'aria-label="' + esc(t('signOut')) + '" title="' + esc(t('signOut')) + '"')}</div></header><div class="page">${content}</div><footer class="studio-footer"><span>${t('footerRule')}</span><span class="handwritten">${t('footerChannel')}</span></footer></main></div>`;
    const bs = $('#brand-switch');
    bs.onchange = async () => {
        state.brand = state.brands.find(x => x.id === bs.value);
        state.data = {};
        location.hash = 'overview';
        await refresh();
    };
    bindExperience();
}
function newOverview() {
    const isIt = currentLang === 'it';
    const c = state.data.contents || [], a = state.data.accounts || [], docs = state.data.knowledge || [], jobs = state.data.jobs || [];
    const cnt = ss => c.filter(x => ss.includes(x.data.status)).length;
    const stats = [
        ['contents', 'blue', t('drafts'), cnt(['DRAFT', 'GENERATED', 'REVIEW_REQUIRED']), t('draftsSub')],
        ['calendar', 'teal', t('scheduled'), cnt(['SCHEDULED']), t('scheduledSub')],
        ['send', 'violet', t('published'), cnt(['PUBLISHED']), t('publishedSub')],
        ['admin', 'amber', t('waitingApproval'), cnt(['WAITING_APPROVAL', 'REVIEW_FAILED']), t('waitingApprovalSub')]
    ];
    const approval = c.filter(x => ['WAITING_APPROVAL', 'REVIEW_FAILED'].includes(x.data.status)).slice(0, 4);
    const future = c.filter(x => x.data.status === 'SCHEDULED').sort((x, y) => String(x.data.scheduleAt).localeCompare(String(y.data.scheduleAt))).slice(0, 4);
    const enabled = a.filter(x => x.data.enabled);
    return head(
        t('ideasInMotion'),
        `${isIt ? 'Ciao' : 'Hello'} ${esc(state.me.user?.email?.split('@')[0] || 'creator')}. ${isIt ? 'Ecco cosa succede nello studio di' : 'Here is what is happening in the studio of'} <b>${esc(state.brand.data.name)}</b>.`,
        may('editor') ? button(icon('plus') + ' ' + t('newContent'), 'new-content', 'primary') : ''
    ) + `<div class="cards metric-cards">${stats.map(([i, col, t, n, sub]) => `<article class="card metric-card"><div class="metric-head"><span class="feature-icon tint-${col}">${icon(i)}</span><span>${t}</span></div><div class="metric">${n}</div><span class="caption">${sub}</span><span class="metric-pencil pencil-${col}"></span></article>`).join('')}</div><div class="overview-grid"><section class="panel performance-panel"><div class="panel-head"><h2>${isIt ? 'Pubblicazioni per canale' : 'Publications by Channel'}</h2><span class="microcopy">${isIt ? 'Nel brand · esiti confermati' : 'In brand · confirmed results'}</span></div><div class="panel-body">${publicationChart(c)}<div class="chart-footnote">${icon('analytics')}${isIt ? 'Le metriche di reach sono disponibili in Analytics dopo la raccolta dal provider.' : 'Reach metrics are available in Analytics once retrieved from provider.'}</div></div></section><section class="panel"><div class="panel-head"><h2>${t('yourChannels')}</h2><a href="#accounts">${isIt ? 'Gestisci' : 'Manage'} ${icon('arrow')}</a></div><div class="channel-health">${enabled.slice(0, 7).map(x => `<a class="health-line" href="#accounts">${socialMark(x.data.platform)}<span><b>${esc(x.data.name)}</b><small>${esc(x.data.platform)}</small></span><span class="status-dot"></span><small>${isIt ? 'Configurato' : 'Configured'}</small></a>`).join('') || empty(isIt ? 'Ogni storia trova il suo canale' : 'Every story finds its channel', isIt ? 'Collega il primo account per iniziare.' : 'Connect your first account to begin.', may('admin') ? button(isIt ? 'Collega un canale' : 'Connect a channel', 'go-channels', 'primary small') : '')}<p class="microcopy">${isIt ? 'I permessi live si controllano dalla pagina Canali.' : 'Live permissions are verified from Channels page.'}</p></div></section></div><div class="dashboard-bottom"><section class="panel"><div class="panel-head"><h2>${t('recentContent')}</h2><a href="#contents">${isIt ? 'Tutti' : 'All'} ${icon('arrow')}</a></div>${contentMini(c.slice(0, 5), isIt ? 'La prima idea parte da qui' : 'The first idea starts here', isIt ? 'Crea un brief o scrivi una bozza. Gli agenti ti aiuteranno a svilupparla.' : 'Create a brief or draft a post. Agents will help you develop it.')}</section><section class="panel"><div class="panel-head"><h2>${t('waitingApproval')}</h2>${badge(String(approval.length))}</div>${contentMini(approval, isIt ? 'Controllo editoriale in ordine' : 'Editorial review up to date', isIt ? 'I contenuti da rivedere compariranno qui.' : 'Content awaiting review will appear here.')}</section><section class="panel"><div class="panel-head"><h2>${isIt ? 'In calendario' : 'Scheduled in Calendar'}</h2><a href="#calendar">${isIt ? 'Apri' : 'Open'} ${icon('arrow')}</a></div>${future.length ? `<div class="upcoming-list">${future.map(x => `<a href="#content/${x.id}"><span class="date-tile"><small>${new Date(x.data.scheduleAt).toLocaleDateString(isIt ? 'it-IT' : 'en-US', { month: 'short', timeZone: state.brand?.data.timezone || 'Europe/Rome' })}</small><b>${new Date(x.data.scheduleAt).toLocaleDateString(isIt ? 'it-IT' : 'en-US', { day: 'numeric', timeZone: state.brand?.data.timezone || 'Europe/Rome' })}</b></span><span><strong>${esc(x.data.title)}</strong><small>${time(x.data.scheduleAt)}</small></span>${socialMark(x.data.platform)}</a>`).join('')}</div>` : empty(isIt ? 'Spazio alle prossime idee' : 'Room for upcoming ideas', isIt ? 'Quando programmi un contenuto approvato, lo trovi qui.' : 'When you schedule approved content, it appears here.')}</section></div><section class="panel section-space"><div class="panel-head"><h2>${icon('spark')} ${t('creativeEngine')}</h2><a href="#jobs">${labels.jobs || 'Jobs'} ${icon('arrow')}</a></div><div class="engine-strip">${[[ 'knowledge', docs.filter(d => d.data.approved).length + (isIt ? ' fonti approvate' : ' approved sources'), isIt ? 'Conoscenza selezionata per il brand' : 'Curated brand knowledge'], ['spark', state.status.model.configured ? (isIt ? 'Modello configurato' : 'Model configured') : (isIt ? 'Scegli un modello' : 'Choose a model'), state.status.model.name || (isIt ? 'Il wizard ti guida nella configurazione' : 'Wizard guides configuration')], ['jobs', jobs.filter(j => j.state === 'QUEUED').length + (isIt ? ' attività in coda' : ' queued jobs'), isIt ? 'Esecuzioni persistenti e tracciate' : 'Persistent, tracked executions'], ['admin', isIt ? 'Revisione umana' : 'Human review', state.brand.data.policy.autoPublish ? (isIt ? 'Policy automatica limitata abilitata' : 'Limited auto-publish policy enabled') : (isIt ? 'Invio solo dopo approvazione' : 'Publish only after human approval')]].map(([i, t, d]) => `<div>${icon(i)}<span><b>${esc(t)}</b><small>${esc(d)}</small></span></div>`).join('')}</div></section>`;
}
function contentMini(cs, title, sub) {
    const isIt = currentLang === 'it';
    const defTitle = isIt ? 'La prima idea parte da qui' : 'The first idea starts here';
    const defSub = isIt ? 'Crea un brief o scrivi una bozza. Gli agenti ti aiuteranno a svilupparla.' : 'Create a brief or draft a post. Agents will help you develop it.';
    return cs.length ? `<div class="content-mini">${cs.map(x => `<a href="#content/${x.id}">${socialMark(x.data.platform)}<span><strong>${esc(x.data.title || (isIt ? 'Senza titolo' : 'Untitled'))}</strong><small>${esc(x.data.platform)} · ${time(x.updatedAt)}</small></span>${badge(x.data.status)}</a>`).join('')}</div>` : empty(title || defTitle, sub || defSub);
}
function publicationChart(cs) {
    const isIt = currentLang === 'it';
    const counts = {};
    for (const c of cs)
        if (c.data.status === 'PUBLISHED')
            counts[c.data.platform] = (counts[c.data.platform] || 0) + 1;
    const items = Object.entries(counts);
    if (!items.length)
        return `<div class="chart-empty"><div class="empty-chart-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><b>${isIt ? 'I risultati iniziano dalle tue pubblicazioni.' : 'Results begin with your publications.'}</b><p>${isIt ? 'Nessun invio confermato, ancora. Il grafico si popolerà con i dati del brand.' : 'No confirmed posts yet. The chart will populate with brand data.'}</p></div>`;
    const max = Math.max(...items.map(x => x[1])), w = 600, h = 190, step = w / items.length;
    return `<svg class="data-chart" viewBox="0 0 660 250" role="img" aria-label="${isIt ? 'Pubblicazioni confermate per piattaforma' : 'Confirmed publications by platform'}"><path class="chart-grid" d="M30 20h610M30 80h610M30 140h610M30 200h610"/>${items.map(([p, n], i) => `<g><rect class="chart-bar bar-${i % 4}" x="${35 + i * step}" y="${200 - (n / max) * h}" width="${Math.max(12, step - 26)}" height="${n / max * h}" rx="3"/><text x="${35 + i * step + (step - 26) / 2}" y="${190 - n / max * h}" text-anchor="middle">${n}</text><text x="${35 + i * step + (step - 26) / 2}" y="230" text-anchor="middle">${esc(p)}</text></g>`).join('')}</svg>`;
}
function connectionBadge(c) {
    const isIt = currentLang === 'it';
    const s = c?.state || 'UNVERIFIED';
    const map = isIt
        ? { CONNECTED: 'Verificato', DISABLED: 'Disattivato', UNVERIFIED: 'Da verificare', EXPIRED: 'Scaduto', CHECK_FAILED: 'Verifica fallita', RECONNECT_REQUIRED: 'Ricollega' }
        : { CONNECTED: 'Verified', DISABLED: 'Disabled', UNVERIFIED: 'To verify', EXPIRED: 'Expired', CHECK_FAILED: 'Verification failed', RECONNECT_REQUIRED: 'Reconnect' };
    return `<span class="connection-state ${['CONNECTED'].includes(s) ? 'ok' : ['EXPIRED', 'CHECK_FAILED', 'RECONNECT_REQUIRED'].includes(s) ? 'warn' : ''}"><i></i>${esc(map[s] || s)}</span>`;
}
function channelCatalog(compact = false) {
    const isIt = currentLang === 'it';
    const catalog = state.status?.platforms || {};
    const keys = compact ? ['facebook', 'instagram', 'whatsapp', 'threads', 'tiktok', 'x', 'linkedin', 'linkedin-page', 'telegram', 'youtube'] : Object.keys(catalog);
    return `<div class="connection-grid ${compact ? 'compact' : ''}">${keys.filter(p => catalog[p]).map(p => {
        const app = oauthApps.find(a => a.platforms.includes(p));
        const n = connections.filter(c => c.data.platform === p && c.data.enabled).length;
        const subLabel = app ? 'OAuth · ' + esc(app.label) : p === 'telegram' ? (isIt ? 'Bot e canale verificati' : 'Verified bot & channel') : (isIt ? 'Credenziali / Postiz' : 'Credentials / Postiz');
        const connectText = isIt ? 'Collega' : 'Connect';
        const configOAuthText = isIt ? 'Configura OAuth' : 'Configure OAuth';
        const configBtnText = app?.configured ? connectText : configOAuthText;
        const telegramBtnText = isIt ? 'Collega bot' : 'Connect bot';
        const configOtherText = isIt ? 'Configura' : 'Configure';
        const adminOnlyNote = isIt ? '<small>Collegamento riservato agli amministratori</small>' : '<small>Connection reserved for administrators</small>';
        return `<article class="connection-card"><div class="connection-title">${socialMark(p)}<span><h3>${esc(catalog[p].label)}</h3><small>${subLabel}</small></span>${n ? `<span class="count-pill">${n}</span>` : ''}</div><p>${esc(catalog[p].notes)}</p><div class="connection-actions">${may('admin') ? app ? button(icon('link') + ' ' + configBtnText, app.configured ? 'connect-oauth' : 'configure-oauth', app.configured ? 'primary small' : 'small', dataId(app.configured ? p : app.provider)) + (app.configured ? button(icon('settings'), 'configure-oauth', 'ghost icon-btn', dataId(app.provider) + ' aria-label="' + (isIt ? 'Configura app ' : 'Configure app ') + esc(app.label) + '"') : '') : button(p === 'telegram' ? telegramBtnText : configOtherText, p === 'telegram' ? 'telegram-connect' : 'new-account', 'small', dataId(p)) : adminOnlyNote}</div></article>`;
    }).join('')}</div>`;
}
function accountsPage() {
    const isIt = currentLang === 'it';
    return head(
        isIt ? 'Connetti il tuo mondo.' : 'Connect your world.',
        isIt ? 'Account, consensi e destinazioni. I token restano cifrati nel backend.' : 'Accounts, consents, and destinations. Tokens remain encrypted in the backend.',
        may('admin') ? button(icon('setup') + ' Wizard', 'go-setup') + button(isIt ? 'Credenziali / Postiz' : 'Credentials / Postiz', 'new-account', 'primary') : ''
    ) + `<div class="connection-summary"><span>${icon('accounts')} <b>${connections.filter(c => c.data.enabled).length}</b> ${isIt ? 'account abilitati' : 'accounts enabled'}</span><span>${icon('admin')} <b>${connections.filter(c => c.connection?.state === 'CONNECTED').length}</b> ${isIt ? 'connessioni verificate' : 'verified connections'}</span><span class="handwritten">${isIt ? 'Meno passaggi. Più connessioni. ↗' : 'Fewer steps. More connections. ↗'}</span></div>${connections.length ? `<section class="panel section-space"><div class="panel-head"><h2>${isIt ? 'Account del brand' : 'Brand accounts'}</h2><span class="microcopy">${isIt ? 'Un controllo non pubblica contenuti' : 'A check does not publish content'}</span></div>${connections.map(a => `<div class="connected-row">${socialMark(a.data.platform)}<div class="connected-identity"><b>${esc(a.data.name)}</b><small>${esc(a.data.platform)} · ${esc(a.data.targetId)}</small><small>${esc(a.connection.detail)}</small>${a.connection.expiresAt ? `<small>${isIt ? 'Scadenza' : 'Expires'}: ${time(new Date(a.connection.expiresAt).toISOString())}</small>` : ''}</div>${connectionBadge(a.connection)}<div class="actions">${may('admin') ? button(isIt ? 'Verifica' : 'Verify', 'connection-check', 'small', dataId(a.id)) + button(icon('settings'), 'edit-account', 'ghost icon-btn', dataId(a.id) + ' aria-label="' + (isIt ? 'Modifica credenziali' : 'Edit credentials') + '"') + (a.data.transport === 'postiz' ? button(isIt ? 'Account Postiz' : 'Postiz Account', 'postiz-integrations', 'small', dataId(a.id)) + button(isIt ? 'Collega OAuth' : 'Connect OAuth', 'account-connect', 'small', dataId(a.id)) : button(icon('inbox'), 'webhook', 'ghost icon-btn', dataId(a.id) + ' aria-label="' + (isIt ? 'Configura webhook' : 'Configure webhook') + '"')) + button(icon('exit'), 'connection-disconnect', 'ghost icon-btn', dataId(a.id) + ' aria-label="' + (isIt ? 'Scollega account' : 'Disconnect account') + '"') : ''}</div></div>`).join('')}</section>` : ''}<div class="section-title"><h2>${isIt ? 'Trova il tuo prossimo canale' : 'Find your next channel'}</h2><span class="microcopy">${isIt ? 'API ufficiali · permessi espliciti' : 'Official APIs · explicit permissions'}</span></div>${channelCatalog()}<div class="callout section-space">${icon('lock')} ${isIt ? 'Il wizard completa URL, account e token dopo il consenso. La creazione dell’app developer, l’app review e gli eventuali accessi commerciali rimangono a carico del gestore. Telegram usa BotFather, non un finto login OAuth.' : 'The wizard completes URLs, accounts, and tokens after consent. Developer app creation, app review, and any commercial access remain the responsibility of the operator. Telegram uses BotFather, not a fake OAuth login.'}</div>`;
}
function wizardPage() {
    const isIt = currentLang === 'it';
    const step = onboarding.step || 0;
    const names = isIt ? ['Workspace', 'Identità del brand', 'Modelli AI', 'Connessioni', 'Revisione'] : ['Workspace', 'Brand Identity', 'AI Models', 'Connections', 'Review'];
    let body = '';
    if (step === 0)
        body = `<div class="wizard-intro"><span class="feature-icon tint-teal">${icon('team')}</span><h2>${isIt ? 'Ogni buona idea merita il suo spazio.' : 'Every good idea deserves its space.'}</h2><p>${isIt ? 'Il workspace riunisce persone, brand e autorizzazioni. Potrai invitare il team quando vuoi.' : 'The workspace brings together people, brands, and permissions. You can invite your team anytime.'}</p></div><form id="workspace-form" class="form">${field('name', isIt ? 'Nome del workspace' : 'Workspace name', state.me.workspaces.find(w => w.id === state.workspace)?.name || (isIt ? 'Il mio studio' : 'My Studio'), 'text', 'required maxlength="100"')}<div>${button(icon('team') + ' ' + (isIt ? 'Invita il team' : 'Invite team'), 'go-team', '', 'type="button"')}</div><button type="submit" class="btn primary">${isIt ? 'Salva workspace' : 'Save workspace'} ${icon('check')}</button><div class="form-error" role="alert"></div></form>`;
    if (step === 1)
        body = `<div class="wizard-intro"><span class="feature-icon tint-violet">${icon('knowledge')}</span><h2>${isIt ? 'Prima di scrivere, conosciamo il tuo brand.' : 'Before writing, let us get to know your brand.'}</h2><p>${isIt ? 'Tono, pubblico, obiettivi e regole: il contesto che rende il lavoro degli agenti davvero tuo.' : 'Tone, audience, goals, and rules: the context that makes the agents\' work truly yours.'}</p></div>${state.brand ? `<div class="brand-profile-preview"><span class="brand-avatar">${esc(state.brand.data.name.slice(0, 1))}</span><div><h3>${esc(state.brand.data.name)}</h3><p>${esc(state.brand.data.description || (isIt ? 'Aggiungi una descrizione per gli agenti.' : 'Add a description for the agents.'))}</p><div class="tag-list">${state.brand.data.tone.map(t => badge(t)).join('')}</div></div></div><div class="actions">${button(isIt ? 'Modifica identità' : 'Edit identity', 'edit-brand', 'primary')}${button(isIt ? 'Aggiungi fonti' : 'Add sources', 'go-knowledge')}</div>` : button(icon('plus') + ' ' + (isIt ? 'Crea il primo brand' : 'Create first brand'), 'new-brand', 'primary')}<p class="microcopy">${isIt ? 'Le fonti devono essere approvate prima di entrare nel recupero RAG. Loghi e media si caricano dalla libreria.' : 'Sources must be approved before entering RAG retrieval. Logos and media are uploaded from the library.'}</p>`;
    if (step === 2)
        body = `<div class="wizard-intro"><span class="feature-icon tint-cyan">${icon('spark')}</span><h2>${isIt ? 'Un team AI. Lo stack che scegli tu.' : 'An AI team. The stack you choose.'}</h2><p>${isIt ? 'Configura Gemini o un endpoint compatibile. Gli embeddings sono separati dal modello generativo.' : 'Configure Gemini or a compatible endpoint. Embeddings are separated from the generative model.'}</p></div>${state.me.siteAdmin ? envForm('models', true) : `<div class="callout">${isIt ? 'La configurazione del modello è riservata all’amministratore dell’installazione.' : 'Model configuration is reserved for the site administrator.'} ${state.status.model.configured ? (isIt ? 'Il modello è già configurato.' : 'The model is already configured.') : (isIt ? 'Chiedi al gestore di abilitarlo prima di generare contenuti.' : 'Ask the operator to enable it before generating content.')}</div>`}`;
    if (step === 3)
        body = `<div class="wizard-intro"><span class="feature-icon tint-teal">${icon('accounts')}</span><h2>${isIt ? 'Ogni canale, con il tuo consenso.' : 'Every channel, with your consent.'}</h2><p>${isIt ? 'Collega un profilo, scegli le destinazioni autorizzate e lascia al backend la gestione dei token.' : 'Connect a profile, choose authorized destinations, and let the backend manage tokens.'}</p></div>${state.brand ? channelCatalog(true) : `<div class="callout warning">${isIt ? 'Crea prima il brand allo step 2.' : 'Create the brand in step 2 first.'}</div>`}<p class="microcopy">${isIt ? 'Tutti gli altri canali e i trasporti Postiz sono disponibili nella sezione Canali.' : 'All other channels and Postiz transports are available in the Channels section.'}</p>`;
    if (step === 4) {
        const checks = [
            [!!state.brand, isIt ? 'Identità del brand' : 'Brand identity', state.brand?.data.name || (isIt ? 'Da creare' : 'To create')],
            [state.status.model.configured, isIt ? 'Modello generativo' : 'Generative model', state.status.model.name || (isIt ? 'Da configurare' : 'To configure')],
            [connections.some(c => c.data.enabled), isIt ? 'Canali abilitati' : 'Enabled channels', connections.filter(c => c.data.enabled).length + (isIt ? ' account' : ' accounts')],
            [(state.data.knowledge || []).some(d => d.data.approved), isIt ? 'Fonti approvate' : 'Approved sources', isIt ? 'Conoscenza pronta per gli agenti' : 'Knowledge ready for agents'],
            [state.status.baseUrl.startsWith('https://'), isIt ? 'HTTPS pubblico' : 'Public HTTPS', isIt ? 'Necessario per OAuth remoto, webhook e media' : 'Required for remote OAuth, webhooks, and media'],
            [state.status.renderer.ffmpeg, isIt ? 'Rendering FFmpeg' : 'FFmpeg rendering', isIt ? 'Immagini e video nel tuo ambiente' : 'Images and video in your environment']
        ];
        body = `<div class="wizard-intro"><span class="feature-icon tint-teal">${icon('admin')}</span><h2>${isIt ? 'Il tuo studio prende forma.' : 'Your studio takes shape.'}</h2><p>${isIt ? 'Controlla cosa è già configurato e cosa richiede ancora un passaggio. Completare il wizard non avvia pubblicazioni.' : 'Check what is already configured and what still requires a step. Completing the wizard does not publish content.'}</p></div><div class="readiness-list">${checks.map(([ok, t, d]) => `<div><span class="readiness-icon ${ok ? 'ready' : ''}">${icon(ok ? 'check' : 'alert')}</span><span><b>${t}</b><small>${esc(d)}</small></span><span class="badge">${ok ? (isIt ? 'Configurato' : 'Configured') : (isIt ? 'Da completare' : 'Incomplete')}</span></div>`).join('')}</div><div class="callout section-space">${isIt ? 'Prima del lancio pubblico servono anche documenti privacy/termini del gestore, collaudi con account reali e verifica dei backup. Nessuna API viene considerata collaudata soltanto perché è configurata.' : 'Before a public launch, operator privacy/terms documents, tests with real accounts, and backup verification are also required. No API is considered tested merely because it is configured.'}</div>`;
    }
    return head(
        isIt ? 'Dai forma al tuo studio.' : 'Shape your studio.',
        isIt ? 'Un percorso guidato, dal primo workspace alle connessioni.' : 'A guided journey, from your first workspace to connections.',
        `<span class="handwritten">${isIt ? 'Le buone idee<br>partono da qui. ↗' : 'Good ideas<br>start here. ↗'}</span>`
    ) + `<ol class="wizard-steps">${names.map((n, i) => `<li class="${i === step ? 'current' : i < step ? 'complete' : ''}"><button data-action="wizard-jump" data-id="${i}" ${i === step ? 'aria-current="step"' : ''}><span>${i < step ? icon('check') : i + 1}</span><b>${n}</b></button></li>`).join('')}</ol><div class="wizard-layout"><section class="panel wizard-panel"><div class="eyebrow">${isIt ? `PASSAGGIO ${step + 1} DI 5` : `STEP ${step + 1} OF 5`}</div>${body}<div class="wizard-footer">${step ? button(isIt ? '← Indietro' : '← Back', 'wizard-back') : `<a href="#overview">${isIt ? 'Esplora lo studio' : 'Explore studio'}</a>`}${button(step === 4 ? (isIt ? 'Completa configurazione ' : 'Complete configuration ') + icon('check') : (isIt ? 'Continua ' : 'Continue ') + icon('arrow'), step === 4 ? 'wizard-complete' : 'wizard-next', 'primary')}</div></section><aside class="wizard-side"><div class="panel"><div class="panel-head"><h2>${icon('settings')} ${isIt ? 'Configurazione automatica' : 'Automatic configuration'}</h2></div><div class="panel-body"><p>${isIt ? 'Il server genera callback e configurazione locale. Le credenziali dei social vengono cifrate, mai copiate nel frontend.' : 'The server generates callbacks and local configuration. Social credentials are encrypted, never copied to the frontend.'}</p><div class="small-checks"><span>${icon('check')} ${isIt ? 'Callback generate' : 'Callbacks generated'}</span><span>${icon('check')} ${isIt ? 'State e sessione verificati' : 'State and session verified'}</span><span>${icon('check')} ${isIt ? 'Selezione account autorizzati' : 'Authorized account selection'}</span><span>${icon('check')} ${isIt ? 'Segreti separati per workspace' : 'Secrets separated by workspace'}</span></div><div class="code-label">${isIt ? 'ORIGIN ATTIVA' : 'ACTIVE ORIGIN'}</div><code class="wrap-code">${esc(state.status.baseUrl)}</code><div class="code-label">${isIt ? 'FILE GENERATO' : 'GENERATED FILE'}</div><code>DATA_DIR/runtime.generated.env</code><p class="microcopy">${isIt ? 'Scritto automaticamente quando salvi l’installazione. I token dei social restano nel database.' : 'Automatically written when you save the installation. Social tokens remain in the database.'}</p>${state.me.siteAdmin ? button(icon('code') + ' ' + (isIt ? 'Anteprima .env' : '.env preview'), 'env-preview', 'small') : ''}</div></div><span class="handwritten wizard-note">${isIt ? 'Meno lavoro manuale.<br>Più spazio per creare.' : 'Less manual work.<br>More room to create.'}<span class="pencil-stroke"></span></span></aside></div>`;
}
function envForm(group, compact = false) {
    const isIt = currentLang === 'it';
    if (!installation)
        return `<p>${isIt ? 'Configurazione non disponibile.' : 'Configuration not available.'}</p>`;
    let fs = installation.fields.filter(f => f.group === group);
    if (compact)
        fs = fs.filter(f => !f.key.startsWith('LLM_MODEL_'));
    return `<form class="form env-form" id="environment-form"><input type="hidden" name="group" value="${group}"><div class="form-row">${fs.map(f => {
        let control;
        if (f.key === 'ALLOW_REGISTRATION')
            control = select(f.key, friendly[f.key], [{ value: 'false', label: isIt ? 'Solo su invito' : 'Invite only' }, { value: 'true', label: isIt ? 'Aperta, con email verificata' : 'Open, with verified email' }], f.value || 'false');
        else if (f.key === 'LLM_PROVIDER')
            control = select(f.key, friendly[f.key], [{ value: 'gemini', label: 'Google Gemini' }, { value: 'compatible', label: isIt ? 'API compatibile / modello locale' : 'Compatible API / local model' }], f.value || state.status?.model?.provider || 'gemini');
        else
            control = field(f.key, friendly[f.key] || f.key, f.value, f.secret ? 'password' : 'text', `autocomplete="off" spellcheck="false" ${f.secret ? 'placeholder="' + (f.configured ? (isIt ? 'Già salvato · lascia vuoto per conservarlo' : 'Already saved · leave blank to keep') : (isIt ? 'Inserisci il segreto' : 'Enter secret')) + '"' : ''}`);
        return `<div class="setting-field">${control}<small>${esc(f.help)}</small>${f.secret && f.configured ? check('clear:' + f.key, isIt ? 'Rimuovi il segreto salvato' : 'Remove saved secret') : ''}</div>`;
    }).join('')}</div>${group === 'login' ? `<div class="callback-box"><span>${icon('link')} ${isIt ? 'URI di redirect da registrare in Google Cloud' : 'Redirect URI to register in Google Cloud'}</span><code>${esc(state.status.baseUrl)}/oauth/google/callback</code>${button(icon('copy') + ' ' + (isIt ? 'Copia callback' : 'Copy callback'), 'copy-text', 'small', 'type="button" data-text="' + esc(state.status.baseUrl + '/oauth/google/callback') + '"')}</div><p class="microcopy">${isIt ? 'Accesso Google e accesso YouTube sono consensi diversi. I grant non vengono condivisi.' : 'Google Sign-in and YouTube access are separate consents. Grants are not shared.'}</p>` : ''}${group === 'models' ? `<p class="microcopy">${isIt ? 'Il salvataggio non esegue chiamate al modello. “Test connessione” effettua una richiesta reale, che può essere a consumo. Cambiando modello embeddings, salva di nuovo le fonti per reindicizzarle.' : 'Saving does not call the model. “Test connection” makes a real request, which may be metered. Changing embedding models requires re-saving sources to re-index them.'}</p>` : ''}${group === 'email' ? `<p class="microcopy">${isIt ? 'Usiamo l’API HTTPS di Resend. Verifica il dominio mittente prima di attivare recupero password e registrazione.' : 'We use the Resend HTTPS API. Verify the sender domain before enabling password recovery and registration.'}</p>` : ''}<div class="form-error" role="alert"></div><div class="actions"><button class="btn primary" type="submit">${icon('check')} ${isIt ? 'Salva configurazione' : 'Save configuration'}</button>${group === 'models' ? button(isIt ? 'Test connessione' : 'Test connection', 'test-model', '', 'type="button"') : group === 'email' ? button(isIt ? 'Invia email di test' : 'Send test email', 'test-email', '', 'type="button"') : ''}</div></form>`;
}
function sharedAppsPage() {
    const isIt = currentLang === 'it';
    return `<div class="callout">${isIt ? 'Configura una sola volta le app developer dell’installazione. I clienti vedranno «Collega» e autorizzeranno i propri account. Il client secret rimane sul server; un workspace può scegliere un’app propria.' : 'Configure the installation developer apps once. Clients will see "Connect" and authorize their own accounts. The client secret remains on the server; a workspace can configure its own app.'}</div><div class="platform-grid">${globalOAuthApps.map(a => `<article class="connection-card"><div class="connection-title">${socialMark(a.platforms[0])}<span><h3>${esc(a.label)}</h3><small>${a.configured ? (isIt ? 'App condivisa configurata' : 'Shared app configured') : (isIt ? 'Da configurare' : 'To configure')}</small></span></div><p>${esc(a.platforms.map(p => state.status.platforms[p]?.label || p).join(' · '))}</p><div class="connection-actions">${button(icon('settings') + ' ' + (isIt ? 'Configura' : 'Configure'), 'configure-shared-oauth', 'small', dataId(a.provider))}${a.provider === 'meta' && a.configured ? button('Webhook', 'shared-meta-webhook', 'small') : ''}</div></article>`).join('')}</div>`;
}
function adminPage() {
    const isIt = currentLang === 'it';
    return head(
        isIt ? 'Il centro di controllo.' : 'Control Center.',
        isIt ? 'Configurazione dell’installazione. Accessibile solo agli amministratori del servizio.' : 'Installation configuration. Accessible only to service administrators.',
        button(icon('code') + ' ' + (isIt ? 'Anteprima .env' : '.env preview'), 'env-preview') + button(icon('download') + ' ' + (isIt ? 'Esporta .env' : 'Export .env'), 'env-export')
    ) + (installation?.pendingRestart ? `<div class="callout warning">${isIt ? 'La URL pubblica è stata modificata. Riavvia il servizio per attivarla e aggiorna i redirect autorizzati nei provider.' : 'The public URL has been modified. Restart the service to activate it and update authorized redirects in providers.'}</div>` : '') + `<div class="admin-metrics"><span>${icon('team')}<b>${siteData?.users?.length || 0}</b> ${isIt ? 'utenti' : 'users'}</span><span>${icon('accounts')}<b>${siteData?.counts?.workspaces || 0}</b> ${isIt ? 'workspace' : 'workspaces'}</span><span>${icon('knowledge')}<b>${siteData?.counts?.brands || 0}</b> ${isIt ? 'brand' : 'brands'}</span><span>${icon('lock')} ${isIt ? 'Segreti cifrati a riposo' : 'Secrets encrypted at rest'}</span></div><div class="settings-tabs" role="tablist" aria-label="${isIt ? 'Impostazioni installazione' : 'Installation settings'}">${Object.entries(groups).map(([k, t]) => `<button class="${installGroup === k ? 'active' : ''}" role="tab" aria-selected="${installGroup === k}" data-action="env-group" data-id="${k}">${t}</button>`).join('')}</div><section class="panel admin-config"><div class="panel-head"><h2>${groups[installGroup]}</h2><span class="badge">${isIt ? 'Installazione' : 'Installation'}</span></div><div class="panel-body">${installGroup === 'oauth' ? sharedAppsPage() : envForm(installGroup)}</div></section><section class="panel section-space"><div class="panel-head"><h2>${isIt ? 'Utenti del servizio' : 'Service Users'}</h2><a href="#team">${isIt ? 'Gestisci il team' : 'Manage team'} ${icon('arrow')}</a></div><div class="table-wrap"><table><thead><tr><th>${isIt ? 'Email' : 'Email'}</th><th>${isIt ? 'Verifica' : 'Verification'}</th><th>${isIt ? 'Accesso' : 'Access'}</th><th></th></tr></thead><tbody>${(siteData?.users || []).map(u => `<tr><td><b>${esc(u.email)}</b>${u.site_admin ? ' <span class="badge">Site admin</span>' : ''}</td><td>${u.verified ? (isIt ? 'Email verificata' : 'Email verified') : (isIt ? 'In attesa' : 'Pending')}</td><td>${u.disabled ? (isIt ? 'Disabilitato' : 'Disabled') : (isIt ? 'Attivo' : 'Active')}</td><td>${!u.site_admin ? button(u.disabled ? (isIt ? 'Riabilita' : 'Enable') : (isIt ? 'Disabilita' : 'Disable'), 'site-user', u.disabled ? 'small' : 'small danger', dataId(u.id) + ' data-disabled="' + u.disabled + '"') : ''}</td></tr>`).join('')}</tbody></table></div></section><section class="panel section-space"><div class="panel-head"><h2>${isIt ? 'Audit amministrativo' : 'Administrative Audit'}</h2><span class="microcopy">${isIt ? 'Ultime 100 operazioni dell’installazione' : 'Last 100 installation operations'}</span></div>${siteData?.audit?.length ? `<div class="audit-list">${siteData.audit.slice(0, 15).map(e => `<div>${icon('jobs')}<b>${esc(e.action)}</b><span>${time(e.at)}</span></div>`).join('')}</div>` : empty(isIt ? 'Nessuna operazione amministrativa' : 'No administrative operations', isIt ? 'Le modifiche di configurazione verranno registrate qui.' : 'Configuration changes will be recorded here.')}</section>`;
}
function teamPage() {
    const isIt = currentLang === 'it';
    const roleDefs = isIt ? [
        ['viewer', 'Osserva', 'Legge i contenuti del workspace.'],
        ['editor', 'Crea', 'Scrive, genera e programma versioni già approvate.'],
        ['approver', 'Valida', 'Revisiona e approva, oltre a creare contenuti.'],
        ['admin', 'Gestisce', 'Gestisce brand, team, account e app OAuth.']
    ] : [
        ['viewer', 'View', 'Reads workspace content.'],
        ['editor', 'Create', 'Drafts, generates, and schedules approved versions.'],
        ['approver', 'Approve', 'Reviews and approves, as well as creates content.'],
        ['admin', 'Manage', 'Manages brands, teams, accounts, and OAuth apps.']
    ];
    return head(
        isIt ? 'Le persone, al centro.' : 'People, at the center.',
        isIt ? 'Ruoli espliciti. Inviti monouso. Ogni membro accede solo ai propri workspace.' : 'Explicit roles. Single-use invites. Each member accesses only their workspaces.',
        button(icon('plus') + ' ' + (isIt ? 'Invita una persona' : 'Invite a member'), 'invite-user', 'primary')
    ) + `<div class="two-col"><section class="panel"><div class="panel-head"><h2>${isIt ? 'Il tuo team' : 'Your team'}</h2><span class="badge">${teamData.length} ${isIt ? 'membri' : 'members'}</span></div><div class="team-list">${teamData.map(u => `<div><span class="avatar">${esc(u.email.slice(0, 2).toUpperCase())}</span><span><b>${esc(u.email)}</b><small>${esc(u.role)}${u.id === state.me.principal.userId ? (isIt ? ' · tu' : ' · you') : ''}</small></span><div class="actions">${button(isIt ? 'Ruolo' : 'Role', 'member-role', 'small', dataId(u.id))}${u.id !== state.me.principal.userId ? button(isIt ? 'Rimuovi' : 'Remove', 'member-remove', 'small danger', dataId(u.id)) : ''}</div></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>${isIt ? 'Inviti in attesa' : 'Pending invites'}</h2><span class="badge">${invitationData.length}</span></div>${invitationData.length ? `<div class="invite-list">${invitationData.map(x => `<div><span><b>${esc(x.email)}</b><small>${esc(x.role)} · ${isIt ? 'scade' : 'expires'} ${time(new Date(x.expires).toISOString())}</small></span>${button(isIt ? 'Revoca' : 'Revoke', 'invite-revoke', 'small danger', dataId(x.id))}</div>`).join('')}</div>` : empty(isIt ? 'Il team può crescere' : 'Team can grow', isIt ? 'Invita una persona via email o condividi il link monouso in modo sicuro.' : 'Invite someone via email or share the single-use link securely.')}</section></div><section class="role-grid section-space">${roleDefs.map(([r, t, d]) => `<article class="feature-card"><span class="badge">${r}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</section><div class="callout section-space">${isIt ? 'Un amministratore di workspace non può leggere o modificare i segreti dell’installazione. I privilegi di site admin sono assegnati dall’operatore sul server.' : 'A workspace administrator cannot read or modify installation secrets. Site admin privileges are assigned by the server operator.'}</div>`;
}
function settingsPage() {
    const isIt = currentLang === 'it';
    let base = legacySettingsPage();
    if (isIt) {
        base = base.replace('Provider e segreti infrastrutturali si configurano in .env. Non vengono esposti nella dashboard.', 'Provider e segreti infrastrutturali si configurano nel pannello Amministrazione, riservato al gestore.').replace('Questa release non include SSO o un servizio di fatturazione.', 'Google OIDC è disponibile se configurato. Il prodotto non include fatturazione o SAML.');
    } else {
        base = base.replace('Provider and infrastructure secrets are configured in .env. They are not exposed in the dashboard.', 'Provider and infrastructure secrets are configured in the Administration panel, reserved for the operator.').replace('This release does not include SSO or a billing service.', 'Google OIDC is available if configured. The product does not include billing or SAML.');
    }
    return base + `<section class="panel section-space"><div class="panel-head"><h2>${googleMark()} ${isIt ? 'Accesso Google' : 'Google Sign-in'}</h2><span class="badge">${state.me.googleLinked ? (isIt ? 'Collegato' : 'Linked') : (isIt ? 'Non collegato' : 'Not linked')}</span></div><div class="panel-body"><p class="subtle">${isIt ? 'Collega il tuo profilo Google dopo aver effettuato l’accesso standard. Un indirizzo email uguale non basta a collegare automaticamente due identità.' : 'Link your Google profile after standard login. An identical email address is not enough to automatically link two identities.'}</p>${state.me.googleLinked ? `<p class="callout">${isIt ? 'Puoi usare Continua con Google nella schermata di accesso.' : 'You can use Continue with Google on the sign-in screen.'}</p>` : button(googleMark() + ' ' + (isIt ? 'Collega Google' : 'Link Google'), 'google-link', '', !publicConfig.google ? 'disabled' : '')}</div></section>`;
}
async function refresh() {
    const isIt = currentLang === 'it';
    if (!state.me) return;
    const serial = ++rendering;
    state.view = location.hash.slice(1) || 'overview';
    if (state.view === 'setup') {
        if (!may('admin')) throw new Error(isIt ? 'Configurazione riservata agli amministratori' : 'Configuration reserved for administrators');
        onboarding = await api('/api/onboarding');
        await experienceData();
        if (state.brand) await loadCollections(['knowledge']);
        shell(wizardPage());
        return;
    }
    if (state.view === 'admin') {
        if (!state.me.siteAdmin) {
            shell(head(isIt ? 'Accesso riservato' : 'Restricted access', isIt ? 'Solo l’amministratore dell’installazione può modificare questa configurazione.' : 'Only the site administrator can modify this configuration.'));
            return;
        }
        [installation, siteData, globalOAuthApps] = await Promise.all([api('/api/admin/installation'), api('/api/admin/site'), api('/api/admin/oauth/apps')]);
        shell(adminPage());
        return;
    }
    if (state.view === 'team') {
        if (!may('admin')) throw new Error(isIt ? 'Accesso riservato agli amministratori' : 'Access reserved for administrators');
        [teamData, invitationData] = await Promise.all([api('/api/admin/users'), api('/api/admin/invitations')]);
        shell(teamPage());
        return;
    }
    if (!state.brand) {
        shell(head(isIt ? 'Il tuo studio sta per nascere.' : 'Your studio is about to come alive.', isIt ? 'Configura il primo brand per dare voce alle tue idee.' : 'Set up your first brand to give voice to your ideas.', may('admin') ? button(icon('setup') + ' ' + (isIt ? 'Inizia dal wizard' : 'Start with wizard'), 'go-setup', 'primary') : '') + `<section class="first-brand"><div>${hubArt()}</div><div><span class="handwritten">${isIt ? 'Una pagina bianca.<br>Infinite possibilità.' : 'A blank page.<br>Infinite possibilities.'}</span><h2>${isIt ? 'Cominciamo dal tuo brand.' : 'Let’s start with your brand.'}</h2><p class="subtle">${isIt ? 'Niente dati fittizi: fonti, contenuti e canali si popoleranno con il tuo lavoro.' : 'No placeholder data: sources, content, and channels will populate with your work.'}</p>${may('admin') ? button(icon('plus') + ' ' + (isIt ? 'Crea un brand' : 'Create brand'), 'new-brand', 'primary') : ''}</div></section>`);
        return;
    }
    if (state.view === 'accounts') await experienceData();
    if (serial !== rendering) return;
    await legacyRefresh();
}
async function experienceData() { const result = await Promise.all([may('admin') ? api('/api/oauth/apps') : [], state.brand ? api(base() + '/connections') : [], state.me.siteAdmin ? api('/api/admin/installation') : null]); [oauthApps, connections, installation] = result; }
function bindExperience() {
    const isIt = currentLang === 'it';
    const env = $('#environment-form');
    if (env)
        env.onsubmit = async (ev) => {
            ev.preventDefault();
            const b = env.querySelector('[type=submit]');
            b.disabled = true;
            try {
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
                publicConfig = { ...publicConfig, ...pc, google: true, supportEmail: pc.supportEmail || '', privacyUrl: pc.privacyUrl || '/privacy', termsUrl: pc.termsUrl || '/terms' };
                toast(isIt ? 'Configurazione salvata. Il file .env è stato generato nel DATA_DIR.' : 'Configuration saved. .env file generated in DATA_DIR.');
                await refresh();
            }
            catch (e) {
                $('.form-error', env).textContent = e.message;
            }
            finally {
                b.disabled = false;
            }
        };
    const wf = $('#workspace-form');
    if (wf)
        wf.onsubmit = async (ev) => {
            ev.preventDefault();
            try {
                await api('/api/admin/workspace', 'PUT', Object.fromEntries(new FormData(wf)));
                state.me = await api('/api/me');
                toast(isIt ? 'Workspace salvato' : 'Workspace saved');
            }
            catch (e) {
                $('.form-error', wf).textContent = e.message;
            }
        };
}
async function configureOAuth(provider, global = false) {
    const isIt = currentLang === 'it';
    await experienceData();
    if (global)
        globalOAuthApps = await api('/api/admin/oauth/apps');
    const a = (global ? globalOAuthApps : oauthApps).find(x => x.provider === provider);
    if (!a)
        throw new Error(isIt ? 'Provider non disponibile' : 'Provider not available');
    const title = (global ? (isIt ? 'App condivisa · ' : 'Shared app · ') : (isIt ? 'Collega ' : 'Connect ')) + a.label;
    const desc = global
        ? (isIt ? 'App del gestore: i workspace autorizzano solo i propri account, senza ricevere il client secret.' : 'Operator app: workspaces authorize only their own accounts, without receiving the client secret.')
        : (isIt ? 'App specifica del workspace, oppure app condivisa del gestore. I grant restano separati per brand.' : 'Workspace-specific app or shared operator app. Grants remain separate per brand.');
    const calloutOverride = a.inherited ? `<div class="callout warning">${isIt ? 'Stai usando l’app del gestore. Salvando qui crei un override: devi fornire il secret della tua app, non viene copiato quello condiviso.' : 'You are using the operator app. Saving here creates an override: you must provide your app secret, the shared one is not copied.'}</div>` : '';
    const stepsCallout = `<div class="callout">${isIt ? '1. Crea o apri la tua app nel portale ufficiale.<br>2. Registra la callback qui sotto e abilita i prodotti necessari.<br>3. Salva Client ID e secret, poi scegli Collega per il consenso.' : '1. Create or open your app in the official portal.<br>2. Register the callback below and enable required products.<br>3. Save Client ID and secret, then choose Connect for consent.'}</div>`;
    const docLink = `<a class="btn small" href="${safeUrl(a.docs)}" target="_blank" rel="noopener noreferrer">${isIt ? 'Apri la documentazione ufficiale ↗' : 'Open official documentation ↗'}</a>`;
    const redirectBox = `<div class="callback-box"><span>${isIt ? 'URI DI REDIRECT' : 'REDIRECT URI'}</span><code>${esc(a.redirectUri)}</code>${button(icon('copy') + ' ' + (isIt ? 'Copia' : 'Copy'), 'copy-text', 'small', 'type="button" data-text="' + esc(a.redirectUri) + '"')}</div>`;
    const clientIdField = field('clientId', provider === 'tiktok' ? 'Client key' : 'Client ID', a.clientId, 'text', 'required autocomplete="off"');
    const clientSecretPlaceholder = a.hasSecret && !a.inherited ? (isIt ? 'Salvato · lascia vuoto per conservarlo' : 'Saved · leave empty to keep') : (isIt ? 'Inserisci il secret della tua app' : 'Enter your app secret');
    const clientSecretField = field('clientSecret', 'Client secret', '', 'password', `autocomplete="off" placeholder="${clientSecretPlaceholder}"`);
    const metaFields = provider === 'meta' ? field('configId', isIt ? 'Facebook Login for Business configuration ID (opzionale)' : 'Facebook Login for Business configuration ID (optional)', a.configId) + field('businessId', isIt ? 'Business ID per discovery WhatsApp (opzionale)' : 'Business ID for WhatsApp discovery (optional)', a.businessId) : '';
    const discordFields = provider === 'discord' ? field('botToken', isIt ? 'Token del bot Discord' : 'Discord Bot Token', '', 'password', `autocomplete="off" placeholder="${a.hasBotToken ? (isIt ? 'Già salvato' : 'Already saved') : (isIt ? 'Richiesto per leggere i canali del bot' : 'Required to read bot channels')}"`) : '';
    const mastodonFields = provider === 'mastodon' ? field('instance', isIt ? 'Origin della tua istanza HTTPS' : 'HTTPS instance origin', a.instance, 'url', 'required') + `<p class="microcopy">${isIt ? 'L’origin deve anche essere autorizzata dal gestore in API & rete.' : 'The origin must also be authorized by the operator in API & Network.'}</p>` : '';
    const enabledCheck = check('enabled', isIt ? 'App abilitata' : 'App enabled', a.enabled);
    const removeOverrideBtn = !global && !a.inherited && a.clientId ? button(isIt ? 'Rimuovi override e usa app del gestore' : 'Remove override and use operator app', 'use-shared-oauth', 'ghost small', 'type="button" data-id="' + esc(provider) + '"') : '';
    const scopesDetails = `<details><summary>${isIt ? 'Permessi di riferimento' : 'Reference permissions'}</summary><p class="wrap-code">${esc(a.scopes.join(' '))}</p><p class="microcopy">${isIt ? 'La richiesta effettiva usa solo gli scope necessari al canale scelto. I permessi dipendono dai prodotti approvati dal provider.' : 'Actual request uses only scopes needed for the selected channel. Permissions depend on products approved by provider.'}</p></details>`;

    form(title, desc, `${calloutOverride}${stepsCallout}${docLink}${redirectBox}${clientIdField}${clientSecretField}${metaFields}${discordFields}${mastodonFields}${enabledCheck}${removeOverrideBtn}${scopesDetails}`, async (f) => {
        await api((global ? '/api/admin/oauth/apps/' : '/api/oauth/apps/') + provider, 'PUT', { ...f, enabled: !!f.enabled });
        toast(isIt ? 'App configurata. Ora collega il canale con OAuth.' : 'App configured. Now connect the channel with OAuth.');
    });
}
async function grantDialog(id) {
    const isIt = currentLang === 'it';
    const g = await api('/api/oauth/grants/' + id);
    const b = state.brands.find(x => x.id === g.brandId);
    if (b)
        state.brand = b;
    await refresh();
    const scopeMsg = g.scopeStatus === 'not-reported'
        ? (isIt ? 'Il provider non restituisce un elenco completo degli scope. Verifica i permessi prima della pubblicazione.' : 'The provider does not return a full scope list. Check permissions before publishing.')
        : (isIt ? 'Permessi restituiti: ' : 'Returned permissions: ') + esc(g.scopes.join(', '));
    form(
        isIt ? 'Scegli gli account da collegare' : 'Choose accounts to connect',
        isIt ? 'Destinazioni restituite dal provider. Nessun invio verrà eseguito.' : 'Destinations returned by provider. No posts will be sent.',
        `<div class="grant-list">${g.candidates.map((c, i) => `<label class="grant-option"><input type="checkbox" name="targets" value="${esc(c.key)}">${socialMark(c.platform)}<span><b>${esc(c.name)}</b><small>${esc(c.platform)} · ${esc(c.targetId)}</small></span></label>`).join('')}</div><p class="microcopy">${scopeMsg}</p>`,
        async (f, fd) => {
            const keys = fd.getAll('targets');
            if (!keys.length)
                throw new Error(isIt ? 'Seleziona almeno una destinazione' : 'Select at least one destination');
            await api('/api/oauth/grants/' + id, 'POST', { keys });
            history.replaceState({}, '', '/app#accounts');
            toast(isIt ? 'Account collegati. Puoi controllare i permessi dalla pagina Canali.' : 'Accounts connected. You can check permissions on Channels page.');
        },
        isIt ? 'Collega gli account selezionati' : 'Connect selected accounts'
    );
}
async function commandPalette() { modal(currentLang === 'it' ? 'Dove vuoi andare?' : 'Where do you want to go?', currentLang === 'it' ? 'Cerca una sezione, un contenuto o un canale del brand.' : 'Search for a section, content, or brand channel.', `<input id="command-search" class="command-input" type="search" aria-label="${esc(t('searchStudio'))}" placeholder="${currentLang === 'it' ? 'Calendario, un titolo, un canale…' : 'Calendar, title, channel…'}" autofocus><div class="command-results" id="command-results"></div>`); let items = Object.entries(labels).filter(([k]) => !['team', 'setup'].includes(k) || may('admin')).filter(([k]) => k !== 'admin' || state.me.siteAdmin).map(([id, label]) => ({ label, id, icon: id })); const draw = q => { $('#command-results').innerHTML = items.filter(x => x.label.toLowerCase().includes(q.toLowerCase()) || (labelsMap.it[x.id] && labelsMap.it[x.id].toLowerCase().includes(q.toLowerCase())) || (labelsMap.en[x.id] && labelsMap.en[x.id].toLowerCase().includes(q.toLowerCase()))).slice(0, 15).map(x => `<a href="#${esc(x.id)}" data-action="command-go" data-id="${esc(x.id)}">${icon(x.icon || 'contents')}<span>${esc(x.label)}</span>${icon('arrow')}</a>`).join('') || `<p class="subtle">${currentLang === 'it' ? 'Nessun risultato.' : 'No results.'}</p>`; }; draw(''); $('#command-search').oninput = ev => draw(ev.target.value); $('#command-search').focus(); if (state.brand) {
    const c = await api(base() + '/contents');
    items.push(...c.map(x => ({ label: x.data.title || (currentLang === 'it' ? 'Senza titolo' : 'Untitled'), id: 'content/' + x.id, icon: 'contents' })));
    if ($('#command-search'))
        draw($('#command-search').value);
} }
async function action(name, idValue, el) {
    const isIt = currentLang === 'it';
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
        toast(isIt ? 'Copiato' : 'Copied');
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
            toast(isIt ? 'Wizard completato. Nessuna pubblicazione è stata avviata.' : 'Wizard completed. No posts were initiated.');
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
            return form(
                isIt ? 'Attiva webhook Telegram' : 'Activate Telegram Webhook',
                isIt ? 'Questo sostituisce il webhook esistente del bot. Usa un bot distinto per ogni canale con inbox. Non vengono inviati post.' : 'This replaces the existing bot webhook. Use a separate bot for each channel with inbox. No posts are sent.',
                check('confirm', isIt ? 'Confermo di impostare il webhook di questo bot' : 'I confirm setting this bot\'s webhook', false, true),
                async () => {
                    await api('/api/accounts/' + idValue + '/install-webhook', 'POST', {});
                    toast(isIt ? 'Webhook registrato presso Telegram.' : 'Webhook registered with Telegram.');
                },
                isIt ? 'Attiva webhook' : 'Activate webhook'
            );
        if (e.connection?.provider === 'meta') {
            const w = await api('/api/oauth/meta/webhook');
            modal(
                isIt ? 'Configura webhook Meta' : 'Configure Meta Webhook',
                isIt ? 'Registra questa callback nella console developer della tua app. Il token di verifica non è un access token.' : 'Register this callback in your app developer console. The verify token is not an access token.',
                `<div class="callback-box"><b>Callback URL</b><code>${esc(w.url)}</code>${button(icon('copy') + ' ' + (isIt ? 'Copia URL' : 'Copy URL'), 'copy-text', 'small', 'data-text="' + esc(w.url) + '"')}</div>${!w.managed ? `<div class="callback-box"><b>Verify token</b><code>${esc(w.verifyToken)}</code>${button(icon('copy') + ' ' + (isIt ? 'Copia token' : 'Copy token'), 'copy-text', 'small', 'data-text="' + esc(w.verifyToken) + '"')}</div>` : ''}<p class="microcopy">${esc(w.configuration)}</p>`
            );
            return;
        }
        return info(
            isIt ? 'Webhook e ricezione' : 'Webhooks and Receiving',
            isIt ? 'Per questo canale la ricezione guidata non è disponibile. I webhook di token Meta manuali si configurano nelle opzioni avanzate usando appSecret e webhookVerifyToken.' : 'Guided receiving is not available for this channel. Manual Meta token webhooks are configured in advanced settings using appSecret and webhookVerifyToken.'
        );
    }
    if (name === 'configure-shared-oauth')
        return configureOAuth(idValue, true);
    if (name === 'shared-meta-webhook') {
        const w = await api('/api/admin/oauth/meta/webhook');
        return modal(
            isIt ? 'Webhook Meta dell’installazione' : 'Installation Meta Webhook',
            isIt ? 'Una callback per tutti i workspace che usano l’app del gestore.' : 'One callback for all workspaces using the operator app.',
            `<div class="callback-box"><b>Callback</b><code>${esc(w.url)}</code>${button(isIt ? 'Copia URL' : 'Copy URL', 'copy-text', 'small', 'data-text="' + esc(w.url) + '"')}</div><div class="callback-box"><b>Verify token</b><code>${esc(w.verifyToken)}</code>${button(isIt ? 'Copia token' : 'Copy token', 'copy-text', 'small', 'data-text="' + esc(w.verifyToken) + '"')}</div><p>${esc(w.configuration)}</p>`
        );
    }
    if (name === 'use-shared-oauth')
        return form(
            isIt ? 'Rimuovi override del workspace' : 'Remove workspace override',
            isIt ? 'Verrà usata l’app condivisa del gestore, se configurata. Gli account autorizzati con un’altra app dovranno essere riconnessi.' : 'The operator shared app will be used if configured. Accounts authorized with another app will need to be reconnected.',
            check('confirm', isIt ? 'Confermo la rimozione della configurazione locale' : 'I confirm removing the local configuration', false, true),
            async () => {
                await api('/api/oauth/apps/' + idValue, 'DELETE');
                toast(isIt ? 'Override rimosso. Verifica e riconnetti gli account interessati.' : 'Override removed. Check and reconnect affected accounts.');
            },
            isIt ? 'Usa app del gestore' : 'Use operator app'
        );
    if (name === 'configure-oauth')
        return configureOAuth(idValue);
    if (name === 'connect-oauth') {
        const r = await api(base() + '/oauth/' + idValue + '/start', 'POST', {});
        location.assign(r.url);
        return;
    }
    if (name === 'telegram-connect')
        return form(
            isIt ? 'Collega Telegram' : 'Connect Telegram',
            isIt ? 'Aggiungi il bot al canale come amministratore. Verifichiamo bot, chat e permessi senza inviare messaggi.' : 'Add bot to channel as administrator. We verify bot, chat, and permissions without sending messages.',
            `${field('botToken', isIt ? 'Token da @BotFather' : 'Token from @BotFather', '', 'password', 'required autocomplete="off"')}${field('targetId', isIt ? 'ID chat o @nomecanale' : 'Chat ID or @channelname', '', 'text', 'required')}<p class="microcopy">${isIt ? 'Per ricevere messaggi e approvazioni, configura il webhook dopo la connessione. Un bot può avere un solo webhook attivo.' : 'To receive messages and approvals, configure the webhook after connecting. A bot can have only one active webhook.'}</p>`,
            async (f) => {
                await api(base() + '/connect-telegram', 'POST', f);
                toast(isIt ? 'Bot e permessi verificati. Canale collegato.' : 'Bot and permissions verified. Channel connected.');
            },
            isIt ? 'Verifica e collega' : 'Verify and connect'
        );
    if (name === 'connection-check') {
        await api('/api/accounts/' + idValue + '/check', 'POST', {});
        toast(isIt ? 'Verifica completata senza pubblicare contenuti.' : 'Check completed without publishing content.');
        await refresh();
        return;
    }
    if (name === 'connection-disconnect')
        return form(
            isIt ? 'Scollegare questo account?' : 'Disconnect this account?',
            isIt ? 'Il canale viene disabilitato e i token locali rimossi. I contenuti già pubblicati restano online. I grant remoti vanno revocati sul provider.' : 'The channel is disabled and local tokens removed. Published content remains online. Remote grants must be revoked on the provider.',
            check('confirm', isIt ? 'Confermo la disconnessione' : 'I confirm disconnection', false, true),
            async () => {
                await api('/api/accounts/' + idValue + '/disconnect', 'POST', {});
                toast(isIt ? 'Account scollegato localmente.' : 'Account disconnected locally.');
            },
            isIt ? 'Scollega account' : 'Disconnect account'
        );
    if (name === 'env-group') {
        installGroup = idValue;
        await refresh();
        return;
    }
    if (name === 'env-preview') {
        installation = await api('/api/admin/installation');
        modal(
            isIt ? 'Il tuo ambiente, senza segreti' : 'Your environment, without secrets',
            isIt ? 'Anteprima del file generato nel DATA_DIR. I token account rimangono cifrati nel database.' : 'Preview of generated file in DATA_DIR. Account tokens remain encrypted in the database.',
            `<pre>${esc(installation.preview)}</pre><div class="actions">${button(icon('copy') + ' ' + (isIt ? 'Copia versione oscurata' : 'Copy masked version'), 'copy-text', '', `data-text="${esc(installation.preview)}"`)}${button(isIt ? 'Chiudi' : 'Close', 'close-modal', 'primary')}</div>`
        );
        return;
    }
    if (name === 'env-export')
        return form(
            isIt ? 'Esporta configurazione riservata' : 'Export confidential configuration',
            isIt ? 'Il file contiene segreti infrastrutturali. Non condividerlo, non caricarlo nel repository e proteggilo come una password.' : 'The file contains infrastructure secrets. Do not share it, do not commit it to a repository, and protect it like a password.',
            check('confirm', isIt ? 'Confermo il download dei segreti sul dispositivo attuale' : 'I confirm downloading secrets to current device', false, true),
            async () => {
                const r = await api('/api/admin/installation/export', 'POST', { includeSecrets: true });
                downloadText(r.filename, r.content);
                toast(isIt ? 'Esportazione eseguita e registrata nell’audit.' : 'Export executed and recorded in audit log.');
            },
            isIt ? 'Esporta .env con segreti' : 'Export .env with secrets'
        );
    if (name === 'test-model' || name === 'test-email') {
        const r = await api('/api/admin/installation/' + name, 'POST', {});
        if (!r.ok)
            throw new Error(isIt ? 'Il test non ha restituito un esito positivo.' : 'The test did not return a successful result.');
        toast(name === 'test-model' ? (isIt ? 'Il modello ha risposto correttamente.' : 'The model responded successfully.') : (isIt ? 'Email di test inviata al tuo indirizzo.' : 'Test email sent to your address.'));
        return;
    }
    if (name === 'invite-user')
        return form(
            isIt ? 'Invita una persona' : 'Invite a member',
            isIt ? 'L’invito è monouso e scade dopo 72 ore. Con email configurata viene anche inviato al destinatario.' : 'Invite is single-use and expires after 72 hours. With email configured it is also sent to recipient.',
            `${field('email', isIt ? 'Email' : 'Email', '', 'email', 'required')}${select('role', isIt ? 'Ruolo' : 'Role', ['viewer', 'editor', 'approver', 'admin'], 'editor')}`,
            async (f) => {
                const r = await api('/api/admin/invitations', 'POST', f);
                closeModal();
                modal(
                    isIt ? 'Invito creato' : 'Invite created',
                    r.delivered ? (isIt ? 'Email inviata. Puoi anche condividere il link in modo sicuro.' : 'Email sent. You can also share the link securely.') : (isIt ? 'Email non configurata: condividi questo link con il destinatario.' : 'Email not configured: share this link with the recipient.'),
                    `<div class="callback-box"><code>${esc(r.url)}</code>${button(icon('copy') + ' ' + (isIt ? 'Copia link' : 'Copy link'), 'copy-text', 'primary', `data-text="${esc(r.url)}"`)}</div><p class="microcopy">${isIt ? 'Il link non sarà più mostrato dopo la chiusura.' : 'The link will not be displayed again after closing.'}</p>${button(isIt ? 'Chiudi' : 'Close', 'close-modal')}`
                );
                return false;
            },
            isIt ? 'Crea invito' : 'Create invite'
        );
    if (name === 'invite-revoke') {
        await api('/api/admin/invitations/' + idValue, 'DELETE');
        await refresh();
        return;
    }
    if (name === 'member-role') {
        const u = teamData.find(x => x.id === idValue);
        return form(isIt ? 'Ruolo nel workspace' : 'Workspace role', u.email, select('role', isIt ? 'Ruolo' : 'Role', ['viewer', 'editor', 'approver', 'admin'], u.role), async (f) => {
            await api('/api/admin/members/' + idValue, 'PUT', f);
            state.me = await api('/api/me');
            toast(isIt ? 'Ruolo aggiornato' : 'Role updated');
        });
    }
    if (name === 'member-remove')
        return form(
            isIt ? 'Rimuovi dal workspace' : 'Remove from workspace',
            isIt ? 'L’account personale rimane esistente. Rimuoviamo solo l’appartenenza a questo workspace.' : 'Personal account remains intact. We only remove membership in this workspace.',
            check('confirm', isIt ? 'Confermo la rimozione' : 'I confirm removal', false, true),
            async () => {
                await api('/api/admin/members/' + idValue, 'DELETE');
                toast(isIt ? 'Membro rimosso' : 'Member removed');
            },
            isIt ? 'Rimuovi' : 'Remove'
        );
    if (name === 'site-user') {
        const disabled = el.dataset.disabled === '0';
        return form(
            disabled ? (isIt ? 'Disabilita accesso' : 'Disable access') : (isIt ? 'Riabilita accesso' : 'Enable access'),
            isIt ? 'La modifica riguarda l’intera installazione e invalida le sessioni esistenti.' : 'Change applies to the entire installation and invalidates active sessions.',
            check('confirm', isIt ? 'Confermo la modifica' : 'I confirm change', false, true),
            async () => {
                await api('/api/admin/site/users/' + idValue, 'PUT', { disabled });
                toast(isIt ? 'Accesso aggiornato' : 'Access updated');
            }
        );
    }
    if (name === 'resend-email')
        return form(
            isIt ? 'Reinvia verifica' : 'Resend verification',
            isIt ? 'Riceverai un’email se il tuo indirizzo deve ancora essere verificato.' : 'You will receive an email if your address still requires verification.',
            field('email', isIt ? 'Email' : 'Email', '', 'email', 'required'),
            async (f) => {
                await api('/api/auth/resend', 'POST', f);
                toast(isIt ? 'Richiesta inoltrata' : 'Request forwarded');
            },
            isIt ? 'Invia' : 'Send'
        );
    return legacyAction(name, idValue, el);
}
async function confirmIdentity() {
    const isIt = currentLang === 'it';
    return new Promise((resolve, reject) => {
        const d = $('#reauth-dialog');
        d.innerHTML = `<form class="form" id="reauth-form"><div><span class="feature-icon tint-teal">${icon('lock')}</span><h2>${isIt ? 'Conferma la tua identità' : 'Confirm your identity'}</h2><p class="subtle">${isIt ? 'Stai modificando una configurazione sensibile. La conferma vale per 15 minuti.' : 'You are modifying sensitive configuration. Confirmation is valid for 15 minutes.'}</p></div>${field('reauthPassword', isIt ? 'Password attuale' : 'Current password', '', 'password', 'required autocomplete="current-password"')}<div class="form-error" role="alert"></div><div class="actions"><button type="button" id="reauth-cancel" class="btn">${isIt ? 'Annulla' : 'Cancel'}</button><button type="submit" class="btn primary">${isIt ? 'Conferma' : 'Confirm'}</button></div><p class="microcopy">${isIt ? 'Con un account solo Google, esci e accedi nuovamente con Google per una sessione recente; poi ripeti l’operazione.' : 'With a Google-only account, log out and sign in again with Google for a fresh session, then retry.'}</p></form>`;
        const cancel = () => {
            d.close();
            reject(new Error(isIt ? 'Operazione annullata. Nessuna modifica applicata.' : 'Operation cancelled. No changes applied.'));
        };
        d.oncancel = ev => {
            ev.preventDefault();
            cancel();
        };
        $('#reauth-cancel').onclick = cancel;
        $('#reauth-form').onsubmit = async (ev) => {
            ev.preventDefault();
            const f = ev.currentTarget, b = f.querySelector('[type=submit]');
            b.disabled = true;
            try {
                await api('/api/auth/reauth', 'POST', { password: new FormData(f).get('reauthPassword') });
                d.close();
                resolve();
            }
            catch (e) {
                $('.form-error', f).textContent = e.message;
            }
            finally {
                b.disabled = false;
            }
        };
        d.showModal();
    });
}
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
    publicConfig = { ...publicConfig, ...pc, google: true, supportEmail: pc.supportEmail || '', privacyUrl: pc.privacyUrl || '/privacy', termsUrl: pc.termsUrl || '/terms' };
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
            toast(currentLang === 'it' ? 'Identità Google collegata al tuo account.' : 'Google identity linked to your account.');
    }
    catch (e) {
        if (state.me) {
            shell(head(currentLang === 'it' ? 'Qualcosa non è andato a buon fine' : 'Something went wrong', esc(e.message), `<a class="btn" href="/app#overview">${currentLang === 'it' ? 'Torna allo studio' : 'Return to studio'}</a>`));
        }
        else
            loginView();
    }
}
else
    authRoute(path);
