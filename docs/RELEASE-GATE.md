# Gate di messa online

Questa checklist distingue **software implementato** da **servizio autorizzato e collaudato**. I checkbox non risultano completati automaticamente perché lo ZIP compila.

## Eseguito nella consegna

- [x] Compilazione TypeScript e sintassi moduli browser.
- [x] Installazione npm da tarball inclusi, con lockfile e cache inizialmente vuota.
- [x] Test automatici locali di servizi, sicurezza, provider HTTP simulati e rendering reale.
- [x] Browser component test di pagine, temi, moduli e layout mobile con fixture esplicite.
- [x] Installazione pulita, HTTP reale, login, persistenza, restart e backup SQLite.
- [x] Nessuna credenziale reale, dato personale di produzione o font inserito nel pacchetto.

## Responsabilità del gestore prima dell’attivazione

- [ ] Host aggiornato, runtime supportato, firewall e volumi persistenti; backup e restore provati.
- [ ] Chiave custodita fuori dal server di pubblicazione e da Git; password bootstrap cambiata.
- [ ] DNS/HTTPS reali, certificato valido, BASE_URL e callback coerenti.
- [ ] Build/start Docker effettivamente provati sul proprio host, oppure servizio systemd verificato.
- [ ] Ruoli minimi, segregazione degli account cliente e policy per gli admin.
- [ ] Modello ed embeddings testati con contenuti non riservati, budget e limiti definiti.
- [ ] App Google e social registrate, scope/prodotti abilitati, review e verifiche richieste completate.
- [ ] Consenso e collegamento live per ciascuna famiglia che intendi offrire.
- [ ] Token refresh/revoca/errori verificati senza duplicare pubblicazioni.
- [ ] Un invio innocuo approvato per ciascun formato abilitato, ricevuta confermata sul social.
- [ ] Webhook live firmati, destinazioni corrette e messaggistica conforme al consenso raccolto.
- [ ] Mittente email/deliverability e recupero account provati; link corretti sul dominio definitivo.
- [ ] Informativa privacy, termini, contatti, conservazione e procedure di cancellazione propri del gestore.
- [ ] Log e monitoraggio configurati senza token/code/password; gestito `UNCERTAIN` senza retry cieco.

## Non verificato nella consegna

App review, account reali, quote/prezzi API, effettiva pubblicazione live, recapito email reale, chiamate a modelli esterni, registrazione DNS/TLS e build Docker. I test con provider simulati non dimostrano questi aspetti.

Le release sono installabili e ispezionabili. La definizione di “pronto in produzione” richiede il superamento di questo gate nel contesto effettivo: nessuna dashboard può creare segreti developer o autorizzazioni che non siano state concesse.
