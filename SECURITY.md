# Sicurezza e modello di fiducia

## Implementato

Password scrypt con sale, sessioni HttpOnly SameSite=Lax, cookie Secure su HTTPS, CSRF per operazioni con cookie, controllo Origin, rate limit locale, query SQL parametrizzate, revisione ottimistica, token API memorizzati come hash e limitati a un brand. Credenziali dei provider cifrate AES-256-GCM con AAD `workspace:brand:account`. Le credenziali non vengono restituite nelle API di lettura o inviate agli agenti.

Ruoli: viewer legge; editor prepara/revisiona/programma contenuti già approvati; approver può approvare fonti/contenuti e insight da una sessione umana; admin configura identità, utenti e credenziali. I token macchina sono viewer/editor e non hanno endpoint di approvazione. Telegram può approvare solo dopo verifica del segreto webhook, ID chat, ID Telegram mappato a un utente dell'app e membership corrente. Una descrizione in un prompt non concede autorizzazioni.

Il publishing verifica nuovamente approvazione, fonti, brand, account, campagna, disponibilità e finestre di messaggistica. Un POST ambiguo diventa `UNCERTAIN`, non viene eseguito di nuovo automaticamente. Per la correzione serve una verifica umana esterna documentata.

## Confini operativi

Il servizio supporta workspace separati su singolo host e registrazione pubblica opzionale con verifica email. Non viene dichiarato certificato o sottoposto a un audit indipendente di esposizione pubblica. Non ci sono MFA, SAML, WAF o isolamento OS per ciascun tenant; Google OIDC e reset password email sono implementati. FFmpeg viene eseguito senza shell, con limiti di formato/dimensione/tempo, ma non in un sandbox separato per ogni media: mantenere FFmpeg aggiornato, usare il container non privilegiato e non aprire upload anonimi.

SQLite contiene in chiaro contenuti, contatti, documenti, audit e output degli agenti; la cifratura riguarda le credenziali, non l'intero database. Usare cifratura disco, backup cifrati, accessi OS stretti e una policy di conservazione. Non caricare dati personali che il provider LLM non è autorizzato a trattare. Il codice non costituisce una certificazione GDPR.

`MASTER_KEY` deve rimanere disponibile per decifrare gli account dopo un restore. Perdere la chiave richiede riconnettere i provider. Non cambiare la chiave a caldo senza migrare i ciphertext: non è presente un key-rotation manager automatico.

Le fonti recuperate sono dati non fidati: i prompt richiedono di non seguire istruzioni contenute nei documenti. I controlli di ruolo e pubblicazione sono indipendenti dagli output LLM; ciò riduce i rischi ma non dimostra l'assenza di ogni prompt injection o allucinazione.

## URL e uscite di rete

Le API esterne hanno una allowlist di origin; gli endpoint custom devono essere approvati dall'operatore in `OUTBOUND_ORIGINS`. Il client non segue redirect. Questa allowlist non è un proxy firewall completo: non autorizzare istanze arbitrarie richieste da utenti non fidati. I media esterni vengono passati ai provider come URL; per asset editoriali verificabili caricarli prima nello storage locale.

I link pubblici dei media sono firmati e temporanei. Chi possiede il link può leggere quel media fino alla scadenza; non sono destinati a documenti privati. Le credenziali Telegram sono inevitabilmente nella URL prevista dalla Bot API: i log applicativi ne depurano la parte sensibile, ma anche proxy e osservabilità esterni devono redigerla.

## Webhook

Telegram: secret token. Meta: HMAC SHA-256 del corpo originale con app secret, controllo target e dedup ID. Non è possibile aprire una finestra 24h scrivendo `lastInboundAt` in una chiamata della rubrica: soltanto un evento verificato può aggiornarla. Registrare consenso per i template WhatsApp separatamente dalla finestra inbound.

Non interpretare un messaggio in inbox come un comando amministrativo. Le risposte sono bozze soggette allo stesso workflow. Evitare broadcast non richiesti e trattare immediatamente revoche di consenso.

## Prima dell'esposizione pubblica

HTTPS con BASE_URL esatta, reverse proxy e firewall; rimuovere la password bootstrap da `.env` dopo il primo avvio; cambiare password; backup e restore verificati; account test separati; chiavi/scopes minimi; disattivare autoPublish finché la policy non è stata validata sul proprio dominio. Applicare retention a contatti/log e una procedura di cancellazione dei dati del workspace.

Segnalare problemi al proprietario del repository senza includere token, screenshot di credenziali o dump del database in issue pubbliche.

## Identità e configurazione 0.2.0

Site admin distinto da ruolo amministratore tenant. Inviti/password reset/email verification hanno token casuali monouso hashati, scadenze e invalidazione sessione. Google usa verifica crittografica RS256 e controlli issuer/audience/nonce/email; un’email coincidente non crea un collegamento implicito. Le operazioni sensibili richiedono recent-auth; un utente Google-only deve impostare una password attraverso il recovery verificato prima di confermarle.

I segreti delle app globali sono cifrati con AAD installazione; un override workspace non li eredita come proprio materiale. I token account restano tenant/brand/account-scoped. La scelta di una destinazione richiede un grant non scaduto, intestato all’utente e al workspace, e configurazione dell’app non modificata. Meta shared webhook e Telegram verificano firma/binding e target esatto prima di creare inbox.

Il proxy può fornire X-Real-IP solo se il socket peer è nella allowlist esatta TRUST_PROXY_IPS. Mantieni protetta tale configurazione e non esporre il backend dietro proxy non verificati. Le limitazioni rate-limit in memoria sono documentate in OPERATIONS.md.

L’export env contiene segreti e richiede conferma + audit. Lo snapshot del database è riservato: contiene token cifrati e contenuti di utenti/brand. Non contiene la chiave necessaria a decifrarli. Nessun audit indipendente, penetration test o certificazione WCAG/legale è stato eseguito. Prima di un servizio pubblico effettua review del verificatore OAuth/OIDC, hardening dell’host e prove live isolate.
