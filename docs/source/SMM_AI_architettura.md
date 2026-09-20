# SMM AI — Architettura del sistema multi-brand per gestione social

## 1. Obiettivo del sistema

SMM AI è una piattaforma di Social Media Management assistita da intelligenza artificiale, progettata per generare, revisionare, approvare, pubblicare e ottimizzare contenuti social in modo semi-automatico o, in futuro, completamente autonomo.

L'obiettivo non è creare un sistema hardcoded per un singolo brand, ma un **motore generico multi-brand** in cui ogni brand fornisce il proprio contesto, le proprie linee guida e i propri obiettivi.

Il sistema deve quindi separare chiaramente:

- **logica generica degli agenti**
- **memoria e identità del brand**
- **generazione dei contenuti**
- **workflow di approvazione**
- **pubblicazione**
- **raccolta analytics**
- **feedback loop**

In questo modo, RideMate può essere il primo brand utilizzatore del sistema senza diventare parte integrante della logica applicativa.

---

# 2. Visione generale

Il flusso principale è il seguente:

```text
                SMM AI
                  │
        ┌─────────┴──────────┐
        │                    │
   Strategia AI         Brand Memory
        │                    │
        └────────┬───────────┘
                 ↓
             Gemini API
        idea / copy / prompt
                 ↓
        Gemini Nano Banana
           visual / image
                 ↓
            Reviewer AI
                 ↓
        APPROVA / MODIFICA
                 ↓
               n8n
                 ↓
            Postiz API
                 ↓
      Instagram / TikTok / ...
                 ↓
            Analytics
                 │
                 └──────→ Brand Memory
```

Questo schema rappresenta un ciclo continuo.

Il sistema non si limita a generare un post.

Ogni contenuto pubblicato produce dati.

I dati vengono analizzati.

Gli insight ottenuti alimentano nuovamente la memoria del brand e la strategia.

Il comportamento futuro del sistema migliora quindi sulla base dei risultati reali.

---

# 3. Principio architetturale fondamentale

Il sistema deve essere progettato secondo questo principio:

```text
GENERIC CORE
    +
BRAND CONTEXT
    +
PLATFORM CONTEXT
    =
CONTENT DECISION
```

Gli agenti non devono conoscere direttamente RideMate, un altro prodotto o un cliente specifico.

Devono ricevere il contesto necessario a runtime.

Esempio:

```json
{
  "brand": {
    "name": "RideMate",
    "industry": "carpooling",
    "target": [
      "studenti",
      "pendolari",
      "lavoratori"
    ],
    "tone": [
      "giovane",
      "semplice",
      "ironico"
    ]
  },
  "platform": "INSTAGRAM",
  "objective": "APP_DOWNLOAD",
  "contentType": "CAROUSEL"
}
```

Questo permette di riutilizzare lo stesso motore in futuro per un secondo brand semplicemente cambiando configurazione.

---

# 4. Componenti principali

## 4.1 Strategia AI

La Strategia AI rappresenta il livello decisionale superiore.

Non genera necessariamente direttamente il contenuto finale.

Il suo compito è stabilire **cosa pubblicare, perché pubblicarlo, per chi e con quale obiettivo**.

### Input principali

- obiettivi del brand
- target
- calendario editoriale
- campagne attive
- contenuti pubblicati di recente
- performance passate
- stagionalità
- eventi esterni
- eventuali vincoli editoriali
- priorità definite manualmente

### Output principali

La Strategia AI può produrre un oggetto strutturato come:

```json
{
  "topic": "Risparmiare sul tragitto casa-lavoro",
  "objective": "APP_DOWNLOAD",
  "platform": "INSTAGRAM",
  "format": "CAROUSEL",
  "angle": "problema-soluzione",
  "target": "pendolari 20-40 anni",
  "desiredEmotion": "identificazione",
  "callToAction": "Scarica RideMate",
  "priority": "HIGH"
}
```

### Responsabilità

La Strategia AI deve decidere:

- quale argomento trattare
- quale segmento di pubblico colpire
- quale formato usare
- quale obiettivo perseguire
- quale tono adottare
- quale CTA proporre
- quando pubblicare
- se il contenuto è coerente con il piano editoriale

---

# 5. Brand Memory

La Brand Memory è il componente che contiene tutto ciò che il sistema deve sapere sul brand.

Non è semplicemente un prompt statico.

Deve essere considerata una memoria strutturata e progressivamente aggiornata.

## 5.1 Contenuti della Brand Memory

Può contenere:

### Identità

- nome brand
- settore
- descrizione
- mission
- vision
- USP
- posizionamento

### Tone of Voice

- formale / informale
- ironico / istituzionale
- giovane / tecnico
- diretto / narrativo
- parole da preferire
- parole da evitare

### Target

- segmenti
- età
- interessi
- bisogni
- problemi
- motivazioni
- obiezioni

### Visual Identity

- logo
- colori
- font
- stili fotografici
- regole per i visual
- esempi approvati
- esempi da evitare

### Marketing

- CTA preferite
- obiettivi
- campagne
- funnel
- promozioni
- eventi
- priorità commerciali

### Knowledge Base

- descrizione prodotti
- feature
- FAQ
- informazioni ufficiali
- pricing
- termini approvati
- claim utilizzabili

### Performance Memory

- post migliori
- post peggiori
- formati più performanti
- temi più performanti
- fasce orarie migliori
- hook più efficaci
- CTA con miglior conversione

---

# 6. Relazione tra Strategia AI e Brand Memory

Strategia AI e Brand Memory lavorano insieme.

La Strategia AI stabilisce una direzione.

La Brand Memory fornisce il contesto necessario per evitare decisioni generiche.

Il flusso concettuale è:

```text
Brand Memory
    ↓
Strategist Agent
    ↓
Content Brief
```

Esempio:

```text
Brand Memory:
- target principale: pendolari
- post sul risparmio performano bene
- CTA "Trova il tuo passaggio" converte meglio
- post ironici ricevono più condivisioni

        ↓

Strategist Agent

        ↓

Brief:
"Creare un Reel ironico sul costo del tragitto quotidiano,
rivolto ai pendolari, con CTA Trova il tuo passaggio"
```

La Brand Memory non decide autonomamente.

Fornisce il contesto.

La Strategia AI interpreta il contesto e prende decisioni.

---

# 7. Agent Orchestrator

L'Agent Orchestrator è il componente che coordina tutti gli agenti.

Il suo scopo è evitare che ogni agente comunichi liberamente con tutti gli altri senza una struttura.

È il punto centrale del workflow.

## Responsabilità

- ricevere una richiesta
- recuperare il Brand Context
- decidere quali agenti coinvolgere
- costruire gli input
- eseguire gli agenti nell'ordine corretto
- salvare gli output
- gestire errori e retry
- passare il contenuto allo step successivo
- registrare lo stato del workflow

Esempio:

```text
Nuovo contenuto richiesto
        ↓
Agent Orchestrator
        ↓
carica Brand Memory
        ↓
Strategist Agent
        ↓
Copywriter Agent
        ↓
Creative Director Agent
        ↓
Image Agent
        ↓
Reviewer Agent
        ↓
Approval Workflow
```

---

# 8. Strategist Agent

Lo Strategist Agent traduce gli obiettivi del brand in una proposta concreta di contenuto.

## Input

```json
{
  "brandContext": "...",
  "campaign": "...",
  "recentPosts": "...",
  "analyticsSummary": "...",
  "platform": "INSTAGRAM"
}
```

## Output

```json
{
  "topic": "pendolarismo e risparmio",
  "contentType": "REEL",
  "objective": "ENGAGEMENT",
  "angle": "POV ironico",
  "hook": "Quando fai Bari-Lecce ogni giorno e scopri quanto spendi...",
  "cta": "Condividi il viaggio su RideMate"
}
```

## Non deve

- creare il visual finale
- pubblicare
- modificare direttamente analytics
- inserire informazioni non presenti nel contesto

---

# 9. Copywriter Agent

Il Copywriter Agent trasforma il brief strategico in copy utilizzabile.

## Produce

- hook
- caption
- CTA
- hashtag
- testo per carousel
- testo sovrapposto alle immagini
- script Reel
- eventuale voiceover script

## Input

```json
{
  "brandContext": "...",
  "strategy": "...",
  "platform": "INSTAGRAM",
  "format": "CAROUSEL"
}
```

## Output

```json
{
  "hook": "Quanto ti costa davvero andare a lavoro da solo?",
  "caption": "...",
  "cta": "Trova il tuo passaggio su RideMate",
  "hashtags": [
    "#carpooling",
    "#pendolari",
    "#ridemate"
  ],
  "slides": [
    {
      "index": 1,
      "headline": "Vai a lavoro da solo ogni giorno?"
    }
  ]
}
```

---

# 10. Creative Director Agent

Il Creative Director Agent definisce **come il contenuto deve apparire visivamente**.

Non genera direttamente l'immagine.

Traduce strategia e copy in direttive visuali.

## Produce

- composizione
- stile
- soggetto
- mood
- palette
- layout
- formato
- prompt immagine
- indicazioni per template renderer

## Esempio output

```json
{
  "format": "1080x1350",
  "style": "clean editorial",
  "mainSubject": "giovane pendolare vicino a un'auto",
  "background": "ambiente urbano italiano",
  "brandColorUsage": "accent",
  "imagePrompt": "...",
  "layout": {
    "headlinePosition": "top-left",
    "ctaPosition": "bottom",
    "logoPosition": "bottom-right"
  }
}
```

---

# 11. Gemini API

Gemini API viene utilizzata come motore cognitivo principale.

Non va vista come un singolo agente.

È l'infrastruttura LLM su cui possono essere eseguiti più ruoli.

Esempio:

```text
Gemini
├── Strategist Agent
├── Copywriter Agent
├── Creative Director Agent
├── Reviewer Agent
└── Analyst Agent
```

Ogni agente può utilizzare:

- system prompt differente
- input differenti
- output JSON differente
- temperatura differente
- modello differente

---

# 12. Gemini Nano Banana

Gemini Nano Banana viene utilizzato per la generazione o modifica delle immagini.

Riceve preferibilmente:

- prompt del Creative Director
- riferimenti del brand
- immagini di riferimento
- indicazioni di formato
- eventuale asset iniziale

## Flusso

```text
Creative Director
        ↓
Image Prompt
        ↓
Nano Banana
        ↓
AI Generated Asset
```

L'output non deve essere necessariamente il post finale.

È preferibile distinguere:

```text
AI BACKGROUND
+
BRAND TEMPLATE
+
TESTO
+
LOGO
=
FINAL ASSET
```

Questo riduce errori di:

- testo
- font
- logo
- dimensioni
- coerenza grafica

---

# 13. Template Renderer

Componente opzionale ma consigliato.

Serve per applicare in modo deterministico:

- logo
- font
- colori
- headline
- CTA
- badge
- elementi grafici
- watermark

Può essere implementato tramite:

- HTML/CSS → immagine
- SVG
- Canvas
- Sharp
- librerie di rendering server-side

## Vantaggio

La generazione AI produce creatività.

Il renderer garantisce coerenza di brand.

---

# 14. Reviewer AI

Il Reviewer Agent è il controllo qualità.

Non deve limitarsi a dire se "il contenuto è bello".

Deve effettuare controlli strutturati.

## Controlli

### Brand

- tono coerente
- colori corretti
- CTA coerente
- visual compatibile

### Copy

- errori grammaticali
- refusi
- copy troppo lungo
- CTA debole
- hook poco efficace

### Informazioni

- claim non supportati
- dati inventati
- informazioni obsolete
- promesse eccessive

### Social

- formato corretto
- lunghezza adeguata
- leggibilità
- rapporto testo/visual
- contenuto ripetitivo

## Output

```json
{
  "approved": false,
  "score": 72,
  "issues": [
    {
      "type": "COPY",
      "severity": "MEDIUM",
      "message": "La CTA è troppo generica"
    }
  ],
  "suggestedChanges": [
    "Sostituire la CTA con 'Trova il tuo passaggio su RideMate'"
  ]
}
```

---

# 15. Ciclo di revisione automatica

Il Reviewer può attivare un loop.

```text
Generated Content
       ↓
Reviewer
       ↓
   APPROVED?
   /      \
 SI        NO
 ↓          ↓
Approval   Revision
             ↓
        Copywriter /
        Creative Director
             ↓
          Reviewer
```

Il numero massimo di revisioni deve essere limitato.

Esempio:

```text
MAX_AUTO_REVISIONS = 2
```

Dopo il limite, il sistema passa necessariamente a revisione umana.

---

# 16. APPROVA / MODIFICA

Questa fase rappresenta il controllo umano.

È consigliabile mantenerla almeno nelle prime versioni.

Possibili azioni:

```text
APPROVA
MODIFICA
RIGENERA COPY
RIGENERA VISUAL
CAMBIA CTA
CAMBIA TONO
RIFIUTA
PROGRAMMA
```

Lo stato del contenuto potrebbe essere:

```text
DRAFT
GENERATING
GENERATED
REVIEW_FAILED
REVIEW_REQUIRED
WAITING_APPROVAL
APPROVED
SCHEDULED
PUBLISHED
FAILED
```

---

# 17. n8n

n8n svolge il ruolo di orchestratore operativo.

Non deve necessariamente contenere tutta la logica business.

La logica strategica e persistente dovrebbe rimanere nel backend.

## n8n è adatto per

- trigger schedulati
- webhook
- chiamate HTTP
- workflow asincroni
- integrazioni
- retry
- notifiche
- approvazioni
- collegamento con Postiz
- esecuzione job

## Esempio

```text
Backend
   ↓
POST /workflow/publish
   ↓
n8n Webhook
   ↓
controllo stato
   ↓
upload asset
   ↓
Postiz API
   ↓
pubblicazione
   ↓
callback backend
```

---

# 18. Postiz API

Postiz viene utilizzato come livello di publishing.

La sua responsabilità è astrarre le differenze tra piattaforme social.

Il sistema SMM AI non deve conoscere nel dettaglio ogni API social.

Idealmente:

```text
SMM AI
  ↓
Postiz
  ├── Instagram
  ├── TikTok
  ├── Facebook
  ├── LinkedIn
  └── X
```

## Responsabilità di Postiz

- gestione account
- OAuth
- scheduling
- pubblicazione
- media upload
- gestione errori di posting
- eventuale recupero metriche

---

# 19. Social Platforms

Le piattaforme sono destinazioni finali.

Esempi:

```text
Instagram
TikTok
Facebook
LinkedIn
X
YouTube Shorts
```

Ogni piattaforma può richiedere una trasformazione specifica dello stesso contenuto.

Per questo è utile introdurre un Platform Adapter.

---

# 20. Platform Adapter

Il Platform Adapter converte un contenuto generico nel formato corretto per ogni social.

Esempio:

```text
MASTER CONTENT
      ↓
Platform Adapter
  ├── Instagram version
  ├── TikTok version
  ├── LinkedIn version
  └── Facebook version
```

Può modificare:

- caption
- hashtag
- formato visual
- durata
- CTA
- tono
- aspect ratio

---

# 21. Analytics

Dopo la pubblicazione il sistema raccoglie le metriche.

Esempi:

- impressions
- reach
- likes
- comments
- shares
- saves
- profile visits
- link clicks
- CTR
- app downloads
- registrations
- conversions

L'analytics non deve essere solamente una dashboard.

Deve diventare un input per l'AI.

---

# 22. Analyst Agent

L'Analyst Agent interpreta i dati.

Esempio:

```json
{
  "postId": 123,
  "results": {
    "reach": 18500,
    "shares": 420,
    "saves": 160,
    "clicks": 310
  }
}
```

L'Analyst Agent può produrre:

```json
{
  "performance": "HIGH",
  "insights": [
    "I contenuti POV performano meglio dei contenuti informativi",
    "La CTA sul risparmio genera più click",
    "I post pubblicati tra le 18:30 e le 20:00 hanno reach superiore"
  ],
  "recommendations": [
    "Aumentare la quota di contenuti POV",
    "Riutilizzare il tema del risparmio entro 14 giorni"
  ]
}
```

---

# 23. Feedback Loop

Il Feedback Loop è una delle parti più importanti.

```text
POST
 ↓
PUBBLICAZIONE
 ↓
METRICHE
 ↓
ANALYST AGENT
 ↓
INSIGHT
 ↓
BRAND MEMORY
 ↓
STRATEGIST AGENT
 ↓
NUOVO POST
```

Questa è la differenza tra un semplice generatore AI e un vero sistema di Social Media Management intelligente.

---

# 24. Memoria statica e memoria dinamica

È consigliabile distinguere due tipi di memoria.

## Static Brand Memory

Informazioni relativamente stabili:

- nome
- settore
- tono
- logo
- colori
- mission
- target
- prodotti

## Dynamic Brand Memory

Informazioni che cambiano:

- performance
- campagne
- insight
- trend
- contenuti recenti
- CTA efficaci
- argomenti saturi
- orari migliori

---

# 25. Content Lifecycle completo

Il ciclo completo di un contenuto può essere rappresentato così:

```text
1. Trigger
   ↓
2. Load Brand Memory
   ↓
3. Strategist Agent
   ↓
4. Content Brief
   ↓
5. Copywriter Agent
   ↓
6. Creative Director Agent
   ↓
7. Nano Banana
   ↓
8. Template Renderer
   ↓
9. Reviewer Agent
   ↓
10. Human Approval
   ↓
11. n8n
   ↓
12. Postiz
   ↓
13. Social Platform
   ↓
14. Analytics
   ↓
15. Analyst Agent
   ↓
16. Update Brand Memory
```

---

# 26. Interazioni tra componenti

## Backend → Brand Memory

Recupera il contesto.

```text
GET BrandContext
```

## Orchestrator → Strategist

Invia contesto + obiettivo.

## Strategist → Copywriter

Invia Content Brief.

## Copywriter → Creative Director

Invia copy + struttura.

## Creative Director → Nano Banana

Invia prompt visuale.

## Nano Banana → Renderer

Invia asset AI.

## Renderer → Reviewer

Invia asset finale.

## Reviewer → Approval

Invia contenuto validato o segnalazioni.

## Approval → n8n

Invia comando di pubblicazione.

## n8n → Postiz

Invia asset, caption e schedule.

## Postiz → Social

Pubblica.

## Social → Analytics

Restituisce metriche.

## Analytics → Analyst

Invia dati aggregati.

## Analyst → Brand Memory

Salva insight.

---

# 27. Esempio di workflow completo

Richiesta:

```text
"Genera un post Instagram per aumentare i download"
```

Il sistema procede così:

### Step 1

Recupera Brand Memory.

### Step 2

Lo Strategist Agent decide:

```text
Tema:
risparmio tragitto casa-lavoro

Target:
pendolari

Formato:
carousel

CTA:
Trova il tuo passaggio
```

### Step 3

Il Copywriter genera:

```text
Slide 1:
"Quanto spendi ogni mese per andare a lavoro da solo?"

Slide 2:
"Benzina + parcheggio + stress"

Slide 3:
"Dividi il viaggio. Dividi le spese."

CTA:
"Trova il tuo passaggio su RideMate"
```

### Step 4

Creative Director:

```text
Urban commuter
Italian city
clean layout
brand colors
friendly photography
```

### Step 5

Nano Banana genera la base visual.

### Step 6

Template Renderer applica:

- logo
- font
- headline
- CTA

### Step 7

Reviewer AI controlla.

### Step 8

Utente approva.

### Step 9

n8n invia il contenuto a Postiz.

### Step 10

Postiz pubblica su Instagram.

### Step 11

Dopo 24h e 72h vengono raccolte metriche.

### Step 12

Analyst Agent genera insight.

### Step 13

Gli insight vengono salvati nella Brand Memory.

---

# 28. Multi-brand

L'architettura deve permettere:

```text
Workspace
  │
  ├── Brand A
  │     ├── Instagram
  │     └── TikTok
  │
  ├── Brand B
  │     ├── Instagram
  │     └── TikTok
  │
  └── Brand C
```

Ogni brand ha:

- memoria separata
- social separati
- analytics separati
- asset separati
- campagne separate

Gli agenti invece sono riutilizzati.

```text
Agent Engine
   ↓
Brand Context A

Agent Engine
   ↓
Brand Context B
```

---

# 29. Oggetti principali suggeriti

Possibili entità:

```text
Workspace
Brand
BrandIdentity
BrandMemory
SocialAccount
Campaign
ContentIdea
ContentBrief
SocialContent
GeneratedAsset
Approval
Publication
PostMetric
AgentExecution
AgentFeedback
```

---

# 30. Audit degli agenti

Ogni esecuzione AI dovrebbe essere tracciata.

Esempio:

```json
{
  "agent": "COPYWRITER",
  "model": "gemini",
  "inputVersion": "v3",
  "promptVersion": "copywriter-v4",
  "contentId": 341,
  "result": "SUCCESS",
  "createdAt": "..."
}
```

Questo permette di capire:

- quale prompt ha prodotto un output
- quale modello è stato usato
- perché un contenuto è stato generato in un certo modo
- se una modifica del prompt migliora o peggiora i risultati

---

# 31. Prompt versioning

I prompt non devono essere hardcoded senza versione.

Esempio:

```text
strategist-v1
strategist-v2
copywriter-v1
reviewer-v3
```

Il sistema deve sapere quale versione è stata usata per ogni contenuto.

---

# 32. Regola importante: output strutturati

Gli agenti dovrebbero restituire JSON strutturato e non testo libero quando possibile.

Meglio:

```json
{
  "hook": "...",
  "caption": "...",
  "cta": "..."
}
```

che:

```text
Ecco il post che secondo me potrebbe funzionare...
```

Gli output strutturati sono più facili da:

- validare
- salvare
- modificare
- passare ad altri agenti
- visualizzare in dashboard

---

# 33. Human-in-the-loop

Nella prima fase è consigliabile mantenere sempre una revisione umana.

Configurazione:

```text
AUTO_GENERATE = true
AUTO_REVIEW = true
AUTO_PUBLISH = false
```

In futuro:

```text
AUTO_GENERATE = true
AUTO_REVIEW = true
AUTO_PUBLISH = true
```

ma solamente per contenuti a basso rischio e con score sufficiente.

---

# 34. Possibile policy di autopublishing

Esempio:

```text
Reviewer score >= 90
AND
brand risk = LOW
AND
content type != PROMOTION
AND
no factual claims
THEN
auto-publish
```

Altrimenti:

```text
WAITING_APPROVAL
```

---

# 35. Evoluzione futura

## Fase 1

Generazione assistita.

```text
Idea → Content → Approval → Publish
```

## Fase 2

Calendario intelligente.

```text
AI decide cosa pubblicare durante la settimana
```

## Fase 3

Optimization loop.

```text
Analytics → Strategy
```

## Fase 4

Autonomia parziale.

```text
AI crea e programma contenuti automaticamente
```

## Fase 5

AI Social Media Manager completo.

```text
Obiettivo:
"aumenta le registrazioni del 15%"

AI:
- crea strategia
- pianifica
- genera contenuti
- pubblica
- analizza
- corregge strategia
```

---

# 36. Architettura finale consigliata

```text
                        DASHBOARD
                            │
                            ▼
                       BACKEND API
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          Brand DB     Content DB     Analytics DB
              │
              ▼
        Brand Memory Service
              │
              ▼
        Agent Orchestrator
              │
     ┌────────┼───────────┬────────────┐
     │        │           │            │
     ▼        ▼           ▼            ▼
Strategist Copywriter CreativeDir   Reviewer
     │        │           │
     └────────┴──────┬────┘
                     ▼
                 Gemini API
                     │
                     ▼
                Nano Banana
                     │
                     ▼
              Template Renderer
                     │
                     ▼
               Human Approval
                     │
                     ▼
                    n8n
                     │
                     ▼
                  Postiz
                     │
         ┌───────────┼──────────┐
         ▼           ▼          ▼
     Instagram     TikTok      ...
         │
         ▼
      Analytics
         │
         ▼
    Analyst Agent
         │
         ▼
    Brand Memory
```

---

# 37. Principio finale

L'obiettivo non deve essere:

```text
"Generare automaticamente dei post"
```

ma:

```text
"Costruire un sistema che prende decisioni di social media marketing,
produce contenuti, misura i risultati e migliora progressivamente
la propria strategia."
```

Questa distinzione è fondamentale.

Il primo è un generatore AI.

Il secondo è un vero **AI Social Media Manager**.
