import { jsonRequest } from '../core/http.js';
import { assert, text, strings, id, sha } from '../core/util.js';
import { cosineSimilarity, tokens } from './similarity.js';
export function chunkText(input, size = 1000, overlap = 120) {
    assert(size > overlap && overlap >= 0, 'CHUNK', 'Dimensioni chunk non valide');
    const normalized = input.replace(/\r\n/g, '\n').trim();
    const result = [];
    let start = 0;
    while (start < normalized.length) {
        let end = Math.min(start + size, normalized.length);
        if (end < normalized.length) {
            const split = normalized.lastIndexOf('\n', end);
            if (split > start + size / 2)
                end = split;
        }
        const s = normalized.slice(start, end).trim();
        if (s)
            result.push(s);
        if (end === normalized.length)
            break;
        start = end - overlap;
    }
    return result;
}
export class Embedder {
    cfg;
    http;
    cache = new Map();
    constructor(cfg, http) {
        this.cfg = cfg;
        this.http = http;
    }
    get enabled() { return !!(this.cfg.embeddingBase && this.cfg.embeddingModel); }
    get model() { return this.cfg.embeddingBase + '#' + this.cfg.embeddingModel; }
    async embed(texts) {
        if (!this.enabled)
            return [];
        const r = await this.http.request(this.cfg.embeddingBase + '/embeddings', jsonRequest({ model: this.cfg.embeddingModel, input: texts }, this.cfg.embeddingKey));
        assert(Array.isArray(r.body.data) && r.body.data.length === texts.length, 'EMBEDDINGS', 'Risposta embeddings incompleta');
        const sorted = [...r.body.data].sort((a, b) => a.index - b.index);
        assert(sorted.every((d, i) => d.index === i), 'EMBEDDINGS', 'Indici embeddings mancanti o duplicati');
        const vectors = sorted.map((d) => d.embedding);
        assert(vectors.every((v) => Array.isArray(v) && v.length > 0 && v.length <= 65536 && v.every((x) => typeof x === 'number' && Number.isFinite(x))) && vectors.every((v) => v.length === vectors[0].length), 'EMBEDDINGS', 'Vettori non validi o dimensioni incoerenti');
        return vectors;
    }
    async query(input) {
        if (!this.enabled)
            return [];
        const key = sha(input);
        const found = this.cache.get(key);
        if (found)
            return found;
        try {
            const v = (await this.embed([input]))[0] ?? [];
            if (this.cache.size >= 200)
                this.cache.delete(this.cache.keys().next().value);
            this.cache.set(key, v);
            return v;
        }
        catch {
            return [];
        }
    }
}
/** GoonersBot knowledgeRetriever pattern, adapted to mandatory tenant/brand scope,
 * versioned embedding space, per-role retrieval and normalized hybrid scoring. */
export class Rag {
    store;
    embedder;
    constructor(store, embedder) {
        this.store = store;
        this.embedder = embedder;
    }
    async ingest(p, brandId, input) {
        this.store.get(p, brandId, 'brand');
        const raw = text(input.text, 'documento', 1000000), title = text(input.title, 'titolo', 200);
        const pieces = chunkText(raw);
        let vectors = [];
        if (this.embedder.enabled) {
            for (let i = 0; i < pieces.length; i += 32)
                vectors.push(...await this.embedder.embed(pieces.slice(i, i + 32)));
        }
        return { title, text: raw, type: text(input.type ?? 'knowledge', 'tipo', 50), platform: text(input.platform ?? '*', 'piattaforma', 40), roles: strings(input.roles ?? ['strategist', 'copywriter', 'creative', 'reviewer', 'analyst'], 'ruoli', 8), approved: input.approved === true, source: text(input.source ?? 'Documento caricato dal responsabile del brand', 'fonte', 2000), validFrom: input.validFrom || undefined, validUntil: input.validUntil || undefined, embeddingModel: vectors.length ? this.embedder.model : undefined, chunks: pieces.map((s, i) => ({ id: id(), text: s, embedding: vectors[i] })) };
    }
    async retrieve(p, brandId, query, role, platform = '*', limit = 8) {
        this.store.get(p, brandId, 'brand');
        const docs = this.store.list(p, 'knowledge', brandId, 5000);
        const terms = tokens(query);
        const q = await this.embedder.query(query);
        const scored = [];
        const at = Date.now();
        for (const doc of docs) {
            const d = doc.data;
            if (!d.approved || !d.roles.includes(role) || (d.platform !== '*' && d.platform !== platform) || (d.validUntil && Date.parse(d.validUntil) < at) || (d.validFrom && Date.parse(d.validFrom) > at))
                continue;
            for (const c of d.chunks) {
                const ct = tokens(c.text + ' ' + d.title);
                let hits = 0;
                for (const t of terms)
                    if (ct.has(t))
                        hits++;
                const lexical = terms.size ? hits / terms.size : 0;
                const sem = d.embeddingModel === this.embedder.model && q.length && c.embedding ? Math.max(0, cosineSimilarity(q, c.embedding)) : 0;
                const score = q.length ? sem * 0.65 + lexical * 0.35 : lexical;
                if (score > 0.08)
                    scored.push({ id: `${doc.id}:${c.id}`, documentId: doc.id, title: d.title, text: c.text, score, source: d.source });
            }
        }
        return scored.sort((a, b) => b.score - a.score).slice(0, Math.min(20, Math.max(1, limit)));
    }
}
//# sourceMappingURL=index.js.map