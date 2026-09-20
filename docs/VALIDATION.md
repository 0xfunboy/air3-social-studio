# Collaudo della release 0.1.0

Eseguito il 20 settembre 2026 sul compilato incluso nello ZIP. Esito finale: **62 test Node passati, 0 fallimenti, 0 saltati**. Node 22.16.0, TypeScript 5.8.3, SQLite di Node, FFmpeg/ffprobe installati nel container Linux. Non è una certificazione indipendente di sicurezza o produzione.

## Risultati

| Controllo | Esito | Tipo di prova |
|---|---|---|
| TypeScript strict + noUncheckedIndexedAccess | PASS | Compilazione reale |
| 62 test Node | PASS | Esecuzione reale; i provider esterni sono sostituiti da fixture HTTP |
| Sessioni/password/CSRF/Origin/ruoli e scope brand | PASS | HTTP locale e database reali |
| Approvazione legata a payload/fonti/brand/account/campagna | PASS | Workflow e persistenza reali |
| RAG, dedup, embedding-space e validazione indici/dimensioni | PASS | Algoritmi reali, vettori di test, endpoint remoto simulato |
| Retry, lease, ripartenza e scritture con esito incerto | PASS | Macchina a stati reale, risposte/errori HTTP simulati |
| Client nativi e Postiz | PASS contratti | URL, header, payload e parsing su risposte dichiarate nei test; non account live |
| Webhook Meta/TG | PASS | Firme calcolate realmente con segreti di test, replay/target/permessi verificati |
| Rendering JPEG e slideshow MP4 | PASS | FFmpeg/ffprobe reali, byte media verificati |
| Testo oltre spazio disponibile nel template | PASS | Il renderer rifiuta overflow invece di sovrapporre titolo/corpo |
| UI desktop 1440 e mobile 390 | PASS | Browser headless, API fixture in memoria, nessun errore JS rilevato né overflow orizzontale mobile |
| Avvio copia pulita senza node_modules | PASS | Setup, npm start, HTTP login, creazione brand e file statici reali |
| Doctor + backup SQLite | PASS | FFmpeg reale, copia consistente, integrity_check e presenza brand nel backup |

Report dettagliati: [TAP Node](validation/node-tests.tap), [browser](validation/browser.json), [avvio pulito/backup](validation/clean-install.json).

## Confine delle prove

Non sono state usate credenziali social reali e non è stato pubblicato alcun contenuto esterno. Gemini, endpoint compatibili, immagini generate da modello, embeddings remoti, scope OAuth, refresh token, audit TikTok, webhook dai server dei provider e disponibilità delle metriche sui veri account **non sono stati verificati live**.

I test social fanno fallire ogni chiamata non esplicitamente prevista nella fixture. Dimostrano che il codice prepara e interpreta i contratti testati, non che un'app sia autorizzata o che il provider non abbia cambiato comportamento. I test LLM producono dati controllati soltanto in `tests/`; il runtime non include un modello finto di riserva.

La navigazione diretta del browser headless al server locale era bloccata dalla policy dell'ambiente. Non è stata aggirata: il controllo UI usa `page.set_content` con fetch sostituito da dati interamente in memoria, senza richieste browser inoltrate altrove. Le API HTTP sono verificate separatamente dal test Node reale. Quindi **non viene dichiarato un test browser end-to-end integrato contro il backend live**.

Le schermate in `screenshots/` mostrano un brand e un utente di collaudo, non account commerciali collegati. Il prodotto distribuito si avvia vuoto. I JSON n8n sono stati parsati ma non eseguiti su n8n; Dockerfile/compose non sono stati costruiti/avviati qui. Il registry npm non era raggiungibile: sono stati usati il compilatore e i tipi disponibili nell'ambiente; il runtime compilato non richiede dipendenze npm.

## Riprodurre i test

```bash
npm install --ignore-scripts
npm run typecheck
npm test
node --check web/app.js
```

Per le prove UI opzionali occorrono Python3, Playwright Python e Chromium installati nel proprio ambiente:

```bash
python tests/browser/visual.py
# CHROMIUM_PATH può indicare un binario diverso da /usr/bin/chromium.
# UI_TEST_OUT sceglie la directory risultati (default /tmp/air3-browser).
```

Per ripetere lo smoke della release, Python3 e Node/FFmpeg locali:

```bash
python tests/release/smoke.py
```

Questo test crea una directory temporanea, genera credenziali locali temporanee, verifica HTTP e backup e poi rimuove l'ambiente. Non usa i dati runtime dell'installazione e non chiama provider social. Non avviarlo con un profilo di produzione modificato per attivare servizi esterni.

## Limiti ancora da verificare

Import OAuth/manual token per ogni piattaforma, audit e requisiti UX TikTok, formati video specifici del creator, proprietà dei domini media, capienza dei contatori/filtri Postiz, stress test sui volumi di dati, restore con upload concorrenti, esposizione pubblica e backup operativi. La matrice [REQUIREMENTS](REQUIREMENTS.md) dichiara le parti parziali/future invece di attribuire completezza ai soli test.
