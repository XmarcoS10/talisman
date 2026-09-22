# Licenze di tutto ciò che Talisman usa e non ha scritto

Verificato il 21/09/2026 (P13 punto 9), aggiornato il 22/09/2026 (volti, maglie, caratteri nuovi). Se si aggiunge qualcosa di esterno, va scritto qui prima del rilascio.

## Asset nel gioco

| Cosa | Origine | Licenza | Note |
|---|---|---|---|
| Caratteri **Space Grotesk**, **Hanken Grotesk**, **JetBrains Mono** (e Barlow Condensed) | Florian Karsten, Hanken Design Co., JetBrains, Jeremy Tribby; pacchetti @fontsource | SIL Open Font License 1.1 | impacchettati nel gioco e nel sito, nessun download |
| Stemmi e maglie dei club | generati dal gioco (`src/ui/procgen/crest.ts`, `kit.ts`) | del progetto | nessuna immagine esterna |
| Volti dei giocatori | generati con **facesjs** (`src/ui/procgen/face.ts`) | Apache 2.0 (compatibile con la GPL-3.0) | disegni della libreria, combinati dal gioco |
| Icone dell'interfaccia | **lucide** (lucide-react) | ISC | anche nel sito, come tracciati SVG |
| Logo e icona dell'app | disegni di Marco (Stitch) | del progetto | |
| Suoni | sintetizzati dal gioco con la Web Audio (`src/ui/audio.ts`) | del progetto | nessun file audio esterno |
| Nomi di giocatori, club, città | inventati, combinando liste di nomi comuni (`src/engine/names.ts`) | del progetto | nessun nome reale di club o giocatore |
| Testi delle storie e della stampa | scritti per il gioco (`src/data/narrative/`) | del progetto | |

**Nomi, stemmi e dati reali non li distribuiamo.** Il formato del mondo è pensato perché li carichi l'utente
(regola 6 del progetto): la responsabilità di quei dati è di chi li carica.

## Librerie incluse nella build

| Libreria | Licenza |
|---|---|
| React, React DOM | MIT |
| lucide-react | ISC |
| facesjs (e le sue dipendenze dlv, dset, svg-path-bbox) | Apache 2.0; MIT, MIT, BSD-3-Clause |
| Electron (e il Chromium che contiene) | MIT; Chromium con le sue licenze, elencate nel file `LICENSES.chromium.html` che Electron mette nella build |

Solo per lo sviluppo, non incluse nel gioco: TypeScript (Apache 2.0), Vite (MIT), Vitest (MIT), @vitejs/plugin-react (MIT).
