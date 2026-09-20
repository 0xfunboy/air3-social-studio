# Client social: capacità, configurazione e limiti

Release 0.1.0, 20 settembre 2026. Ogni riga identifica un adapter implementato, **non una verifica live dell'account**. Le restrizioni lato provider, gli scope concessi e gli audit dell'app prevalgono sulla configurazione locale. Le API di publishing non sono equivalenti ai prodotti consumer: non ogni funzione visibile nell'app mobile ha un endpoint pubblico.

## Catalogo e trasporti

| Identificatore | Diretto in questa release | Tramite Postiz |
|---|---|---|
| `facebook` | Pages: testo, foto, video asincrono | Pagine, media e formati esposti dall'integrazione |
| `instagram` | Professionale: JPEG, carousel immagini, Reel/video MP4, Story per account idonei | Integrazione Instagram con Facebook Login; opzioni specifiche del provider |
| `threads` | Testo, immagine, video, carousel immagini | Integrazione Threads |
| `whatsapp` | Business Cloud: testo, immagine, video, template | Non previsto |
| `messenger` | Risposte testo o allegato a conversazioni verificate | Non previsto |
| `instagram-dm` | Risposte testo o allegato a conversazioni professionali verificate | Non previsto |
| `tiktok` | Direct Post foto/carousel immagini e video, creator info e status | Direct Post attraverso Postiz |
| `linkedin` | Post testo di un membro | Media secondo integrazione LinkedIn |
| `linkedin-page` | Post testo di un'organizzazione | Media secondo integrazione LinkedIn Page |
| `x` | Post testo | Media e opzioni X |
| `telegram` | Bot: testo, foto, album, video; approvazioni e webhook | Publishing tramite integrazione Telegram |
| `youtube` | Nessun upload nativo in questa release | Video / Shorts: titolo, visibilità, made-for-kids |
| `pinterest` | Pin immagine su board autorizzata | Formati estesi dell'integrazione |
| `reddit` | Self-post testuale con titolo e subreddit | Formati estesi dell'integrazione |
| `bluesky` | Record testuale AT Protocol | Media dell'integrazione |
| `mastodon` | Status testuale, idempotency key | Media dell'integrazione |
| `discord` | Testo, immagine via embed, video come URL; menzioni di massa disabilitate | Integrazione Discord |
| `farcaster` | Cast testo/immagine via Neynar | Provider `warpcast` |
| `twitch` | Messaggi chat; nessun upload video o avvio stream | Provider Twitch |
| `slack` | Messaggi testuali in canali autorizzati | Provider Slack |

I formati estesi dipendono dalla versione e dalla configurazione di Postiz: questa release non implementa un modulo guidato per ogni opzione di ciascun provider. Le opzioni aggiuntive si impostano nel JSON `options.settings` dell'account o del contenuto; il provider può rifiutare combinazioni non ammesse. I test verificano i payload implementati, non tutti i possibili formati di Postiz. Per Instagram Postiz usare l'integrazione `instagram`, non `instagram-standalone`, che ha uno schema distinto non mappato qui.

## Account e segreti

Dalla dashboard **Canali → Nuovo account** scegliere piattaforma, trasporto e target. Le `credentials` sono cifrate AES-256-GCM; le `options` sono configurazione visibile. Non mettere token o password nelle options. Cambiare account, target, credenziali o opzioni modifica la revisione e invalida le approvazioni dei post collegati.

| Diretto | `targetId` | Campi `credentials` |
|---|---|---|
| Facebook | ID pagina | `accessToken` della pagina |
| Instagram | ID utente professionale | `accessToken`; `options.login = "instagram"` per Instagram Login, altrimenti Graph Facebook |
| Threads | ID utente Threads | `accessToken` |
| WhatsApp | **phone_number_id**, non numero telefonico | `accessToken`, `appSecret`, `webhookVerifyToken` |
| Messenger | ID pagina | `accessToken`, `appSecret`, `webhookVerifyToken` |
| Instagram Direct | ID professionale | `accessToken`, `appSecret`, `webhookVerifyToken`; `options.login` coerente |
| TikTok | ID/open_id del creator come riferimento locale | `accessToken` |
| LinkedIn membro | `urn:li:person:…` autorizzata | `accessToken` |
| LinkedIn pagina | `urn:li:organization:…` autorizzata | `accessToken` |
| X | ID autore come riferimento locale | token utente `accessToken`, non token app-only |
| Telegram | ID raw del gruppo/canale o `@channel` per l'invio | `botToken`, `webhookSecret` per webhook |
| Pinterest | ID board | `accessToken` |
| Reddit | Nome subreddit senza `/r/` | `accessToken`, `username` per User-Agent |
| Bluesky | DID autore come riferimento locale | `accessToken`, `did`, `pds` opzionale (default `https://bsky.social`) |
| Mastodon | ID/handle come riferimento locale | `accessToken`, `instance` (origin HTTPS) |
| Discord | ID canale | `botToken` |
| Farcaster | Channel ID; usare il canale autorizzato | `apiKey`, `signerUuid` approvato da Neynar |
| Twitch | broadcaster_id | `accessToken`, `clientId`, `senderId` |
| Slack | ID canale | `accessToken` del bot/app autorizzata |

Il target locale non conferisce permessi: per X, TikTok, Bluesky, Farcaster e Slack l'identità effettiva dipende dal token/signer. Verificare l'account autenticato prima del primo invio.

I client nativi accettano token già ottenuti dall'operatore. **Non includono wizard OAuth completo, rinnovo automatico o verifica universale degli scope.** Registrare l'app nel provider, ottenere i grant corretti, conservare scadenze e ruotare i token. Preferire Postiz per demandare i flussi di collegamento social supportati.

## Postiz

Impostare `transport: "postiz"`, `targetId` uguale all'ID dell'integrazione restituito da Postiz, e credentials con `apiKey` e `baseUrl`. Il default hosted è `https://api.postiz.com/public/v1`; per self-hosted indicare la propria base completa dell'API pubblica. Aggiungere la **origin** del server a `OUTBOUND_ORIGINS` nel backend, non tramite dati forniti dal modello.

La dashboard permette di leggere le integrazioni e ottenere la URL di collegamento dal proprio Postiz. L'utente completa OAuth in Postiz, poi seleziona/copia l'ID integrazione nel canale dello Studio. Non si tratta di un OAuth callback implementato nel nuovo backend.

Lo Studio gestisce gli orari; quando il job scatta invia a Postiz `type: "now"`. L'ID del job Postiz resta `PROCESSING` finché il suo stato non è `PUBLISHED`. Non si applicano due scheduler indipendenti al medesimo contenuto. I media vengono caricati con `upload-from-url`: il server Postiz deve poter raggiungere gli URL pubblici firmati.

## Meta

Configurare `META_GRAPH_VERSION` con una versione supportata dall'app; nessun default silenzioso. La dashboard espone Facebook Pages, Instagram, Threads, WhatsApp Business, Messenger e Instagram Direct. Non sono implementati Marketplace, Ads Manager, pubblicazione su profili Facebook personali, Quest, WhatsApp Status/Channels o automazioni WhatsApp Web.

Per Instagram servono account professionali e autorizzazioni per la modalità di login scelta. `options.accountType: "BUSINESS"` abilita il controllo locale per Stories, **non dimostra** che il provider abbia concesso il permesso. Verificare realmente l'idoneità. Il formato `video` Instagram viene pubblicato con il percorso Reels; non è un formato feed-video legacy separato.

Il publishing Instagram/Threads crea prima container; il worker interroga lo stato e programma una scrittura `media_publish` / `threads_publish` separata solo quando il container è pronto. Nei carousel nativi sono supportate immagini, non composizioni miste video/foto.

### WhatsApp, Messenger e Instagram Direct

Configurare callback pubblico `BASE_URL/webhooks/ACCOUNT_ID`, verify token e App Secret dell'app. La verifica GET risponde solo al verify token corretto; i POST Meta richiedono la firma SHA-256 e un target coerente con l'account.

Le finestre di risposta si aprono solo dopo eventi inbound firmati. La rubrica manuale non può impostare `lastInboundAt`. WhatsApp: nella finestra di 24h sono ammessi messaggi liberi; fuori finestra occorrono consenso registrato e template approvato. Il JSON del contenuto template è `options.template` con `name`, `language: {"code":"it"}` e gli eventuali `components` previsti dal template, più `options.recipient`. Non è un sistema per messaggi a liste acquisite senza consenso.

`options.recipient` per Messenger è un PSID autorizzato; per Instagram è l'identificatore della conversazione/account scoped; per WhatsApp il numero internazionale richiesto dalla Cloud API. Gli allegati Messenger/Instagram Direct non contengono caption nell'endpoint implementato: il backend rifiuta allegato più testo invece di perdere silenziosamente il copy. Le ricevute WhatsApp distinguono accepted, sent, delivered e read; `PUBLISHED` per messaging non equivale a un feed pubblico né a lettura da parte dell'utente.

## TikTok

Il form richiede privacy esplicita, dichiarazioni commerciali e consenso sulla versione corrente. Le modifiche azzerano il consenso. Prima dell'invio nativo viene interrogato `creator_info`; privacy, commenti, duet e stitch devono essere consentiti dal creator. Per app non dichiarate auditate il backend permette soltanto `SELF_ONLY`. Impostare `options.audited: true` sull'account solo dopo l'audit effettivo. Sono necessari permessi Content Posting, domini URL verificati e rispetto dei requisiti UX TikTok, da completare e validare nell'app approvata.

Un'app interna a uso limitato può non soddisfare i requisiti di audit TikTok: il codice non garantisce che venga approvata. Il sistema non aggira l'audit né pubblica a nome di utenti senza consenso. Non sono implementati live stream, comment moderation o ads. Controllare durata/dimensioni video ammesse per il creator prima di approvare: i limiti media locali sono generici, non una validazione completa del catalogo TikTok.

## Telegram e approvazioni

Il bot deve avere permesso di scrittura nei canali/gruppi target. Dopo aver configurato un `webhookSecret`, usare **Installa webhook** dalla dashboard. Questo cambia il webhook del bot: un bot già utilizzato da un altro servizio non può conservare contemporaneamente un secondo webhook.

Per approvare da Telegram aggiungere nelle options dell'account notificatore:

```json
{
  "approvalChatId": "-1001234567890",
  "approvers": { "123456789": "ID_UTENTE_INTERNO_STUDIO" }
}
```

Gli ID sopra sono solo esempi di forma. Recuperare l'ID interno reale da **Impostazioni → Membri** e verificare gli ID Telegram raw. Il backend controlla firma, chat, mappatura, ruolo attuale e revisione del contenuto. L'approvazione Telegram non programma automaticamente il post. Media e consenso TikTok richiedono la dashboard.

## Analytics e prove live

Native: X public_metrics, Instagram like/comment count, Mastodon reblog/reply/favourite. Gli altri adapter ricorrono a Postiz dove disponibile oppure accettano importazioni con fonte dichiarata. Nessuna API universale fornisce automaticamente conversioni/app-download; collegare un sistema di attribuzione e importare dati verificabili. Un provider che non espone metriche viene indicato come non supportato, non convertito in una serie di zeri.

Prima di attivare scheduling ricorrente fare, su ogni account: un post innocuo approvato; verifica dell'ID esterno; verifica dell'esito asincrono; verifica di un errore di autorizzazione; controllo delle metriche realmente disponibili. Tali prove live non sono state eseguite nella preparazione dello ZIP. Fonti e riferimenti in [SOURCES](SOURCES.md).
