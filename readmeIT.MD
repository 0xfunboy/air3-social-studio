<p align="center">
  <img src="docs/screenshots/landing-dark.webp" alt="AIR3 Social Studio — Autonomous Social Operations" width="100%">
</p>

<p align="center">
  <strong>Pensa. Crea. Pubblica. Lascia il segno.</strong><br>
  <em>Autonomous Multi-Agent Social Media Operations & Brand RAG Intelligence — Enterprise v2.0</em>
</p>

<p align="center">
  <a href="#quickstart"><strong>🚀 Quickstart</strong></a> ·
  <a href="#at-a-glance">At a glance</a> ·
  <a href="#superadmin-access">Superadmin</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#multi-agent-system">AI Agents</a> ·
  <a href="#channel-hub">Channels & OAuth</a> ·
  <a href="#enterprise-security">Security</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Release-v2.0%20Paper%20%26%20Graphite-black?style=flat-square" alt="Version 2.0">
  <img src="https://img.shields.io/badge/Runtime%20Dependencies-0%20(Pure%20ESM)-success?style=flat-square" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/Tests-115%20TAP%20Passed-blue?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/Runtime-Node.js%2022.16%2B-forestgreen?style=flat-square" alt="Node 22">
  <img src="https://img.shields.io/badge/Storage-SQLite%20WAL%20Encrypted-critical?style=flat-square" alt="SQLite WAL">
  <img src="https://img.shields.io/badge/Ingress-HTTPS%20Reverse%20Proxy-orange?style=flat-square" alt="Reverse Proxy">
  <img src="https://img.shields.io/badge/License-0xfunboy%20Non--Commercial%20v1.1-purple?style=flat-square" alt="License">
</p>

---

## Executive Summary

**AIR3 Social Studio v2.0 (Paper & Graphite)** is an enterprise-grade, self-hosted social media automation and brand intelligence suite. Engineered for organizations demanding complete data sovereignty, zero cloud vendor lock-in, and autonomous editorial workflows, AIR3 unifies multi-agent AI deliberation, brand memory retrieval (RAG), cryptographic secret isolation, and direct social network publishing into a single, cohesive ecosystem.

Unlike disjointed SaaS platforms or fragile wrapper scripts, AIR3 Social Studio runs entirely on your own infrastructure. It features zero runtime npm dependencies, offline-verifiable TypeScript compilation, and persistent encrypted SQLite storage with strict WAL journaling.

---

## At a glance

- **Zero Runtime Dependencies** — Pure Node.js 22.16+ standard library and native SQLite; zero vulnerability surface from third-party runtime npm packages.
- **Paper & Graphite Design System** — Bespoke editorial aesthetic with tactile paper textures, graphite line-art, dark/light modes, isometric SVG vector branding, and instant mobile responsiveness.
- **Autonomous Multi-Agent Council** — Six specialized AI agents (Strategist, Copywriter, Creative Director, Reviewer, Analyst, Planner) collaborate, debate, and refine content against strict brand guidelines before human sign-off.
- **Deterministic Brand RAG Engine** — Hybrid lexical (FTS5) and dense semantic embedding retrieval (BGE-M3 / OpenAI / Gemini) grounding every generated post in validated brand guidelines and official assets.
- **Centralized Social Hub & Direct OAuth** — Native integration with 20 channel types across 12 social families (LinkedIn, X/Twitter, Meta/Instagram/Threads, YouTube, TikTok, Pinterest, Bluesky, Farcaster, Telegram, Discord, and Postiz).
- **Automated Superadmin Provisioning** — Ruolo di amministratore globale e multi-workspace assegnato all'indirizzo configurato in `.env` (`SUPERADMIN_EMAIL`).
- **Terminazione TLS & Ingress HTTPS** — Ingress sicuro via reverse proxy (Caddy / NGINX) con terminazione HTTPS e protezione firewall.
- **Enterprise Security Isolation** — AES-256-GCM encrypted tokens at rest, strict SSRF origin verification, constant-time authentication, signed webhooks, and tamper-evident audit logging.

---

## Visual Experience

The v2.0 **Paper & Graphite** interface was designed from the ground up for clarity, precision, and focus. Every view is fully functional, dynamic, and directly coupled to backend APIs.

<p align="center">
  <img src="docs/screenshots/overview-dark.webp" alt="AIR3 Social Studio — Analytics & Performance Hub" width="100%">
  <em>Executive Overview: Campaign pacing, cross-platform reach, engagement metrics, and pending approval queues.</em>
</p>

<br>

<p align="center">
  <img src="docs/screenshots/wizard-social-dark.webp" alt="AIR3 Social Studio — Social Setup Wizard" width="100%">
  <em>Editorial Wizard: Multi-channel scheduling, asset synthesis, brand guideline verification, and agent council deliberation.</em>
</p>

<br>

<p align="center">
  <img src="docs/screenshots/accounts-dark.webp" alt="AIR3 Social Studio — Connected Channels & Token Vault" width="100%">
  <em>Account & Channel Governance: Individual workspace connections alongside shared enterprise OAuth apps.</em>
</p>

<br>

<p align="center">
  <img src="docs/screenshots/admin-shared-oauth-dark.webp" alt="AIR3 Social Studio — Enterprise Shared OAuth" width="49%">
  <img src="docs/screenshots/google-configuration-dark.webp" alt="AIR3 Social Studio — Google Identity Federation" width="49%">
  <br>
  <em>Left: Centralized OAuth credentials management. Right: Enterprise Google Identity & OIDC Federation.</em>
</p>

<br>

<p align="center">
  <img src="docs/screenshots/landing-light.webp" alt="AIR3 Social Studio — Light Theme" width="65%">
  <em>Adaptive Design: Paper & Graphite light palette and responsive layout optimized for handheld devices.</em>
</p>

---

## Superadmin Access

AIR3 Social Studio v2.0 include la delega automatica del ruolo di amministratore:

- **Identità Superadmin configurabile:** Imposta `SUPERADMIN_EMAIL=admin@iltuodominio.com` nel file `.env` (o tramite credenziali bootstrap).
- **Livello di privilegio:** Superadmin Globale dell'installazione (`site_admins`) + Amministratore completo su tutti i workspace attivi e futuri.
- **Meccanica di auto-promozione:**
  - **Autenticazione Locale:** Il login o la registrazione con l'email configurata imposta automaticamente `verified=1`, `disabled=0`, inserisce l'utente in `site_admins` e concede il ruolo `admin` in tutti i workspace.
  - **Federazione Google OIDC:** Al primo accesso con Google Identity, gli account corrispondenti all'email di amministrazione vengono associati, verificati e promossi a Superadmin senza interventi manuali nel database.
  - **Verifica delle autorizzazioni:** A ogni emissione di sessione e controllo dei permessi, `siteAdmin()` restituisce `true`, sbloccando telemetria, gestione OAuth globale, audit log e workspace multi-tenant.

---

## Quickstart

### 1. Prerequisiti

- **OS:** Linux (Ubuntu 22.04+ / Debian 12+ consigliato), macOS, o Docker
- **Runtime:** Node.js 22.16+ (LTS)
- **Media Engine:** FFmpeg & ffprobe (per render caroselli e slideshow video)
- **Font di sistema:** DejaVu Sans / FreeFont (es. `apt-get install -y ffmpeg fonts-dejavu-core`)

### 2. Installazione e Build Locale

Tutti i tool di compilazione (`typescript`, `@types/node`) sono inclusi offline in `vendor/`.

```bash
# 1. Clona o apri la directory del repository
git clone https://github.com/0xfunboy/air3-social-studio.git
cd air3-social-studio

# 2. Collega le dipendenze offline e compila TypeScript
npm ci --offline --ignore-scripts
npm run build

# 3. Inizializza la configurazione e genera le chiavi di cifratura
node scripts/setup.mjs --email admin@iltuodominio.com --url http://127.0.0.1:3100

# 4. Avvia il servizio
npm start
```

Il server si avvia su `http://127.0.0.1:3100`. Lo script di setup visualizza la Master Key e la password temporanea iniziale.

---

## Accesso Superadmin via Variabile d'Ambiente

Qualsiasi indirizzo specificato in `SUPERADMIN_EMAIL` nel file `.env` (oppure l'account di bootstrap iniziale) riceve automaticamente i privilegi completi di Superadmin:

```env
SUPERADMIN_EMAIL=admin@iltuodominio.com
```

---

## Ingress HTTPS & Reverse Proxy

AIR3 Social Studio rimane in ascolto locale su `http://127.0.0.1:3100`. In produzione, esponi l'interfaccia via HTTPS usando un reverse proxy (Caddy, NGINX) o un gateway sicuro:

- **Endpoint pubblico:** `https://studio.iltuodominio.com`
- **Servizio upstream locale:** `http://127.0.0.1:3100`

### Esempio Caddyfile (TLS automatico)
```caddy
studio.iltuodominio.com {
    reverse_proxy 127.0.0.1:3100
}
```

### Esempio NGINX
```nginx
server {
    server_name studio.iltuodominio.com;
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Architecture

AIR3 Social Studio segue un'architettura monolitica modulare ad alta affidabilità con zero overhead operativo:

```
                      +------------------------------------------+
                      |       Browser / Mobile Client (ESM)      |
                      |   Paper & Graphite Minimalist Frontend   |
                      +--------------------+---------------------+
                                           |
                                HTTPS / WSS (Port 443)
                                            |
                       +--------------------+---------------------+
                       |       HTTPS Ingress / Reverse Proxy      |
                       |          studio.iltuodominio.com         |
                       +--------------------+---------------------+
                                           |
                                Local Loopback (Port 3100)
                                           |
                      +--------------------+---------------------+
                      |        AIR3 HTTP / REST API Core         |
                      |   Rate Limiting - Auth - CSRF - Router   |
                      +---------+----------+----------+----------+
                                |          |          |
         +----------------------+          |          +----------------------+
         v                                 v                                 v
+------------------+             +-------------------+             +------------------+
|  Multi-Agent AI  |             |  Brand RAG Engine |             | Channel Hub &    |
|     Council      |             | FTS5 + Embeddings |             | Social Gateways  |
| Strategist       |             | Document Chunker  |             | Meta, X, LinkedIn|
| Copywriter       |             | Similarity Search |             | YouTube, TikTok  |
| Creative Dir     |             | Knowledge Vault   |             | Telegram, Discord|
| Reviewer/Analyst |             +---------+---------+             | Postiz / n8n MCP |
+--------+---------+                       |                       +--------+---------+
         |                                 |                                |
         +---------------------------------+--------------------------------+
                                           |
                      +--------------------+---------------------+
                      |      Storage & Security Subsystem        |
                      |  SQLite 3 WAL + AES-256-GCM Key Vault   |
                      |    Audit Logs & Tamper-Evident State     |
                      +------------------------------------------+
```

---

## Multi-Agent System

Content is never generated blindly. AIR3 executes a coordinated deliberation protocol across six specialized agents:

1. **The Strategist** — Analyzes campaign goals, target demographics, historical performance metrics, and content timing.
2. **The Copywriter** — Drafts channel-native copy adhering to length limits, hashtags, and tonal nuances.
3. **The Creative Director** — Specifies visual framing, color balance, typography overlays, and media templates.
4. **The Reviewer** — Enforces compliance against brand safety rules, prohibited terms, and regulatory claims.
5. **The Analyst** — Interprets downstream engagement, sentiment signals, and audience retention.
6. **The Planner** — Coordinates editorial calendars, scheduling dependencies, and multi-channel publication waves.

All agent reasoning can be inspected in real time or collapsed for executive review.

---

## Channel Hub & OAuth Support

AIR3 provides native support for both individual workspace credentials and centralized administrator-managed OAuth applications:

| Platform Family | Integration Type | Features Supported |
|---|---|---|
| **LinkedIn** | Direct REST v2 / OAuth 2.0 | Text, Single Image, Carousel, Articles, Analytics |
| **X / Twitter** | API v2 PKCE / OAuth 1.0a | Tweets, Threads, Media Upload, In reply to |
| **Meta (Instagram / FB)** | Graph API / OAuth 2.0 | Feed Posts, Reels, Carousels, Stories, Insights |
| **Meta (Threads)** | Official Threads API | Posts, Media attachments, Replies, Metrics |
| **YouTube** | Data API v3 / OAuth 2.0 | Community Posts, Video Shorts, Metadata |
| **TikTok** | Content Posting API | Video Publishing, Privacy Controls, Status checks |
| **Pinterest** | API v5 / OAuth 2.0 | Pin creation, Board selector, Rich media |
| **Bluesky** | AT Protocol / App Passwords | Rich text, Facets, Embedded cards, Blob upload |
| **Farcaster** | Neynar / Hub Signers | Casts, Frames, Embeds, Channel routing |
| **Telegram** | Bot API | Messages, Channels, Groups, Rich photo/video |
| **Discord** | Webhooks / Bot API | Rich embeds, Channel routing, Attachments |
| **Postiz** | Unified Gateway API | Multi-tenant delegation, Fallback channel driver |

---

## Enterprise Security

- **Cryptographic Isolation:** Access tokens, refresh tokens, and API secrets are encrypted using AES-256-GCM before storage. Decryption occurs strictly in-memory at the point of dispatch.
- **SSRF Immunity:** Outbound HTTP requests to external LLMs, webhooks, and social APIs are validated against an allowlist. Private RFC1918 addresses and link-local metadata endpoints are strictly blocked unless explicitly authorized in `ALLOWED_SSRF_ORIGINS`.
- **Zero Token Leakage:** Authentication cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` attributes. Master encryption keys are strictly isolated from SQLite database backups.
- **Session Hardening:** 12-hour maximum session lifetimes with mandatory constant-time password hash verification (Argon2id/PBKDF2 equivalent constant work).

---

## Verification & Testing

The test suite validates runtime behavior, security boundaries, and social provider contracts:

```bash
# Run complete test suite (115 tests)
npm test

# Run end-to-end integration flows
npm run test:e2e

# Run social provider contract tests
npm run test:social

# Verify web assets and build bundle
npm run check
```

---

## Documentation

Comprehensive operational, architecture, and API guides are available in the [`docs/`](docs/) directory:

- [Architecture & Data Flow](docs/ARCHITECTURE.md)
- [Design & Paper & Graphite Aesthetic](docs/DESIGN.md)
- [OAuth & Provider Setup Guide](docs/OAUTH.md)
- [Model Configuration & Local LLMs](docs/MODELS.md)
- [Production Deployment & Docker](docs/DEPLOYMENT.md)
- [Operations, Backup & Migrations](docs/OPERATIONS.md)
- [REST API Reference](docs/API.md)
- [Social Clients & Capabilities Matrix](docs/SOCIAL_CLIENTS.md)
- [Security Model & Disclosure](SECURITY.md)
- [Verification & Test Results](docs/VALIDATION.md)

---

## License

Copyright © 2026 0xfunboy. All rights reserved.

This project is licensed under the terms of the **0xfunboy Non-Commercial License Version 1.1**.

- Non-commercial, academic, and evaluation use is freely permitted.
- Commercial operation, SaaS redistribution, and enterprise deployment require explicit written authorization from the copyright holder.

For complete license terms, refer to [LICENSE.md](LICENSE.md) and [LICENSING.md](LICENSING.md).
