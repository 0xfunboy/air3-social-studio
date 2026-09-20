# MCP, n8n e webhook

## MCP

Endpoint `POST /mcp`, autenticazione Bearer con token viewer/editor limitato a un brand. Trasporto Streamable HTTP **stateless**, risposta JSON; non apre SSE persistenti. Versioni negoziate: `2025-11-25`, `2025-06-18`, `2025-03-26`. Metodi: initialize, ping, tools/list, tools/call, resources/list, resources/read. Le notifiche ricevono HTTP202. Non viene dichiarato un authorization server OAuth/MCP discovery; un client deve poter impostare un Bearer esplicito, oppure usare il bridge stdio.

Tool: `brand_context`, `knowledge_search`, `recent_posts`, `analytics_summary`, `create_draft`, `request_generation`, `schedule_approved`. I tool non espongono approvazioni, credenziali o accesso SQL arbitrario. Resources `smm://brand/ID` restituiscono le regole del brand autorizzato. RAG e REST applicano gli stessi confini di accesso.

```bash
curl -fsS "$SMM_URL/mcp" -H "Authorization: Bearer $SMM_TOKEN"   -H 'Content-Type: application/json'   -H 'MCP-Protocol-Version: 2025-11-25'   -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"operator","version":"1.0"}}}'
```

Per client stdio avviare `node /PERCORSO/air3-social-studio/scripts/mcp-stdio.mjs` con env `SMM_MCP_URL=https://HOST/mcp` e `SMM_API_TOKEN` ricevuto dalla dashboard. Il bridge legge JSON-RPC newline-delimited da stdin e restituisce solo protocollo su stdout. Non inserire il token in un repository o in screenshot. Il percorso va sostituito con quello reale dell'installazione.

Questa release **espone** servizi SMM ad altri agenti via MCP. Non implementa un client generico per importare automaticamente qualsiasi server MCP remoto dentro gli agenti interni. Gli agenti editoriali interni usano strumenti controllati del backend; Postiz è un adapter HTTP esplicito.

## n8n

In `workflows/` sono inclusi due workflow importabili, entrambi **inattivi**:

- `weekly-editorial-plan.json`: un Schedule Trigger settimanale propone un piano mediante `/api/brands/:id/plan`. Non converte, approva o pubblica in automatico.
- `schedule-approved-content.json`: avvio manuale, GET contenuto, guardia stato APPROVED e POST schedule con revisione letta. Una modifica concorrente viene rifiutata dal backend.

Impostare nelle variabili n8n `SMM_BASE_URL` (senza slash finale), `SMM_BRAND_ID`, e per il secondo workflow `SMM_CONTENT_ID`, `SMM_SCHEDULE_AT` (ISO con offset). Se l'edizione n8n non offre Variables, sostituire queste espressioni con valori configurati nei nodi, senza modificare il codice del prodotto. Creare una credenziale n8n **Header Auth**, nome header `Authorization`, valore `Bearer TOKEN_EDITOR_DEL_BRAND`, poi selezionarla nei nodi HTTP Request. I workflow non contengono una credenziale preesistente o token di esempio funzionanti.

Il primo workflow usa il lunedì mattina, timezone Europe/Rome come valore iniziale esplicito nel file: verificare giorno/ora prima di attivarlo. I file JSON sono stati verificati sintatticamente; non sono stati importati/eseguiti su un'istanza n8n reale in questa sessione. Tenere le chiamate di pubblicazione nella coda dello Studio: non aggiungere un secondo invio Postiz al workflow n8n.

## Webhook social

Endpoint pubblico `GET/POST /webhooks/ACCOUNT_ID`. Implementazioni inbound: Telegram, WhatsApp Business, Messenger e Instagram Direct. Meta richiede challenge+verify token e firma `X-Hub-Signature-256`; Telegram richiede `X-Telegram-Bot-Api-Secret-Token`. Target e brand vengono risolti dall'account, mai da identificatori liberi nel payload. Event ID persistiti per deduplicazione. Finestra messaggistica aggiornata solo da eventi inbound autenticati.

I webhook non pubblicano richieste arbitrarie ricevute da internet. Un messaggio inbound diventa una voce Inbox; il responsabile può creare una bozza di risposta, generarla, verificarla e approvarla. Non esiste un auto-responder indiscriminato.

Per webhook verso sistemi terzi non è incluso un event-bus universale: usare le API di stato/audit con un token limitato. `workflows/` contiene automazioni client, non un n8n server incorporato.
