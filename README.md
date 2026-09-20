# AIR3 Social Studio

**Self-hosted social-media management, con agenti specializzati e controllo editoriale.**

Release **0.1.0**, preparata il 20 settembre 2026 per 0xfunboy a partire dai requisiti in `docs/source/SMM_AI_architettura.md`.

Applicazione eseguibile, non solo schema architetturale: backend TypeScript, dashboard web responsive, SQLite, coda persistente, agenti con output JSON, knowledge base, retrieval, media renderer, approvazioni, publishing e analytics. Nessun account, credenziale, metrica o contenuto dimostrativo è preinstallato nel prodotto.

> **Stato del rilascio:** test locali e contratti HTTP simulati eseguiti. Non sono state effettuate pubblicazioni su account social reali o chiamate a modelli a pagamento. Accessi, audit delle app, scope OAuth e quota dei provider devono essere verificati nel proprio ambiente. Vedere [VALIDATION](docs/VALIDATION.md) e [matrice funzionalità](docs/REQUIREMENTS.md). Questa release non è una certificazione di produzione o di conformità alle piattaforme.

## Avvio dallo ZIP

Servono Node.js **22.16+** con `node:sqlite` e FFmpeg/ffprobe. Il pacchetto include il JavaScript compilato in `dist/`: non è necessario scaricare dipendenze npm per avviarlo.

```bash
cd air3-social-studio
node scripts/setup.mjs
npm start
```

Aprire **http://localhost:3100**. Il setup stampa una password casuale e crea `.env` con permessi restrittivi; email iniziale `admin@localhost.test`. Non sovrascrive una configurazione esistente. Cambiare la password dalla dashboard e conservare `MASTER_KEY` fuori dal repository.

Su Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg fonts-dejavu-core
```

Su Windows usare Docker oppure installare FFmpeg e impostare `FFMPEG_PATH` / `FONT_PATH` verso programmi e font locali. Non sono inclusi font nel pacchetto.

### Docker

```bash
node scripts/setup.mjs
docker compose up -d --build
docker compose logs -f studio
```

Il compose usa i file già compilati dello ZIP, volume persistente e porta esposta soltanto su loopback. Per pubblicare media e ricevere webhook occorrono un dominio HTTPS raggiungibile e `BASE_URL` coerente: [Deployment](docs/DEPLOYMENT.md).

### Modificare e verificare il codice

```bash
npm install --ignore-scripts
npm run typecheck
npm test
npm run build
npm start
```

Le sole dipendenze npm sono gli strumenti di sviluppo TypeScript e le definizioni dei tipi. Il runtime usa Node e FFmpeg. Il file lock non è incluso: durante la preparazione la rete del container non consentiva l'accesso al registry; le versioni dirette in `package.json` sono fissate e il compilato consegnato è stato testato. Registrare il lock generato nel proprio repository dopo l'installazione verificata.

## Primo flusso completo

1. **Crea un brand**: identità, tono, obiettivi, colori, claim e regole obbligatorie. Il primo brand non è hardcoded.
2. **Carica e approva le fonti** in Conoscenza. Imposta ambito, ruoli, piattaforma e validità. Il test RAG mostra i frammenti realmente recuperati.
3. **Collega un canale**: account diretto con credenziali dell'app autorizzata, oppure integrazione Postiz. Le credenziali vengono cifrate e non tornano nei GET.
4. **Crea una bozza**, scegli canale, formato e obiettivo. Scrivi il contenuto manualmente o configura un modello per generare strategia, copy e visual.
5. **Revisiona, approva e programma**. Per i media è richiesta conferma della verifica umana; per TikTok anche consenso esplicito sulla versione. Le modifiche invalidano l'approvazione.
6. **Controlla Attività e Analytics**. La coda segue gli stati del provider. Esiti incerti vanno riconciliati, non ritentati alla cieca. Gli insight diventano conoscenza approvata solo dopo una conferma umana.

## Cosa è incluso

| Area | Implementazione |
|---|---|
| Workspace e brand | Più workspace, membri e ruoli viewer/editor/approver/admin; dati e token circoscritti al brand |
| Brand memory | Regole strutturate sempre nel contesto; documenti e insight separati e versionati |
| RAG | Chunk con overlap, embeddings opzionali, cosine + ricerca lessicale, filtri di approvazione/ruolo/validità/piattaforma |
| Agenti | Strategist, Copywriter, Creative Director, Reviewer, Analyst e Planner; prompt versionati, validazione JSON e audit input/output |
| Modelli | Gemini nativo oppure endpoint chat/embeddings compatibili; modello selezionabile per ruolo; nessuna dipendenza ElizaOS |
| Media | Upload verificati con ffprobe, immagini Gemini opzionali, template JPEG con brand/logo/testi, carousel e slideshow MP4 |
| Workflow | Bozze, revisioni, rifiuto, approvazione legata al payload, calendario, programmazione, annullamento, riconciliazione |
| Social | 20 tipi di canale nel catalogo; client nativi o publishing tramite Postiz secondo la matrice dedicata |
| Inbox | Eventi verificati Telegram, WhatsApp, Messenger e Instagram Direct; rubrica con consenso e bozze di risposta |
| Analytics | Snapshot nativi dove disponibili o Postiz, raccolta a 24h/72h, importazione con fonte, analisi e insight da approvare |
| Integrazioni | REST API, server MCP stateless, bridge stdio e workflow n8n importabili |
| Operazioni | Docker, backup SQLite consistente, health check, audit, test e script per creare un nuovo repository |

**Postiz è un servizio opzionale esterno, non incluso come sorgente o istanza già configurata.** È necessario per YouTube e per i formati multimediali dei canali i cui adapter diretti supportano solo testo. I client non aggirano autorizzazioni o politiche dei social.

## Scelte tecniche

TypeScript mantiene riutilizzabili i moduli dei tuoi agenti e permette lo stesso linguaggio per API, orchestrazione e integrazioni. FFmpeg gestisce il rendering nativo dei media; non serve riscrivere in Rust/C un servizio dominato da richieste HTTP. La dashboard usa ES modules e CSS, senza toolchain frontend separata.

Il database è SQLite WAL, **non un vector database ANN**: gli embedding sono memorizzati insieme ai chunk e ricercati per scansione nell'ambito del brand. La configurazione è adatta a un'installazione self-hosted su singolo host; non è stata misurata la scalabilità a migliaia di brand o milioni di chunk.

Il riuso di GoonersBot è selettivo e tracciato: primitive di similarità e pattern di retrieval, non il bot intero, la personalità o il suo sistema operativo. Le parti applicative sono nuove. [Provenienza](PROVENANCE.md).

## Documentazione

[Configurazione modelli](docs/MODELS.md) · [Client e permessi](docs/SOCIAL_CLIENTS.md) · [API](docs/API.md) · [MCP e n8n](docs/INTEGRATIONS.md) · [Architettura](docs/ARCHITECTURE.md) · [Sicurezza](SECURITY.md) · [Deployment](docs/DEPLOYMENT.md) · [Requisiti e limiti](docs/REQUIREMENTS.md) · [Collaudo](docs/VALIDATION.md) · [Fonti ufficiali](docs/SOURCES.md).

## Nuovo repository

Lo ZIP non modifica i repository originali e non pubblica un repository remoto. Include `REPOSITORY.bundle`, una fotografia Git locale della consegna; istruzioni in `docs/DEPLOYMENT.md`. In alternativa:

```bash
git init -b main
git add .
git commit -m "Initial AIR3 Social Studio implementation"
gh repo create 0xfunboy/air3-social-studio --private --source=. --remote=origin --push
```

Questo ultimo comando pubblica effettivamente il repository e va eseguito solo dopo aver verificato i file e scelto la visibilità. Prima della redistribuzione commerciale verificare le autorizzazioni in [LICENSING](LICENSING.md).
