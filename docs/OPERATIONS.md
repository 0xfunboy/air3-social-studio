# Operazioni, migrazione e ripristino

## Segreti e proprietà

`MASTER_KEY` è la chiave della cifratura dei token, app OAuth e configurazione. Una sua modifica non ruota automaticamente i dati: senza l’originale non puoi decifrarli. Conserva backup della chiave separato dal backup dati. `.env`, `DATA_DIR/runtime.generated.env`, database, backup e link di invito/reset non devono entrare in Git o screenshot pubblici.

Ruoli: viewer/editor/approver/admin nel workspace; **site admin** separato per host, modelli, Google, email e app condivise. Un customer admin non può modificare host/chiavi o provisionare arbitrariamente account personali. Usa inviti per i clienti.

## Upgrade da 0.1.0

1. Ferma worker e applicazione. Conserva copia completa di directory dati, `.env` e chiave originale; non sovrascrivere un backup noto funzionante.
2. Estrai 0.2.0 in una directory nuova. Non eseguire setup. Copia la `.env` precedente e indica il percorso dello stesso DATA_DIR, dopo averne fatto un backup offline.
3. `npm ci --offline --ignore-scripts && npm run check`.
4. Avvia con il vecchio MASTER_KEY. Lo schema aggiunge idempotentemente le tabelle di identità/configurazione/OAuth; le entità editoriali non cambiano formato.
5. In una installazione già esistente, nessun admin del workspace viene promosso silenziosamente a site admin. Dalla shell dell’operatore:

```bash
node --env-file=.env dist/cli.js site-admin LA-TUA-EMAIL --confirm
```

6. Verifica login, brand, bozze, job e file media prima di riattivare il worker e aprire la rete. Configura le nuove app OAuth o mantieni credenziali manuali già valide. Le credenziali manuali non ricevono refresh automatico senza un grant appropriato.

Il database con versione superiore a quella supportata viene rifiutato, non degradato. Per rollback applicativo usa un backup **precedente alla migrazione** e la corrispondente release; non aprire ciecamente uno schema nuovo con binari vecchi.

## Backup

```bash
node --env-file=.env dist/cli.js backup /PERCORSO-BACKUP
```

La API SQLite produce una snapshot consistente del database. Gli asset sono copiati separatamente: **metti in pausa upload e modifiche media** per la coerenza dell’intero backup. Il comando include `studio.sqlite`, `assets/` e `RESTORE.txt`, non `.env` o MASTER_KEY. Il file SQLite conserva anche la configurazione cifrata e le app OAuth.

Docker: esegui la CLI nel container verso un volume backup montato esplicitamente, oppure ferma il servizio e copia il volume dati. Non cancellare i volumi con `down -v` durante un normale aggiornamento.

## Restore

Arresta il servizio, sostituisci DATA_DIR con database/assets della snapshot e ripristina la chiave originale. Rimuovi eventuali file WAL/SHM appartenenti al database che stai sostituendo, a servizio fermo; non mischiare WAL vecchi a una snapshot differente. Ripristina ownership/permessi. Avvia una sola istanza con worker inizialmente spento, verifica integrity_check, login, media e job, poi riabilitalo.

Il backup dei token permette di tornare a dati precedenti, ma un refresh token ruotato o revocato presso il provider non torna valido con il restore locale: riconnetti i canali interessati.

## Recupero amministratore senza email

Richiede accesso locale alla directory e ai segreti:

```bash
node --env-file=.env dist/cli.js password-reset LA-TUA-EMAIL --confirm
```

Stampa un link monouso di 30 minuti. Il link non è un log da condividere. Il reset cambia la password e invalida le sessioni; non crea utenti nuovi. Usa questa procedura per il bootstrap Google-only che necessita una password locale per la ri-autenticazione di operazioni sensibili.

## Lavori, retry e invii incerti

Un post approvato deve essere programmato esplicitamente. Il worker acquisisce job persistenti, interroga gli stati asincroni e distingue `PROCESSING`, `PUBLISHED`, `FAILED`, `UNCERTAIN`. Un timeout dopo un invio può aver creato il post: non premere riprova senza controllare l’account e la ricevuta esterna. Usa la riconciliazione dalla UI.

Il completamento del wizard, un test OAuth o un test connessione non pubblicano messaggi. Il test modello e il test email, invece, chiamano i servizi configurati su richiesta dell’amministratore.

## Proxy, log, gestione processo

Il processo mantiene contatori rate-limit in memoria: un riavvio li azzera. Usa anche limiti/monitoraggio al proxy per esposizioni pubbliche con molto traffico. TRUST_PROXY_IPS accetta IP esatti del peer immediato, non wildcard; verifica la rete dopo modifiche Docker.

Non attivare log che registrano authorization headers, token, body di login oppure query dei callback OAuth. Gli audit applicativi includono metadati delle azioni; le esecuzioni AI possono includere input/output del brand, quindi anche il database di audit è riservato.

Per systemd vedi `ops/air3-social-studio.service`: crea l’utente dedicato, usa il percorso Node effettivamente installato e dai accesso scrivibile soltanto a DATA_DIR. Non usare contemporaneamente servizio systemd e Docker sullo stesso database.

La chiusura attende il worker/maintenance prima di chiudere SQLite. Il compose concede due minuti, systemd tre. Nei deployment con lavori lunghi, aumenta consapevolmente il grace period e verifica i job dopo un arresto forzato.

## Limiti operativi deliberati

Singolo host/processo, nessuna replica HA, nessun cluster ANN, nessun load test su migliaia di tenant. Upload massimo 128 MiB, limite API JSON molto inferiore. Budget/disponibilità modelli e provider dipendono dagli account configurati. API versionate vanno aggiornate con i rispettivi test prima delle scadenze: Meta richiede una versione esplicita, LinkedIn parte da 202609.

Non sono implementati fatturazione SaaS, MFA, SAML, gestione automatica delle richieste legali di cancellazione dati o un sistema di disaster recovery gestito. Definisci policy di conservazione, backup, revoca account e incident response prima di offrire il servizio a terzi. Il codice non è una certificazione legale o di sicurezza.
