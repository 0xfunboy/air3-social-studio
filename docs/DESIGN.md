# Paper & Graphite: frontend implementato

Il prodotto interpreta i mockup approvati; le immagini originali non sono usate come sfondo di una finta interfaccia. Landing, form e dashboard sono DOM accessibili, CSS e SVG collegati alle API reali. Gli screenshot in `screenshots/` sono acquisizioni dell’interfaccia eseguita in browser con un workspace di collaudo dichiarato, non render generati.

## Sistema visivo

Light: carta quasi bianca, grafite scura, linee sottili, texture discreta e segni colorati di evidenziazione. Dark: carta grafite, linee chiare, ciano/verde/corallo/violetto/ambra come inchiostri. I toni sono definiti in `web/style.css`; la preferenza tema è l’unico dato persistito in localStorage. Il tema è applicato anche a login, dialoghi e amministrazione.

Il logo originale è composto da facce isometriche. Esportazioni autonome:

- `web/assets/mark.svg`
- `web/assets/logo-light.svg`
- `web/assets/logo-dark.svg`

Il wordmark usa tipografia di sistema, non font incorporati. La resa delle annotazioni manoscritte dipende dai font di sistema presenti: nessun file di font viene fornito. Le piccole glyph dei social sono indicatori di canale accompagnati dal nome, non badge di partnership o una certificazione dei rispettivi marchi.

## Pagine

Pubbliche: landing, accesso, registrazione quando abilitata, recupero/verifica/invito, privacy/termini con link del gestore.

Private: panoramica, contenuti, calendario, conoscenza, canali, asset, campagne, inbox, analytics, attività, impostazioni, wizard e team. Admin installazione: modelli, Google, email, rete, app social condivise, utenti e audit.

Il wizard ha cinque passi persistenti. Il completamento non implica account tutti connessi né abilita autopublishing. Le azioni non disponibili hanno motivazione; un canale non configurato non mostra un falso “Connected”. Tutte le nuove dashboard partono senza post, contatori inventati, testimonial o loghi di clienti presunti.

## Accessibilità e interazioni

Link salto al contenuto, titoli gerarchici, label form, focus visibile, `dialog` nativi, annunci toast via aria-live, navigazione mobile, rispetto di prefers-reduced-motion. La ricerca Cmd/Ctrl+K apre una palette di pagine. Moduli in errore riportano messaggi; ri-autenticazione sensibile avviene in dialogo senza perdere l’operazione originale.

Verificati layout a 320, 390, 768 e 1440 CSS px nei flussi coperti. Questo non è un audit WCAG completo né un test manuale con screen reader: eseguirli nel processo di accessibilità del prodotto se necessari.

## Modifiche

Il frontend è ESM senza framework o dipendenze client esterne: `brand.js` esporta icone e logo, `app.js` instrada pagine e richieste, `style.css` contiene componenti e temi. `npm run build` include controlli sintattici e dell’entrypoint CSP. Nessun bundler o CDN font è necessario per l’avvio.
