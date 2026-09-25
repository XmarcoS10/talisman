# Motore partita L2 (fase F3)

File: `src/engine/match/` — `engine.ts` (ciclo), `state.ts` (stato della partita), `positioning.ts` (posizioni),
`pressure.ts` (pressione e vista del portatore), `decision.ts` (opzioni e scelta), `execute.ts` (esecuzione e tiri),
`events.ts` (falli, contrasti, infortuni, fatica), `setpieces.ts`, `subs.ts`, `ratings.ts`, `pitch.ts` (xT, xG), `tactics.ts`.
Controlli: `golden.test.ts` (le partite non cambiano senza volerlo), `structure.test.ts` (funzioni corte),
`sense.test.ts` (buon senso tattico), `pnpm sim -- --match-stats` (statistiche per partita).
Punto d'ingresso: `playMatch()` in `src/engine/match.ts`. Costanti: `MATCH` in `src/engine/balance.ts`.

## Il campo
Griglia 12×8 continua (1 zona ≈ 8,75 × 8,5 m). Ogni squadra ragiona nel proprio sistema: x = 0 la propria porta, x = 12 quella avversaria.

## Il ciclo (§6.2)
Ogni `step()` è un'azione del portatore:
1. **Posizioni** (`place`): ogni giocatore ha una posizione ideale = modulo + palla + ruolo, e ci *corre* a velocità limitata
   (Velocità, Accelerazione, energia). Chi attacca sale a blocco: esterni e mezzali accompagnano, chi ha Inserimenti alto
   attacca l'area, gli smarcamenti casuali aprono e chiudono linee. Chi difende accorcia, marca a uomo nella propria metà
   campo (un attaccante a testa, stando tra uomo e porta), il difensore in più esce a schermare e il più vicino pressa.
2. **Pressione** sul portatore dai difensori entro 1,4 zone (Sacrificio, energia, istruzione di pressing).
3. **Opzioni** (`decision.ts`): passaggio a ogni compagno, palla in profondità alle spalle della linea, dribbling, tiro,
   cross. Ognuna ha probabilità di riuscita p (sigmoide di un logit documentato) e utilità
   `u = p·(xT dopo + K) − (1−p)·(valore regalato + K)`, dove K = valore del possesso in sé.
4. **Scelta**: softmax con temperatura. Decisioni alte → quasi sempre l'opzione migliore; pressione e poca Compostezza → più errori.
5. **Esecuzione** e conseguenze: intercetti, contrasti, falli (con cartellini, rigori, punizioni), fuorigioco, tiri
   (gol/parata/respinta/fuori, corner), cambi, infortuni, stanchezza, momentum.

Dopo l'ora di gioco chi è avanti abbassa la mentalità e chi è sotto la alza (stato della partita).

## Perché le posizioni non sono "teletrasportate"
Con posizioni ricalcolate da zero a ogni azione, attaccare in massa non costava nulla (la mentalità 5 dominava).
Con il movimento a velocità limitata chi perde palla sbilanciato deve rientrare: nascono contropiedi e la palla in
profondità punisce le linee alte. È anche la base per il campo 2D (F6): il `trace` registra ogni azione.

## Tattica
5 moduli (`tactics.ts`), mentalità 1-5, istruzioni 0-2: pressing, ritmo, ampiezza, linea difensiva, verticalità.
La mentalità è un compromesso: più offensiva = più gol fatti e subiti (`mentalityCover`, `mentalityCompact`).

**Ruoli** (`roles.ts`, 27 ruoli): ogni ruolo è un vettore di tendenze — posizione in possesso (follow, push, maxX, baseX,
dy), inserimenti (runs), rientro (hold), voglia di tirare/crossare/dribblare, verticalità, pressing, colpo di testa,
fatica (drain). I ruoli di default riproducono esattamente la taratura F3: le differenze nascono solo dalle scelte.
Lezione di bilanciamento: "restare alti senza palla" (hold > 1) è un vantaggio nel modello, non un costo, quindi i
ruoli offensivi pagano con la fatica. Verifica: `formations.mts` nello scratchpad → portarlo nel sim-cli se servirà spesso.

**Formazione dell'utente**: `club.lineup` (un id per slot). Chi non è disponibile viene sostituito dal migliore per quello
slot, con una notizia sulla Scrivania. L'IA sceglie modulo (quello che valorizza la rosa) e mentalità (in base all'avversario).

## Persone in campo (F5)
Ogni giocatore entra con un logit personale del giorno (`dayMod` in `engine.ts`), sommato al bonus del portatore:
morale (`moraleK`, centrato su 65), condizione partita sotto 80 (`sharpK`), modulo poco conosciuto (`famK`).
Nella scelta del passaggio il peso di ogni compagno è moltiplicato per l'intesa (`chem` in `decision.ts`): ±8% al massimo
tra amici o nemici. Gli infortuni "senza contatto" dipendono dal rischio personale e chi è rientrato da poco può ricadere.
Con `FLAGS.psychology = false` morale e relazioni non entrano in campo (test A/B, `pnpm sim -- --psych 20`).

## Dal registro al campo 2D (F6)
`runMatch()` esegue la partita un'azione alla volta: la schermata Live simula solo quanto le serve per stare davanti alla
riproduzione, così cambi e istruzioni decisi in panchina contano davvero. Ogni azione scrive un `TraceStep` con le posizioni
di tutti in coordinate globali (la squadra ospite gioca a specchio), palla, portatore, esito, minuto e punteggio.
`ui/match/playback.ts` interpola: i giocatori corrono verso la posizione del fotogramma successivo, la palla percorre la
traiettoria dell'azione nella prima parte dell'intervallo e poi aspetta. Decisioni in `docs/adr/0005-partita-2d.md`.

## Dribbling e 1 contro 1 (Blocco 2b, intervento 3)
- **Chi punta l'uomo**: abilità `0,4·Dribbling + 0,2·(Tecnica + Agilità + Accelerazione)`; **chi difende**: `0,4·Contrasto +
  0,3·(Posizionamento + Anticipo)` (tutti centrati su 11). Riuscita `σ(dribBase + dribSkill·att − vicinanza·dribDef·dif
  − dribPress·pressione + stanchezza del difensore + bonus)`. Esiti: uomo saltato (avanza di `dribGain`), fallo subito,
  palla persa (contrasto vinto). Saltare un uomo vicino vale `dribBeat × vicinanza` oltre alla zona guadagnata.
- **Contrasto sul portatore pressato**, prima che giochi: probabilità `pressTackle · pressione · max(0,2, 1 + tackleSkill·Δ)`,
  con Δ = `0,4·Contrasto + 0,3·(Posizionamento + Anticipo)` del difensore meno `0,5·Tecnica + 0,25·(Compostezza + Equilibrio)`
  del portatore. Vinto: palla al difensore dove si trova.
- Misura: 15,7 dribbling tentati a squadra, 43% riusciti, 15,3 contrasti vinti (Serie A: ~6 riusciti, 15 contrasti).

## Fatica
Energia persa al minuto: `drain del ruolo × (drainBase + drainStamina·(1 − Resistenza/20))`, più per chi pressa. Con
`drainStamina` 0,5 chi ha poca Resistenza arriva davvero stanco (prima al 75' erano tutti fra 76 e 80). L'energia
toglie `energySkill` di logit per punto sotto 100 al portatore e, nei dribbling, al difensore.

## Voti
Base 6,2 + gol, assist, passaggi chiave, tiri in porta, recuperi, dribbling, precisione passaggi, parate,
porta inviolata/gol subiti per i difensori, risultato; − cartellini. Media ≈ 6,65, 5% sopra l'8.

## Come si tara
`pnpm sim -- --matches 3000` (partite isolate) e `pnpm sim -- --seasons 10` (stagioni). Target in `docs/balance/targets.md`.
Si cambia una costante di `MATCH` alla volta e si rilancia.

## Limiti noti
- Moduli: 4-3-3 1,44 punti a partita, 4-2-3-1 1,18 (misura del 24/09, stessa rosa): da equilibrare (intervento 9).
- Il possesso è poco legato alla qualità (la più forte ha ~51%): serve la difesa che si disordina (`docs/design/motore-v2.md` §7).
- Velocità: ~3,8 ms a partita su un thread; `pnpm sim` gioca in parallelo (10.000 partite in ~6 s).
