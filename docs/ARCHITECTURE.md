# Architettura implementata

## Confini

```text
Dashboard web / n8n / client MCP
              │
   HTTP API + auth + tenant scope
              │
       Studio application service
        ├── Brand / campagne / contenuti / approvazioni
        ├── Rag → embedding provider → chunk nello storage
        ├── Agent contracts → Gemini / endpoint compatibile
        ├── Media service → Gemini image opzionale + FFmpeg
        └── Job queue persistente → Worker
                                      │
                              SocialHub / Postiz
                                      │
                          Receipt → polling/webhook
                                      │
                       Metriche → Analyst → insight
                                      │
                    approvazione umana → Brand RAG
```

Il generatore, il server MCP e la dashboard richiamano gli stessi servizi applicativi. L'orchestrazione del flusso editoriale è deterministica: non è un gruppo di LLM che decide autonomamente se bypassare una revisione. I tool esposti via MCP possono essere usati da un client esterno autorizzato; questa release non contiene un client universale per eseguire arbitrari server MCP remoti.

## Modello dati

`Store` implementa tabelle SQLite per utenti, workspace, membership, sessioni, token, entità versionate, job, audit e deduplicazione webhook. Le entità JSON hanno sempre `workspaceId`, `brandId`, `kind`, `revision` e date server. I tipi applicativi includono brand, account, content, knowledge, campaign, asset, execution, prompt, insight, metric, contact, inbox, plan e history.

`BrandIdentity`/`BrandMemory` del documento sono implementati come record brand + documenti knowledge + insight; `Publication` è il receipt salvato nel content con job/audit; `Approval` è un record firmato del payload nel content. Non sono tre database separati: sono separazioni logiche nello stesso database persistente.

## Agent contracts

- Strategist: topic, target, obiettivo, angolo, hook, CTA e motivazione a partire da dati del brand.
- Copywriter: titolo, testo, hashtag, slide, script video/voiceover, claim con source IDs, dubbi aperti.
- Creative Director: prompt immagine, headline, layout editoriale e alt text.
- Reviewer: esito, score 0..100, elenco di problemi. Affiancato dai controlli deterministici non aggirabili.
- Analyst: sintesi, ipotesi, limiti, raccomandazioni. Non viene inventata una confidenza statistica.
- Planner: idee per account autorizzati con date ISO; il piano crea bozze solo quando richiesto.

Ogni esecuzione registra modello, ruolo, versione prompt, input, hash dell'input, output/esito ed errore depurato. Le istruzioni non possono concedere permessi di pubblicazione. Gli output vengono validati usando il sottoinsieme JSON Schema impiegato dai contratti; non si dichiara implementata l'intera specifica JSON Schema.

## Retrieval e memoria

Le regole obbligatorie del brand sono sempre incluse nel contesto; non dipendono dal fatto che un frammento entri nella top-k. I documenti vengono spezzati in chunk da circa 1.000 caratteri con overlap 120. In modalità embedding si usa uno spazio identificato da endpoint + modello e si verificano indici, dimensioni e valori finiti. Il ranking combina lessicale e cosine similarity; i documenti di un altro spazio vettoriale non vengono confrontati semanticamente.

Filtri prima del ranking: workspace, brand, approvazione, ruolo, piattaforma e validità. Niente knowledge store globale condiviso fra clienti. Gli allegati della dashboard accettano testo UTF-8 (MD/TXT/JSON/CSV): non è incluso un parser semantico PDF/DOCX/immagini o un crawler web. Per quei documenti estrarre prima il testo o usare l'API di ingestione.

La `performance memory` è composta da snapshot osservati e insight esplicitamente accettati. L'analyst usa l'ultima osservazione per contenuto, non somma lo stesso conteggio cumulativo a 24h e 72h. L'accettazione di un insight e la creazione della fonte avvengono atomicamente; i documenti insight scadono dopo 30 giorni.

## Ciclo di pubblicazione

`DRAFT → GENERATING → WAITING_APPROVAL / REVIEW_FAILED → APPROVED → SCHEDULED → PUBLISHING → PROCESSING / PUBLISHED / FAILED / UNCERTAIN`.

Un'approvazione lega testo, hashtag, titolo, media locali immutabili, opzioni, destinatario, account, brand, campagna e revisioni delle fonti. Aggiornare uno di questi elementi invalida l'approvazione. URL media esterni sono legati come URL, non come byte: per un vincolo forte caricare l'asset in libreria invece di utilizzare una URL modificabile da terzi.

La coda usa lease e heartbeat. Il worker non ritenta automaticamente un POST la cui risposta è andata persa: l'esito diventa UNCERTAIN. Un 429 dichiarato può essere ritentato con backoff. Non viene promessa la semantica exactly-once fra database e API esterne; viene preservata esplicitamente l'incertezza.

Meta: creazione container, polling GET, poi un secondo job di pubblicazione. TikTok: ticket iniziale e verifica status. Postiz: receipt locale di coda e verifica dello stato pubblicato. WhatsApp: accettazione API e ricevute firmate separate.

## Organizzazione del codice

`src/core`: servizi, sicurezza, persistenza, worker, media. `src/rag`: embedding e ranking. `src/agents`: provider e contratti. `src/social`: client e capacità. `src/integrations`: webhook e MCP. `src/api`: HTTP. `web`: dashboard. `tests`: test reali locali e contratti simulati, chiaramente denominati.
