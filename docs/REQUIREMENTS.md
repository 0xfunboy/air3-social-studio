# Copertura del documento originale

Base: `source/SMM_AI_architettura.md`. La numerazione conserva le 37 sezioni originali. “Implementato” si riferisce al codice e ai flussi locali; il collaudo live dei provider è separato. “Parziale” indica un limite reale della release, non un'integrazione nascosta o futura venduta come esistente.

| § | Requisito originale | Copertura nella release |
|---|---|---|
| 1 | Generare, revisionare, approvare, pubblicare, ottimizzare | Flusso implementato; ottimizzazione tramite proposte/insight, nessuna garanzia di risultato commerciale |
| 2 | Ciclo continuo contenuto → analytics → memory | Job 24h/72h e insight accettati; pianificazione/analisi avviate da UI/API/n8n |
| 3 | Generic core + brand/platform context | Implementato, nessun RideMate hardcoded |
| 4 | Strategia | Agent contract, fonti, campagne, obiettivi e storico |
| 5 | Brand Memory | Regole strutturate, knowledge, asset, campagne e insight; visual font del renderer configurabile dal server, non un editor di font per brand |
| 6 | Strategia e memoria | Retrieval e contesto per ruolo |
| 7 | Agent Orchestrator | Servizio applicativo + coda persistente + tracce di esecuzione |
| 8 | Strategist | Implementato con JSON e nessun potere di invio |
| 9 | Copywriter | Testo, hashtag, slide, script video/voiceover e claim; non un catalogo di ogni formato pubblicitario |
| 10 | Creative Director | Implementato; layout effettivo del renderer è editoriale, non un page builder generico |
| 11 | Gemini API | Provider nativo + compatibile; configurazione reale richiesta |
| 12 | Nano Banana / immagini | Generazione tramite modello immagine Gemini configurato; nessun nome commerciale fissato come garanzia di disponibilità |
| 13 | Template Renderer | JPEG con headline, corpo, brand, logo e sfondo; FFmpeg reale. Nessuna condivisione di font proprietari |
| 14 | Reviewer | AI + gate deterministici; immagini locali sotto soglia al modello, video da verificare manualmente |
| 15 | Revisione automatica | Fino a 2 correzioni automatiche del copy testuale. Per visual/video non si esegue un loop automatico completo di rigenerazione e giudizio video |
| 16 | Approva/modifica | Salva, modifica, rigenera copy/visual, rifiuta, approva, programma, annulla, riconcilia; revisione ottimistica |
| 17 | n8n | REST API e workflow JSON importabili; backend conserva regole, permessi e stato. Nessuna istanza n8n già attiva |
| 18 | Postiz | Client reale, upload media, OAuth delegato, publishing monitorato, analytics; servizio configurabile esterno |
| 19 | Social platforms | 20 tipi di canale, con formati e autorizzazioni distinti; non tutte le API di tutti i prodotti Meta |
| 20 | Platform Adapter | Validazione e payload per canale; adattamento a bozze separate. Non conversione automatica universale di ogni media/formato |
| 21 | Analytics | Metriche esposte dai client, import con fonte e snapshot. Download app/registrazioni richiedono dati di attribution importati; non vengono inventati |
| 22 | Analyst | Sintesi, ipotesi, limiti, raccomandazioni con snapshot osservati |
| 23 | Feedback loop | Accettazione umana → documenti recuperabili; nessun auto-training dei pesi |
| 24 | Statica/dinamica | Separazione brand/knowledge/campagne/metriche/insight |
| 25 | Lifecycle | Implementato con stati intermedi e stati di errore espliciti |
| 26 | Interazioni | API, servizi, job, provider e webhook documentati |
| 27 | Esempio completo | Riproducibile configurando provider/account; non collaudato live in questa consegna |
| 28 | Multi-brand | Isolamento workspace + brand; test di accesso incrociato e token dedicati |
| 29 | Oggetti | Entità logiche presenti; alcuni oggetti sono incorporati nei content, non tabelle separate |
| 30 | Audit agenti | Modello, versione prompt, input/hash, output, stato, errori |
| 31 | Prompt versioning | Prompt per ruolo e brand con storico |
| 32 | Output strutturati | JSON + validazione degli schemi impiegati |
| 33 | Human-in-the-loop | Default obbligatorio. Token macchina non possono approvare |
| 34 | Autopublishing | Opt-in ristretto a testo a basso rischio secondo filtri e review. Non una prova automatica dell'assenza di ogni claim fattuale |
| 35 | Evoluzione futura | Generazione assistita, planner, insight e autonomia testuale limitata presenti. Agente commerciale totalmente autonomo con obiettivi percentuali non implementato |
| 36 | Architettura finale | Separazioni logiche implementate in un servizio singolo + storage; non una piattaforma multi-cluster |
| 37 | Sistema SMM intelligente | Applicazione integrata con memoria e misurazioni; risultato strategico non garantito |

## Aggiunte richieste nell'ultimo messaggio

Telegram Bot API; WhatsApp Business Cloud API; Messenger; Instagram Direct; Facebook Pages; Instagram Professional; Threads; TikTok; X; LinkedIn member/page; YouTube MP4 nativo e YouTube/Shorts via Postiz; Pinterest; Reddit; Bluesky; Mastodon; Discord; Farcaster via Neynar; Twitch chat; Slack. Per ciascuno vedere `SOCIAL_CLIENTS.md`.

## Funzioni non presenti e non simulate

Pubblicazione di WhatsApp Status/Channels o gestione WhatsApp Web; profili Facebook personali; Ads Manager/Marketing API e acquisto pubblicità; Marketplace/commerce/VR Meta; gestione universale di commenti e DM di tutti i social; importazione PDF/DOCX/OCR nativa; rinnovo garantito senza nuovo consenso per tutti i provider; montaggio video generativo arbitrario, avatar/TTS; replica multi-host/ANN; billing/SAML/MFA; social listening/crawler universale; crescita commerciale garantita.

Questi limiti sono espliciti nell'interfaccia e nella documentazione. Per canali non ancora autorizzati una credenziale salvata è indicata come “configurata”, non “verificata live”.

## Frontend e onboarding richiesti successivamente: 0.2.0

Landing pubblica, design Paper/Graphite light/dark, logo isometrico SVG, login email/password e Google OIDC, verifica email, inviti e recupero password, ruoli workspace e site admin separati, wizard in cinque passi, app OAuth condivise con override tenant, discovery e selezione account, refresh dove il grant lo permette, configurazione cifrata e generazione env: implementati.

Google login e 12 famiglie di OAuth hanno implementazione nativa; Telegram ha collegamento guidato del bot. La scoperta provider può avere limiti di paginazione dichiarati. I formati e le funzionalità native restano quelli di SOCIAL_CLIENTS.md: il nuovo wizard non crea automaticamente app review, permessi o funzioni consumer prive di API. Il deploy ha un gate locale e una checklist separata per le prove live.
