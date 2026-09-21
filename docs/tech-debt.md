# Debito tecnico — revisione dopo F6, F7, F8 (P12)

Revisione di salute del codice, senza funzioni nuove. Priorità = impatto × rischio (1-5 ciascuno).
Stima in ore di lavoro di Claude, test compresi.

## Numeri

**I dieci file più lunghi** (senza test): `match/engine.ts` 793 · `balance.ts` 530 · `model.ts` 438 · `world.ts` 384 ·
`narrative/rules/club.ts` 307 · `transfers/contracts.ts` 259 · `narrative/rules/player.ts` 235 · `transfers/market.ts` 198 ·
`match.ts` 183 · `morale.ts` 178.

**Le funzioni più complesse** (punti di decisione: if, cicli, case, && || ?? e ternari):

| Funzione | Complessità | Righe |
|---|---|---|
| `match/engine.ts: runMatch` | 203 | 623 — è un modulo a chiusure: la contano tutte le funzioni interne |
| `match/decision.ts: options` | 52 | 102 |
| `ui/App.tsx: App` | 43 | 112 |
| `social.ts: weekSocial` | 37 | 46 |
| `match/engine.ts: act` | 29 | 74 |
| `development.ts: developPlayer` | 28 | 57 |
| `match/engine.ts: shoot` | 26 | 36 |
| `ui/match/renderer.ts: draw` | 25 | 91 |
| `ui/match/analyst.ts: context` | 23 | 43 |
| `narrative/scanner.ts: weekStories` | 22 | 50 |

**Pulito:** nessun `any` fuori dalle migrazioni (dove è giustificato), nessun TODO o FIXME aperto, tutti i `as unknown as`
(5) sono nelle migrazioni dei salvataggi con commento. Il motore gira in Node puro (`pnpm sim`) e `engine.test.ts`
blocca gli import proibiti.

## Registro

| # | Voce | Impatto | Rischio | Priorità | Stima |
|---|---|---|---|---|---|
| 1 | **Salvataggi vicino al limite del `localStorage`, e il fallimento è silenzioso.** Uno slot pesa ~2,7 milioni di caratteri dopo cinque stagioni e cresce; tre slot sono ~8 milioni, oltre il limite di circa 5 milioni per l'intera app. Quando si sfora, il salvataggio automatico restituisce `false` e finisce in `console.error`: nessuno lo vede, e si perdono partite giocate. | 5 | 5 | **25** | 3 h |
| 2 | **Funzioni copiate in più file.** `clamp` è definita 13 volte, l'età 4 volte, i punti a partita nelle ultime cinque 2 volte (`board.ts` e `finance/ledger.ts`, identiche). Una correzione fatta in un posto non arriva negli altri. | 3 | 4 | **12** | 1 h |
| 3 | **Costanti di taratura fuori da `balance.ts`** nelle parti nuove, contro la regola 3 del progetto: effetto spogliatoio degli acquisti (0,4 · 12 · 20 · 13 · 0,3 · 0,05), probabilità degli agenti (0,2) e del parametro zero (0,3), accettazione del rinnovo (95 · 6 · ×3), gol in nazionale per ruolo (0,6 · 0,2), presenze nei tornei (3/4/5/6), soglia dei minuti degli agenti (0,25). Più due costanti morte (`revenuePerSeat`, `revenuePerRep2`) rimaste dopo F8, con un commento `ponytail` ormai falso. | 3 | 3 | **9** | 1 h |
| 4 | **`runMatch` è una chiusura da 623 righe.** Funziona ed è veloce, ma ogni modifica al motore passa di lì. Spezzarla in un modulo con stato esplicito renderebbe il motore leggibile, ma tocca il cuore del bilanciamento. | 3 | 2 | 6 | 6 h |
| 5 | **Benchmark delle 10.000 partite** a ~47 s contro un obiettivo di 20 s (aperto da F5). Il ciclo caldo è `options()`. | 2 | 2 | 4 | 4 h |
| 6 | **Test lenti**: la suite completa impiega ~46 s perché diversi test giocano stagioni intere. Va bene oggi; con altre fasi diventerà un freno. | 2 | 2 | 4 | 2 h |
| 7 | **Nessun test sull'interfaccia.** I percorsi critici del motore (salvataggio, migrazioni, mercato, finanze) sono coperti; le schermate no, e gli errori di interfaccia li trova solo il collaudo a mano. | 2 | 2 | 4 | 5 h |
| 8 | **`options()` in `decision.ts` ha complessità 52** su 102 righe: è il ciclo più caldo, commentato, e toccarlo senza benchmark è rischioso. | 2 | 1 | 2 | 3 h |

## Cosa risolvo adesso

Come chiede P12, **solo le prime tre voci**, ognuna in un commit separato, senza cambiare il comportamento del gioco e
senza toccare i test esistenti.
