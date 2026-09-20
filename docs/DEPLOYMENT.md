# Installazione e operazioni

## Esecuzione locale dallo ZIP

Node 22.16+ e FFmpeg/ffprobe; il JavaScript compilato è incluso. Eseguire dalla directory principale:

```bash
node scripts/setup.mjs
npm start
```

Il primo avvio crea database e utente dalla configurazione bootstrap. Cambiare subito la password. Non cancellare `MASTER_KEY` quando si rimuovono le credenziali bootstrap dall'env: senza quella chiave non sono recuperabili i token social cifrati. Conservare una copia protetta della chiave fuori dall'host e verificare il ripristino.

`npm run doctor` riporta modello configurato, embeddings, FFmpeg/font, Graph version e account. Una configurazione senza modello permette editing manuale e review deterministica; la generazione AI deve rifiutare la richiesta, non simulare una risposta. `WORKER_ENABLED=false` disattiva il consumo della coda, utile per manutenzione/collaudo.

## Dominio pubblico

Per i social che scaricano media via URL e per ricevere webhook occorre un dominio HTTPS stabile. Impostare `BASE_URL=https://social.example.org` con il proprio dominio effettivo, senza pathname. `HOST=127.0.0.1` dietro proxy; in Docker il servizio ascolta su 0.0.0.0 ma il compose espone la porta sull'host soltanto su 127.0.0.1.

`ops/Caddyfile.example` configura TLS e reverse proxy, assumendo DNS e raggiungibilità del dominio. Adeguare `SMM_HOSTNAME`; non usarlo con il nome d'esempio. Se si usa un altro proxy, conservare Host/Origin e supporto Range per video; non esporre `.env`, database, directory del repository o backup come file statici.

I link media sono firmati, scadono e consentono ai provider di leggere soltanto l'asset selezionato. Un link locale `localhost` non è accessibile ai server Meta/TikTok/Postiz. Evitare URL di origine modificabili dopo l'approvazione: importare il file nel media store per fissarne l'hash.

## Docker

```bash
node scripts/setup.mjs
# Modificare BASE_URL, modello e credenziali nel proprio ambiente.
docker compose up -d --build
docker compose logs --tail=100 studio
```

Il Dockerfile installa FFmpeg e un font dal repository Debian nel build locale dell'operatore, usa dist già compilato e utente non root. Nessun font è distribuito nello ZIP. Il compose applica no-new-privileges, drop capabilities e root filesystem read-only con volume dati. Il build Docker **non è stato eseguito** qui perché richiede registry/package repository raggiungibili.

## systemd

Alternativa a Docker: creare utente di servizio `air3-studio`, installare in `/opt/air3-social-studio`, rendere `data/` scrivibile solo a quell'utente e adattare `ops/air3-social-studio.service`. Il file presume `/usr/bin/node`; correggerlo se Node è installato altrove. La `MASTER_KEY` non deve finire nel testo dell'unità pubblicata. Verificare `systemctl status` e healthz prima di accodare post.

## Backup e ripristino

```bash
npm run backup
# Oppure destinazione esplicita:
node --env-file-if-exists=.env dist/cli.js backup /PERCORSO/BACKUP
```

L'utility usa SQLite backup API, non copia a caldo il solo file principale ignorando WAL. Copia anche gli asset. Il backup contiene contenuti e credenziali cifrate: trattarlo come riservato. `.env` e MASTER_KEY non sono inclusi: proteggerli separatamente. Per una fotografia coerente anche con upload/render in corso, fermare l'app prima del backup finale; il database è consistente, ma file media e DB non sono un'unica transazione di filesystem.

Per ripristinare: fermare il servizio; sostituire `DATA_DIR/studio.sqlite` e `DATA_DIR/assets/` con il backup; ripristinare la stessa MASTER_KEY; eliminare eventuali vecchi file `-wal/-shm` soltanto a servizio fermo; correggere proprietario/permessi; avviare con worker disattivato; verificare dati e account; riattivare il worker dopo aver risolto job ambigui.

SQLite WAL è pensato per un singolo host con disco locale. Non collocare il DB su NFS e non avviare cluster multi-host sullo stesso file. Il worker usa lease e riconciliazione, ma questa release non è stata stressata per throughput multi-worker o grandi tenant.

## Aggiornamento

Fare backup, fermare il servizio, sostituire codice/dist conservando data e segreti, avviare i test nel proprio checkout, riavviare. Non sono ancora presenti migrazioni distruttive: la creazione schema è idempotente. Per modifiche future preparare migrazioni versionate e rollback. Aggiornare periodicamente API versionate e credenziali; la versione LinkedIn iniziale è 202609, mentre Graph Meta va dichiarata dall'operatore.

## Repository locale e remoto

Lo ZIP include un bundle Git locale, **nessun repository remoto è stato creato**. Il bundle non comprende sé stesso ed evita la directory `.git` nello ZIP:

```bash
git clone /PERCORSO/REPOSITORY.bundle air3-social-studio
cd air3-social-studio
git log --oneline -1
```

I commit includono sorgenti, test, docs e dist. Il bundle non include segreti, dati runtime o node_modules. In alternativa inizializzare Git dalla directory estratta. Per pubblicare, dopo login GitHub CLI e revisione dei file:

```bash
bash scripts/publish-repository.sh 0xfunboy/air3-social-studio --private
```

Scegliere `--public` solo dopo aver verificato le condizioni di licenza e l'assenza di dati personali. L'interfaccia GitHub disponibile in questa sessione non esponeva la creazione di nuovi repository; non è stato tentato un push su repository esistenti del proprietario.

## Attivazione controllata

Prima dell'uso reale completare configurazione modello/embedding, dominio HTTPS, scope social, consenso e politica editoriale. Eseguire una pubblicazione di prova per ciascun account, controllare i webhook e la raccolta metriche. Le validazioni locali sono documentate, le connessioni live no. Nessun segreto o token dei tuoi agenti esistenti è stato trasferito automaticamente.
