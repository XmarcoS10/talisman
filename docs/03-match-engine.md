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

## Cross e duelli aerei (Blocco 2b, intervento 4, `aerial.ts`)
- **Due cross**: alto dalla fascia (da `crossMinX`, entro `crossWide` zone dalla linea laterale) e, dal fondo
  (`lowMinX`), palla bassa all'indietro. Arriva con `σ(crossBase + crossSkill·Cross − crossPress·pressione + bonus)`;
  se no è respinto (in corner con `crossBlockCorner`) o fuori.
- **Portiere**: sul cross alto esce e blocca con `claimBase + claimSkill·(Uscite alte + Comando dell'area)/2`.
- **Duello aereo**: forza aerea `0,45·Colpo di testa + 0,15·Coraggio + 0,15·Forza + 0,25·altezza` (182 cm = 11) più il
  bonus del ruolo; vince l'attaccante con `σ(duelBase + duelSkill·(attaccante − marcatore) + crossSkill·Cross)`. Vinto:
  colpo di testa con xG `headerXg × (1 + headerMargin·margine)`. Sulla palla bassa decide l'anticipo (Movimento senza
  palla e Primo controllo contro Anticipo e Posizionamento) e il tiro è di piede dal dischetto.
- **Respinta**: in corner (`crossClearCorner`), seconda palla ripresa al limite dall'attacco (`secondBall`), o palla alla difesa.
- **Statistiche**: il cross riuscito è quello che trova un compagno, come Opta; conta anche fra i passaggi, e per
  questo la precisione complessiva scende di circa un punto e mezzo.

## Portiere (Blocco 2b, intervento 5, `keeper.ts`)
- **Parata**: la bravura dipende dal tiro. Ravvicinato (xG ≥ `gkCloseXg`): `0,5·Uno contro uno + 0,3·Riflessi +
  0,2·Uscite basse`; rigore: `0,7·Riflessi + 0,3·Concentrazione`; il resto: `0,6·Riflessi + 0,25·Posizionamento +
  0,15·Concentrazione`. Entra nella probabilità di gol come prima (`gkSkill`).
- **Presa o respinta**: trattiene con `σ(gkHoldBase + gkHoldSkill·Presa − gkHoldXg·xG)`; la respinta va in corner
  (`gkParryCorner`), sui piedi di un attaccante (ribattuta, `gkRebound`, xG `gkReboundXg`) o a un difensore.
- **Uscita in profondità**: prende la palla in profondità prima dell'attaccante con `gkSweepBase + gkSweepSkill·Uscite
  basse` (+ `gkSweepRole` il portiere libero).
- **Rinvio lungo**: opzione del portiere verso chi sta nella metà campo avversaria, riuscita `σ(kickBase +
  kickSkill·(Rinvio + Colpo di testa di chi riceve))`, voglia `kickDirect × verticalità`.

## Piazzati (Blocco 2b, intervento 8, `setpieces.ts`)
- **Battitori**: quelli scelti in Tattica (`tactic.takers`, schema 22) se sono in campo, altrimenti il migliore per
  Calci d'angolo, Calci piazzati, o `0,7·Rigori + 0,3·Compostezza` per il rigore.
- **Corner**: corto (`cornerShort`), sul primo palo (`cornerNear`: duello +`nearPostDuel`, colpo di testa ×`nearPostXg`)
  o sul secondo. La palla arriva con `σ(spDelivery + crossSkill·Calci d'angolo)`, il portiere può uscire, poi il duello
  aereo dei cross con `cornerDuel` in più per chi attacca (schema, rincorsa) e colpo di testa ×`cornerXg`.
- **Punizioni**: dal limite (`fkShot`) tira lo specialista, la barriera respinge (`fkWall`, a volte in corner); dalla
  trequarti (`fkCrossX`) la palla va in area (`fkCross`) ed è un duello aereo.
- Le rimesse lunghe non ci sono: il modello non ha l'attributo né le rimesse laterali.

## Transizioni (Blocco 2b, intervento 6)
- **Transizione**: i `transWindow` secondi e le `transActs` azioni dopo un cambio di possesso (`inTransition`).
- **Dopo la palla persa** (istruzione `counterPress`, schema 23): la pressione di chi ha appena perso palla è ×`cpRetreat`
  (ripiega), ×1 (normale) o ×`cpPress` (contro-pressing, che stanca di `cpDrain` in più).
- **Ripartenza**: se in transizione restano oltre la palla più di `counterFrom` avversari, chi ha palla verticalizza
  (`counterDirect` per ognuno oltre la soglia) e i passaggi durano ×`transTempo`.
- **Fallo tattico**: contro una ripartenza a metà campo con la difesa scoperta, il più vicino può fermarla
  (`tacticalFoul × Aggressività/10`), e il giallo arriva ×`tacticalYellow` più spesso.

## Istruzioni individuali e piani partita (Blocco 2b, intervento 10)
- **Istruzioni individuali** (`tactic.players`, schema 24, `MP.ins`): tiro (×`insShoot`), ampiezza (±`insWidth`
  zone), inserimenti (×`insRuns`, e "di più" attacca l'area anche se il ruolo non lo fa), resta dietro (non oltre
  `stayBackX`), marca stretto un ruolo avversario (lo prende prima degli altri, ×`markStrict` più vicino).
- **Piani partita** (`tactic.plans`, `plans.ts`): fino a 3; ognuno scatta una volta, al primo minuto ≥ `from` in cui
  il punteggio è quello previsto (sotto o sopra di `by`, o in parità). Cambia mentalità, pressing, linea e modulo (i
  giocatori in campo vanno alle posizioni nuove, al più adatto); il vice lo annuncia con l'evento `plan`. A fine partita
  la tattica del club torna com'era. L'IA non usa i piani.

## Registro per il 2D (`trace.ts`)
Un fotogramma (`TraceStep`) per azione: `pass`, `dribble`, `shot`, `cross`, e `tackle` / `foul` quando la difesa ferma
il portatore prima che giochi; `high` se la palla è alta (cross, rinvio lungo). Dentro, `beats`: i momenti in ordine,
ognuno con chi (`who`), contro chi (`vs`), dove era la palla e se era alta: intercetto, fuorigioco, uomo saltato,
contrasto, fallo, giallo, rosso, corner, punizione, barriera, rigore, colpo di testa, respinta della difesa, seconda
palla, uscita alta, uscita in profondità, parata, respinta del portiere, ribattuta, tiro murato, fuori, gol, rinvio
lungo. Le posizioni dei 22 ogni 0,25 s restano in `run.track`. Col registro spento `beat()` non fa niente.

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
