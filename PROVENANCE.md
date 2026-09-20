# Provenienza e riuso

Il progetto è stato costruito per la richiesta di 0xfunboy. I repository donatori non sono stati modificati e non sono stati inclusi segreti, dati delle community, wallet, configurazioni di produzione o codice di trading.

## Codice effettivamente riutilizzato

`src/rag/similarity.ts` deriva dalle primitive di GoonersBot:

- `src/rag/types.ts`: `cosineSimilarity`, blob `34bb8a77a864a6cb968d1c65aadba339423cab43`.
- `src/memory/memoryDeduper.ts`: tokenizzazione e similarità Jaccard, blob `6e26358bca25c43cfca7b7e170cd71c8aaba456a`.

Modifiche: estrazione dalle dipendenze specifiche del bot, esportazione della tokenizzazione, protezioni sui valori numerici e utilizzo nel retrieval/dedup dei documenti di brand. Origine: https://github.com/0xfunboy/GoonersBot

## Pattern adattati, non file copiati integralmente

`GoonersBot/src/rag/embedder.ts`, `src/knowledge/knowledgeRetriever.ts`, `src/memory/vectorRetriever.ts`: provider embeddings opzionale, fallback lessicale, recupero solo quando pertinente, isolamento prima della similarità. Sono stati riscritti per workspace + brand, approvazione delle fonti, ruoli editoriali e spazi embedding versionati. Non viene dichiarato un porting integrale del kernel del bot.

`client-airifica`: riferimento per il confine fra sessione autenticata, contesto, runtime e azioni; nessuna parte wallet/Pacifica trasferita. I client ElizaOS pubblici Reddit/Farcaster/Twitch sono stati usati come riferimenti concettuali di adapter, non incorporati come pacchetti `workspace:*` della vecchia versione ElizaOS.

Gli agenti editoriali, il workflow, il server HTTP, la dashboard, la coda, le approvazioni, i nuovi payload social, il media renderer e la persistenza sono implementazioni nuove. Il prodotto non dipende da ElizaOS e non sostiene di essere un fork completo del framework.

## Materiali conservati

Specifica originale integrale in `docs/source/SMM_AI_architettura.md`.
Licenza corrente GoonersBot e avviso precedente MIT in `licenses/`. Le autorizzazioni precedenti e di terzi restano valide secondo il loro ambito; il solo fatto che un repository appartenga a 0xfunboy non consente di riattribuire il copyright di terzi.

Nessun asset grafico, modello, font o logo di una piattaforma è stato copiato dai repository donatori. Le sigle dei canali nella dashboard sono testo, non un kit di loghi ufficiali.
