import { Studio } from './service.js';
import { type Content, type Job, type Principal, type Receipt } from './types.js';
import { AppError, assert, now, safeError } from './util.js';
import { ProviderError } from './http.js';
export class Worker {
    private timer?: NodeJS.Timeout;
    private running = false;
    private closed = false;
    constructor(readonly studio: Studio) { }
    start(): void { if (this.timer)
        return; this.studio.store.recover(); this.timer = setInterval(() => void this.tick(), 1000); this.timer.unref(); void this.tick(); }
    async stop(): Promise<void> { this.closed = true; if (this.timer)
        clearInterval(this.timer); while (this.running)
        await new Promise(r => setTimeout(r, 25)); }
    async tick(): Promise<boolean> {
        if (this.running || this.closed)
            return false;
        this.running = true;
        const store = this.studio.store;
        store.recover();
        const job = store.claim();
        if (!job) {
            this.running = false;
            return false;
        }
        const heartbeat = setInterval(() => store.heartbeat(job), 30000);
        heartbeat.unref();
        const p: Principal = { userId: 'worker', workspaceId: job.workspaceId, brandId: job.brandId, role: 'admin', via: 'system' };
        try {
            const result = await this.execute(p, job);
            if (result === 'PENDING')
                store.finish(job, 'QUEUED', null, Date.now() + Math.min(60000, 5000 + job.attempts * 2000));
            else
                store.finish(job, result || 'DONE');
        }
        catch (err) {
            const error = safeError(err);
            let state = 'FAILED';
            const content = store.maybe<Content>(p, job.entityId, 'content');
            const inFlight = job.kind === 'publish' && content?.data.status === 'PUBLISHING';
            if (inFlight && (!(err instanceof ProviderError) || err.ambiguous)) {
                state = 'UNCERTAIN';
                if (content)
                    store.update(p, content.id, content.revision, { ...content.data, status: 'UNCERTAIN' as const });
            }
            else if (err instanceof ProviderError && err.retryable && job.attempts < 5) {
                state = 'QUEUED';
                if (inFlight && content)
                    store.update(p, content.id, content.revision, { ...content.data, status: job.payload.phase === 'finalize' ? 'PROCESSING' : 'SCHEDULED' });
            }
            else if (err instanceof AppError && err.code === 'METRICS_UNSUPPORTED')
                state = 'SKIPPED';
            else if (content && ['publish', 'generate'].includes(job.kind))
                store.update(p, content.id, content.revision, { ...content.data, status: 'FAILED' as const });
            store.audit(p, job.brandId, 'job.' + state.toLowerCase(), job.entityId, { jobId: job.id, kind: job.kind, error });
            store.finish(job, state, error, state === 'QUEUED' ? Date.now() + Math.max(err instanceof ProviderError ? err.retryAfterMs : 0, Math.min(300000, 5000 * 2 ** job.attempts)) : undefined);
        }
        finally {
            clearInterval(heartbeat);
            this.running = false;
        }
        return true;
    }
    private async execute(p: Principal, j: Job): Promise<string | void> {
        const s = this.studio, store = s.store;
        if (j.kind === 'generate') {
            await s.generate(p, j.entityId, j.payload.mode ?? 'all');
            const c = s.content(p, j.entityId);
            if (c.data.status === 'WAITING_APPROVAL')
                store.enqueue(p, j.brandId, 'notify', c.id, {}, Date.now(), `notify:${c.id}:${c.revision}`);
            return;
        }
        if (j.kind === 'analyze') {
            await s.analyze(p, j.brandId);
            return;
        }
        if (j.kind === 'plan') {
            await s.plan(p, j.brandId, j.payload.objective ?? '');
            return;
        }
        if (j.kind === 'notify') {
            const e = s.content(p, j.entityId);
            if (!['WAITING_APPROVAL', 'REVIEW_FAILED'].includes(e.data.status))
                return 'CANCELLED';
            const a = store.list<import('./types.js').Account>(p, 'account', j.brandId).find(x => x.data.platform === 'telegram' && x.data.enabled && x.data.options.approvalChatId && x.data.transport === 'direct');
            if (!a)
                return 'SKIPPED';
            const buttons: any[][] = [[{ text: 'Apri contenuto', url: s.cfg.baseUrl + '/#content/' + e.id }]];
            if (e.data.platform !== 'tiktok' && !e.data.media.length)
                buttons.push([{ text: 'Approva questa versione', callback_data: `ap:${e.id}:${e.revision}` }, { text: 'Rifiuta', callback_data: `no:${e.id}:${e.revision}` }]);
            await s.hub.direct.telegram(s.hub.credentials(a), 'sendMessage', { chat_id: a.data.options.approvalChatId, text: `Revisione ${e.revision} · ${e.data.title}\n\n${e.data.text.slice(0, 2500)}\n\n${e.data.platform} · score ${e.data.review?.score ?? '—'}. Approvare non programma l'invio.`, reply_markup: { inline_keyboard: buttons } });
            return;
        }
        const e = s.content(p, j.entityId), a = s.hub.account(p, e.data.accountId);
        if (j.kind === 'publish') {
            if (!['SCHEDULED', 'PROCESSING'].includes(e.data.status))
                return 'CANCELLED';
            assert(e.data.approval && e.data.approval.digest === j.payload.digest && e.data.approval.digest === s.digest(p, e), 'APPROVAL_STALE', 'Approvazione non più valida');
            const issues = s.hardIssues(p, e);
            assert(!issues.length, 'PUBLISH_BLOCKED', issues.join('; '));
            const post = { ...s.post(e), media: await s.media.hydrate(p, e.data.media) };
            let current = store.update<Content>(p, e.id, e.revision, { ...e.data, status: 'PUBLISHING' });
            store.audit(p, j.brandId, 'publication.dispatch', e.id, { phase: j.payload.phase ?? 'initial', accountId: a.id, platform: a.data.platform });
            const receipt = j.payload.phase === 'finalize' ? await s.hub.finalize(a, e.data.publication!) : await s.hub.publish(a, post);
            store.transaction(() => { current = store.update(p, current.id, current.revision, { ...current.data, status: receipt.state, publication: receipt }); this.follow(p, current, receipt); });
            return;
        }
        if (j.kind === 'poll') {
            if (e.data.status !== 'PROCESSING' || !e.data.publication)
                return 'CANCELLED';
            if (j.attempts > 180) {
                store.update(p, e.id, e.revision, { ...e.data, status: 'UNCERTAIN' as const });
                store.audit(p, j.brandId, 'publication.poll-timeout', e.id);
                return 'UNCERTAIN';
            }
            const receipt = await s.hub.poll(a, e.data.publication);
            const current = store.update(p, e.id, e.revision, { ...e.data, status: receipt.state, publication: receipt });
            if (receipt.details?.readyToPublish) {
                store.enqueue(p, j.brandId, 'publish', e.id, { phase: 'finalize', digest: e.data.approval?.digest }, Date.now(), `finalize:${e.id}:${receipt.externalId}`);
                return;
            }
            if (receipt.state === 'PROCESSING')
                return 'PENDING';
            this.follow(p, current, receipt);
            return;
        }
        if (j.kind === 'receiptTimeout') {
            if (e.data.status === 'PROCESSING') {
                store.update(p, e.id, e.revision, { ...e.data, status: 'UNCERTAIN' as const });
                return 'UNCERTAIN';
            }
            return;
        }
        if (j.kind === 'metrics') {
            if (e.data.status !== 'PUBLISHED' || !e.data.publication)
                return 'CANCELLED';
            const metrics = await s.hub.metrics(a, e.data.publication);
            store.create(p, j.brandId, 'metric', { ...metrics, contentId: e.id, observationWindow: j.payload.window });
            store.audit(p, j.brandId, 'metrics.collected', e.id, { keys: Object.keys(metrics.values), window: j.payload.window });
            return;
        }
        assert(false, 'JOB_KIND', 'Tipo job sconosciuto');
    }
    private follow(p: Principal, e: import('./types.js').Entity<Content>, r: Receipt): void { const store = this.studio.store; if (r.state === 'PROCESSING') {
        if (r.details?.stage === 'webhook')
            store.enqueue(p, e.brandId, 'receiptTimeout', e.id, {}, Date.now() + 72 * 3600000, `timeout:${e.id}:${r.externalId}`);
        else
            store.enqueue(p, e.brandId, 'poll', e.id, {}, Date.now() + 5000, `poll:${e.id}:${r.externalId}`);
    }
    else if (r.state === 'PUBLISHED') {
        for (const hours of [24, 72])
            store.enqueue(p, e.brandId, 'metrics', e.id, { window: hours + 'h' }, Date.now() + hours * 3600000, `metric:${e.id}:${hours}:${r.externalId}`);
        store.audit(p, e.brandId, 'content.published', e.id, { externalId: r.externalId, at: now() });
    } }
}
