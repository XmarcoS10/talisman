# Debito tecnico — revisione del 26/09/2026 (dopo i Blocchi 1-6 e le nazionali)

Salute del codice, senza funzioni nuove. Priorità = impatto × rischio (1-5 ciascuno); stima in ore di lavoro di
Claude, test compresi. La revisione precedente (dopo F6-F8) è in fondo.

## Numeri di oggi

**I dieci file più lunghi** (senza test): `engine/balance.ts` 688 · `engine/model.ts` 535 · `engine/world.ts` 496 ·
`engine/narrative/rules/club.ts` 312 · `engine/match/positioning.ts` 271 · `engine/match/state.ts` 260 ·
`engine/transfers/contracts.ts` 259 · `ui/match/renderer.ts` 255 · `engine/narrative/rules/player.ts` 235 ·
`engine/match/decision.ts` 214.

**Le funzioni con più punti di decisione** (if, cicli, case, `&&`, `||`, `??`, ternari):

| Funzione | Punti di decisione | Righe |
|---|---|---|
| `ui/App.tsx: App` | 55 | 136 |
| `ui/screens/Live.tsx: Live` | 46 | 150 |
| `ui/screens/Tables.tsx: Tables` | 46 | 115 |
| `ui/screens/PlayerView.tsx: PlayerView` | 43 | 151 |
| `ui/screens/Market.tsx: Market` | 38 | 129 |
| `engine/social.ts: weekSocial` | 36 | 47 |
| `ui/screens/LiveLoop.ts: useLiveLoop` | 34 | 83 |
| `ui/match/overlays.ts: drawOverlays` | 32 | 61 |

**Cambiato in meglio dalla revisione precedente**: il motore partita non è più una chiusura da 623 righe con
complessità 203, ma un insieme di moduli con stato esplicito (`match/state.ts`); `structure.test.ts` fa fallire la
build se una funzione del motore supera le 80 righe o i 20 punti di decisione, e `golden.test.ts` dice subito se una
modifica cambia le partite. Le dieci funzioni più intricate sono oggi tutte componenti React, dove i punti di
decisione sono soprattutto rami di JSX.

**Pulito**: nessun `any` fuori dalle migrazioni, nessun TODO aperto, nessuna costante di taratura fuori da
`balance.ts`, motore eseguibile in Node puro (`engine.test.ts` blocca gli import proibiti).

## Registro

| # | Voce | Impatto | Rischio | Priorità | Stima |
|---|---|---|---|---|---|
| 1 | **Nessun test sull'interfaccia.** I percorsi critici del motore sono coperti; le schermate no. Un errore in una schermata lo trova solo chi gioca. Basterebbero pochi test di montaggio sulle cinque schermate più usate. | 3 | 3 | **9** | 5 h |
| 2 | **`App.tsx` è il crocevia di tutto** (55 punti di decisione): navigazione, modali, giornata, partita dal vivo, avvisi. Si può spezzare in un router e due o tre contenitori senza cambiare comportamento. | 2 | 3 | 6 | 3 h |
| 3 | **Test lenti**: la suite completa impiega ~4 minuti, perché parecchi test giocano stagioni intere. Va bene oggi; con altri sistemi diventerà un freno. Si può marcare la parte lenta e lasciarla alla CI. | 2 | 2 | 4 | 2 h |
| 4 | **`balance.ts` è arrivato a 688 righe.** Resta leggibile perché è diviso in sezioni commentate, ma conviene spezzarlo per sistema (partita, mercato, persone, società) quando si toccherà di nuovo. | 1 | 2 | 2 | 2 h |
| 5 | **`world.ts` fa da direttore d'orchestra** (496 righe): calendario, avanzamento, fine stagione, promozioni. Ogni sistema nuovo aggiunge una riga lì. Da guardare se cresce ancora. | 2 | 1 | 2 | 3 h |

Niente di urgente: nessuna voce tocca la correttezza, e le prime due si possono fare in una sessione tranquilla.

---

## Revisione precedente (dopo F6, F7, F8)

Erano aperte otto voci. Le tre più gravi furono risolte allora (salvataggi su file con avviso, funzioni condivise in
`engine/util.ts`, costanti riportate in `balance.ts`). Delle altre, oggi sono chiuse:

- **`runMatch` da 623 righe** → spezzata nei moduli di `match/` con `structure.test.ts` a guardia.
- **Benchmark delle 10.000 partite** a 47 s → oggi 6,5 s (e `pnpm bench` misura il motore su un thread solo).
- **`options()` con complessità 52** → rientrata nei limiti del test di struttura.

Restano, riportate qui sopra: i test dell'interfaccia e la lentezza della suite.
