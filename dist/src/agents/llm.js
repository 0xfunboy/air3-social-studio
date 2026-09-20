import { jsonRequest } from '../core/http.js';
import { assert, object } from '../core/util.js';
export class LanguageModel {
    cfg;
    http;
    constructor(cfg, http) {
        this.cfg = cfg;
        this.http = http;
    }
    get available() { return !!this.cfg.llmModel; }
    get name() { return this.cfg.llmModel; }
    async generate(system, input, schema, images = [], role = '') {
        assert(this.available, 'MODEL_REQUIRED', 'Configurare LLM_MODEL e il provider. Nessun modello simulato viene usato in produzione.', 503);
        const model = process.env[`LLM_MODEL_${role.toUpperCase()}`] || this.cfg.llmModel;
        let result;
        if (this.cfg.llmProvider === 'gemini') {
            const r = await this.http.request(`${this.cfg.llmBase}/models/${encodeURIComponent(model)}:generateContent`, jsonRequest({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }, ...images.map(x => ({ inlineData: { mimeType: x.mime, data: x.data } }))] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: role === 'reviewer' ? 0.1 : 0.65 } }, undefined, { 'x-goog-api-key': this.cfg.llmKey }));
            result = r.body.candidates?.[0]?.content?.parts?.filter((p) => p.text).map((p) => p.text).join('');
        }
        else {
            const content = [{ type: 'text', text: JSON.stringify(input) }, ...images.map(x => ({ type: 'image_url', image_url: { url: `data:${x.mime};base64,${x.data}` } }))];
            const r = await this.http.request(this.cfg.llmBase + '/chat/completions', jsonRequest({ model, messages: [{ role: 'system', content: system + '\nReturn JSON following this schema: ' + JSON.stringify(schema) }, { role: 'user', content: images.length ? content : JSON.stringify(input) }], response_format: { type: 'json_object' }, temperature: role === 'reviewer' ? 0.1 : 0.65 }, this.cfg.llmKey));
            result = r.body.choices?.[0]?.message?.content;
        }
        assert(typeof result === 'string' && result.length < 200000, 'MODEL_OUTPUT', 'Il modello non ha restituito JSON utilizzabile');
        let parsed;
        try {
            parsed = object(JSON.parse(result));
        }
        catch {
            throw new Error('Il modello ha restituito JSON non valido');
        }
        validateSchema(parsed, schema);
        return parsed;
    }
}
/** Strict validator for the JSON-Schema subset emitted by our prompt contracts. */
export function validateSchema(value, schema, path = '$') {
    if (schema.enum)
        assert(schema.enum.includes(value), 'MODEL_SCHEMA', `${path}: valore fuori enum`);
    if (schema.type === 'object') {
        assert(value && typeof value === 'object' && !Array.isArray(value), 'MODEL_SCHEMA', `${path}: oggetto richiesto`);
        for (const k of schema.required ?? [])
            assert(Object.hasOwn(value, k), 'MODEL_SCHEMA', `${path}.${k}: campo obbligatorio`);
        if (schema.additionalProperties === false)
            for (const k of Object.keys(value))
                assert(Object.hasOwn(schema.properties ?? {}, k), 'MODEL_SCHEMA', `${path}.${k}: campo inatteso`);
        for (const [k, s] of Object.entries(schema.properties ?? {}))
            if (value[k] !== undefined)
                validateSchema(value[k], s, path + '.' + k);
    }
    else if (schema.type === 'array') {
        assert(Array.isArray(value), 'MODEL_SCHEMA', `${path}: array richiesto`);
        assert(value.length <= (schema.maxItems ?? 100), 'MODEL_SCHEMA', `${path}: array troppo grande`);
        for (const v of value)
            validateSchema(v, schema.items, path + '[]');
    }
    else if (schema.type === 'string')
        assert(typeof value === 'string' && value.length <= (schema.maxLength ?? 20000) && value.length >= (schema.minLength ?? 0), 'MODEL_SCHEMA', `${path}: stringa non valida`);
    else if (schema.type === 'number' || schema.type === 'integer')
        assert(typeof value === 'number' && Number.isFinite(value) && (schema.type !== 'integer' || Number.isInteger(value)) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity), 'MODEL_SCHEMA', `${path}: numero non valido`);
    else if (schema.type === 'boolean')
        assert(typeof value === 'boolean', 'MODEL_SCHEMA', `${path}: booleano richiesto`);
}
//# sourceMappingURL=llm.js.map