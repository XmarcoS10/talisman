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
vera: fps, foto; THROTTLE=4 = portatile medio) · `npx electron tools/clips.cjs` (clip del sito) · `GOLDEN=update pnpm vitest run golden` (golden master del motore:
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

## Nazionali (§7.8)
Convocazioni e forza in `engine/nations/squad.ts`, partite col motore vero in `engine/nations/match.ts`: la nazionale
è un `Club` costruito al momento (id negativo) e non salvato, e le sue partite non toccano `p.stats` — restano in
`world.intl` (schema 28), che la schermata Vivaio mostra. `playIntl` (Poisson) resta solo per la Primavera.

## Motore partita
Spiegato in `docs/03-match-engine.md`, decisioni in `docs/adr/0002-motore-l2.md` e `docs/adr/0005-partita-2d.md`.
Moduli con stato esplicito (`match/state.ts`), nessuna funzione oltre 80 righe o complessità 20 (`structure.test.ts`);
il golden master (`golden.test.ts`) dice se una modifica cambia le partite. Le decisioni restano per azione; col registro acceso (partita seguita dal vivo) il motore emette anche `run.track`,
il campo ogni 0,25 s. Le posizioni di fine intervallo sono quelle del motore: i passi intermedi non spostano il
bilanciamento e il sim-cli non li calcola. Il ciclo più caldo è `options()` in
`match/decision.ts`: niente allocazioni dentro i loop, niente `Math.hypot` (usa `len`).

## Motore nel Web Worker (Blocco 2a)
Giornata, fine stagione, apertura e chiusura della giornata seguita girano in `ui/engine.worker.ts` (`engine-ops.ts`,
chiamato da `engine-client.ts`): il mondo va e torna come testo serializzato e si sostituisce (`setWorld`), le partite
tornano come chiavi. La partita guardata si gioca nel thread dell'interfaccia (costa ~0,07 ms ad azione). Se il worker
non c'è, `handle` gira sul posto. Prova nell'app vera: `pnpm build && npx electron tools/worker-check.cjs`.

## Salvataggi e diagnostica
In Electron gli slot sono file in `%APPDATA%/talisman/saves` (preload `electron/preload.cjs`), con intestazione davanti
al mondo; il registro degli errori è in `%APPDATA%/talisman/logs`. Nel browser resta il localStorage.
Impostazioni del giocatore (suggerimenti, guida, volumi) in `src/ui/settings.ts`.

## Fatto =
test verdi + typecheck pulito + report sim nei target.
