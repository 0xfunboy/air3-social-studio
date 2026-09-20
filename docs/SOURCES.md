# Fonti tecniche e stato delle verifiche

Consultazione per la release del 20 settembre 2026. Le fonti definiscono i contratti usati dagli adapter; non costituiscono una prova di funzionamento live con grant specifici. URL API e versioni possono cambiare. Non sono state usate fonti secondarie come prova dei contratti.

## Codice del proprietario e specifica

- Specifica ricevuta: copia integrale `source/SMM_AI_architettura.md`.
- GoonersBot: https://github.com/0xfunboy/GoonersBot — file/blob esatti in `../PROVENANCE.md`.
- Confine prodotto/runtime: https://github.com/0xfunboy/client-airifica
- Adapter di riferimento: https://github.com/0xfunboy/client-reddit e https://github.com/0xfunboy/client-farcaster e https://github.com/0xfunboy/client-twitch
- Licenza e prior grants: https://github.com/0xfunboy/GoonersBot/blob/main/LICENSING.md

## Modelli e protocollo

- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Chat Completions: https://platform.openai.com/docs/api-reference/chat/create
- Embeddings: https://platform.openai.com/docs/api-reference/embeddings/create
- MCP transport: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports

Il termine “compatibile” indica il protocollo HTTP implementato: non garantisce tutte le caratteristiche di qualsiasi server che esponga una URL simile. L'endpoint embeddings usa lo stesso spazio modello per ingestione/query e valida dimensioni/indici; non aggiunge capacità di embedding a un modello chat che non le offre.

## Postiz

- Creazione: https://docs.postiz.com/public-api/posts/create
- Elenco/stati: https://docs.postiz.com/public-api/posts/list
- Integrazioni: https://docs.postiz.com/public-api/integrations/list
- Collegamento: https://docs.postiz.com/public-api/integrations/connect
- Analytics: https://docs.postiz.com/public-api/analytics/post
- Documentazione completa, upload e impostazioni provider: https://docs.postiz.com/public-api

Dal contratto letto: Authorization contiene la chiave API senza prefisso Bearer; l'invio ritorna ID Postiz, non prova di pubblicazione; l'elenco supporta startDate/endDate; analytics sono serie temporali e non devono essere sommate indiscriminatamente come contatori indipendenti.

## Social

- Instagram, collezione Meta ufficiale: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- WhatsApp Cloud, collezione Meta ufficiale: https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api
- Meta Graph: https://developers.facebook.com/docs/graph-api/
- Threads: https://developers.facebook.com/docs/threads/
- TikTok Direct Post: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok Content Posting: https://developers.tiktok.com/products/content-posting-api/
- LinkedIn Posts: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-09
- X create post: https://docs.x.com/x-api/posts/create-post
- Telegram Bot API: https://core.telegram.org/bots/api
- YouTube upload: https://developers.google.com/youtube/v3/docs/videos/insert (upload MP4 nativo e trasporto Postiz disponibili)
- Mastodon status: https://docs.joinmastodon.org/methods/statuses/
- Bluesky createRecord: https://docs.bsky.app/docs/api/com-atproto-repo-create-record
- Reddit: https://www.reddit.com/dev/api/
- Pinterest: https://developers.pinterest.com/docs/api/v5/
- Discord create message: https://discord.com/developers/docs/resources/message#create-message
- Slack chat.postMessage: https://docs.slack.dev/reference/methods/chat.postMessage/
- Farcaster/Neynar: https://docs.neynar.com/reference/publish-cast
- Twitch chat: https://dev.twitch.tv/docs/api/reference/#send-chat-message

Alcune pagine developers.facebook.com hanno risposto con limiti di accesso durante la ricerca; sono state consultate anche le collezioni ufficiali Meta su Postman. Alcune pagine API dinamiche non esponevano testo completo al browser di ricerca: i test di contratto non sono presentati come sostituti della verifica live o delle ultime condizioni dell'app. Controllare i requisiti specifici di ogni piattaforma prima del deploy.

## Operazioni

- n8n HTTP Request: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- Caddy request_body: https://caddyserver.com/docs/caddyfile/directives/request_body
- Node SQLite: https://nodejs.org/api/sqlite.html

La matrice di release separa capacità implementate e roadmap; il documento iniziale resta conservato senza reinterpretarlo come prova che tutte le integrazioni siano già abilitate presso i provider.

## OAuth, identità e deploy aggiunti in 0.2.0

Consultati il 20 settembre 2026. Questi link sono documentazione primaria, non provider connessi né attestazioni del prodotto.

- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Google server-side OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- YouTube resumable upload: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
- TikTok Web: https://developers.tiktok.com/doc/login-kit-web/
- TikTok token: https://developers.tiktok.com/doc/oauth-user-access-token-management
- X authorization code/PKCE: https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- LinkedIn authorization code: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- LinkedIn versione settembre 2026: https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-09
- Threads, collezione ufficiale Meta: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- Slack OAuth: https://docs.slack.dev/authentication/installing-with-oauth/
- Twitch OAuth: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
- Reddit OAuth, wiki ufficiale archiviata: https://github.com/reddit-archive/reddit/wiki/OAuth2
- Pinterest: https://developers.pinterest.com/docs/getting-started/connect-app/
- Discord OAuth: https://docs.discord.com/developers/topics/oauth2
- Mastodon: https://docs.joinmastodon.org/client/token/
- Docker Compose production: https://docs.docker.com/compose/how-tos/production/
- Caddy reverse_proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

Il default LinkedIn `202609` corrisponde alla versione documentata per settembre 2026; il codice non suppone che rimanga valida per sempre. Meta Graph non ha un default silenzioso: l’operatore sceglie la versione della propria app. La documentazione Google raccomanda librerie consolidate; qui il piccolo verificatore OIDC usa primitive crittografiche Node e test espliciti, ma resta da sottoporre a revisione di sicurezza indipendente prima di un’esposizione sensibile.
