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
- YouTube upload: https://developers.google.com/youtube/v3/docs/videos/insert (implementazione delegata a Postiz)
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
