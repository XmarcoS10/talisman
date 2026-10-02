# TACTIC F.C. MANAGER (TFM 27, nome in codice Talisman) — regole per l'agente

Gioco manageriale di calcio stile Football Manager, gratuito. Specifica completa in `GUIDA.md` (Blocco B = specifiche, §13 = prompt per fase).
Marco non programma: fa collaudo, playtest e decisioni. Il codice lo scrive Claude, fase per fase (roadmap GUIDA §9).

## Struttura
- `src/engine/` — core di simulazione puro. NON importa React, DOM, Electron o `node:*` (lo verifica `engine.test.ts`).
- `src/sim-cli/` — laboratorio di bilanciamento in Node (`pnpm sim`).
- `src/ui/` — React. Stringhe in `it.json` via `t()`, colori solo dai token di `tokens.css`.
- `src/ui/match/` — campo 2D: interpolazione dal registro del motore, disegno su canvas, regole dell'analista; salienti,
  momenti animati, sovrapposizioni, racconto e tabellino (Blocco 3, `docs/adr/0005-partita-2d.md`).
- `electron/main.cjs` — guscio desktop.

## Regole
1. TypeScript strict. Niente `any`; `as` solo con commento che lo giustifica.
2. Niente caso nativo JS nel motore: solo `Rng` (seeded). Nessuna data reale: solo `season` + `day`.
3. Costanti di calibrazione tutte in `src/engine/balance.ts`; si tarano col report di `pnpm sim`, target in `docs/balance/targets.md`.
4. Valori derivati (valore di mercato, classifica, età) calcolati, non salvati.
5. Ogni cambio al formato del mondo: alza `SCHEMA_VERSION` e aggiungi una migrazione in `save.ts`.
6. Il formato di `WorldState` è anche il formato del database della community (nomi/stemmi reali li carica l'utente, noi non li distribuiamo).
7. Commenti in italiano, identificatori in inglese. Componenti React sotto le 200 righe.

## Comandi
`pnpm dev` (browser) · `pnpm app` (Electron) · `pnpm test` · `pnpm typecheck` · `pnpm assets` (pipeline grafica)
`pnpm dist:win` (installer Windows in `release/`; ferma prima `pnpm dev`, che tiene aperta la cartella) · `pnpm dist:linux` (solo su Linux)
`pnpm sim -- --seasons 10 --seed 42` · `pnpm sim -- --matches 3000` (bilanciamento motore partita)
`pnpm sim -- --career 25 --seed 42` (carriere lunghe: inflazione, distacco A–B, bancarotte) · `pnpm sim -- --dev 10` (curve di sviluppo) · `pnpm sim -- --psych 20` (A/B della psicologia, ~5 min)
`pnpm bench` (ms a partita del motore, guardia nella CI) · `pnpm build && npx electron tools/live-check.cjs` (partita 2D nell'app
vera: fps, foto; THROTTLE=4 = portatile medio) · `npx electron tools/ui-shots.cjs [cartella]` (foto dell'interfaccia a 1280×800, dopo `pnpm build`) · `npx electron tools/clips.cjs` (clip del sito) · `GOLDEN=update pnpm vitest run golden` (golden master del motore:
si aggiorna solo apposta, con il motivo nel commit)

## Persone (F5)
Settimana = `trainWeek` (allenamento, condizione, infortuni, sviluppo) + `weekPsych` (grafo, morale, contagio) per ogni club,
chiamate da `passDays` in `world.ts`. Decisioni in `docs/adr/0004-persone.md`.

## Mercato (F7)
`src/engine/transfers/` (valore, trattativa, agenti, IA di mercato, contratti) e `src/engine/scouting/`
(nebbia e osservatori). Finestre: estiva in `endSeason`, invernale in `passDays`. Decisioni in
`docs/adr/0006-mercato.md`, report con `pnpm sim -- --market 5` in `docs/balance/market.md`.
**Regola §7.6: dei giocatori non dell'utente non si mostra mai un valore vero** — si passa da `scouting/fog.ts`.
Per i giocatori dell'utente l'IA non compra: manda un'offerta (`transfers/offers.ts`, `world.offers`, schema 20) che
l'utente decide dalla Scrivania. Le offerte hanno un generatore loro: non spostano il caso del mondo.

## F10 (schermate nuove, `docs/notes/f10-schermate-nuove.md`)
Disegni di riferimento in `docs/design/stitch/`. Coppa nazionale in `engine/cup.ts` (le partite di un giorno si prendono
con `fixturesOn`, mai solo dai campionati), amichevoli estive in `engine/friendlies.ts`, Primavera derivata in
`engine/youth/primavera.ts`, filosofia dell'allenatore in `STYLE`. Componenti comuni in `app.css` (sezione F10):
`kpis/kpi`, `seg-tabs`, `chips`, `tag`, `meter`, `mini-card`, `section-h`. Attenzione ai nomi di classe già usati
(`.slot` è della tattica, `.timeline` non esiste più). Il test `src/ui/i18n.test.ts` controlla le chiavi scritte per intero.

## Grafica (`docs/notes/grafica.md`)
Stemmi, maglie e volti sono procedurali in `src/ui/procgen/` (GP1-GP3), deterministici dall'id: niente immagini da
distribuire. Le immagini generate con ComfyUI passano da `pnpm assets` (`tools/assets/`, Blocco C §4) e arrivano al
gioco dal manifest generato `src/ui/assets-manifest.ts` (non si modifica a mano); `src/ui/art.ts` le usa se esistono.

## Record e storia (0.3.0)
`engine/records.ts` scrive a fine stagione (`endSeasonRecords`, dopo `p.history` e prima dei ritiri) i record dei club in
`world.records` e la stagione dell'allenatore in `manager.seasons` (schema 29); nessuna pesca dal caso. I record dei
giocatori sono derivati. Schermata `ui/screens/Records.tsx`, CSV con `ui/csv.ts`. Tema chiaro: `data-theme` sulla
radice (`settings.applyTheme`), token in `tokens.css`; il campo (`.pitch`, `.pitch-wrap`, `.shot-map`) resta scuro.

## Allenatori dell'IA (0.5.0)
`engine/coaches.ts`: `world.coaches` (schema 30), uno per club IA più i liberi; lo stile (`COACH.styles`) decide
istruzioni e spinta sulla mentalità (`tactic.mentality − 3`, sommata ad `aiMentality` in `matchSetups`). Esoneri in
`weekCoaches`, fine stagione in `seasonCoaches`; `ensureCoaches` in `passDays` (carriere vecchie, panchina dell'utente).
Rng proprio. Equilibrio degli stili: `tools/diag-coaches.ts`; delle istruzioni: `tools/diag-instructions.ts`.

## Arbitri, meteo, radiocronaca (0.5.0)
Arbitri (`engine/referees.ts`) e meteo (`engine/weather.ts`) si ricavano da seme e calendario, non si salvano; entrano
nella partita da `matchSetups` (`TeamSetup.ref`, `TeamSetup.wx` → `MatchState.ref`, `MatchState.wx`). Radiocronaca in
`ui/match/radio.ts`, scritta al momento della lettura dagli eventi salvati.

## Database della community (0.4.0)
`engine/database.ts`: formato `talisman-db` v1 (documentato in `docs/database.md`), `validateDb` (il file arriva da
fuori: tutto controllato, stemmi solo PNG/JPEG/WebP), `worldFromDb` (stessa costruzione di `newWorld`: `emptyWorld` →
`makeClub` con `fill` → `finishWorld`), `worldToDb`. UI in `ui/screens/DbImport.tsx`. Nel repository mai dati reali.

## Nazionali (§7.8)
Convocazioni e forza in `engine/nations/squad.ts`, partite col motore vero in `engine/nations/match.ts`: la nazionale
è un `Club` costruito al momento (id negativo) e non salvato, e le sue partite non toccano `p.stats` — restano in
`world.intl` (schema 28), che la schermata Vivaio mostra. `playIntl` (Poisson) resta solo per la Primavera.

## Motore partita
Spiegato in `docs/03-match-engine.md`, decisioni in `docs/adr/0002-motore-l2.md` e `docs/adr/0005-partita-2d.md`.
Fase di costruzione (0.6.0): pazienza di chi palleggia meglio (`patientKeep` in `decision.ts`) e disordine della difesa
dai cambi di gioco (`unsettle` in `execute.ts`, `st.dis`), diario in `docs/design/motore-v2.md`. Moduli con stato esplicito (`match/state.ts`), nessuna funzione oltre 80 righe o complessità 20 (`structure.test.ts`);
il golden master (`golden.test.ts`) dice se una modifica cambia le partite. Le decisioni restano per azione; col registro acceso (partita seguita dal vivo) il motore emette anche `run.track`,
il campo ogni 0,25 s. Posizioni a blocco (0.15.0, diario §14, `match/shape.test.ts`): linea agganciata alla palla, reparti a distanza
fissa, marcatura a zona. Ritaratura 0.14.0 (diario §13): pressione legata per metà all'energia (`pressEnergy`), il motore legge
gli attributi di partita `m.a` (`matchAttrs`, manopole `attrSpread`/`attrSat` spente); misure con `bash tools/battery.sh`. Le posizioni di fine intervallo sono quelle del motore: i passi intermedi non spostano il
bilanciamento e il sim-cli non li calcola. Il ciclo più caldo è `options()` in
`match/decision.ts`: niente allocazioni dentro i loop, niente `Math.hypot` (usa `len`).

## Motore nel Web Worker (Blocco 2a)
Giornata, fine stagione, apertura e chiusura della giornata seguita girano in `ui/engine.worker.ts` (`engine-ops.ts`,
chiamato da `engine-client.ts`): il mondo va e torna come testo serializzato e si sostituisce (`setWorld`), le partite
tornano come chiavi. La partita guardata si gioca nel thread dell'interfaccia (costa ~0,07 ms ad azione). Se il worker
non c'è, `handle` gira sul posto. Prova nell'app vera: `pnpm build && npx electron tools/worker-check.cjs`.

## Interfaccia v2 (0.7.0, `docs/design/ui-v2-piano.md`)
Cornice alla Openfoot (`Sidebar.tsx`, `Topbar.tsx`: «Continua» col menu dal vivo / solo risultato, `settings.matchMode`) con lo
stile di Stitch (`docs/design/stitch-v2/`): `--primary` rosso per pulsanti e selezioni, `--accent` verde per ciò che va bene.
Scrivania a riquadri: catalogo in `screens/DeskWidgets.tsx` (taglie S/M/L su 12 colonne, layout pronti), layout in `settings.desk`.

## Discorsi alla squadra (0.8.0)
`engine/talks.ts`: `talkResponse` (carattere, morale, punteggio) per i sei toni. Prima e all'intervallo `run.talk` somma
`MATCH.talkBoost` al logit dei giocatori in campo; a fine partita `fullTimeTalk` muove morale e fiducia (`PSYCH.talkMorale`,
`talkTrust`) sul mondo già chiuso (in `App.tsx`, dopo `closeDay`). Nelle partite non seguite li fa il vice (`viceTalk` in
`playMatch`, 0.12.0: più è bravo più toni conosce). L'IA non ne fa. Colloqui individuali (0.13.0): `holdChat` in
`talks.ts`, lodare o criticare il rendimento (`PSYCH.chat*`); uno a settimana, ricavato dal registro delle cause.
Conferenza pre-partita (0.16.0, schema 35): `preMatch`/`rivalFire` in `press/press.ts`, domanda con `vs`; la carica
dell'avversario entra in `matchSetups` come `TeamSetup.boost` (`MATCH.rivalFireK`).

## Staff (0.9.0)
`engine/staff.ts`: vice, preparatore e medico solo per il club dell'utente (`world.staff`, schema 31), bravura 1-20, a 10
nessun effetto (`staffEdge`); guarigioni, infortuni in allenamento, morale (`STAFF` in balance.ts). Rng proprio: il caso
del mondo non cambia. Nasce in `preseason`, in `passDays` e all'apertura della carriera (`ensureStaff`).

## Tratti del giocatore (0.10.0)
`engine/traits.ts`, come i tratti di FM: `p.traits` e `p.learning` (schema 32). Nascono da id e attributi (`bornTraits`,
niente caso del mondo), si insegnano o disimparano in allenamento (`weekTraits`, solo utente). In partita contano dai bit
`MP.tr` attraverso `habit.*` (costanti in `TRAIT`): il motore non guarda mai la lista. Coppie opposte in `CONFLICTS`.

## Tattica con e senza palla (0.11.0, come FM26)
`Tactic.formationOut` e `rolesOut` (schema 33, facoltativi): modulo e ruolo senza palla. `phaseMap` (match/tactics.ts)
abbina gli slot; nel motore contano solo in `shapeDef` (`MP.ox, oy, oHold`), nella pressione (`oPress`) e nella fatica
(`oDrain`). Moduli di una fase sola in `PHASE_FORMATIONS` (3-2-5, 5-4-1), fuori da `FORMATION_IDS` (l'IA non li pesca).
IA: `COACH.outShape` e `COACH.outRoles` per stile. Istruzione individuale `tackle` (schema 34) = bit del tratto `divesIn` in `mp`. Misura: `node tools/diag-phases.ts`; diario in `docs/design/motore-v2.md` §12.

## Salvataggi e diagnostica
In Electron gli slot sono file in `%APPDATA%/talisman/saves` (preload `electron/preload.cjs`), con intestazione davanti
al mondo; il registro degli errori è in `%APPDATA%/talisman/logs`. Nel browser resta il localStorage.
Impostazioni del giocatore (suggerimenti, guida, volumi) in `src/ui/settings.ts`.

## Fatto =
test verdi + typecheck pulito + report sim nei target.
