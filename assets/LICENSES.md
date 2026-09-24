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

## Immagini generate (`pnpm assets licenses`)

<!-- assets:start -->

| Asset | Modello | Licenza | Seed | Data |
|---|---|---|---|---|
| `illustrazioni/awayCurse` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 926854234 | 2026-09-22 |
| `illustrazioni/boardUnrest` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 2537753023 | 2026-09-23 |
| `illustrazioni/cleanRun` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 56520098 | 2026-09-22 |
| `illustrazioni/comeback` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 940756182 | 2026-09-24 |
| `illustrazioni/comebackKid` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3921095215 | 2026-09-23 |
| `illustrazioni/crisis` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 4009364198 | 2026-09-23 |
| `illustrazioni/debut` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3480615439 | 2026-09-23 |
| `illustrazioni/drought` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3897394054 | 2026-09-22 |
| `illustrazioni/fans` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3582215623 | 2026-09-23 |
| `illustrazioni/feud` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 830771023 | 2026-09-23 |
| `illustrazioni/ffp` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3899196321 | 2026-09-24 |
| `illustrazioni/flop` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 145080928 | 2026-09-24 |
| `illustrazioni/formerClub` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1902488641 | 2026-09-23 |
| `illustrazioni/fortress` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1788963846 | 2026-09-22 |
| `illustrazioni/giant` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1709623851 | 2026-09-22 |
| `illustrazioni/hatTrick` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 951540387 | 2026-09-23 |
| `illustrazioni/hotStreak` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 314177483 | 2026-09-23 |
| `illustrazioni/hothead` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 571824874 | 2026-09-23 |
| `illustrazioni/keeper` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3702230125 | 2026-09-23 |
| `illustrazioni/lateWinner` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 648625619 | 2026-09-23 |
| `illustrazioni/leaky` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1500244120 | 2026-09-22 |
| `illustrazioni/mentor` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3875052920 | 2026-09-24 |
| `illustrazioni/nemesis` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 726700322 | 2026-09-22 |
| `illustrazioni/newSigning` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3471493946 | 2026-09-23 |
| `illustrazioni/preSigned` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 56768764 | 2026-09-23 |
| `illustrazioni/predestined` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 301023086 | 2026-09-23 |
| `illustrazioni/redemption` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 189978765 | 2026-09-23 |
| `illustrazioni/relegation` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1293336023 | 2026-09-23 |
| `illustrazioni/revenge` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 4104582015 | 2026-09-22 |
| `illustrazioni/scorerRace` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1518272149 | 2026-09-23 |
| `illustrazioni/showdown` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 390678025 | 2026-09-23 |
| `illustrazioni/slump` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1338681113 | 2026-09-23 |
| `illustrazioni/surprise` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 611668438 | 2026-09-22 |
| `illustrazioni/talisman` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 372201799 | 2026-09-23 |
| `illustrazioni/thrashing` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 104708452 | 2026-09-24 |
| `illustrazioni/titleRace` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1565595616 | 2026-09-22 |
| `illustrazioni/unbeaten` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 337875267 | 2026-09-22 |
| `illustrazioni/veteran` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 2938520469 | 2026-09-23 |
| `illustrazioni/wantsOut` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3304874809 | 2026-09-24 |
| `illustrazioni/winStreak` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 2847569109 | 2026-09-23 |
| `sfondi/board` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3034572969 | 2026-09-22 |
| `sfondi/desk` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 690051518 | 2026-09-22 |
| `sfondi/dressing` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 539231490 | 2026-09-22 |
| `sfondi/finance` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3239320663 | 2026-09-22 |
| `sfondi/fixtures` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3889846821 | 2026-09-22 |
| `sfondi/market` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1461753717 | 2026-09-22 |
| `sfondi/scouts` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1551531640 | 2026-09-22 |
| `sfondi/squad` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 2964546175 | 2026-09-22 |
| `sfondi/stories` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3982160282 | 2026-09-22 |
| `sfondi/tactics` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 2811259572 | 2026-09-22 |
| `sfondi/training` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 683616354 | 2026-09-22 |
| `sfondi/youth` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 3673181638 | 2026-09-22 |
| `texture/carta` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 2700603112 | 2026-09-23 |
| `texture/erba` | flux1-dev-Q6_K.gguf | FLUX.1 [dev] Non-Commercial License: le immagini generate si possono usare, anche in un gioco distribuito | 1913483108 | 2026-09-23 |

<!-- assets:end -->
