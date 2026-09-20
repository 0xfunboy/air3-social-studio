# Collaudo 0.2.0 · Paper & Graphite

Eseguito il 20 settembre 2026. **115 test Node passati, zero fallimenti, zero saltati.** Ambiente effettivo: Linux, Node 22.16.0, TypeScript 5.8.3, SQLite Node e FFmpeg/ffprobe locali. Questo documento distingue prove reali locali, risposte provider simulate e verifiche esterne mancanti.

## Risultati

| Controllo | Esito | Prova |
|---|---|---|
| TypeScript strict / noUncheckedIndexedAccess | PASS | Compilazione reale |
| 115 test Node | PASS | Servizi reali; provider esterni con fixture HTTP esplicite |
| Installazione npm offline | PASS | Tarball inclusi, package-lock, cache inizialmente vuota |
| Login, CSRF, Origin, sessioni, ruoli, isolamento | PASS | HTTP locale e SQLite reali |
| Site admin separato da customer admin | PASS | Accessi negati a configurazione e provisioning globali |
| Google OIDC | PASS locale | RSA/JWKS, firma e claim realmente verificati con chiavi di test; token endpoint simulato |
| Inviti, verifica email, reset, disabled flags | PASS locale | Token monouso e scadenze, hash, invalidazione sessioni; mail simulata |
| OAuth di tutte le 12 famiglie | PASS contratti | Stato, PKCE dove configurato, token exchange e discovery su fixture dedicate |
| App condivise e override | PASS | Segreti non copiati al cliente, ACL, source binding e selezione dopo consenso |
| Rinnovo shared grant | PASS contratti | Un rinnovo per più destinazioni, preservate revisioni editoriali |
| Meta globale/workspace e Telegram | PASS locale | HMAC/binding reali con segreti di test, target e workspace distinti |
| Proxy spoofing | PASS | X-Real-IP accettato solo da un peer esplicitamente fidato |
| RAG ed embeddings | PASS locale | Algoritmi veri, vettori test, filtro brand, ruolo, fonte, approvazione e spazio embedding |
| Approvazioni/scheduler/retry | PASS | Macchina a stati reale, revisioni, esiti incerti e riconciliazione |
| Native social e Postiz | PASS contratti | Endpoint/header/payload/parsing implementati, non grant reali |
| YouTube MP4 | PASS contratti | Byte locali e sessione resumable simulata, origin verificata, stato e metriche |
| JPEG e slideshow MP4 | PASS | FFmpeg/ffprobe reali; rifiuto overflow del template |
| Browser pagine e temi | PASS | 18 voci di schermata, più temi secondari/dialoghi, dati di collaudo dichiarati |
| Moduli browser | PASS fixture | Salvataggio workspace, passo wizard, Google secret oscurato, app OAuth condivisa |
| Responsive e comandi | PASS | 320/390/768/1440 px nei flussi coperti, nessun overflow, palette e dialoghi |
| Installazione pulita | PASS | Avvio senza node_modules, HTTP reale, brand, wizard, env e restart |
| Readiness gate locale | PASS | Segnala ACTION_REQUIRED per requisiti mancanti invece di simulare un deploy pronto |
| Backup | PASS | SQLite backup API, integrity_check, entità conservate |
| Migrazione dal vero ZIP 0.1.0 | PASS | Entità/ciphertext conservati, password e token leggibili, site admin solo da CLI esplicita |

Report: [TAP Node](validation/node-tests.tap), [browser](validation/browser.json), [installazione](validation/clean-install.json), [migrazione](validation/migration.json). I valori di durata dipendono dalla macchina e non sono benchmark del prodotto.

## Confine browser / backend

La policy dell’ambiente impediva al browser headless la navigazione diretta, anche verso localhost. Non è stata aggirata. Il test UI usa `page.set_content` e un mock fetch **interamente in memoria**, con fixture generate dallo schema dell’applicazione. Esegue i veri handler dei form e controlla le richieste prodotte, ma non è una prova browser end-to-end contro il server reale.

Separatamente, i test Node e di installazione effettuano richieste HTTP reali al backend locale e verificano il database. Queste due categorie non vengono confuse. Gli screenshot sono del frontend eseguito, con utente e brand di collaudo; l’applicazione distribuita non precarica questi dati.

## Confine provider / produzione

Nessun accesso a Google, Meta, TikTok, X, LinkedIn, YouTube o altri account reali durante i test; nessuna email o pubblicazione esterna; nessun modello a pagamento invocato. Le fixture verificano il codice e i contratti presi a riferimento, non l’app review, gli scope effettivamente disponibili all’operatore o le variazioni future delle API.

Dockerfile/Compose/Caddy sono inclusi e revisionati come configurazione, ma **Docker non era disponibile** per costruirli ed eseguirli. La matrice CI 22/24 è inclusa, non è stato eseguito un run remoto GitHub. DNS/TLS, deliverability, performance sotto carico, audit sicurezza e accessibilità completa non sono stati certificati.

## Riprodurre

```bash
npm ci --offline --ignore-scripts
npm run check
npm run test:ui
npm run test:install
```

UI: Python3, Playwright e Chromium già installati; `CHROMIUM_PATH` sceglie il binario, `UI_TEST_OUT` la cartella. Gli script non installano silenziosamente un browser.

Per testare l’archivio finale in una directory temporanea, ricompilando offline:

```bash
AIR3_RELEASE_ZIP=/PERCORSO/AIR3-Social-Studio-v0.2.0.zip AIR3_SMOKE_COMPILE=1 npm run test:install
```

La verifica crea credenziali temporanee, avvia solo il backend locale senza worker, effettua chiamate HTTP, backup e restart, quindi pulisce l’ambiente. Non usa DATA_DIR o credenziali della tua installazione.

Migrazione: estrai il vecchio ZIP in una cartella separata, poi:

```bash
AIR3_LEGACY_ROOT=/PERCORSO/vecchia-release/air3-social-studio node tests/release/migrate.mjs
```

Usa un database temporaneo. La CLI di promozione site admin è eseguita soltanto sul database di test.

Per la verifica sul dominio e sugli account reali seguire [RELEASE-GATE](RELEASE-GATE.md), non impostare flag “audited” o stati “verified” soltanto perché questi test sono passati.
