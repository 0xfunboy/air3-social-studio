const $ = (q, root = document) => root.querySelector(q);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => { try {
    const x = new URL(u, location.origin);
    return ['http:', 'https:'].includes(x.protocol) ? esc(x.href) : '#';
}
catch {
    return '#';
} };
const state = { me: null, csrf: '', workspace: '', brands: [], brand: null, status: null, view: 'overview', data: {}, month: new Date(), busy: false };
const labels = { overview: 'Panoramica', contents: 'Contenuti', calendar: 'Calendario', knowledge: 'Conoscenza', accounts: 'Canali', assets: 'Media library', campaigns: 'Campagne', inbox: 'Inbox', analytics: 'Analytics', jobs: 'Attività', settings: 'Impostazioni' };
const icons = { overview: '◈', contents: '▤', calendar: '▦', knowledge: '⌘', accounts: '◎', assets: '▧', campaigns: '⚑', inbox: '✉', analytics: '▥', jobs: '◷', settings: '⚙' };
const statusLabels = { DRAFT: 'Bozza', GENERATING: 'Generazione', GENERATED: 'Generato', WAITING_APPROVAL: 'Da approvare', APPROVED: 'Approvato', SCHEDULED: 'Programmato', PUBLISHING: 'Invio', PROCESSING: 'In elaborazione', PUBLISHED: 'Pubblicato / inviato', REVIEW_FAILED: 'Da correggere', REVIEW_REQUIRED: 'Da revisionare', FAILED: 'Fallito', UNCERTAIN: 'Da riconciliare', REJECTED: 'Rifiutato', QUEUED: 'In coda', LEASED: 'In esecuzione', DONE: 'Completato', SUCCESS: 'Riuscito', CANCELLED: 'Annullato', SKIPPED: 'Non disponibile' };
let toastTimer;
function toast(message, error = false) { const t = $('#toast'); t.textContent = message; t.className = 'visible' + (error ? ' error' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 6000); }
function may(role) { return ['viewer', 'editor', 'approver', 'admin'].indexOf(state.me?.principal?.role) >= ['viewer', 'editor', 'approver', 'admin'].indexOf(role); }
async function api(path, method = 'GET', body, headers = {}) { const h = { 'X-Workspace-Id': state.workspace, ...headers }; if (method !== 'GET' && method !== 'HEAD')
    h['X-CSRF-Token'] = state.csrf; if (body !== undefined && !(body instanceof File) && !(body instanceof Blob)) {
    h['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
} const r = await fetch(path, { method, headers: h, body, credentials: 'same-origin' }); let out; try {
    out = await r.json();
}
catch {
    throw new Error('Risposta server non leggibile');
} if (!r.ok) {
    if (r.status === 401 && state.me) {
        state.me = null;
        loginView();
    }
    throw new Error(out.error?.message || `HTTP ${r.status}`);
} return out; }
const base = () => '/api/brands/' + state.brand.id;
const badge = s => `<span class="badge ${esc(s)}">${esc(statusLabels[s] || s)}</span>`;
const platform = p => `<span class="platform"><span class="picon">${esc(({ instagram: 'IG', facebook: 'f', threads: '@', whatsapp: 'WA', telegram: 'TG', tiktok: 'Tk', linkedin: 'in', 'linkedin-page': 'in', youtube: 'YT', pinterest: 'P', discord: 'D', mastodon: 'M', bluesky: 'B', farcaster: 'F', slack: '#' })[p] || String(p).slice(0, 2).toUpperCase())}</span>${esc(state.status?.platforms?.[p]?.label || p)}</span>`;
const button = (label, action, cls = '', extra = '') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const dataId = id => `data-id="${esc(id)}"`;
const time = v => v ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: state.brand?.data.timezone || 'Europe/Rome' }).format(new Date(v)) : '—';
function head(title, sub, actions = '') { return `<div class="heading"><div><div class="eyebrow">Editorial workspace</div><h1>${esc(title)}</h1><p class="subtle">${sub}</p></div><div class="actions">${actions}</div></div>`; }
function empty(title, sub, action = '') { return `<div class="empty"><strong>${esc(title)}</strong>${esc(sub)}${action ? '<br>' + action : ''}</div>`; }
function modal(title, sub, html) { const d = $('#dialog'); $('#dialog-content').innerHTML = `<div class="dialog-head"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>${button('✕', 'close-modal', 'ghost small', 'aria-label="Chiudi"')}</div>${html}`; if (!d.open)
    d.showModal(); }
function closeModal() { $('#dialog').close(); }
function info(title, data) { modal(title, 'Dati restituiti dal sistema', `<pre>${esc(typeof data === 'string' ? data : JSON.stringify(data, null, 2))}</pre>`); }
const field = (name, label, value = '', type = 'text', extra = '') => `<div class="field"><label for="f-${name}">${esc(label)}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
const area = (name, label, value = '', cls = '', rows = 4) => `<div class="field"><label for="f-${name}">${esc(label)}</label><textarea id="f-${name}" name="${name}" class="${cls}" rows="${rows}">${esc(value)}</textarea></div>`;
function select(name, label, options, value = '', extra = '') { return `<div class="field"><label for="f-${name}">${esc(label)}</label><select id="f-${name}" name="${name}" ${extra}>${options.map(x => { const v = typeof x === 'string' ? x : x.value, l = typeof x === 'string' ? x : x.label; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></div>`; }
const check = (name, label, value = false, required = false) => `<label class="check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''} ${required ? 'required' : ''}> <span>${label}</span></label>`;
const lines = v => String(v || '').split(/\n/).map(x => x.trim()).filter(Boolean);
const json = v => { try {
    return JSON.parse(v || '{}');
}
catch {
    throw new Error('Il campo JSON contiene un errore di sintassi');
} };
function form(title, sub, html, onSubmit, label = 'Salva') { modal(title, sub, `<form class="form" id="edit-form">${html}<div class="form-error" id="form-error" role="alert"></div><div class="dialog-footer">${button('Annulla', 'close-modal', '', 'type="button"')}<button type="submit" class="btn primary">${label}</button></div></form>`); $('#edit-form').addEventListener('submit', async (ev) => { ev.preventDefault(); const f = ev.currentTarget, submit = f.querySelector('[type=submit]'); submit.disabled = true; $('#form-error').textContent = ''; try {
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
} }); }
function loginView() {
    state.me = null;
    $('#app').innerHTML = `<div class="login"><section class="login-story"><div class="logo">AIR3<small>Social Studio</small></div><div class="login-visual" aria-hidden="true"><i></i><i></i><i></i></div><h1>Un brand.<br>La sua voce.<br><span>Ogni canale.</span></h1><p>Conoscenza, creatività e controllo editoriale. Lo spazio di lavoro per progettare contenuti insieme ai tuoi agenti.</p><div class="footer-note">SELF-HOSTED · HUMAN-IN-THE-LOOP · MULTI-BRAND</div></section><section class="login-form"><div class="eyebrow">Bentornato nello studio</div><h2>Accedi al workspace</h2><p class="subtle">Usa le credenziali create durante il setup o ricevute dall’amministratore.</p><form id="login-form" class="form">${field('email', 'Email', '', 'email', 'required autocomplete="username"')}${field('password', 'Password', '', 'password', 'required autocomplete="current-password"')}<div class="form-error" role="alert" id="login-error"></div><button class="btn primary full" type="submit">Entra nello studio →</button></form><p class="footer-note">Primo accesso? Esegui <span class="help-key">npm run setup</span> nella cartella del progetto. Nessuna password predefinita viene distribuita.</p></section></div>`;
    $('#login-form').onsubmit = async (ev) => { ev.preventDefault(); const f = ev.currentTarget, b = Object.fromEntries(new FormData(f)), btn = f.querySelector('button'); btn.disabled = true; try {
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
    } };
}
async function init() { state.status = await api('/api/status'); state.brands = await api('/api/brands'); state.brand = state.brands.find(x => x.id === state.brand?.id) || state.brands[0] || null; await refresh(); }
function shell(content) {
    $('#app').innerHTML = `<div class="shell"><aside class="sidebar"><div class="logo">AIR3<small>Social Studio</small></div><div class="nav-label">Il tuo studio</div><nav class="nav">${Object.entries(labels).map(([k, l]) => `<a href="#${k}" class="${state.view === k || state.view.startsWith('content/') && k === 'contents' ? 'active' : ''}"><span class="icon" aria-hidden="true">${icons[k]}</span>${l}</a>`).join('')}</nav><div class="sidebar-bottom"><b>Conoscenza → contenuto → impatto</b><br>Revisione umana attiva<br>Release 0.1.0 · Self-hosted</div></aside><main class="main"><header class="topbar"><div class="brand-switch">${button('☰', 'menu', 'ghost mobile-menu', 'aria-label="Menu"')}<div class="brand-avatar">${esc(state.brand?.data.name?.slice(0, 1) || '+')}</div><select id="brand-switch" aria-label="Seleziona brand">${state.brands.length ? state.brands.map(b => `<option value="${b.id}" ${b.id === state.brand?.id ? 'selected' : ''}>${esc(b.data.name)}</option>`).join('') : '<option>Crea il primo brand</option>'}</select>${may('admin') ? button('+', 'new-brand', 'ghost small', 'aria-label="Nuovo brand"') : ''}</div><div class="top-right"><span class="badge">${esc(state.me.principal.role)}</span><span class="member-pill">${esc(state.me.user?.email || state.me.principal.userId)}</span><div class="avatar">${esc(state.me.user?.email?.slice(0, 2).toUpperCase() || 'AI')}</div>${button('Esci', 'logout', 'ghost small')}</div></header><div class="page">${content}</div></main></div>`;
    const b = $('#brand-switch');
    if (b)
        b.onchange = async () => { state.brand = state.brands.find(x => x.id === b.value); state.view = 'overview'; location.hash = 'overview'; await refresh(); };
}
async function loadCollections(keys) { await Promise.all(keys.map(async (k) => { state.data[k] = await api(base() + '/' + k); })); }
async function refresh() {
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
function postsTable(rows, compact = false) { if (!rows.length)
    return empty('Nessun contenuto da mostrare', 'Le bozze e i contenuti programmati compariranno qui.'); return `<div class="table-wrap"><table><thead><tr><th>CONTENUTO</th>${compact ? '' : '<th>CANALE</th>'}<th>STATO</th><th>${compact ? 'CANALE' : 'PROGRAMMAZIONE'}</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td><a href="#content/${x.id}"><b class="truncate">${esc(x.data.title || 'Senza titolo')}</b></a><div class="subtle truncate">${esc(x.data.text?.slice(0, 80) || x.data.objective || 'Bozza da sviluppare')}</div></td>${compact ? '' : `<td>${platform(x.data.platform)}</td>`}<td>${badge(x.data.status)}</td><td>${compact ? platform(x.data.platform) : `<span class="subtle">${time(x.data.scheduleAt)}</span>`}</td><td><a class="btn small ghost" href="#content/${x.id}">Apri ↗</a></td></tr>`).join('')}</tbody></table></div>`; }
function overviewPage() { const cs = state.data.contents, accounts = state.data.accounts, docs = state.data.knowledge; const count = s => cs.filter(x => s.includes(x.data.status)).length; const stats = [['Da approvare', count(['WAITING_APPROVAL', 'REVIEW_FAILED']), 'Controllo editoriale'], ['Programmati', count(['SCHEDULED', 'PROCESSING']), 'Nella coda di pubblicazione'], ['Pubblicati / inviati', count(['PUBLISHED']), 'Esiti confermati dal provider'], ['Canali configurati', accounts.length, 'Credenziali salvate, non test live']]; const upcoming = cs.filter(x => ['SCHEDULED', 'WAITING_APPROVAL', 'REVIEW_FAILED', 'GENERATING', 'PROCESSING'].includes(x.data.status)).slice(0, 6); return head('Ogni contenuto, sotto controllo.', `Il workspace di <b>${esc(state.brand.data.name)}</b>. Dall’idea alla pubblicazione, con fonti e revisioni tracciate.`, may('editor') ? button('+ Nuovo contenuto', 'new-content', 'primary') : '') + `<div class="cards">${stats.map(([label, n, sub], i) => `<div class="card"><div class="overline">${label}<span class="metric-dot ${i === 2 ? 'green' : ''}"></span></div><div class="metric">${n}</div><div class="caption">${sub}</div></div>`).join('')}</div><div class="split"><div class="panel"><div class="panel-head"><h2>In lavorazione</h2><a href="#contents" class="subtle">Tutti i contenuti ↗</a></div>${postsTable(upcoming, true)}</div><div class="panel"><div class="panel-head"><h2>Il tuo sistema editoriale</h2><span class="badge">${docs.filter(x => x.data.approved).length} fonti</span></div><div class="panel-body steps">${[[true, 'Identità del brand', 'Tono, obiettivi e vincoli sempre nel contesto.'], [docs.some(x => x.data.approved), 'Conoscenza verificata', 'Carica le fonti e approvale per abilitarne il recupero.'], [accounts.length > 0, 'Canali e autorizzazioni', 'Collega gli account con API ufficiali o Postiz.'], [state.status.model.configured, 'Agenti specializzati', state.status.model.configured ? 'Modello: ' + state.status.model.name : 'Configura provider e modello nel file .env.']].map(([done, title, sub], i) => `<div class="step"><div class="step-num ${done ? 'done' : ''}">${done ? '✓' : i + 1}</div><div><h3>${title}</h3><p>${esc(sub)}</p></div></div>`).join('')}<div class="status-strip"><span>Storage locale</span><span>${state.status.embeddings.configured ? 'Retrieval ibrido' : 'Retrieval lessicale'}</span></div></div></div></div><div class="callout section-space">Gli agenti preparano i contenuti. I permessi, le approvazioni e l’invio sono gestiti dal backend. La pubblicazione automatica è ${state.brand.data.policy.autoPublish ? 'abilitata solo per la policy testuale limitata del brand' : 'disattivata'}.</div>`; }
function contentsPage() { return head('Contenuti', 'Brief, copy, visual e approvazioni. Ogni versione ha una propria traccia.', may('editor') ? button('+ Nuovo contenuto', 'new-content', 'primary') : '') + `<div class="toolbar"><input id="content-search" class="filter" aria-label="Cerca contenuti" placeholder="Cerca per titolo o testo"><select id="status-filter" class="filter" aria-label="Filtra stato"><option value="">Tutti gli stati</option>${Object.entries(statusLabels).slice(0, 15).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div><div class="panel" id="content-table">${postsTable(state.data.contents)}</div><p class="footer-note">Una bozza può essere adattata a più canali. Ogni destinazione richiede la propria revisione e approvazione.</p>`; }
function contentPage(e) { const d = e.data, mutable = ['DRAFT', 'GENERATED', 'REVIEW_FAILED', 'REVIEW_REQUIRED', 'WAITING_APPROVAL', 'APPROVED', 'FAILED', 'REJECTED'].includes(d.status); let actions = ''; if (may('editor') && mutable)
    actions += button('Modifica', 'edit-content', '', dataId(e.id)) + button('Genera con AI', 'generate', 'primary', dataId(e.id)); if (may('editor') && mutable)
    actions += button('Revisiona', 'review', '', dataId(e.id)); if (may('approver') && mutable && d.review)
    actions += button('Approva', 'approve', 'dark', dataId(e.id)); if (d.status === 'APPROVED' && may('editor'))
    actions += button('Programma', 'schedule', 'primary', dataId(e.id)); if (d.status === 'SCHEDULED' && may('editor'))
    actions += button('Annulla programmazione', 'cancel-content', 'danger', dataId(e.id)); if (['UNCERTAIN', 'PROCESSING'].includes(d.status) && may('admin'))
    actions += button('Riconcilia esito', 'reconcile', 'danger', dataId(e.id)); return head(d.title || 'Bozza senza titolo', `${platform(d.platform)} &nbsp; ${badge(d.status)} &nbsp; <span class="subtle">Versione ${e.revision} · ${time(e.updatedAt)}</span>`, actions) + `<div class="detail-grid"><div class="stack"><div class="panel"><div class="panel-head"><h2>Anteprima editoriale</h2><span class="badge">${esc(d.format)}</span></div><div class="panel-body"><div class="preview">${esc(d.text || 'Il testo non è ancora stato scritto.')}</div><div class="tag-list">${d.hashtags.map(h => `<span class="badge">${esc(h.startsWith('#') ? h : '#' + h)}</span>`).join('')}</div><div class="preview-media">${d.media.map(m => m.mime.startsWith('video/') ? `<video src="${safeUrl(m.url)}" controls preload="metadata"></video>` : `<img src="${safeUrl(m.url)}" alt="${esc(m.alt || d.title)}">`).join('')}</div></div></div>${d.strategy ? `<div class="panel"><div class="panel-head"><h2>Brief strategico</h2></div><div class="panel-body"><div class="preview subtle">${esc(d.strategy.rationale || '')}</div><div class="tag-list"><span class="badge">${esc(d.strategy.target || '')}</span><span class="badge">${esc(d.strategy.angle || '')}</span></div></div></div>` : ''}${d.options.videoScript || d.options.voiceoverScript ? `<div class="panel"><div class="panel-head"><h2>Script e voiceover</h2></div><div class="panel-body"><div class="preview subtle">${esc(d.options.videoScript || '')}\n\n${esc(d.options.voiceoverScript || '')}</div></div></div>` : ''}</div><aside class="detail-side"><div class="panel"><div class="panel-head"><h2>Controllo qualità</h2>${d.review ? `<span class="badge">${d.review.score}/100</span>` : ''}</div><div class="panel-body">${d.review ? `<div class="subtle">${d.review.passed ? 'Controlli automatici superati' : 'Sono presenti segnalazioni'}</div><ul class="checklist">${d.review.issues.map(i => `<li>${esc(i)}</li>`).join('') || '<li>Nessuna segnalazione automatica.</li>'}</ul><p class="footer-note">${esc(d.review.version)} · Lo score non è una probabilità di correttezza.</p>` : empty('Revisione da eseguire', 'Salva o genera il contenuto, quindi avvia i controlli.')}</div></div><div class="panel"><div class="panel-head"><h2>Fonti e destinazione</h2></div><div class="panel-body"><div class="kicker">Obiettivo</div><p class="subtle">${esc(d.objective || 'Non specificato')}</p><div class="kicker">Account</div><p class="subtle">${esc(state.data.accounts.find(a => a.id === d.accountId)?.data.name || d.accountId)}</p><div class="kicker">Fonti recuperate</div><p class="subtle">${new Set(d.sourceIds.map(x => x.split(':')[0])).size} documenti · ${d.claims.length} claim tracciati</p>${button('Ispeziona fonti e metadati', 'inspect-content', 'small', dataId(e.id))}</div></div>${d.approval ? `<div class="callout">Approvato da <b>${esc(d.approval.userId)}</b><br>${time(d.approval.at)}<br>La firma lega contenuto, fonti, brand e account.</div>` : ''}${d.publication ? `<div class="panel"><div class="panel-head"><h2>Ricevuta provider</h2></div><div class="panel-body"><p class="id-code">${esc(d.publication.externalId)}</p>${badge(d.publication.state)}${d.publication.details?.delivery ? `<p class="subtle">Consegna: ${esc(d.publication.details.delivery)}</p>` : ''}${d.publication.url ? `<p><a href="${safeUrl(d.publication.url)}" target="_blank" rel="noopener noreferrer">Apri sul social ↗</a></p>` : ''}</div></div>` : ''}<div class="actions">${may('editor') ? button('Adatta ad altri canali', 'adapt', 'small', dataId(e.id)) : ''}${may('approver') && mutable ? button('Rifiuta', 'reject-content', 'small danger', dataId(e.id)) : ''}${may('editor') && mutable ? button('Solo copy', 'generate-copy', 'small', dataId(e.id)) + button('Solo visual', 'generate-visual', 'small', dataId(e.id)) : ''}</div><div class="footer-note">${e.history.length} versioni precedenti conservate. Nessuna pubblicazione viene cancellata dal social attraverso questa schermata.</div></aside></div>`; }
function calendarPage() { const y = state.month.getFullYear(), m = state.month.getMonth(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, start = new Date(y, m, 1 - offset), today = new Date().toDateString(); const cs = state.data.contents.filter(x => x.data.scheduleAt); const title = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(first); return head('Calendario editoriale', `Orari visualizzati in ${esc(state.brand.data.timezone)}. Le idee del planner restano proposte.`, may('editor') ? button('Genera piano settimanale', 'plan', 'primary') : '') + `<div class="toolbar">${button('←', 'prev-month', 'small')}${button('Oggi', 'today-month', 'small')}<b>${esc(title)}</b>${button('→', 'next-month', 'small')}<div class="actions">${button('Esporta .ics', 'export-calendar', 'small')}</div></div><div class="table-wrap"><div class="calendar">${['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map(x => `<div class="weekday">${x}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); const events = cs.filter(c => new Intl.DateTimeFormat('en-CA', { timeZone: state.brand.data.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(c.data.scheduleAt)) === key); return `<div class="day ${date.getMonth() !== m ? 'out' : ''} ${date.toDateString() === today ? 'today' : ''}"><div class="date">${date.getDate()}</div>${events.map(e => `<a class="event" href="#content/${e.id}" title="${esc(e.data.title)}">${esc(e.data.platform)} · ${esc(e.data.title)}</a>`).join('')}</div>`; }).join('')}</div></div><div class="section-title"><h2>Proposte editoriali</h2><span class="subtle">Nessun invio automatico dal piano</span></div>${state.data.plans.length ? `<div class="grid">${state.data.plans.map(e => `<div class="card"><div class="card-header"><b>Piano del ${time(e.createdAt)}</b><span class="badge">${esc(e.data.status)}</span></div><div class="card-body">${e.data.ideas.map(i => `<p>${esc(i.topic)}<br><small>${esc(i.format)} · ${time(i.suggestedAt)}</small></p>`).join('')}</div>${may('editor') && e.data.status === 'PROPOSED' ? button('Crea le bozze', 'plan-drafts', 'small', dataId(e.id)) : ''}</div>`).join('')}</div>` : `<div class="panel">${empty('Nessun piano proposto', 'Il planner usa obiettivi, campagne e storico per suggerire fino a sette idee.')}</div>`}`; }
function knowledgePage() { return head('La conoscenza del brand', 'Fonti approvate, recupero selettivo e contesto specifico per ogni agente.', may('editor') ? button('+ Aggiungi documento', 'new-knowledge', 'primary') : '') + `<div class="callout">Le regole obbligatorie del brand vengono sempre fornite agli agenti. Il retrieval aggiunge soltanto i frammenti pertinenti delle fonti approvate. Modalità: <b>${state.status.embeddings.configured ? 'ibrida, con fallback lessicale' : 'lessicale; embeddings non configurati'}</b>.</div><div class="toolbar"><input class="filter" id="rag-query" placeholder="Es. risparmio per i pendolari" aria-label="Query RAG"><select id="rag-role" class="filter" aria-label="Ruolo RAG">${['copywriter', 'strategist', 'creative', 'reviewer', 'analyst'].map(x => `<option>${x}</option>`).join('')}</select>${button('Prova retrieval', 'test-rag', 'small')}</div><div id="rag-results"></div>${state.data.knowledge.length ? `<div class="grid">${state.data.knowledge.map(e => `<div class="card"><div class="card-header"><span class="badge">${esc(e.data.type)}</span>${badge(e.data.approved ? 'APPROVED' : 'DRAFT')}</div><h3>${esc(e.data.title)}</h3><div class="card-body">${esc(e.data.text.slice(0, 180))}${e.data.text.length > 180 ? '…' : ''}</div><div class="tag-list">${e.data.roles.map(r => `<span class="badge">${esc(r)}</span>`).join('')}</div><p class="id-code">${e.data.chunkCount} frammenti · v${e.revision} · ${e.data.embeddingModel ? 'vettori + testo' : 'testo'}</p><div class="card-footer">${may('editor') ? button('Modifica', 'edit-knowledge', 'small', dataId(e.id)) : ''}${may('approver') ? button(e.data.approved ? 'Revoca approvazione' : 'Approva fonte', 'approve-knowledge', 'small', dataId(e.id)) + button('Elimina', 'delete-knowledge', 'small danger', dataId(e.id)) : ''}</div></div>`).join('')}</div>` : `<div class="panel">${empty('Nessuna fonte caricata', 'Aggiungi linee guida, FAQ, caratteristiche prodotto, claim documentati ed esempi di post.')}</div>`}`; }
function accountsPage() { const connected = state.data.accounts; return head('Tutti i tuoi canali', 'API ufficiali, credenziali cifrate e una destinazione esplicita per ogni account.', may('admin') ? button('+ Collega canale', 'new-account', 'primary') : '') + `<div class="callout warning">“Configurato” indica che le credenziali sono state salvate. Accessi, scope, audit e formati dipendono dal provider. Il prodotto non aggira approvazioni delle app o limitazioni delle piattaforme.</div>${connected.length ? `<div class="grid">${connected.map(e => `<div class="card"><div class="card-header">${platform(e.data.platform)}<span class="badge ${e.data.enabled ? 'APPROVED' : 'FAILED'}">${e.data.enabled ? 'Configurato' : 'Disabilitato'}</span></div><h3>${esc(e.data.name)}</h3><p class="id-code">${esc(e.data.targetId)}</p><div class="card-body">Trasporto: <b>${esc(e.data.transport)}</b><br>${esc(state.status.platforms[e.data.platform].notes)}</div><div class="card-footer">${may('admin') ? button('Configura', 'edit-account', 'small', dataId(e.id)) : ''}${may('admin') && e.data.transport === 'postiz' ? button('OAuth', 'account-connect', 'small', dataId(e.id)) + button('Elenco canali', 'postiz-integrations', 'small', dataId(e.id)) : ''}${may('admin') && e.data.platform === 'telegram' && e.data.transport === 'direct' ? button('Installa webhook', 'install-webhook', 'small', dataId(e.id)) : ''}${e.data.platform === 'tiktok' && e.data.transport === 'direct' ? button('Creator info', 'creator-info', 'small', dataId(e.id)) : ''}</div></div>`).join('')}</div>` : `<div class="panel">${empty('Nessun canale collegato', 'Aggiungi un account diretto o una destinazione gestita da Postiz.')}</div>`}<div class="section-title"><h2>Catalogo integrazioni</h2><span class="subtle">${Object.keys(state.status.platforms).length} tipi di canale</span></div><div class="grid">${Object.entries(state.status.platforms).map(([k, c]) => `<div class="card"><div class="card-header">${platform(k)}</div><div class="card-body">${esc(c.notes)}</div><div class="tag-list">${c.native.length ? '<span class="badge">Client diretto</span>' : ''}${c.postiz ? '<span class="badge">Postiz</span>' : ''}</div><p class="footer-note">Formati diretti: ${esc(c.native.join(', ') || 'nessuno; usare Postiz')}</p></div>`).join('')}</div>`; }
function assetsPage() { return head('Media library', 'Asset del brand, template deterministici e video editoriali da slide.', may('editor') ? button('Crea visual', 'render', '') + button('Crea video', 'video', '') + button('↑ Carica media', 'upload', 'primary') : '') + `<input type="file" id="media-upload" accept="image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav" multiple hidden>${state.data.assets.length ? `<div class="grid">${state.data.assets.map(e => `<div class="card">${e.data.mime.startsWith('image/') ? `<img class="asset-cover" src="${safeUrl(e.data.url)}" alt="${esc(e.data.alt || e.data.name)}" loading="lazy">` : `<div class="asset-cover video">${e.data.mime.startsWith('video/') ? '▶' : '♫'}</div>`}<h3>${esc(e.data.name)}</h3><div class="card-body">${esc(e.data.mime)} · ${(e.data.size / 1024 / 1024).toFixed(2)} MB<br>${e.data.width ? `${e.data.width} × ${e.data.height}` : ''}${e.data.duration ? ` · ${Math.round(e.data.duration)} s` : ''}</div><div class="card-footer"><a class="btn small" href="${safeUrl(e.data.url)}" target="_blank" rel="noopener noreferrer">Apri asset ↗</a>${button('Copia ID', 'copy-id', 'small', dataId(e.id))}</div></div>`).join('')}</div>` : `<div class="panel">${empty('La libreria è pronta', 'Carica immagini, video, audio o crea un visual con logo, headline e colori del brand.')}</div>`}<p class="footer-note">File verificati con FFmpeg. Massimo 128 MB, 40 megapixel o 15 minuti per asset locale. I limiti dei social possono essere inferiori.</p>`; }
function campaignsPage() { return head('Campagne', 'Obiettivi e vincoli commerciali con un intervallo di validità esplicito.', may('editor') ? button('+ Nuova campagna', 'new-campaign', 'primary') : '') + (state.data.campaigns.length ? `<div class="grid">${state.data.campaigns.map(e => `<div class="card"><div class="card-header"><h3>${esc(e.data.name)}</h3>${badge(e.data.active ? 'APPROVED' : 'DRAFT')}</div><p class="card-body">${esc(e.data.objective)}</p><p class="card-body">${esc(e.data.brief)}</p><p class="subtle">${time(e.data.startAt)}<br>${time(e.data.endAt)}</p>${may('editor') ? button('Modifica', 'edit-campaign', 'small', dataId(e.id)) : ''}</div>`).join('')}</div>` : `<div class="panel">${empty('Nessuna campagna attiva', 'Crea una campagna per guidare strategia, calendario e generazione.')}</div>`); }
function inboxPage() { return head('Inbox e conversazioni', 'Messaggi ricevuti tramite webhook verificati. Le risposte passano dal workflow editoriale.', may('admin') ? button('+ Registra contatto', 'new-contact', 'primary') : '') + `<div class="callout">WhatsApp, Messenger e Instagram Direct usano una finestra di risposta registrata dal webhook, non dichiarata dall’AI. Fuori finestra WhatsApp richiede un template e un consenso registrato.</div><div class="panel">${state.data.inbox.length ? `<table><thead><tr><th>CONVERSAZIONE</th><th>CANALE</th><th>RICEVUTO</th><th></th></tr></thead><tbody>${state.data.inbox.map(e => `<tr><td><b>${esc(e.data.recipient)}</b><div class="subtle preview">${esc(e.data.text.slice(0, 1000))}</div></td><td>${platform(e.data.platform)}<br><span class="badge">${esc(e.data.status)}</span></td><td>${time(e.data.at)}</td><td>${may('editor') ? button('Prepara risposta', 'reply-draft', 'small', dataId(e.id)) + button('Chiudi', 'close-inbox', 'small ghost', dataId(e.id)) : ''}</td></tr>`).join('')}</tbody></table>` : empty('Nessun messaggio ricevuto', 'Configura le sottoscrizioni webhook del provider e la verifica della firma.')}</div><div class="section-title"><h2>Rubrica autorizzata</h2></div><div class="panel">${state.data.contacts.length ? `<table><thead><tr><th>CONTATTO</th><th>CONSENSO TEMPLATE</th><th>ULTIMO INBOUND</th></tr></thead><tbody>${state.data.contacts.map(e => `<tr><td><b>${esc(e.data.name)}</b><div class="id-code">${esc(e.data.recipient)}</div></td><td>${e.data.optIn ? 'Registrato' : 'Non registrato'}</td><td>${time(e.data.lastInboundAt)}</td></tr>`).join('')}</tbody></table>` : empty('Rubrica vuota', 'I messaggi in ingresso registrano la conversazione, ma non inventano un consenso marketing.')}</div>`; }
function analyticsPage() { const metrics = state.data.metrics, latest = new Map(); for (const m of metrics) {
    const old = latest.get(m.data.contentId);
    if (!old || old.data.collectedAt < m.data.collectedAt)
        latest.set(m.data.contentId, m);
} const actual = [...latest.values()]; return head('Dai risultati, nuove domande.', 'Osservazioni reali, provenienza esplicita e insight da validare prima di inserirli nella memoria.', may('editor') ? button('Importa metriche', 'import-metrics', '') + button('Analizza con AI', 'analyze', 'primary') : '') + `<div class="cards"><div class="card"><div class="overline">Contenuti misurati</div><div class="metric">${actual.length}</div><div class="caption">Una sola osservazione più recente per post</div></div><div class="card"><div class="overline">Snapshot conservati</div><div class="metric">${metrics.length}</div><div class="caption">Finestre e fonti registrate</div></div><div class="card"><div class="overline">Insight proposti</div><div class="metric">${state.data.insights.filter(x => !x.data.accepted).length}</div><div class="caption">In attesa di validazione</div></div><div class="card"><div class="overline">Insight accettati</div><div class="metric">${state.data.insights.filter(x => x.data.accepted).length}</div><div class="caption">Disponibili nel RAG del brand</div></div></div><div class="panel"><div class="panel-head"><h2>Ultime osservazioni per contenuto</h2></div>${actual.length ? `<div class="table-wrap"><table><thead><tr><th>CONTENUTO</th><th>VALORI RESTITUITI</th><th>FONTE</th><th>OSSERVATO</th><th></th></tr></thead><tbody>${actual.map(e => `<tr><td><a href="#content/${e.data.contentId}">${esc(state.data.contents.find(c => c.id === e.data.contentId)?.data.title || e.data.contentId)}</a></td><td>${Object.entries(e.data.values).map(([k, v]) => `<span class="badge">${esc(k)}: ${esc(v)}</span>`).join(' ')}</td><td class="subtle">${esc(e.data.source)}</td><td>${time(e.data.collectedAt)}</td><td>${may('editor') ? button('Aggiorna', 'collect-metrics', 'small', dataId(e.data.contentId)) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('Non ci sono ancora metriche', 'Il worker raccoglie osservazioni a 24 e 72 ore, quando il client e il provider le rendono disponibili.')}</div><div class="section-title"><h2>Insight e ipotesi</h2></div><div class="grid">${state.data.insights.map(e => `<div class="card"><div class="card-header"><span class="badge">n = ${e.data.sampleSize} post</span>${badge(e.data.accepted ? 'APPROVED' : 'WAITING_APPROVAL')}</div><h3>${esc(e.data.summary)}</h3><div class="card-body">${e.data.hypotheses.map(x => `<p>${esc(x)}</p>`).join('')}<b>Limiti</b>${e.data.limitations.map(x => `<p>${esc(x)}</p>`).join('')}</div><div class="card-footer">${may('approver') && !e.data.accepted ? button('Accetta nella memoria', 'accept-insight', 'small', dataId(e.id)) : ''}${button('Dati completi', 'inspect-insight', 'small', dataId(e.id))}</div></div>`).join('')}</div><p class="footer-note">Mancanza di una metrica ≠ zero. Valori di social, obiettivi e finestre diversi non vengono aggregati in un punteggio universale.</p>`; }
function jobsPage() { return head('Attività e audit degli agenti', 'Job persistenti, retry controllati e traccia delle esecuzioni. Nessun esito esterno viene inventato.', may('approver') ? button('Apri audit', 'show-audit', '') : '') + `<div class="panel"><div class="panel-head"><h2>Coda operativa</h2><span class="badge">${state.status.workerEnabled ? 'Worker attivo' : 'Worker disabilitato'}</span></div>${state.data.jobs.length ? `<div class="table-wrap"><table><thead><tr><th>TIPO</th><th>STATO</th><th>TENTATIVI</th><th>DATA</th><th>ESITO / ERRORE</th></tr></thead><tbody>${state.data.jobs.map(j => `<tr><td><b>${esc(j.kind)}</b><div class="id-code">${j.entityId}</div></td><td>${badge(j.state)}</td><td>${j.attempts}</td><td>${time(j.dueAt)}</td><td class="subtle">${esc(j.error || '—')}</td></tr>`).join('')}</tbody></table></div>` : empty('Coda vuota', 'Generazioni e pubblicazioni vengono accodate qui.')}</div><div class="section-title"><h2>Esecuzioni AI</h2></div><div class="panel">${state.data.executions.length ? `<table><thead><tr><th>AGENTE</th><th>PROMPT</th><th>MODELLO</th><th>STATO</th><th></th></tr></thead><tbody>${state.data.executions.map(e => `<tr><td>${esc(e.data.role)}</td><td>${esc(e.data.promptVersion)}</td><td>${esc(e.data.model)}</td><td>${badge(e.data.status)}</td><td>${button('Input / output', 'inspect-execution', 'small', dataId(e.id))}</td></tr>`).join('')}</tbody></table>` : empty('Nessuna esecuzione', 'Ogni chiamata registra versione del prompt, modello, input e risultato.')}</div>`; }
function settingsPage() { const b = state.brand.data; return head('Impostazioni del workspace', 'Identità del brand, ruoli umani, prompt versionati e accesso degli strumenti.') + `<div class="two-col"><div class="panel"><div class="panel-head"><h2>Identità di ${esc(b.name)}</h2>${may('admin') ? button('Modifica', 'edit-brand', 'small') : ''}</div><div class="panel-body"><div class="kicker">Descrizione</div><p class="subtle">${esc(b.description || 'Non specificata')}</p><div class="kicker">Tone of voice</div><div class="tag-list">${b.tone.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div><div class="kicker">Lingua e calendario</div><p class="subtle">${esc(b.language)} · ${esc(b.timezone)}</p><div class="kicker">Policy</div><p class="subtle">Auto-publish: ${b.policy.autoPublish ? 'policy testuale limitata' : 'disattivato'}<br>Massimo ${b.policy.maxAutoRevisions} correzioni automatiche<br>Soglia review: ${b.policy.minReviewScore}</p></div></div><div class="panel"><div class="panel-head"><h2>Infrastruttura AI</h2></div><div class="panel-body"><div class="kicker">Generazione</div><p class="subtle">${esc(state.status.model.name || 'Modello non configurato')} · ${esc(state.status.model.provider)}</p><div class="kicker">Embeddings</div><p class="subtle">${esc(state.status.embeddings.model || 'Non configurati: retrieval lessicale')}</p><div class="kicker">Visual</div><p class="subtle">Modello immagine: ${esc(state.status.imageModel || 'non configurato')}<br>FFmpeg: ${state.status.renderer.ffmpeg ? 'disponibile' : 'non disponibile'}</p><p class="footer-note">Provider e segreti infrastrutturali si configurano in .env. Non vengono esposti nella dashboard.</p></div></div></div>${may('admin') ? `<div class="section-title"><h2>Controllo degli accessi</h2></div><div class="actions">${button('Utenti e ruoli', 'users')}${button('Aggiungi utente', 'new-user')}${button('Nuovo workspace', 'new-workspace')}${button('Token MCP / API', 'tokens')}${button('Prompt degli agenti', 'prompts')}</div>` : ''}<div class="section-title"><h2>Sessione</h2></div><div class="actions">${button('Cambia password', 'password')}${state.me.workspaces?.length > 1 ? select('workspace', 'Workspace', state.me.workspaces.map(w => ({ value: w.id, label: w.name })), state.workspace) : ''}</div><div class="callout section-space">MCP endpoint: <span class="help-key">${esc(state.status.baseUrl)}/mcp</span><br>I token sono limitati a un brand e non possono approvare contenuti. n8n può creare bozze, accodare generazioni e programmare versioni già approvate usando la stessa API.</div><p class="footer-note">Prima di un utilizzo pubblico: HTTPS, backup cifrati della configurazione, revisione delle autorizzazioni dei provider e collaudi sugli account reali. Questa release non include SSO o un servizio di fatturazione.</p>`; }
async function brandForm(edit = false) { const e = edit ? state.brand : null, b = e?.data || { name: '', description: '', industry: '', mission: '', target: [], tone: ['Chiaro', 'Diretto'], objectives: [], colors: ['#172338'], language: 'it', timezone: 'Europe/Rome', bannedWords: [], requiredPhrases: [], approvedClaims: [], policy: { autoPublish: false, maxAutoRevisions: 2, minReviewScore: 90 } }; if (edit)
    await loadCollections(['assets']); form(edit ? 'Modifica brand' : 'Crea il tuo brand', 'L’identità e le policy sono sempre incluse nel contesto degli agenti.', `${field('name', 'Nome', b.name, 'text', 'required maxlength="100"')}<div class="form-row">${field('industry', 'Settore', b.industry)}${field('language', 'Lingua', b.language)}</div>${area('description', 'Descrizione', b.description)}${area('mission', 'Mission', b.mission)}<div class="form-row">${area('target', 'Segmenti target, uno per riga', b.target.join('\n'))}${area('tone', 'Tone of voice, uno per riga', b.tone.join('\n'))}</div>${area('objectives', 'Obiettivi, uno per riga', b.objectives.join('\n'))}<div class="form-row">${field('colors', 'Colori #RRGGBB separati da virgole', b.colors.join(', '))}${field('timezone', 'Timezone IANA', b.timezone)}</div>${edit ? select('logoAssetId', 'Logo dalla libreria', [{ value: '', label: 'Nessun logo' }, ...state.data.assets.filter(a => a.data.mime.startsWith('image/')).map(a => ({ value: a.id, label: a.data.name }))], b.logoAssetId || '') : ''}<details><summary>Regole obbligatorie e pubblicazione automatica</summary><div class="form">${area('bannedWords', 'Termini vietati, uno per riga', b.bannedWords.join('\n'))}${area('requiredPhrases', 'Frasi obbligatorie in ogni contenuto', b.requiredPhrases.join('\n'))}${area('approvedClaims', 'Claim approvati esplicitamente dal brand', b.approvedClaims.join('\n'))}<div class="form-row">${field('maxAutoRevisions', 'Revisioni automatiche (0–2)', b.policy.maxAutoRevisions, 'number', 'min="0" max="2"')}${field('minReviewScore', 'Soglia review (70–100)', b.policy.minReviewScore, 'number', 'min="70" max="100"')}</div>${check('autoPublish', 'Autorizzo la policy automatica limitata: solo testo, review ≥ 90, nessun claim dichiarato, nessun numero o link. Non abilita messaggi, video o TikTok.', b.policy.autoPublish)}</div></details>`, async (f) => { const body = { ...f, revision: e?.revision, target: lines(f.target), tone: lines(f.tone), objectives: lines(f.objectives), colors: f.colors.split(',').map(x => x.trim()), bannedWords: lines(f.bannedWords), requiredPhrases: lines(f.requiredPhrases), approvedClaims: lines(f.approvedClaims), policy: { autoPublish: !!f.autoPublish, maxAutoRevisions: Number(f.maxAutoRevisions), minReviewScore: Number(f.minReviewScore) } }; state.brand = await api(e ? '/api/brands/' + e.id : '/api/brands', e ? 'PUT' : 'POST', body); state.brands = await api('/api/brands'); toast('Brand salvato'); }); }
async function accountForm(accountId) {
    const e = accountId ? await api('/api/accounts/' + accountId) : null, d = e?.data || { name: '', platform: 'instagram', transport: 'direct', targetId: '', options: { accountType: 'BUSINESS', login: 'facebook' }, enabled: true };
    form(e ? 'Configura canale' : 'Collega un canale', 'I segreti vengono cifrati nel backend. Nessun test di pubblicazione viene eseguito durante il salvataggio.', `${field('name', 'Nome leggibile dell’account', d.name, 'text', 'required')}<div class="form-row">${select('platform', 'Piattaforma', Object.entries(state.status.platforms).map(([k, c]) => ({ value: k, label: c.label })), d.platform)}${select('transport', 'Trasporto', ['direct', 'postiz'], d.transport)}</div><div class="callout" id="account-help">${esc(state.status.platforms[d.platform].notes)}</div>${field('targetId', 'ID destinazione / integrazione Postiz', d.targetId, 'text', 'required')}${area('credentials', e ? 'Nuove credenziali JSON (lascia vuoto per conservarle)' : 'Credenziali JSON (cifrate)', e ? '' : JSON.stringify({ accessToken: '' }, null, 2), 'code')}<div class="subtle" id="credential-help"></div><details open><summary>Opzioni del canale</summary>${area('options', 'Opzioni JSON pubbliche, senza segreti', JSON.stringify(d.options, null, 2), 'code')}<p class="footer-note">Telegram: approvalChatId e approvers {"TELEGRAM_USER_ID":"APP_USER_ID"}. Postiz: settings per il provider, con ID board/subreddit/canale quando richiesti.</p></details>${check('enabled', 'Account abilitato', d.enabled)}`, async (f) => { const body = { name: f.name, platform: f.platform, transport: f.transport, targetId: f.targetId, options: json(f.options), enabled: !!f.enabled, revision: e?.revision }; if (f.credentials.trim())
        body.credentials = json(f.credentials); await api(e ? '/api/accounts/' + e.id : base() + '/accounts', e ? 'PUT' : 'POST', body); toast('Credenziali salvate. Collauda le autorizzazioni prima di pubblicare.'); });
    const update = () => { const p = $('#f-platform').value, t = $('#f-transport').value, c = state.status.platforms[p]; $('#account-help').textContent = c.notes; let example = { accessToken: 'TOKEN_UTENTE_AUTORIZZATO' }; if (t === 'postiz')
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
        example = { accessToken: 'TOKEN_META', appSecret: 'APP_SECRET_META', webhookVerifyToken: 'SEGRETO_VERIFICA' }; $('#credential-help').innerHTML = `Formato atteso: <pre>${esc(JSON.stringify(example, null, 2))}</pre>${!c.native.length && t === 'direct' ? '<b>Scegli Postiz: questo social non ha un client diretto in questa release.</b>' : ''}`; };
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
async function knowledgeForm(documentId) { const e = documentId ? await api('/api/knowledge/' + documentId) : null, d = e?.data || { title: '', text: '', type: 'knowledge', source: 'Documento fornito dal responsabile', platform: '*', roles: ['strategist', 'copywriter', 'creative', 'reviewer', 'analyst'], approved: false }; form(e ? 'Modifica fonte' : 'Aggiungi una fonte', 'Carica testo verificato. I file MD/TXT/JSON vengono letti localmente dal browser.', `${field('title', 'Titolo del documento', d.title, 'text', 'required')}<div class="field"><label for="document-file">Importa testo da file</label><input id="document-file" type="file" accept=".md,.txt,.json,.csv"></div>${area('text', 'Testo del documento', d.text, '', 10)}<div class="form-row">${field('type', 'Categoria', d.type)}${field('platform', 'Filtro piattaforma (* = tutte)', d.platform)}</div>${field('source', 'Fonte / riferimento verificabile', d.source)}${field('roles', 'Ruoli autorizzati, separati da virgole', d.roles.join(', '))}<div class="form-row">${field('validFrom', 'Valido da (ISO con timezone)', d.validFrom || '')}${field('validUntil', 'Scade il (ISO con timezone)', d.validUntil || '')}</div>${may('approver') ? check('approved', 'Confermo la fonte e la abilito nel RAG', d.approved) : '<p class="subtle">La fonte sarà salvata come bozza e dovrà essere approvata.</p>'}`, async (f) => { await api(e ? '/api/knowledge/' + e.id : base() + '/knowledge', e ? 'PUT' : 'POST', { ...f, roles: f.roles.split(',').map(x => x.trim()), approved: !!f.approved, revision: e?.revision }); toast('Fonte indicizzata e salvata'); }); $('#document-file').onchange = async (ev) => { const f = ev.target.files[0]; if (!f)
    return; if (f.size > 1000000) {
    toast('File di testo massimo 1 MB', true);
    return;
} $('#f-text').value = await f.text(); if (!$('#f-title').value)
    $('#f-title').value = f.name; }; }
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
async function action(name, idValue, buttonEl) {
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
document.addEventListener('click', async (ev) => { const el = ev.target.closest('[data-action]'); if (!el || el.disabled)
    return; ev.preventDefault(); const name = el.dataset.action; try {
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
} });
document.addEventListener('input', ev => { if (['content-search', 'status-filter'].includes(ev.target.id)) {
    const query = ($('#content-search')?.value || '').toLowerCase(), filter = $('#status-filter')?.value || '';
    $('#content-table').innerHTML = postsTable(state.data.contents.filter(x => (!filter || x.data.status === filter) && (!query || (x.data.title + ' ' + x.data.text).toLowerCase().includes(query))));
} });
document.addEventListener('change', async (ev) => { if (ev.target.id === 'f-workspace') {
    state.workspace = ev.target.value;
    state.me = await api('/api/me');
    state.brand = null;
    await init();
} if (ev.target.id === 'media-upload') {
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
} });
window.addEventListener('hashchange', () => { if (state.me)
    refresh().catch(e => toast(e.message, true)); });
// Do not replace forms or selections while a user is editing.
setInterval(() => { if (state.me && !state.busy && !$('#dialog').open && ['overview', 'jobs'].includes(state.view))
    refresh().catch(() => { }); if (state.me && !state.busy && !$('#dialog').open && state.view.startsWith('content/') && ['GENERATING', 'PROCESSING', 'PUBLISHING', 'SCHEDULED'].includes(state.data.current?.data.status))
    refresh().catch(() => { }); }, 7000);
try {
    state.me = await api('/api/me');
    state.csrf = state.me.csrf;
    state.workspace = state.me.principal.workspaceId;
    await init();
}
catch {
    loginView();
}
