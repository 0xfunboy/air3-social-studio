# Configurare i modelli

Nessun modello fittizio viene usato se manca la configurazione: generazione, pianificazione e analisi richiedono un provider reale. Le bozze manuali, la revisione deterministica e il workflow umano restano disponibili senza LLM.

## Gemini nativo

Impostare in `.env`:

```dotenv
LLM_PROVIDER=gemini
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
LLM_MODEL=
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=
```

Inserire un modello testuale con supporto agli output JSON strutturati e, separatamente, un modello di generazione immagini disponibile al proprio progetto Google. I valori restano intenzionalmente vuoti fino alla configurazione: nessun modello corrente o quota viene dato per garantito. Non impostare chiavi in frontend o in prompt.

Il client usa `:generateContent`, `systemInstruction`, `responseMimeType` e `responseJsonSchema`; per immagini usa risposta multimodale e salva realmente i byte ricevuti. Il modello immagine non è necessario per i template a colore uniforme o con sfondi caricati manualmente.

## Endpoint compatibile chat/completions

```dotenv
LLM_PROVIDER=compatible
LLM_BASE_URL=http://127.0.0.1:8080/v1
LLM_MODEL=modello-caricato-nel-proprio-server
LLM_API_KEY=
OUTBOUND_ORIGINS=http://127.0.0.1:8080
```

Il nome sopra è una configurazione di esempio: deve coincidere con un modello realmente caricato. Il provider deve accettare `/chat/completions`, risposta `json_object`, messaggi system/user e, per la revisione visuale, contenuti multimodali. Se il modello non supporta immagini, usare un reviewer multimodale distinto o tenere la revisione manuale; non si simula una verifica visuale.

Endpoint remoti custom richiedono l'origin esatta nell'allowlist server `OUTBOUND_ORIGINS`. Non vengono seguiti redirect, per evitare la propagazione delle credenziali a un altro host. In Docker `127.0.0.1` indica il container stesso: usare la rete/container del provider e autorizzarne esplicitamente l'origin.

## Modello per ruolo

Facoltativi: `LLM_MODEL_STRATEGIST`, `LLM_MODEL_COPYWRITER`, `LLM_MODEL_CREATIVE`, `LLM_MODEL_REVIEWER`, `LLM_MODEL_ANALYST`, `LLM_MODEL_PLANNER`. Condividono provider, endpoint e credenziali del server. In loro assenza viene usato `LLM_MODEL`.

## Embeddings opzionali

```dotenv
EMBEDDING_BASE_URL=http://127.0.0.1:8081/v1
EMBEDDING_MODEL=modello-embedding-caricato
EMBEDDING_API_KEY=
OUTBOUND_ORIGINS=http://127.0.0.1:8080,http://127.0.0.1:8081
```

L'endpoint deve implementare `/embeddings`. Senza configurazione si usa retrieval lessicale, non si generano vettori casuali. Se la query embedding fallisce si ricade sul lessicale; se fallisce l'indicizzazione si segnala l'errore e non si dichiara indicizzato un documento inesistente.

Quando si cambia modello o endpoint occorre reindicizzare i documenti salvandoli nuovamente. Lo spazio vettoriale include endpoint e nome modello; cambiare pesi mantenendo lo stesso nome richiede responsabilità dell'operatore e una reindicizzazione. Questa release non effettua download o training di modelli.

## Limiti da verificare

Nessuna chiamata live ai modelli è stata eseguita nella preparazione. I test usano un `FakeModel` solo nella cartella test, con nome `TEST_FIXTURE_NOT_A_LIVE_MODEL`. Gli schemi strutturati, la presenza di fonti e gli score non garantiscono correttezza fattuale: il controllo umano rimane il default.
