# Installazione 0.2.0

## Prima di cominciare

Supporto locale verificato: Linux, Node 22.16.0, FFmpeg/ffprobe disponibili. `node:sqlite` su questa versione emette un avviso ExperimentalWarning: non è un errore di avvio. Il codice usa la API disponibile da Node 22.16; la matrice CI include 22 e 24, ma nella consegna è stata eseguita solo la versione locale indicata. Non è stato eseguito un collaudo Windows/macOS.

L’applicazione è a processo singolo e usa SQLite WAL. Mantieni database, asset e segreti su storage persistente. Non impostare più repliche concorrenti del worker come se fosse un database distribuito.

## Compilazione riproducibile senza registry npm

```bash
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
```

`npm test` ricompila TypeScript e verifica la sintassi del frontend. `vendor/` contiene tre tarball, `package-lock.json` fissa le dipendenze e le integrità. Il runtime non importa pacchetti npm: `dist/` e `web/` possono essere avviati senza `node_modules`.

Il test UI è opzionale e richiede Python + Playwright + Chromium già installati:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run test:ui
npm run test:install
```

I test browser usano fixture esplicite e non aprono OAuth presso i provider. Gli script API/installazione usano HTTP locale e database reali.

## Installazione locale

```bash
node scripts/setup.mjs --email admin@localhost.test --url http://localhost:3100
npm start
```

Il setup genera `.env` con modalità 0600 e `data/` con modalità 0700 sui sistemi che supportano tali permessi. Conserva la password visualizzata e `MASTER_KEY`. Su Windows applica anche ACL equivalenti al file. Il comando si rifiuta di sovrascrivere `.env` o generare una nuova chiave su `DATA_DIR/studio.sqlite` già esistente.

FFmpeg/ffprobe devono essere nel PATH; `FFMPEG_PATH` può specificare il binario. `FONT_PATH` deve puntare a un font locale leggibile. Il setup propone percorsi di sistema per Linux, macOS e Windows, da verificare con `npm run doctor`. Nessun file di font è incluso nello ZIP.

## Installazione Docker con Caddy

1. Configura un hostname reale verso l’IP del server e rendi raggiungibili 80/tcp, 443/tcp; 443/udp è opzionale per HTTP/3.
2. Crea una nuova configurazione:

```bash
node scripts/setup.mjs --production --email admin@tuodominio.it --url https://social.tuodominio.it
```

3. Compila e avvia:

```bash
docker compose -f compose.yaml -f compose.production.yaml up -d --build
docker compose -f compose.yaml -f compose.production.yaml ps
docker compose -f compose.yaml -f compose.production.yaml logs --tail=100 studio
```

Il Dockerfile compila con `npm ci --offline`, poi crea un runtime non-root. I download dell’immagine Node/Caddy e dei pacchetti apt richiedono rete. Le immagini base non sono fissate a un digest: prima del deploy operativo blocca il digest verificato nel tuo processo di aggiornamento. Nessun digest è stato inventato nella consegna.

Caddy usa `DOMAIN` generato da setup, persiste certificati nei suoi volumi e inoltra allo Studio. I file del codice sono in sola lettura; `/app/data` e `/tmp` sono scrivibili. La porta 3100 è esposta solo sul loopback dell’host. I log Docker ruotano, mentre l’access log Caddy con query OAuth non è attivato.

La rete dedicata usa `172.30.43.0/24`, proxy `.2` e Studio `.3`. Prima verifica che non collida con le reti esistenti. Se cambi rete, modifica anche **TRUST_PROXY_IPS** per accettare solo l’IP reale del proxy. Il backend ignora X-Real-IP/X-Forwarded-For da peer non fidati; il Caddy incluso sostituisce X-Real-IP con l’indirizzo del proprio client. Non impostare fiducia indiscriminata ai proxy Internet.

Il browser, i provider e Postiz devono poter raggiungere la stessa `BASE_URL` HTTPS. Se metti un CDN davanti a Caddy, configura consapevolmente la catena dei proxy; non copiare gli header del client senza verificarne la provenienza.

## Primo accesso in produzione

Entra con la password bootstrap, cambiala in Impostazioni e completa il wizard. In Amministrazione verifica nome prodotto, supporto, URL privacy e termini. Questi documenti spettano al gestore: la landing non mostra testi legali inventati.

In Modelli imposta provider, endpoint, nome modello e chiave. La selezione di un modello non attiva automaticamente embeddings o generazione immagini. I pulsanti di test effettuano vere chiamate al modello/email configurati e possono avere un costo.

Per Google login configura una app Web nella console Google, callback esatta `/oauth/google/callback` e schermata di consenso. Per i canali configura app condivise in **Amministrazione → App social condivise**, oppure un override nel workspace. Poi usa **Canali → Collega**, presta il consenso e scegli le destinazioni. Guida completa in OAUTH.md.

Lascia inizialmente `ALLOW_REGISTRATION=false`: accesso per utenti già esistenti e invitati. La registrazione pubblica con password richiede un mittente Resend configurato e verificato. Gli inviti possono essere condivisi manualmente dall’amministratore se l’email non è configurata. Non usare un account gestore come normale utente cliente.

## Env e riavvii

Il bootstrap conserva `MASTER_KEY`, binding/porta, directory, percorsi del renderer e configurazione proxy. Le impostazioni web sono cifrate in SQLite e prevalgono sui valori bootstrap per i campi gestiti.

Il wizard produce `DATA_DIR/runtime.generated.env`. Non occorre farne `source`: il servizio legge direttamente la configurazione persistita. Le chiavi account e OAuth sono nel database, non nel file env. L’anteprima oscurata è condivisibile soltanto dopo revisione; l’export completo contiene segreti infrastrutturali.

Le modifiche ai modelli e alle allowlist sono applicate al salvataggio. Una nuova `BASE_URL` viene attivata al riavvio; aggiorna anche `DOMAIN`/reverse proxy e le callback registrate in ciascuna console provider. Cookie, link email e media firmati devono usare la stessa origin.

## Controlli finali

```bash
npm run doctor -- --production
```

Nel container:

```bash
docker compose -f compose.yaml -f compose.production.yaml exec studio node dist/cli.js doctor --production
```

L’exit code 2 significa che mancano requisiti locali dichiarati. PASS non verifica DNS, certificato esterno, review provider, deliverability email né un invio reale. Completa RELEASE-GATE.md prima di affidare account operativi.
