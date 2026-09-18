# TALISMAN — regole per l'agente

Gioco manageriale di calcio stile Football Manager, gratuito. Specifica completa in `GUIDA.md` (Blocco B = specifiche, §13 = prompt per fase).
Marco non programma: fa collaudo, playtest e decisioni. Il codice lo scrive Claude, fase per fase (roadmap GUIDA §9).

## Struttura
- `src/engine/` — core di simulazione puro. NON importa React, DOM, Electron o `node:*` (lo verifica `engine.test.ts`).
- `src/sim-cli/` — laboratorio di bilanciamento in Node (`pnpm sim`).
- `src/ui/` — React. Stringhe in `it.json` via `t()`, colori solo dai token di `tokens.css`.
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
`pnpm dev` (browser) · `pnpm app` (Electron) · `pnpm test` · `pnpm typecheck`
`pnpm sim -- --seasons 10 --seed 42` · `pnpm sim -- --matches 3000` (bilanciamento motore partita)
`pnpm sim -- --dev 10` (curve di sviluppo) · `pnpm sim -- --psych 20` (A/B della psicologia, ~5 min)

## Persone (F5)
Settimana = `trainWeek` (allenamento, condizione, infortuni, sviluppo) + `weekPsych` (grafo, morale, contagio) per ogni club,
chiamate da `passDays` in `world.ts`. Decisioni in `docs/adr/0004-persone.md`.

## Motore partita
Spiegato in `docs/03-match-engine.md`, decisioni in `docs/adr/0002-motore-l2.md`. Il ciclo più caldo è `options()` in
`match/decision.ts`: niente allocazioni dentro i loop, niente `Math.hypot` (usa `len`).

## Fatto =
test verdi + typecheck pulito + report sim nei target.
