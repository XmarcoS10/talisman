# Licenze di tutto ciò che Talisman usa e non ha scritto

Verificato il 21/09/2026 (P13 punto 9). Se si aggiunge qualcosa di esterno, va scritto qui prima del rilascio.

## Asset nel gioco

| Cosa | Origine | Licenza | Note |
|---|---|---|---|
| Carattere **Inter** | Rasmus Andersson | SIL Open Font License 1.1 | oggi scaricato da Google Fonts all'avvio; **da impacchettare in locale** prima del rilascio |
| Carattere **Barlow Condensed** | Jeremy Tribby | SIL Open Font License 1.1 | come sopra |
| Carattere **IBM Plex Mono** | IBM | SIL Open Font License 1.1 | come sopra |
| Stemmi dei club | generati dal gioco (`src/ui/Crest.tsx`) | del progetto | nessuna immagine esterna |
| Suoni | sintetizzati dal gioco con la Web Audio (`src/ui/audio.ts`) | del progetto | nessun file audio esterno |
| Nomi di giocatori, club, città | inventati, combinando liste di nomi comuni (`src/engine/names.ts`) | del progetto | nessun nome reale di club o giocatore |
| Testi delle storie e della stampa | scritti per il gioco (`src/data/narrative/`) | del progetto | |

**Nomi, stemmi e dati reali non li distribuiamo.** Il formato del mondo è pensato perché li carichi l'utente
(regola 6 del progetto): la responsabilità di quei dati è di chi li carica.

## Librerie incluse nella build

| Libreria | Licenza |
|---|---|
| React, React DOM | MIT |
| Electron (e il Chromium che contiene) | MIT; Chromium con le sue licenze, elencate nel file `LICENSES.chromium.html` che Electron mette nella build |

Solo per lo sviluppo, non incluse nel gioco: TypeScript (Apache 2.0), Vite (MIT), Vitest (MIT), @vitejs/plugin-react (MIT).
