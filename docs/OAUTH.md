# Accesso Google e connessioni OAuth

## Due funzioni separate

**Accedi con Google** autentica la persona nello Studio con OpenID Connect. **Collega YouTube/Meta/X…** autorizza un account di pubblicazione per un brand. I grant non sono intercambiabili e un login Google non concede automaticamente accesso a YouTube.

Le app developer devono essere create e abilitate dall’operatore nei portali ufficiali. Il wizard genera le callback, salva i segreti, avvia il consenso, scambia il codice e legge le destinazioni; non inventa Client ID, non approva le app al posto dei provider e non ottiene consensi in background.

## App condivise o proprie

**App del gestore:** Amministrazione → App social condivise. Il client secret è cifrato con contesto dell’installazione; tutti i workspace possono autorizzare i propri account. Nessuna API cliente restituisce il secret o lo copia nel suo workspace.

**App del workspace:** Canali → Configura OAuth. Le impostazioni locali prevalgono sulla app condivisa. Se stai creando un override devi inserire il tuo secret. Il pulsante “Rimuovi override e usa app del gestore” elimina la configurazione locale; i canali autorizzati con un’altra app vanno riconnessi. Disabilitare una app blocca l’utilizzo dei suoi token, anche se non ancora scaduti.

Il callback usa stato casuale monouso con scadenza, cookie di binding, identità di sessione, workspace e brand. Il codice viene scambiato solo dopo tali verifiche. PKCE è impiegato nei flussi configurati che lo supportano (Google, X, YouTube); gli altri usano codice + secret secondo il contratto del provider. Non viene dichiarato PKCE universale.

Le destinazioni trovate vengono tenute in un grant cifrato per 15 minuti. L’utente seleziona esplicitamente i target, che devono appartenere al grant. Cambiare l’app durante il flusso ne invalida la selezione. La discovery è limitata e non promette un elenco illimitato di risorse in organizzazioni molto grandi.

## Google login

Nella console Google crea un OAuth client **Web application**, configura schermata di consenso e callback:

```text
https://IL-TUO-DOMINIO/oauth/google/callback
```

Salva ID/secret in **Amministrazione → Accesso Google**. Il pulsante appare abilitato soltanto se la configurazione è presente. Sono richiesti `openid email profile`. La verifica server-side controlla chiavi Google, firma RS256, issuer, audience, azp quando presente, nonce, tempi, subject e email verificata.

Un indirizzo email coincidente **non collega silenziosamente** una nuova identità Google a un account esistente. Accedi prima con la password, poi usa “Collega Google” nelle impostazioni personali con lo stesso indirizzo verificato. Dopo il collegamento il login Google può aprire una nuova sessione. Con registrazioni chiuse, un’identità sconosciuta non crea un account o un ruolo amministratore.

I link email di verifica durano 24 ore, recupero 30 minuti, inviti 72 ore; sono monouso e conservati come hash. Il reset invalida le sessioni. L’email transazionale usa Resend con mittente verificato; per il recupero d’emergenza locale vedere OPERATIONS.md.

## Callback per i canali

Tutte sono mostrate e copiabili dalla UI; sostituisci l’origin con quella effettiva.

| Famiglia | Callback | Configurazione / scope impiegati |
|---|---|---|
| Meta | `/oauth/meta/callback` | App Business, Graph version esplicita; scope scelti per Pages, IG, Messenger o WhatsApp; configuration ID facoltativo |
| Threads | `/oauth/threads/callback` | `threads_basic`, `threads_content_publish`, `threads_manage_insights` |
| TikTok | `/oauth/tiktok/callback` | Client key/secret, Login Kit Web, `user.info.basic`, `video.publish`; permessi/audit separati |
| X | `/oauth/x/callback` | Confidential Web app, PKCE, `tweet.read tweet.write users.read offline.access` |
| LinkedIn | `/oauth/linkedin/callback` | Membro: `openid profile w_member_social`; Page: `openid profile w_organization_social rw_organization_admin` |
| YouTube | `/oauth/youtube/callback` | App Google social separata, `youtube.upload`, `youtube.readonly`, consenso offline |
| Pinterest | `/oauth/pinterest/callback` | `boards:read pins:read pins:write user_accounts:read` |
| Reddit | `/oauth/reddit/callback` | Web app, `identity read submit mysubreddits`, grant permanent; User-Agent applicativo |
| Twitch | `/oauth/twitch/callback` | `user:write:chat`; canale/identità dell’utente restituito dalla API |
| Slack | `/oauth/slack/callback` | `chat:write channels:read groups:read`; discovery canali di cui il bot è membro |
| Discord | `/oauth/discord/callback` | `identify guilds bot`, installazione bot; bot token lato server, guild con ruolo admin/manage |
| Mastodon | `/oauth/mastodon/callback` | App registrata sulla propria istanza HTTPS; `read:accounts write:statuses`; origin autorizzata dal gestore |

Scope completi per Meta in `SocialOAuth.scopes()`:

- Facebook Pages: `pages_show_list pages_read_engagement pages_manage_posts`.
- Instagram publishing: `pages_show_list pages_read_engagement instagram_basic instagram_content_publish instagram_manage_insights`.
- Messenger: `pages_show_list pages_read_engagement pages_messaging pages_manage_metadata`.
- Instagram Direct: `pages_show_list pages_read_engagement pages_manage_metadata instagram_basic instagram_manage_messages`.
- WhatsApp: `business_management whatsapp_business_management whatsapp_business_messaging`.

Se il provider restituisce gli scope concessi vengono controllati; se non li restituisce, la UI lo dichiara. Il controllo di identità/target non prova il diritto a ogni formato o metrica. I permessi avanzati dipendono dall’abilitazione del prodotto nella console provider.

La discovery Meta usa Pages e Instagram professionali collegati via Facebook Login. WhatsApp individua WABA **owned** dei Business autorizzati e i relativi phone_number_id; non automatizza Embedded Signup, verifica del numero o creazione del Business. Risorse partner/shared possono richiedere configurazione manuale. Per Instagram Login diretto resta l’adapter manuale con `options.login` appropriato.

YouTube legge i canali dell’utente autenticato, LinkedIn Page legge le organizzazioni restituite dagli ACL amministrativi. Reddit mostra i subreddit restituiti dall’API, non garantisce che le loro regole ammettano il post. Discord filtra guild amministrabili e canali testo/annunci; il provider verifica comunque i permessi di invio effettivi. Mastodon usa endpoint dell’istanza configurata e non effettua registrazioni dinamiche automatiche dell’app.

## Token, rinnovi, disconnessione

Token access/refresh sono cifrati in SQLite con AAD di workspace, brand e account. Non sono restituiti alla UI né salvati nel browser. Il worker controlla periodicamente i token vicini alla scadenza e li rinnova prima dell’uso quando esiste un refresh token valido. Destinazioni del medesimo grant condividono un lock di rinnovo: un token ruotato viene aggiornato su tutte senza alterare le revisioni editoriali.

Threads usa il rinnovo long-lived finché valido. Meta scambia token iniziali in long-lived ma non dispone qui di un rinnovo universale senza nuovo consenso. LinkedIn può non restituire refresh token per il prodotto autorizzato; altri provider possono scadere o revocare il refresh. In questi casi lo stato richiede riconnessione. Un errore di refresh blocca l’invio anziché spacciarlo per completato.

Le credenziali manuali senza provider/refresh non vengono “convertite” in OAuth: la rotazione compete al gestore. La disconnessione elimina le credenziali locali e disabilita il canale. **Non dichiara una revoca globale presso il provider**: revoca il grant anche nella sua console se necessario.

## Webhook

Meta con app condivisa: `/webhooks/meta-global`, URL e verify token accessibili al site admin. Con app propria: `/webhooks/meta/WORKSPACE_ID`. Le firme sono controllate prima del routing, che usa origine dell’app, workspace e ID esatto di target. Il cliente di una app condivisa non riceve il suo verify token.

L’operatore deve registrare callback/token, campi e sottoscrizioni nelle console Meta: la UI non finge di avere installato automaticamente tutte le sottoscrizioni provider. Un token manuale mantiene `/webhooks/ACCOUNT_ID` e appSecret/verifyToken configurabili.

Telegram usa `botToken`, non OAuth. Il collegamento guidato verifica getMe/getChat/getChatMember senza inviare post. L’azione “Attiva webhook” chiama davvero setWebhook dopo conferma. Un bot ha una sola callback: usa un bot distinto per ciascun canale con inbox, anche tra installazioni diverse. Eventi di un’altra chat vengono ignorati.

Bluesky, Farcaster e Postiz sono percorsi manuali/delegati descritti in SOCIAL_CLIENTS.md, non pulsanti OAuth fittizi.

## Prove richieste prima dell’uso operativo

Per ogni famiglia: consenso su account di test, callback con state valido, scelta corretta della destinazione, token salvato, verifica target, un post innocuo approvato, receipt esterna, polling fino a stato definitivo, revoca/errori, refresh quando disponibile e webhook firmato quando previsto. Tutto questo richiede app/utenti reali. Le prove incluse nella release coprono il codice locale e i contratti HTTP simulati, non l’approvazione dell’app.

Fonti primarie e date in SOURCES.md; i portali provider possono cambiare procedura e requisiti.
