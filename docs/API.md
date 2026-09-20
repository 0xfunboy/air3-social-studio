# API REST

Base locale `http://localhost:3100`. JSON UTF-8 salvo upload binari. L'API restituisce entità `{id, workspaceId, brandId, kind, revision, createdAt, updatedAt, data}`; le revisioni sono numeri interi. Inviare la revisione corrente nelle modifiche: `409` indica conflitto o stato non più utilizzabile. Gli errori hanno forma `{ "error": { "code": "…", "message": "…" } }`.

## Autenticazione

`POST /api/login` con `{email,password}` crea sessione HttpOnly/SameSite=Strict e restituisce `csrf`, utente e workspace. Per scritture da sessione servono header `X-CSRF-Token` e Origin coerente con `BASE_URL`; selezionare il workspace con `X-Workspace-Id` quando necessario. `GET /api/me` restituisce identità, ruolo, workspace e CSRF. `POST /api/logout` revoca la sessione. `POST /api/password` con `{current,password}` richiede almeno 16 caratteri e revoca le sessioni dell'utente.

Per server e automazioni creare dalla dashboard un token **brand-scoped**, role `viewer` o `editor`, scadenza 1..365 giorni. Il valore viene mostrato una sola volta: header `Authorization: Bearer TOKEN`. Non serve CSRF per Bearer. Un token editor può creare/generare/programmare contenuti già approvati, ma non può approvare contenuti/fonti, creare brand o leggere/sostituire segreti.

```bash
# Valori forniti dal proprio ambiente, nessun token incluso nella consegna.
export SMM_URL=http://localhost:3100
read -r -s -p 'Token API: ' SMM_TOKEN; echo
export SMM_TOKEN
curl -fsS "$SMM_URL/api/me" -H "Authorization: Bearer $SMM_TOKEN"
```

## Catalogo endpoint

| Metodo e percorso | Operazione |
|---|---|
| GET `/healthz` | Health pubblico, senza segreti |
| GET `/api/status` | Stato configurazione modello/embedding/renderer, catalogo piattaforme |
| GET/POST `/api/brands` | Elenco/creazione brand; creazione admin umano |
| GET/PUT `/api/brands/:id` | Lettura/modifica brand; PUT con revision |
| GET `/api/brands/:id/accounts` | Account senza credentials |
| POST `/api/brands/:id/accounts` | Creazione account, admin umano |
| GET/PUT `/api/accounts/:id` | Lettura/modifica account, segreti cifrati in input soltanto |
| GET/POST `/api/brands/:id/knowledge` | Fonti, ingestione testo/chunk/embeddings |
| GET/PUT/DELETE `/api/knowledge/:id` | Fonte singola; cancellazione approver umano |
| POST `/api/knowledge/:id/approve` | `{revision,approved}`; approver umano |
| POST `/api/brands/:id/rag` | `{query,role,platform}`; recupero con filtri |
| GET/POST `/api/brands/:id/contents` | Elenco e creazione bozze |
| GET/PUT `/api/contents/:id` | Dettaglio/cronologia; modifica azzera approvazione |
| POST `/api/contents/:id/generate` | `{revision,mode}`; mode `all`, `copy` o `visual`; ritorna job |
| POST `/api/contents/:id/review` | Revisione deterministica; aggiunge AI se il modello è configurato |
| POST `/api/contents/:id/approve` | `{revision,visualConfirmed,consent,reason?}`; approver umano |
| POST `/api/contents/:id/schedule` | `{revision,at}` timestamp ISO con offset/Z |
| POST `/api/contents/:id/cancel` | `{revision}`; annulla prima dell'invio |
| POST `/api/contents/:id/reject` | `{revision,reason}` |
| POST `/api/contents/:id/reconcile` | Risoluzione umana dell'esito incerto; campi descritti sotto |
| POST `/api/contents/:id/adapt` | `{accountIds:[...]}`; nuove bozze per destinazione, nessuna pubblicazione |
| POST `/api/contents/:id/collect-metrics` | Accoda raccolta supportata dal trasporto |
| POST `/api/contents/:id/metrics` | Importa metriche `{values,source,collectedAt}` |
| GET/POST `/api/brands/:id/campaigns` | Campagne `{name,objective,brief,startAt,endAt,active}` |
| GET/PUT `/api/campaigns/:id` | Modifica campagna con revision |
| GET `/api/brands/:id/assets` | Asset e URL firmati temporanei |
| POST `/api/brands/:id/assets?name=…&alt=…` | Corpo binario, Content-Type effettivo; limite 128MB |
| POST `/api/brands/:id/render` | `{headline,body,options:{width,height,backgroundId}}` → JPEG |
| POST `/api/brands/:id/video` | `{assetIds:[...],audioId?}` → MP4 slideshow |
| POST `/api/brands/:id/plan` | `{objective}` → job piano editoriale |
| GET `/api/brands/:id/plans` | Piani proposti |
| POST `/api/plans/:id/drafts` | Converte atomicamente proposte in bozze, non programma |
| POST `/api/brands/:id/analyze` | Analisi delle metriche presenti → job |
| GET `/api/brands/:id/metrics` | Osservazioni con provenienza |
| GET `/api/brands/:id/insights` | Insight proposti |
| POST `/api/insights/:id/accept` | `{revision}` → fonte approvata, operazione umana |
| GET `/api/brands/:id/inbox` | Eventi inbound verificati dei canali supportati |
| POST `/api/inbox/:id/reply-draft` | `{text}` → bozza, non messaggio inviato |
| POST `/api/inbox/:id/close` | `{revision}` |
| GET/POST `/api/brands/:id/contacts` | Rubrica/consensi; impossibile impostare finestre inbound manuali |
| GET `/api/brands/:id/jobs` | Stato coda, errori, tentativi |
| GET `/api/brands/:id/executions` | Audit esecuzioni AI, senza payload voluminosi |
| GET `/api/executions/:id` | Input/output e metadati della singola esecuzione |
| GET `/api/brands/:id/audit` | Audit operativo, da ruolo approver |
| GET `/api/prompts` | Contratti e prompt base, admin |
| GET/POST `/api/brands/:id/prompts` | Prompt di brand `{role,version,system,revision?}` |
| GET/POST `/api/brands/:id/tokens` | Elenco metadata / creazione token `{name,role,days}` |
| DELETE `/api/brands/:id/tokens/:tokenId` | Revoca, admin umano |
| GET/POST `/api/admin/users` | Membri; aggiunta `{email,password,role}` |
| POST `/api/admin/workspaces` | `{name}` crea workspace e membership admin |
| GET `/api/accounts/:id/creator-info` | TikTok nativo: opzioni consentite dal creator |
| POST `/api/accounts/:id/install-webhook` | Imposta il webhook Telegram, admin umano |
| GET `/api/accounts/:id/postiz-integrations` | Elenco integrazioni Postiz |
| POST `/api/accounts/:id/connect` | URL OAuth delegato al proprio Postiz |

Per rendere auto-documentanti gli esatti vincoli di input consultare `src/core/service.ts`, `src/api/server.ts` e gli schemi agenti in `src/agents/prompts.ts`. Questo riferimento non sostituisce gli schema provider né dichiara un OpenAPI completo.

## Esempio: bozza con token editor

```bash
# BRAND_ID e ACCOUNT_ID sono gli ID della dashboard, nello stesso brand.
curl -fsS "$SMM_URL/api/brands/$BRAND_ID/contents"   -H "Authorization: Bearer $SMM_TOKEN" -H 'Content-Type: application/json'   -d "{"accountId":"$ACCOUNT_ID","title":"Nuovo post","objective":"Presentare il servizio","format":"text","text":"Testo da revisionare","media":[],"claims":[],"sourceIds":[]}"
```

Le fonti dei claim generati usano identificativi `DOCUMENT_ID:CHUNK_ID`. I documenti devono appartenere allo stesso brand ed essere approvati/validi. Il controllo deterministico verifica i riferimenti, non dimostra automaticamente che una frase sia vera: revisione editoriale ancora necessaria.

## Upload e lifecycle

L'upload binario restituisce un asset. Per collegarlo a una bozza inserire `media: [{id: ASSET_ID}]`; il server ricava MIME e hash dal proprio archivio, senza fidarsi di un MIME scelto dal modello. `GET /api/contents/:id` include URL temporanei dei media.

Approvazione e scheduling sono operazioni separate. Le modifiche al post, brand, campagna, account o documenti citati invalidano il digest approvato. L'orario va inviato come ISO8601, non come ora locale priva di offset. Il calendario visualizza nella timezone del brand.

Per esiti `UNCERTAIN` il responsabile deve prima ispezionare l'account social: se il post esiste, riconciliare con l'ID esterno; se è stata verificata l'assenza, dichiararla prima di sbloccare una nuova pubblicazione. Non esiste un retry automatico che presuma fallita una scrittura dopo timeout.

## Errori e limiti

`400` input/stato non valido, `401` login/token, `403` scope/ruolo/firma/CSRF, `404` oggetto fuori scope o inesistente, `409` conflitto revisione/stato, `413` dimensioni, `429` limite. I provider possono richiedere scope/quota aggiuntivi e produrre errori espliciti. Non loggare corpi con token o dati personali su reverse proxy/automazioni.

Riconciliazione: `{revision,published,evidence,externalId?,url?}`. `published` è booleano; `evidence` descrive la verifica esterna realmente svolta. `externalId` è obbligatorio se il post è stato trovato. Ruolo admin umano richiesto. Un eventuale override editoriale usa `reason` (minimo 12 caratteri) e non può bypassare i controlli deterministici.

## Identità, onboarding e amministrazione 0.2.0

Tutti i POST/PUT/DELETE autenticati mantengono sessione, Origin e CSRF descritti sopra. Le operazioni host richiedono site admin; le operazioni OAuth del workspace richiedono admin umano. La ri-autenticazione recente dura 15 minuti; una risposta `REAUTH_REQUIRED` non esegue la scrittura.

| Endpoint | Uso |
|---|---|
| GET `/api/public` | Configurazione pubblica senza segreti |
| POST `/api/auth/signup`, `/api/auth/forgot`, `/api/auth/resend` | Registrazione/verifica/reset email, rate-limited |
| POST `/api/auth/verify`, `/reset`, `/invite` | Consuma un token monouso, password dove necessaria |
| POST `/api/auth/google/start` | Login Google; `{link:true}` richiede una sessione |
| GET `/oauth/:provider/callback` | Callback stato + browser + token exchange, redirect 303 |
| POST `/api/auth/reauth` | `{password}`; rinnova il recent-auth della sessione |
| GET/PUT `/api/onboarding` | Stato wizard per workspace |
| GET/PUT `/api/admin/installation` | Configurazione host oscurata / patch allowlist |
| POST `/api/admin/installation/export` | `{includeSecrets:true}`, site admin e recent-auth |
| POST `/api/admin/installation/test-model`, `/api/admin/installation/test-email` | Test espliciti verso servizi reali |
| GET/POST `/api/admin/invitations` | Inviti del workspace |
| DELETE `/api/admin/invitations/:hash` | Revoca invito non ancora accettato |
| PUT `/api/admin/workspace` | Nome workspace |
| PUT/DELETE `/api/admin/members/:id` | Cambia ruolo o rimuove membership; ultimo admin protetto |
| GET `/api/admin/site` | Utenti e audit installazione |
| PUT `/api/admin/site/users/:id` | Abilita/disabilita; self-lock protetto |
| GET `/api/admin/oauth/apps` | App condivise, site admin |
| PUT `/api/admin/oauth/apps/:provider` | Salva app condivisa, site admin e recent-auth |
| GET `/api/oauth/apps` | App effettive nel workspace, con source/inherited |
| PUT/DELETE `/api/oauth/apps/:provider` | Salva/rimuove override workspace, recent-auth |
| POST `/api/brands/:id/oauth/:platform/start` | Restituisce URL di consenso e cookie binding |
| GET `/api/oauth/grants/:id` | Destinazioni autorizzate, senza token |
| POST `/api/oauth/grants/:id` | `{keys:[...]}` conferma destinazioni del grant |
| GET `/api/brands/:id/connections` | Stato canali / expiry / rinnovo / verifica |
| POST `/api/brands/:id/connect-telegram` | `{botToken,targetId}` con verifica provider |
| POST `/api/accounts/:id/check`, `/api/accounts/:id/disconnect` | Verifica identità o revoca locale |
| GET `/api/oauth/meta/webhook` | Callback workspace o indicazione managed |
| GET `/api/admin/oauth/meta/webhook` | Callback globale + verify token, site admin |
| GET/POST `/webhooks/meta-global` | Challenge/eventi firmati della app condivisa |
| GET/POST `/webhooks/meta/:workspaceId` | Challenge/eventi firmati app workspace |

Una configurazione `PUT /api/admin/installation` accetta `{values:{KEY:value},clear:[KEY]}`. Valori secret vuoti preservano quanto salvato, clear elimina esplicitamente. Chiavi non allowlisted o valori multilinea sono rifiutati. Gli access/refresh token dei social non appartengono a questo schema.
