import { PLATFORMS } from './types.js';
import { assert, id, now, object, sha, stable, strings, text, timestamp, safeError } from './util.js';
import { encrypt } from './crypto.js';
import { requireRole, requireHuman } from './auth.js';
import { credentialAad } from '../social/hub.js';
import { CAPABILITIES, validatePost } from '../social/capabilities.js';
import { validateSchema } from '../agents/llm.js';
import { jaccard } from '../rag/similarity.js';
import { CONTRACTS, GROUNDING } from '../agents/prompts.js';
const MUTABLE = ['DRAFT', 'GENERATED', 'REVIEW_FAILED', 'REVIEW_REQUIRED', 'WAITING_APPROVAL', 'APPROVED', 'FAILED', 'REJECTED'];
const MESSAGING = ['whatsapp', 'messenger', 'instagram-dm'];
const FORMATS = ['text', 'image', 'carousel', 'video', 'reel', 'story', 'message', 'template'];
export function publicAccount(e) { const { credential, ...data } = e.data; return { ...e, data: { ...data, configured: !!credential } }; }
function noSecrets(value) {
    if (!value || typeof value !== 'object')
        return;
    for (const [k, v] of Object.entries(value)) {
        assert(!/(?:secret|password|accessToken|refreshToken|apiKey|botToken|privateKey)/i.test(k), 'SECRET_FIELD', 'I segreti vanno solo nel campo credentials cifrato');
        noSecrets(v);
    }
}
export class Studio {
    store;
    cfg;
    rag;
    media;
    hub;
    model;
    constructor(store, cfg, rag, media, hub, model) {
        this.store = store;
        this.cfg = cfg;
        this.rag = rag;
        this.media = media;
        this.hub = hub;
        this.model = model;
    }
    scope(p, brandId) { this.store.get(p, brandId, 'brand'); return { ...p, brandId }; }
    brand(p, brandId) { return this.store.get(p, brandId, 'brand'); }
    saveBrand(p, input, brandId) {
        requireRole(p, 'admin');
        requireHuman(p);
        noSecrets(input);
        const old = brandId ? this.brand(p, brandId) : undefined;
        const colors = strings(input.colors ?? ['#172338'], 'colori', 5);
        assert(colors.length && colors.every(x => /^#[0-9a-f]{6}$/i.test(x)), 'COLORS', 'Usare colori #RRGGBB');
        const timezone = text(input.timezone ?? 'Europe/Rome', 'timezone', 80);
        try {
            new Intl.DateTimeFormat('it', { timeZone: timezone });
        }
        catch {
            assert(false, 'TIMEZONE', 'Timezone IANA non valida');
        }
        const policy = object(input.policy ?? {});
        const maxAutoRevisions = Number(policy.maxAutoRevisions ?? 2), minReviewScore = Number(policy.minReviewScore ?? 90);
        assert(Number.isInteger(maxAutoRevisions) && maxAutoRevisions >= 0 && maxAutoRevisions <= 2 && Number.isInteger(minReviewScore) && minReviewScore >= 70 && minReviewScore <= 100, 'POLICY', 'Revisioni 0..2 e soglia 70..100');
        const data = { name: text(input.name, 'nome brand', 100), description: text(input.description ?? '', 'descrizione', 10000, true), industry: text(input.industry ?? '', 'settore', 200, true), language: text(input.language ?? 'it', 'lingua', 20), timezone, target: strings(input.target ?? [], 'target'), tone: strings(input.tone ?? [], 'tono'), mission: text(input.mission ?? '', 'mission', 3000, true), colors, bannedWords: strings(input.bannedWords ?? [], 'parole vietate'), requiredPhrases: strings(input.requiredPhrases ?? [], 'frasi obbligatorie'), approvedClaims: strings(input.approvedClaims ?? [], 'claim approvati'), objectives: strings(input.objectives ?? [], 'obiettivi'), policy: { autoPublish: policy.autoPublish === true, maxAutoRevisions, minReviewScore } };
        if (input.logoAssetId) {
            assert(old, 'LOGO', 'Creare prima il brand');
            this.media.asset(this.scope(p, old.id), String(input.logoAssetId));
            data.logoAssetId = input.logoAssetId;
        }
        const bid = old?.id ?? id();
        const result = old ? this.store.update(p, bid, Number(input.revision), data) : this.store.create(p, bid, 'brand', data, bid);
        this.store.audit(p, bid, old ? 'brand.updated' : 'brand.created', bid, { revision: result.revision });
        return result;
    }
    saveAccount(p, brandId, input, accountId) {
        requireRole(p, 'admin');
        requireHuman(p);
        p = this.scope(p, brandId);
        const old = accountId ? this.hub.account(p, accountId) : undefined;
        const platform = input.platform;
        assert(PLATFORMS.includes(platform), 'PLATFORM', 'Social non supportato');
        const transport = input.transport ?? 'direct';
        assert(['direct', 'postiz'].includes(transport), 'TRANSPORT', 'Trasporto non valido');
        assert(transport === 'direct' ? CAPABILITIES[platform].native.length : CAPABILITIES[platform].postiz, 'TRANSPORT', 'Trasporto non disponibile per questo social');
        const options = object(input.options ?? {});
        noSecrets(options);
        assert(JSON.stringify(options).length < 15000, 'OPTIONS', 'Opzioni troppo grandi');
        const aid = old?.id ?? id();
        const credentials = input.credentials ? object(input.credentials) : undefined;
        assert(credentials || old, 'CREDENTIALS', 'Credenziali richieste');
        // Updating a target requires an explicit new grant rather than silently reusing another brand's token.
        const targetId = text(input.targetId, 'targetId', 500);
        if (old && (old.data.platform !== platform || old.data.targetId !== targetId || old.data.transport !== transport))
            assert(credentials, 'CREDENTIALS', 'Cambio target o trasporto: fornire nuove credenziali esplicite');
        if (credentials) {
            assert(JSON.stringify(credentials).length < 20000, 'CREDENTIALS', 'Credenziali troppo grandi');
            if (transport === 'postiz')
                assert(credentials.apiKey, 'CREDENTIALS', 'Postiz richiede apiKey');
            else if (platform === 'telegram' || platform === 'discord')
                assert(credentials.botToken, 'CREDENTIALS', 'Bot token richiesto');
            else if (platform === 'farcaster')
                assert(credentials.apiKey && credentials.signerUuid, 'CREDENTIALS', 'Neynar richiede apiKey e signerUuid');
            else
                assert(credentials.accessToken, 'CREDENTIALS', 'Access token richiesto');
        }
        const data = { name: text(input.name, 'nome account', 150), platform, transport, targetId, options, enabled: input.enabled !== false, credential: credentials ? encrypt(credentials, this.cfg.masterKey, credentialAad(p.workspaceId, brandId, aid)) : old.data.credential };
        const saved = old ? this.store.update(p, aid, Number(input.revision), data) : this.store.create(p, brandId, 'account', data, aid);
        this.store.audit(p, brandId, 'account.saved', aid, { platform, targetId, transport });
        return publicAccount(saved);
    }
    async saveKnowledge(p, brandId, input, documentId) {
        requireRole(p, 'editor');
        p = this.scope(p, brandId);
        if (input.approved === true) {
            requireRole(p, 'approver');
            requireHuman(p);
        }
        if (input.validFrom)
            timestamp(input.validFrom);
        if (input.validUntil)
            timestamp(input.validUntil);
        assert(!input.validFrom || !input.validUntil || timestamp(input.validFrom) < timestamp(input.validUntil), 'DATES', 'Intervallo documento non valido');
        const old = documentId ? this.store.get(p, documentId, 'knowledge') : undefined;
        const duplicate = this.store.list(p, 'knowledge', brandId).find(d => d.id !== old?.id && d.data.title === input.title && jaccard(d.data.text, String(input.text ?? '')) > 0.98);
        assert(!duplicate, 'DUPLICATE_KNOWLEDGE', 'Documento quasi identico già presente. Modificare quello esistente.', 409);
        const data = await this.rag.ingest(p, brandId, input);
        const e = old ? this.store.update(p, old.id, Number(input.revision), data) : this.store.create(p, brandId, 'knowledge', data);
        this.store.audit(p, brandId, 'knowledge.saved', e.id, { approved: data.approved, chunks: data.chunks.length, embeddingModel: data.embeddingModel });
        return e;
    }
    approveKnowledge(p, documentId, revision, approved) { requireRole(p, 'approver'); requireHuman(p); const e = this.store.get(p, documentId, 'knowledge'); const updated = this.store.update(p, e.id, revision, { ...e.data, approved }); this.store.audit(p, e.brandId, 'knowledge.approval', e.id, { approved }); return updated; }
    saveCampaign(p, brandId, b, campaignId) { requireRole(p, 'editor'); p = this.scope(p, brandId); noSecrets(b); const startAt = new Date(timestamp(b.startAt)).toISOString(), endAt = new Date(timestamp(b.endAt)).toISOString(); assert(startAt < endAt, 'DATES', 'Fine campagna deve seguire inizio'); const data = { name: text(b.name, 'nome', 200), objective: text(b.objective, 'obiettivo', 3000), brief: text(b.brief ?? '', 'brief', 10000, true), startAt, endAt, active: b.active !== false }; const old = campaignId ? this.store.get(p, campaignId, 'campaign') : undefined; return old ? this.store.update(p, old.id, Number(b.revision), data) : this.store.create(p, brandId, 'campaign', data); }
    savePrompt(p, brandId, b) {
        requireRole(p, 'admin');
        requireHuman(p);
        p = this.scope(p, brandId);
        const role = text(b.role, 'ruolo', 30);
        assert(CONTRACTS[role], 'ROLE', 'Ruolo agente sconosciuto');
        const old = this.store.list(p, 'prompt', brandId).find(x => x.data.role === role);
        const data = { role, version: text(b.version, 'versione', 100), system: text(b.system, 'prompt', 15000) };
        if (old)
            this.store.create(p, brandId, 'promptHistory', old.data);
        const e = old ? this.store.update(p, old.id, Number(b.revision), data) : this.store.create(p, brandId, 'prompt', data);
        this.store.audit(p, brandId, 'prompt.saved', e.id, { role, version: data.version });
        return e;
    }
    content(p, contentId) { return this.store.get(p, contentId, 'content'); }
    contentInput(p, brandId, b) {
        const a = this.hub.account(this.scope(p, brandId), text(b.accountId, 'account', 80));
        assert(FORMATS.includes(b.format), 'FORMAT', 'Formato non valido');
        if (b.campaignId)
            this.store.get(this.scope(p, brandId), String(b.campaignId), 'campaign');
        assert(Array.isArray(b.media ?? []) && Array.isArray(b.claims ?? []), 'VALIDATION', 'media e claims devono essere array');
        const media = (b.media ?? []).map((m) => {
            assert(m.id || m.url, 'MEDIA', 'Asset o URL richiesti');
            if (m.id) {
                const asset = this.media.asset(this.scope(p, brandId), String(m.id));
                return { id: asset.id, mime: asset.data.mime, alt: text(m.alt ?? asset.data.alt ?? '', 'alt', 2000, true) };
            }
            const url = text(m.url, 'URL media', 3000);
            const u = new URL(url);
            assert(u.protocol === 'https:' && !u.username && !u.password, 'MEDIA_URL', 'Media esterni: solo URL HTTPS senza credenziali');
            return { url, mime: text(m.mime, 'MIME', 80), alt: text(m.alt ?? '', 'alt', 2000, true) };
        });
        assert(media.length <= 10, 'MEDIA', 'Massimo 10 media');
        const options = object(b.options ?? {});
        noSecrets(options);
        assert(JSON.stringify(options).length <= 20000, 'OPTIONS', 'Opzioni troppo grandi');
        const claims = (b.claims ?? []).map((c) => ({ text: text(c.text, 'claim', 3000), sourceIds: strings(c.sourceIds ?? [], 'fonti', 30) }));
        assert(claims.length <= 30, 'CLAIMS', 'Troppi claim');
        return { title: text(b.title ?? '', 'titolo', 300, true), text: text(b.text ?? '', 'testo', 65000, true), hashtags: strings(b.hashtags ?? [], 'hashtag', 30), platform: a.data.platform, format: b.format, accountId: a.id, objective: text(b.objective ?? '', 'obiettivo', 3000, true), campaignId: b.campaignId || undefined, media, options, sourceIds: strings(b.sourceIds ?? [], 'fonti', 100), claims, status: 'DRAFT' };
    }
    saveContent(p, brandId, b, contentId) {
        requireRole(p, 'editor');
        p = this.scope(p, brandId);
        const old = contentId ? this.content(p, contentId) : undefined;
        if (old)
            assert(MUTABLE.includes(old.data.status), 'CONTENT_LOCKED', 'Annullare la programmazione prima di modificare. Esiti incerti richiedono riconciliazione.', 409);
        const data = this.contentInput(p, brandId, b);
        if (data.platform === 'tiktok' && old)
            data.options = { ...data.options, consent: false }; // Every edit needs new consent, even if a client resends a stale true value.
        const e = this.store.transaction(() => {
            if (old)
                this.store.create(p, brandId, 'contentHistory', { contentId: old.id, revision: old.revision, content: old.data });
            return old ? this.store.update(p, old.id, Number(b.revision), data) : this.store.create(p, brandId, 'content', data);
        });
        this.store.audit(p, brandId, 'content.saved', e.id, { revision: e.revision });
        return e;
    }
    sourceDocuments(p, e) { const ids = new Set([...e.data.sourceIds, ...e.data.claims.flatMap(c => c.sourceIds)].map(x => x.split(':')[0])); return [...ids].map(x => this.store.get({ ...p, brandId: e.brandId }, x, 'knowledge')); }
    digest(p, e) { const b = this.brand(p, e.brandId), a = this.hub.account({ ...p, brandId: e.brandId }, e.data.accountId); const d = e.data; return sha(stable({ contentId: e.id, brandRevision: b.revision, accountRevision: a.revision, title: d.title, text: d.text, hashtags: d.hashtags, format: d.format, platform: d.platform, accountId: d.accountId, objective: d.objective, campaignId: d.campaignId, campaignRevision: d.campaignId ? this.store.get({ ...p, brandId: e.brandId }, d.campaignId, 'campaign').revision : undefined, media: d.media.map(m => m.id ? { ...m, hash: this.media.asset({ ...p, brandId: e.brandId }, m.id).data.sha256 } : m), options: d.options, claims: d.claims, sourceIds: d.sourceIds, sources: this.sourceDocuments(p, e).map(x => ({ id: x.id, revision: x.revision })) })); }
    post(e) { return { id: e.id, title: e.data.title, text: [e.data.text, ...e.data.hashtags.map(x => x.startsWith('#') ? x : '#' + x)].filter(Boolean).join('\n'), format: e.data.format, media: e.data.media, options: e.data.options }; }
    hardIssues(p, e, requireConsent = true) {
        const issues = [];
        const b = this.brand(p, e.brandId).data, a = this.hub.account({ ...p, brandId: e.brandId }, e.data.accountId).data, post = this.post(e), body = post.text.toLocaleLowerCase();
        try {
            validatePost(a, !requireConsent && a.platform === 'tiktok' ? { ...post, options: { ...post.options, consent: true } } : post);
        }
        catch (err) {
            issues.push(safeError(err));
        }
        for (const word of b.bannedWords)
            if (body.includes(word.toLocaleLowerCase()))
                issues.push(`Termine vietato: ${word}`);
        for (const phrase of b.requiredPhrases)
            if (!body.includes(phrase.toLocaleLowerCase()))
                issues.push(`Manca frase obbligatoria: ${phrase}`);
        try {
            const docs = this.sourceDocuments(p, e), at = Date.now();
            for (const doc of docs)
                if (!doc.data.approved || (doc.data.validFrom && Date.parse(doc.data.validFrom) > at) || (doc.data.validUntil && Date.parse(doc.data.validUntil) < at))
                    issues.push(`Fonte non approvata o scaduta: ${doc.data.title}`);
            const valid = new Set(docs.flatMap(d => d.data.chunks.map(c => `${d.id}:${c.id}`)));
            for (const claim of e.data.claims) {
                if (!claim.sourceIds.length && !b.approvedClaims.includes(claim.text))
                    issues.push(`Claim senza fonte: ${claim.text.slice(0, 100)}`);
                for (const sid of claim.sourceIds)
                    if (!valid.has(sid))
                        issues.push('ID frammento fonte inesistente');
            }
        }
        catch {
            issues.push('Riferimento a fonti non disponibili nel brand');
        }
        if (e.data.campaignId) {
            const campaign = this.store.get({ ...p, brandId: e.brandId }, e.data.campaignId, 'campaign').data;
            if (!campaign.active || Date.now() > timestamp(campaign.endAt))
                issues.push('Campagna inattiva o conclusa');
        }
        if (MESSAGING.includes(a.platform)) {
            const contact = this.store.list({ ...p, brandId: e.brandId }, 'contact', e.brandId).find(x => x.data.accountId === e.data.accountId && x.data.recipient === e.data.options.recipient);
            if (!contact)
                issues.push('Destinatario non registrato nella rubrica autorizzata');
            else if (a.platform === 'whatsapp' && e.data.format === 'template') {
                if (!contact.data.optIn)
                    issues.push('Template WhatsApp: manca consenso registrato dal responsabile');
            }
            else if (!contact.data.lastInboundAt || Date.now() - Date.parse(contact.data.lastInboundAt) > 86400000)
                issues.push('Finestra di risposta 24h chiusa: attendere nuovo messaggio o usare template WhatsApp approvato');
        }
        return issues;
    }
    async review(p, contentId) {
        requireRole(p, 'editor');
        let e = this.content(p, contentId);
        assert(MUTABLE.includes(e.data.status) || e.data.status === 'GENERATING', 'CONTENT_LOCKED', 'Contenuto non revisionabile');
        p = this.scope(p, e.brandId);
        const hard = this.hardIssues(p, e, false);
        let review = { passed: hard.length === 0, score: hard.length ? 0 : 100, issues: [...hard], version: 'deterministic-v1', checkedAt: now() };
        if (this.model.available) {
            const docs = this.sourceDocuments(p, e).map(d => ({ id: d.id, ...d.data, chunks: d.data.chunks.map(({ embedding, ...c }) => c) }));
            const images = [];
            for (const m of e.data.media.slice(0, 10))
                if (m.id && m.mime.startsWith('image/')) {
                    const bytes = await this.media.bytes(p, m.id);
                    if (bytes.length <= 4 * 1024 * 1024)
                        images.push({ mime: m.mime, data: bytes.toString('base64') });
                }
            const result = await this.agent(p, e.brandId, 'reviewer', { brand: this.brand(p, e.brandId).data, post: this.post(e), claims: e.data.claims, sources: docs, hardIssues: hard, recentPosts: this.recent(p, e.brandId).filter(x => x.id !== e.id), visualsInspected: images.length }, images);
            review = { passed: hard.length === 0 && result.passed, score: Math.min(hard.length ? 0 : 100, result.score), issues: [...hard, ...result.issues], version: 'reviewer-v1+deterministic-v1', checkedAt: now() };
        }
        else
            review.issues.push('Revisione AI non eseguita: modello non configurato. Verifica umana obbligatoria.');
        if (e.data.media.some(x => x.mime.startsWith('video/')))
            review.issues.push('Video: revisione visiva umana obbligatoria; il reviewer automatico non analizza la timeline video.');
        const result = this.store.update(p, e.id, e.revision, { ...e.data, status: review.passed ? 'WAITING_APPROVAL' : 'REVIEW_FAILED', review, approval: undefined });
        this.store.audit(p, e.brandId, 'content.reviewed', e.id, { passed: review.passed, version: review.version });
        return result;
    }
    approve(p, contentId, revision, options = {}) {
        requireRole(p, 'approver');
        requireHuman(p);
        let e = this.content(p, contentId);
        assert(MUTABLE.includes(e.data.status), 'STATE', 'Contenuto non approvabile');
        assert(e.revision === revision, 'CONFLICT', 'Versione modificata', 409);
        assert(e.data.review, 'REVIEW_REQUIRED', 'Eseguire la revisione prima di approvare');
        if (e.data.media.length)
            assert(options.visualConfirmed === true, 'VISUAL_CONFIRMATION', 'Confermare la revisione umana dei media finali');
        if (e.data.platform === 'tiktok') {
            assert(options.consent === true, 'TIKTOK_CONSENT', 'Confermare esplicitamente questa versione del post');
            e = { ...e, data: { ...e.data, options: { ...e.data.options, consent: true } } };
        }
        const issues = this.hardIssues(p, e);
        assert(!issues.length, 'REVIEW_BLOCKED', issues.join('; '));
        const brand = this.brand(p, e.brandId).data;
        if (!e.data.review.passed || e.data.review.score < brand.policy.minReviewScore)
            assert(typeof options.reason === 'string' && options.reason.length >= 12, 'OVERRIDE_REASON', 'Revisione insufficiente: motivazione umana di almeno 12 caratteri richiesta');
        const data = { ...e.data, status: 'APPROVED', approval: { userId: p.userId, at: now(), digest: this.digest(p, e), overrideReason: options.reason || undefined } };
        const saved = this.store.update(p, e.id, revision, data);
        this.store.audit(p, e.brandId, 'content.approved', e.id, { revision: saved.revision, digest: data.approval.digest, overrideReason: options.reason });
        return saved;
    }
    schedule(p, contentId, revision, at) {
        requireRole(p, 'editor');
        const e = this.content(p, contentId);
        assert(e.data.status === 'APPROVED' && e.data.approval, 'APPROVAL', 'Approvazione necessaria');
        assert(e.revision === revision, 'CONFLICT', 'Versione modificata', 409);
        assert(e.data.approval.digest === this.digest(p, e), 'APPROVAL_STALE', 'Approvazione scaduta per modifiche al brand, account o fonti. Ripetere revisione e approvazione.', 409);
        const dueAt = timestamp(at);
        assert(dueAt >= Date.now() - 60000 && dueAt < Date.now() + 366 * 86400000, 'SCHEDULE', 'Data non valida o oltre un anno');
        const result = this.store.transaction(() => { const saved = this.store.update(p, e.id, e.revision, { ...e.data, status: 'SCHEDULED', scheduleAt: new Date(dueAt).toISOString() }); this.store.enqueue(p, e.brandId, 'publish', e.id, { digest: e.data.approval.digest }, dueAt, `publish:${e.id}:${saved.revision}`); return saved; });
        this.store.audit(p, e.brandId, 'content.scheduled', e.id, { at });
        return result;
    }
    cancel(p, contentId, revision) { requireRole(p, 'editor'); const e = this.content(p, contentId); assert(e.data.status === 'SCHEDULED', 'STATE', 'Solo una programmazione non ancora partita può essere annullata'); return this.store.transaction(() => { const leased = this.store.db.prepare("SELECT id FROM jobs WHERE entity_id=? AND kind='publish' AND state='LEASED'").get(e.id); assert(!leased, 'PUBLISHING', 'Il worker ha già preso in carico il post', 409); this.store.db.prepare("UPDATE jobs SET state='CANCELLED' WHERE entity_id=? AND state='QUEUED' AND kind='publish'").run(e.id); return this.store.update(p, e.id, revision, { ...e.data, status: 'DRAFT', approval: undefined, scheduleAt: undefined }); }); }
    reject(p, contentId, revision, reason) { requireRole(p, 'approver'); requireHuman(p); const e = this.content(p, contentId); assert(MUTABLE.includes(e.data.status), 'STATE', 'Contenuto non rifiutabile in questo stato'); text(reason, 'motivo', 2000); this.store.audit(p, e.brandId, 'content.rejected', e.id, { reason }); return this.store.update(p, e.id, revision, { ...e.data, status: 'REJECTED', approval: undefined }); }
    reconcile(p, contentId, revision, result) { requireRole(p, 'admin'); requireHuman(p); const e = this.content(p, contentId); assert(['UNCERTAIN', 'PROCESSING'].includes(e.data.status), 'STATE', 'Solo esiti incerti o in elaborazione'); const evidence = text(result.evidence, 'evidenza di verifica esterna', 3000); assert(result.published === true || result.published === false, 'EVIDENCE', 'Indicare esito verificato'); const receipt = result.published ? { state: 'PUBLISHED', externalId: text(result.externalId, 'ID reale', 1000), url: result.url || undefined, details: { reconciledBy: p.userId, evidence } } : undefined; const saved = this.store.update(p, e.id, revision, { ...e.data, status: result.published ? 'PUBLISHED' : 'DRAFT', publication: receipt, approval: undefined }); this.store.audit(p, e.brandId, 'publication.reconciled', e.id, { evidence, published: result.published }); return saved; }
    enqueueGeneration(p, contentId, revision, mode = 'all') { requireRole(p, 'editor'); assert(this.model.available, 'MODEL_REQUIRED', 'Configurare il modello prima di generare'); const e = this.content(p, contentId); assert(MUTABLE.includes(e.data.status), 'STATE', 'Contenuto non rigenerabile'); assert(['all', 'copy', 'visual'].includes(mode), 'MODE', 'Modalità non valida'); return this.store.transaction(() => { const saved = this.store.update(p, e.id, revision, { ...e.data, status: 'GENERATING', approval: undefined, options: { ...e.data.options, consent: false } }); this.store.enqueue(p, e.brandId, 'generate', e.id, { mode }, Date.now(), `generate:${e.id}:${saved.revision}`); return saved; }); }
    async agent(p, brandId, role, input, images = []) {
        const contract = CONTRACTS[role];
        assert(contract, 'AGENT', 'Ruolo non valido');
        const custom = this.store.list(p, 'prompt', brandId).find(x => x.data.role === role)?.data;
        const version = custom?.version ?? contract.version;
        const execution = this.store.create(p, brandId, 'execution', { role, promptVersion: version, model: process.env['LLM_MODEL_' + role.toUpperCase()] || this.model.name, startedAt: now(), status: 'RUNNING', input, inputHash: sha(stable(input)), imageCount: images.length });
        try {
            const out = await this.model.generate((custom?.system ?? contract.system) + GROUNDING, input, contract.schema, images, role);
            validateSchema(out, contract.schema);
            this.store.update(p, execution.id, execution.revision, { ...execution.data, status: 'SUCCESS', finishedAt: now(), output: out });
            return out;
        }
        catch (err) {
            this.store.update(p, execution.id, execution.revision, { ...execution.data, status: 'FAILED', finishedAt: now(), error: safeError(err) });
            throw err;
        }
    }
    recent(p, brandId) { return this.store.list(p, 'content', brandId, 50).map(x => ({ id: x.id, at: x.createdAt, status: x.data.status, platform: x.data.platform, objective: x.data.objective, title: x.data.title, text: x.data.text.slice(0, 2000) })); }
    async context(p, e, role) { const b = this.brand(p, e.brandId); return { brand: b.data, brandRevision: b.revision, platform: e.data.platform, format: e.data.format, objective: e.data.objective, topic: e.data.title, now: now(), sources: await this.rag.retrieve(p, e.brandId, e.data.title + ' ' + e.data.objective, role, e.data.platform), campaigns: this.store.list(p, 'campaign', e.brandId).filter(x => x.data.active && timestamp(x.data.startAt) <= Date.now() && timestamp(x.data.endAt) >= Date.now()).map(x => x.data), recentPosts: this.recent(p, e.brandId), insights: this.store.list(p, 'insight', e.brandId, 20).filter(x => x.data.accepted).map(x => x.data) }; }
    async generate(p, contentId, mode) {
        let e = this.content(p, contentId);
        p = this.scope(p, e.brandId);
        assert(e.data.status === 'GENERATING', 'STATE', 'Generazione non attiva');
        const b = this.brand(p, e.brandId).data;
        let strategy = e.data.strategy, copy, creative = e.data.creative;
        if (mode !== 'visual') {
            strategy = await this.agent(p, e.brandId, 'strategist', await this.context(p, e, 'strategist'));
            const context = await this.context(p, e, 'copywriter');
            copy = await this.agent(p, e.brandId, 'copywriter', { ...context, strategy, maxTextLength: CAPABILITIES[e.data.platform].limit });
            const allowed = new Set(context.sources.map(x => x.id));
            for (const claim of copy.claims)
                for (const sid of claim.sourceIds)
                    assert(allowed.has(sid), 'HALLUCINATED_SOURCE', 'Il copywriter ha inventato un riferimento fonte');
            e = this.store.update(p, e.id, e.revision, { ...e.data, title: copy.title, text: copy.text, hashtags: copy.hashtags, claims: copy.claims, sourceIds: [...allowed], strategy, generatedBy: this.model.name, options: { ...e.data.options, slides: copy.slides, videoScript: copy.videoScript, voiceoverScript: copy.voiceoverScript, openQuestions: copy.openQuestions, consent: false } });
        }
        if (mode !== 'copy' && ['image', 'carousel', 'video', 'reel', 'story'].includes(e.data.format)) {
            creative = await this.agent(p, e.brandId, 'creative', { ...(await this.context(p, e, 'creative')), strategy, copy: { title: e.data.title, text: e.data.text, slides: e.data.options.slides } });
            let media = e.data.media;
            if (e.data.options.generateVisual !== false) {
                let backgroundId = e.data.options.backgroundAssetId;
                if (e.data.options.useAiBackground === true)
                    backgroundId = (await this.media.generateBackground(p, e.brandId, creative.imagePrompt, e.data.media)).id;
                const slides = Array.isArray(e.data.options.slides) && e.data.options.slides.length ? e.data.options.slides : [{ headline: creative.headline, body: '' }];
                const toRender = e.data.format === 'carousel' || ['video', 'reel'].includes(e.data.format) ? slides.slice(0, 10) : slides.slice(0, 1);
                const assets = [];
                for (const slide of toRender)
                    assets.push(await this.media.render(p, e.brandId, b, slide.headline, slide.body, { backgroundId, height: ['video', 'reel', 'story'].includes(e.data.format) ? 1920 : 1350 }));
                if (['video', 'reel'].includes(e.data.format)) {
                    const video = await this.media.slideshow(p, e.brandId, assets.map(x => x.id), e.data.options.audioAssetId);
                    media = [{ id: video.id, mime: video.data.mime, alt: creative.altText }];
                }
                else
                    media = assets.map(x => ({ id: x.id, mime: x.data.mime, alt: creative.altText }));
            }
            e = this.store.update(p, e.id, e.revision, { ...e.data, media, creative });
        }
        e = this.store.update(p, e.id, e.revision, { ...e.data, status: 'GENERATED' });
        e = await this.review(p, e.id);
        for (let attempt = 0; attempt < b.policy.maxAutoRevisions && !e.data.review?.passed && mode !== 'visual'; attempt++) {
            if (e.data.media.length)
                break;
            const context = await this.context(p, e, 'copywriter');
            copy = await this.agent(p, e.brandId, 'copywriter', { ...context, strategy, previous: { text: e.data.text, claims: e.data.claims }, issues: e.data.review?.issues, fixOnlyCopy: true, maxTextLength: CAPABILITIES[e.data.platform].limit });
            // Visual-bearing posts must return to the operator if copy changes; never approve stale slide text.
            if (e.data.media.length)
                break;
            const allowed = new Set(context.sources.map(x => x.id));
            for (const claim of copy.claims)
                for (const sid of claim.sourceIds)
                    assert(allowed.has(sid), 'HALLUCINATED_SOURCE', 'Fonte inventata nella revisione');
            e = this.store.update(p, e.id, e.revision, { ...e.data, title: copy.title, text: copy.text, hashtags: copy.hashtags, claims: copy.claims, sourceIds: [...allowed], status: 'GENERATED' });
            e = await this.review(p, e.id);
        }
        // Restricted opt-in autopublishing, unavailable to messages, visual posts, TikTok, or factual copy.
        const eligible = b.policy.autoPublish && e.data.format === 'text' && e.data.review?.passed && e.data.review.score >= Math.max(90, b.policy.minReviewScore) && e.data.claims.length === 0 && !/[0-9]|https?:|\b(?:promo|sconto|offert|garant|free|gratis)\w*/i.test(e.data.text + ' ' + e.data.objective) && !MESSAGING.includes(e.data.platform) && e.data.platform !== 'tiktok';
        if (eligible) {
            const approval = { userId: 'policy:auto', at: now(), digest: this.digest(p, e) };
            e = this.store.update(p, e.id, e.revision, { ...e.data, status: 'APPROVED', approval });
            this.store.audit(p, e.brandId, 'content.policy-approved', e.id, { digest: approval.digest });
            this.schedule(p, e.id, e.revision, now());
        }
    }
    async analyze(p, brandId) {
        requireRole(p, 'editor');
        p = this.scope(p, brandId);
        const snapshots = this.store.list(p, 'metric', brandId, 5000);
        assert(snapshots.length, 'NO_METRICS', 'Nessuna metrica disponibile');
        const latest = new Map();
        for (const m of snapshots) {
            const old = latest.get(m.data.contentId);
            if (!old || m.data.collectedAt > old.data.collectedAt)
                latest.set(m.data.contentId, m);
        }
        const rows = [...latest.values()].map(m => { const c = this.content(p, m.data.contentId); return { snapshotId: m.id, contentId: c.id, platform: c.data.platform, format: c.data.format, objective: c.data.objective, metrics: m.data.values, collectedAt: m.data.collectedAt, source: m.data.source }; });
        const output = await this.agent(p, brandId, 'analyst', { brand: this.brand(p, brandId).data, sampleSize: rows.length, rows });
        return this.store.create(p, brandId, 'insight', { ...output, sampleSize: rows.length, snapshotIds: rows.map(x => x.snapshotId), accepted: false, createdAt: now() });
    }
    async acceptInsight(p, insightId, revision) {
        requireRole(p, 'approver');
        requireHuman(p);
        const e = this.store.get(p, insightId, 'insight');
        p = this.scope(p, e.brandId);
        assert(e.revision === revision, 'CONFLICT', 'Versione modificata', 409);
        assert(!e.data.accepted, 'INSIGHT', 'Insight già accettato');
        const data = await this.rag.ingest(p, e.brandId, { title: 'Insight: ' + e.data.summary.slice(0, 120), text: JSON.stringify(e.data, null, 2), type: 'performance_insight', source: 'Analytics snapshots: ' + e.data.snapshotIds.join(', '), approved: true, roles: ['strategist', 'analyst', 'copywriter'], validUntil: new Date(Date.now() + 30 * 86400000).toISOString() });
        return this.store.transaction(() => { const current = this.store.get(p, e.id, 'insight'); assert(current.revision === revision && !current.data.accepted, 'CONFLICT', 'Insight già modificato', 409); const knowledge = this.store.create(p, e.brandId, 'knowledge', data); const updated = this.store.update(p, e.id, revision, { ...e.data, accepted: true, acceptedBy: p.userId, knowledgeId: knowledge.id }); this.store.audit(p, e.brandId, 'insight.accepted', e.id, { knowledgeId: knowledge.id }); return updated; });
    }
    convertPlan(p, planId) {
        requireRole(p, 'editor');
        const e = this.store.get(p, planId, 'plan');
        p = this.scope(p, e.brandId);
        assert(e.data.status === 'PROPOSED', 'PLAN', 'Piano già convertito');
        const items = e.data.ideas.map((idea) => this.contentInput(p, e.brandId, { ...idea, title: idea.topic, text: '', options: { suggestedAt: idea.suggestedAt } }));
        return this.store.transaction(() => { const current = this.store.get(p, e.id, 'plan'); assert(current.revision === e.revision && current.data.status === 'PROPOSED', 'CONFLICT', 'Piano già modificato', 409); const drafts = items.map(data => this.store.create(p, e.brandId, 'content', data)); this.store.update(p, e.id, e.revision, { ...e.data, status: 'DRAFTED', contentIds: drafts.map(x => x.id) }); this.store.audit(p, e.brandId, 'plan.converted', e.id, { contentIds: drafts.map(x => x.id) }); return drafts; });
    }
    async plan(p, brandId, objective) {
        requireRole(p, 'editor');
        p = this.scope(p, brandId);
        const accounts = this.store.list(p, 'account', brandId).filter(x => x.data.enabled).map(x => ({ id: x.id, platform: x.data.platform, formats: x.data.transport === 'direct' ? CAPABILITIES[x.data.platform].native : FORMATS }));
        assert(accounts.length, 'NO_ACCOUNT', 'Collegare almeno un account');
        const output = await this.agent(p, brandId, 'planner', { brand: this.brand(p, brandId).data, objective, accounts, now: now(), recentPosts: this.recent(p, brandId), campaigns: this.store.list(p, 'campaign', brandId).map(x => x.data), insights: this.store.list(p, 'insight', brandId).filter(x => x.data.accepted).map(x => x.data) });
        for (const idea of output.ideas) {
            assert(accounts.some(x => x.id === idea.accountId), 'PLAN_ACCOUNT', 'Account inventato nel piano');
            timestamp(idea.suggestedAt);
        }
        return this.store.create(p, brandId, 'plan', { ...output, status: 'PROPOSED' });
    }
    saveContact(p, brandId, b) {
        requireRole(p, 'admin');
        requireHuman(p);
        p = this.scope(p, brandId);
        this.hub.account(p, text(b.accountId, 'account', 80));
        const recipient = text(b.recipient, 'destinatario', 200), e = this.store.list(p, 'contact', brandId).find(x => x.data.accountId === b.accountId && x.data.recipient === recipient);
        const data = { ...e?.data, accountId: b.accountId, recipient, name: text(b.name ?? recipient, 'nome', 200), optIn: b.optIn === true, consentEvidence: text(b.consentEvidence ?? '', 'evidenza consenso', 3000, true), recordedBy: p.userId, recordedAt: now() };
        if (data.optIn)
            assert(data.consentEvidence.length >= 8, 'CONSENT', 'Inserire evidenza del consenso');
        return e ? this.store.update(p, e.id, e.revision, data) : this.store.create(p, brandId, 'contact', data);
    }
    recordMetric(p, contentId, b) {
        requireRole(p, 'editor');
        const e = this.content(p, contentId);
        assert(e.data.status === 'PUBLISHED', 'STATE', 'Metriche solo per contenuti pubblicati');
        const values = object(b.values);
        assert(Object.keys(values).length <= 50, 'METRICS', 'Troppe metriche');
        for (const [k, v] of Object.entries(values))
            assert(k.length <= 100 && typeof v === 'number' && Number.isFinite(v) && v >= 0, 'METRICS', 'Valori numerici finiti non negativi');
        const collectedAt = new Date(timestamp(b.collectedAt ?? now())).toISOString();
        assert(timestamp(collectedAt) <= Date.now() + 60000, 'METRICS_DATE', 'Osservazione futura non consentita');
        const result = this.store.create(p, e.brandId, 'metric', { contentId: e.id, values, collectedAt, source: text(b.source, 'fonte metriche', 1000), importedBy: p.userId });
        this.store.audit(p, e.brandId, 'metric.imported', result.id, { contentId });
        return result;
    }
}
//# sourceMappingURL=service.js.map