/** Adapted from 0xfunboy/GoonersBot: src/rag/types.ts (blob 34bb8a77a864a6cb968d1c65aadba339423cab43)
 * and src/memory/memoryDeduper.ts (blob 6e26358bca25c43cfca7b7e170cd71c8aaba456a).
 * Attribution and original terms: ../../licenses and docs/PROVENANCE.md.
 * Modification: export tokenization; reject non-finite inputs explicitly. */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length)
        return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        const av = a[i] ?? 0, bv = b[i] ?? 0;
        if (!Number.isFinite(av) || !Number.isFinite(bv))
            return 0;
        dot += av * bv;
        normA += av * av;
        normB += bv * bv;
    }
    if (normA === 0 || normB === 0)
        return 0;
    const score = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Number.isFinite(score) ? score : 0;
}
export function tokens(text: string): Set<string> { return new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(t => t.length >= 3)); }
export function jaccard(a: string, b: string): number {
    const ta = tokens(a), tb = tokens(b);
    if (!ta.size || !tb.size)
        return 0;
    let inter = 0;
    for (const t of ta)
        if (tb.has(t))
            inter++;
    const union = ta.size + tb.size - inter;
    return union === 0 ? 0 : inter / union;
}
