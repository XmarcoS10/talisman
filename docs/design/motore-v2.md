# Motore partita v2 — diagnosi e piano (Blocco 2)

Stato: **proposta, in attesa del via di Marco.** Nessuna riga di codice del motore è cambiata per scrivere questo documento.
Numeri misurati il 24/09/2026 sul commit `34ab6a7` con `tools/diag-match.ts` (2.000 partite di Serie A, seme 42),
`pnpm sim -- --matches 10000` e un profilo della CPU su 1.500 partite.

---

## 1. Dove siamo, in numeri

| Statistica per squadra a partita | Motore oggi | Target della richiesta | Serie A reale | Target proposto |
|---|---|---|---|---|
| Passaggi tentati · precisione | 409 · 78,8% | 380-520 · 78-86% | **433 · 83,6%** (2024-25) | 380-520 · **80-86%** |
| Cross tentati · riusciti | **7,2 · 49%** | 12-20 | ~4,3 cross riusciti a partita | **12-18 · 20-30%** |
| Dribbling tentati · riusciti | **4,0 · 34%** | 12-20 · 45-60% | ~6,1 riusciti a partita | **11-17 · 40-55%** |
| Contrasti | **~2,6** (82 contando gli intercetti) | 14-20 | **15,0** (da 12,2 a 18,2) | **13-18**, intercetti a parte |
| Corner | 5,1 | 4-6 | 4,7 circa (da 3,6 a 6,0) | 4-6 |
| Fuorigioco | 2,5 | 1-3 | **1,5** (da 0,8 a 2,4) | 1-2,5 |
| Tiri di testa sul totale dei tiri | **~33%** (24% da cross, ~10% da corner) | 15-25% | gol di testa 13-16% dei gol | **15-22%** |
| Gol da piazzato (corner, punizione, rigore) | **~21-24%** | 25-35% | 20,6% senza rigori + ~10% di rigori | 25-35% |
| Gol in contropiede | **3,2%** | 10-18% | **7,1%** (record della Premier 2024-25) | **5-10%** |
| Possesso della squadra nettamente più forte | **50,2%** | 57-63% | la prima della A ha il 59,8% di media | 57-63% (scarto di CA medio ≥ 15) |

Restano verdi tutti i target di oggi: gol 2,66, casa 42,7%, pareggi 21,9-23,6% (sul bordo), xG 1,34, tiri 14,9, falli 23,
cartellini, correlazione 0,78-0,80.

**Moduli** (500 partite ciascuno, stessa rosa, stessa familiarità, mentalità 3): 4-3-3 **1,44** · 3-5-2 1,43 ·
5-3-2 1,28 · 4-4-2 1,23 · 4-2-3-1 **1,18** punti a partita. Il «5-3-2 a 0,5» di `03-match-engine.md` non è più vero,
ma lo scarto fra il migliore e il peggiore (0,26) è quasi cinque volte l'errore statistico (±0,055).
**Mentalità**: 1 → 1,17 · 2 → **1,40** · 3 → 1,29 · 4 → 1,28 · 5 → 1,26. La prudente vince su tutte.

**Velocità**: 4,9 ms a partita, **10.000 partite in 49 s** (target 20 s). Dove va il tempo: `options()` 32%, il ciclo della
pressione in `step()` 16%, `aimDef()` 12%, `runTo()` 6%, `choose()` 5%, `sigmoid` 5%.
Nell'interfaccia: una giornata blocca lo schermo per 100 ms (mediana; 190 ms al massimo), la fine stagione 240 ms.
Serializzare e rileggere il mondo costa 16 + 10 ms.

**Codice**: `runMatch` è una chiusura di 640 righe con complessità 203; `options()` ha complessità 52.

### Fonti (Serie A 2024-25 dove c'è, altrimenti Premier League, dati Opta)

- Passaggi: somma delle 20 squadre, 328.847 tentati in 760 partite di squadra → 433 a partita; precisione 83,6%.
  [StatMuse](https://www.statmuse.com/fc/ask/serie-a-team-pass-completion-percentage-2024-25)
- Contrasti 15,04 a partita: [StatMuse](https://www.statmuse.com/fc/ask/serie-a-team-tackles-per-game-2024-25)
- Cross riusciti ~4,3 a partita: [StatMuse](https://www.statmuse.com/fc/ask/serie-a-team-crosses-per-game-2024-25).
  Il numero dei tentativi non è pubblico lì: con la riuscita tipica del 20-30% fanno circa 14-20 tentativi.
- Dribbling riusciti ~6,1 a partita: [StatMuse](https://www.statmuse.com/fc/ask/serie-a-team-dribbles-per-game-2024-25)
- Corner: [StatMuse](https://www.statmuse.com/fc/ask/serie-a-team-corners-per-game-2024-25) ·
  fuorigioco: [StatMuse](https://www.statmuse.com/fc/ask/serie-a-team-offsides-per-game-2024-25)
- Possesso dell'Inter 59,8%: stessa fonte dei contrasti.
- Contropiede 7,1% dei gol, 10,2% dei tiri (Premier 2024-25, record da quando si misura):
  [Opta Analyst](https://theanalyst.com/articles/premier-league-counter-attacks-verticality-transitions-guardiola-iraola)
- Piazzati senza rigori 20,6% dei gol nel 2024-25, 28,3% nel 2025-26:
  [Opta Analyst](https://theanalyst.com/articles/premier-league-teams-still-more-direct-2025-26)
- Gol di testa: 16% dei gol nella Premier 2024-25, 14% a inizio 2025-26, 13% cinque stagioni fa (dati riportati da
  [Martin Tyler, Letter from the Gantry n. 28](https://martintylerandneilbarnett.substack.com/p/martin-tylers-letter-from-the-gantry-2b1); letti dai risultati di ricerca, da ricontrollare)

FBref, la fonte più completa, blocca la lettura automatica con una verifica anti-bot: non l'ho aggirata. Chi vuole
ricontrollare a mano: FBref, «Squad Standard Stats» della Serie A.

**Correzioni ai target che propongo**: precisione dei passaggi 80-86 (non 78: siamo al bordo solo perché il motore sbaglia
troppo), riuscita dei cross 20-30% (il motore ne completa uno su due), riuscita dei dribbling 40-55% (60 non lo raggiunge
nessuno), contrasti 13-18 contati separati dagli intercetti, **contropiede 5-10%** (il 10-18% della richiesta è oltre
il record reale), tiri di testa 15-22%.

---

## 2. Diagnosi: perché i numeri sono questi

Il motore è una catena di decisioni del portatore (844 azioni a partita, il 96% sono passaggi). Funziona per risultati
e xG, ma diverse cose del calcio vero ci sono solo come probabilità astratte.

1. **Il possesso non dipende dalla qualità (50,2%).** Il valore di tenere palla (`possessionValue`) è uguale per
   tutti, e la precisione del passaggio dipende da Passaggi e Primo controllo ma non da Tecnica, Compostezza o Visione
   del portatore. Chi è più forte non tiene di più: tira prima. È la causa della «vittoria della più forte» all'80%
   ottenuta con i tiri, non con il gioco.
2. **Il dribbling non conviene quasi mai (4 a partita, 34% riusciti).** L'utilità confronta una zona guadagnata con il
   costo pieno della palla persa; il difensore più vicino entra sempre con Contrasto, Posizionamento e Anticipo. Non
   c'è il «saltato l'uomo» che apre il campo: dopo un dribbling riuscito il gioco continua uguale. Il contrasto vero
   esiste solo qui, per questo i contrasti sono 2,6.
3. **I cross sono pochi e precisi (7 · 49%), e il colpo di testa arriva sempre.** Il cross parte solo dal fondo
   (y < 2 o > 6, x ≥ 8,3), si risolve in un solo numero, e se riesce c'è sempre un tiro di testa (xG 0,1). Non ci sono
   cross a rientrare né bassi, e nemmeno la seconda palla: il duello aereo è un confronto di Colpo di testa del miglior
   attaccante con il miglior difensore, senza Elevazione, altezza, Forza né posizione. Per questo i tiri di testa sono
   un terzo del totale.
4. **I piazzati sono istantanei.** Un corner è un'estrazione: 30% colpo di testa, 20% corto, 50% palla ai difensori.
   Nessuno si dispone, il battitore è «chi ha Calci d'angolo più alto», non c'è barriera, la punizione diretta è un xG
   fisso, non ci sono rimesse lunghe né rigorista designato.
5. **Il portiere è una media.** Riflessi, Uno contro uno e Presa entrano in un solo numero che riduce la probabilità di
   gol. Non c'è parata trattenuta o respinta (quindi nessuna ribattuta), niente uscite, e il rinvio è sempre un passaggio
   corto. Il portiere libero cambia solo quanto sale.
6. **Il contropiede nasce per caso (3%).** Esiste perché chi perde palla deve rientrare a velocità limitata, ma nessuno
   sceglie di ripartire in verticale sapendo che l'avversario è sbilanciato, nessuno fa contro-pressing e nessuno fa il
   fallo tattico.
7. **Il movimento senza palla è uno scarto casuale.** `jitter()` sposta ognuno di ±0,6 zone a caso a ogni azione; oltre a
   questo ci sono solo l'inserimento in area e la marcatura. Mancano sovrapposizioni, tagli, attacco della profondità,
   punta che viene incontro, terzo uomo. Nel 2D si vede: i 22 si muovono a blocco.
8. **Moduli e mentalità non sono in equilibrio.** Il 4-2-3-1 perde 0,26 punti a partita dal 4-3-3; la mentalità
   prudente rende più di tutte. Il modello premia chi resta compatto più di quanto costi.
9. **Difetti del registro.** Quando un tiro è gol, `kickoff()` cambia squadra prima che si scriva l'esito, così il
   registro segna il gol come tiro fallito: il racconto testuale del 2D dice «tiro» invece di «GOL»
   (`ui/match/commentary.ts:23`). I corner, i rigori e le punizioni non lasciano un'azione nel registro.
10. **Velocità.** 4,9 ms a partita: ogni meccanica nuova costerà tempo, e siamo già a 2,5 volte il target.

---

## 3. Il piano, in ordine

### 2a — Rete di sicurezza, ristrutturazione, velocità (comportamento identico)

| Passo | Cosa | Come lo misuro |
|---|---|---|
| 0 | Correggo il registro del tiro-gol (cambia solo `ok` nel registro, non i risultati) | test sul racconto: un gol su azione dice «GOL» |
| 1 | **Golden master**: 1.000 partite a semi fissi, impronta di risultati, statistiche, eventi, voti e registro | test in `pnpm test`; resta identico fino alla fine di 2a |
| 2 | `runMatch` spezzato in moduli con uno stato esplicito e tipizzato: `state.ts`, `positioning.ts`, `pressure.ts`, `options.ts`, `execute.ts`, `events.ts` (falli, cartellini, infortuni), `setpieces.ts`, `subs.ts`, `ratings.ts` | nessuna funzione oltre 80 righe e complessità 20 (script di controllo nel test); golden master identico |
| 3 | Velocità: tabella di xT precalcolata, `sigmoid` in linea, niente passaggi valutati verso compagni irraggiungibili, pressione e marcature in un solo giro, `Float64Array` per le posizioni | profilo prima/dopo; golden master identico |
| 4 | `pnpm bench` (tempo per partita su 2.000 partite) con limite controllato nella CI | fallisce se si sfora |
| 5 | Motore in un **Web Worker** nell'interfaccia (vedi D3) | nessun blocco dell'interfaccia oltre 50 ms durante giornata e partita |

Obiettivo di velocità (deciso il 24/09 dopo la misura, opzione A): a comportamento identico il motore non scende sotto
~3,8 ms a partita (il ciclo dei passaggi è già a ~12 ns per coppia compagno-difensore). Le 10.000 partite si giocano in
16 blocchi paralleli (6,5 s); `pnpm bench` fa da guardia (4,2 ms in locale, 7 nella CI). Budget: ogni intervento di 2b
può aggiungere al massimo il 15%; oltre, prima si ottimizza.

### 2b — Realismo, un intervento per commit, in ordine di impatto

Il golden master da qui si aggiorna apposta, con una riga di motivazione nel commit. Dopo ogni intervento:
`pnpm sim -- --match-stats` (report nuovo con tutte le righe della tabella del §1), `pnpm sim -- --seasons 10 --seed 42`,
e i test di buon senso. **Se un target che era verde diventa rosso mi fermo e te lo dico.**

L'ordine non è quello della richiesta: metto prima quello che sposta di più i numeri e che serve agli interventi dopo.

| # | Intervento (numero nella richiesta) | Impatto | Rischio sul bilanciamento | Come lo misuro |
|---|---|---|---|---|
| 1 | **Test di buon senso tattico** (10), scritti per primi: all'inizio alcuni falliscono, e ogni intervento dopo li fa passare | alto: è il metro di tutto il resto | nessuno (non cambia il motore) | 5 test × 500 partite, differenza con p < 0,01 |
| 2 | **Possesso legato alla qualità** (7): Tecnica, Passaggi, Visione e Compostezza nella precisione e nel valore del possesso; palleggio o verticalità contano | alto: possesso 50 → 57-63%, e cambia tutto il resto | **medio-alto**: sposta gol, pareggi (già al bordo) e la «vittoria della più forte» | possesso della più forte, precisione, pareggi, correlazione |
| 3 | **Dribbling e 1 contro 1** (2): Dribbling, Tecnica, Agilità e Accelerazione contro Contrasto, Posizionamento e Anticipo; esiti saltato / fallo subito / palla persa; il contrasto vero separato dall'intercetto | alto: dribbling 4 → 11-17, contrasti 2,6 → 13-18 | medio: più falli e più rigori | dribbling, contrasti, falli, rigori |
| 4 | **Fasce e cross** (3): dal fondo, a rientrare, bassi; duello aereo con Colpo di testa, Elevazione, altezza, Forza e posizione; respinte e seconde palle | alto: cross 7 → 12-18, testa 33 → 15-22% | medio: meno gol di testa, più tiri da fuori | cross, tiri di testa, gol per tipo |
| 5 | **Portiere vero** (5): posizionamento, uscite, parata trattenuta o respinta (con ribattuta), rinvio secondo la tattica, portiere libero | medio-alto: il test «portiere migliore» | medio: la respinta crea tiri in più | test del portiere, gol per tipo |
| 6 | **Transizioni** (6): contro-pressing (istruzione nuova), ripartenza scelta quando l'avversario è sbilanciato, fallo tattico | medio: contropiede 3 → 5-10% | medio: più gialli | gol in contropiede, gialli, test del pressing |
| 7 | **Movimento senza palla** (1): sovrapposizioni, tagli, attacco della profondità, terzo uomo, punta che viene incontro, da Movimento senza palla, Inserimenti e Intesa | alto per il 2D, medio per i numeri | **alto**: più linee di passaggio = più gol (in F6.2 posizioni più precise hanno spostato i gol da 2,77 a 2,48) | gol, xG, fuorigioco, test della linea alta |
| 8 | **Piazzati** (4): corner primo palo / secondo palo / corto, punizioni dirette con barriera e specialista, indirette, rimesse lunghe, rigorista; battitori scelti in Tattica | medio: piazzati 21-24 → 25-35% | basso-medio | gol per tipo, corner |
| 9 | **Equilibrio di moduli e mentalità** (8), per ultimo perché tutto quello prima lo sposta | alto per chi gioca | medio | matrice modulo × modulo: ogni modulo fra 1,2 e 1,5, nessuno migliore contro tutti |
| 10 | **Istruzioni individuali e piani partita** (9) | medio (profondità tattica) | basso: le istruzioni di default non cambiano niente | test: «tira di più» → più tiri di quel giocatore, piano → cambio al minuto |

Il registro per il 2D cresce insieme agli interventi: tipo di azione (dribbling, contrasto, cross, colpo di testa,
parata, respinta, uscita, piazzato), altezza della palla, esito e giocatori coinvolti. Posizioni dei 22 ogni 0,25 s ci
sono già (F6.2); i movimenti senza palla veri arrivano con l'intervento 7. `03-match-engine.md` si aggiorna a ogni
intervento, le costanti restano tutte in `balance.ts`.

---

## 4. Decisioni che servono da te prima di partire

**D1 — Cosa entra nell'impronta del golden master.**
- A: solo risultati e statistiche (piccola, veloce, ma non vede un registro che cambia).
- **B (consiglio)**: risultati, statistiche, eventi, voti **e** registro, con le coordinate arrotondate a 6 decimali,
  in un'unica impronta SHA-256 più un riassunto leggibile (gol, tiri, passaggi totali) che dice *cosa* è cambiato quando
  l'impronta cambia. Costo: circa 10 s nella suite dei test.
- C: tutto, anche la traccia densa a 0,25 s: troppo lenta (7,6 MB a partita), e la traccia deriva dal registro.

**D2 — Forma della ristrutturazione.**
- **A (consiglio)**: un oggetto di stato tipizzato (`MatchState`) e funzioni nei moduli che lo ricevono
  (`advance(st, dt)`, `options(st, view)`…). Si testa un pezzo alla volta, i moduli restano puri.
- B: una classe `Match` con metodi: meno parametri da passare, ma è la chiusura di oggi divisa in file.

**D3 — Il Web Worker.**
- A: solo la partita dal vivo nel worker. Facile, ma la giornata blocca ancora 100-190 ms.
- **B (consiglio)**: partita dal vivo **e** avanzamento (giornata, fine stagione) nel worker. Il mondo passa come testo
  serializzato, che si fa già per il salvataggio automatico: 26 ms fra andata e ritorno contro 100-240 ms di blocco oggi.
  Le schermate continuano a leggere il mondo come oggi.
- C: il mondo vive solo nel worker e le schermate lo interrogano: nessun blocco, ma si riscrivono tutte le schermate.

**D4 — Il limite di tempo nella CI.** Le macchine di GitHub sono 1,5-2 volte più lente di questo PC.
- **A (consiglio)**: `pnpm bench` misura i ms a partita. In CI il limite è 3,5 ms; in locale e nel report 1,9 ms.
- B: limite unico e severo, con il rischio di una CI rossa a caso.

**D5 — Formato del salvataggio.** Istruzioni individuali, piani partita e battitori dei piazzati si salvano nella
tattica del club, contrasti e intercetti separati nelle statistiche delle partite. Propongo **una sola versione nuova
del formato (22)** quando arrivano gli interventi 8 e 10, con migrazione: le carriere della 0.1.x si aprono con
istruzioni vuote e battitori automatici.

**D6 — Target corretti.** Vanno bene le correzioni del §1? In particolare: **contropiede 5-10%** invece di 10-18%
(il record reale è 7,1%), cross riusciti 20-30%, dribbling riusciti 40-55%.

---

## 5. Stima

2a: circa 2 giornate di lavoro (la ristrutturazione a comportamento identico è la parte lenta). 2b: 10 interventi,
da mezza giornata a una giornata ciascuno; il 2 e il 7 sono quelli con più tentativi di taratura.

---

## 6. Diario di 2b

### Intervento 2 (possesso legato alla qualità) — 25/09, fermo: serve prima il movimento senza palla

Misura di partenza: contro la 19ª della A, la 2ª fa **29 tiri, 340 passaggi, precisione 79,3%** (la debole: 9 tiri,
452 passaggi, 80,4%), possesso 51%. La superiorità si esprime tutta in tiri affrettati. Prove (4.000 partite ciascuna):

| Variante | Gol | Possesso della più forte | Forte contro debole: precisione · passaggi · tiri |
|---|---|---|---|
| Prima | 2,68 | 50,4% | 79,3% · 340 · 29 contro 80,4% · 452 · 9 |
| Qualità (Passaggi, Tecnica, Visione) più pesante sulla precisione, fino a 0,20 | 2,67 → 3,16 | 50,5 → 51,4% | quasi invariato |
| Mentalità imposte (4-2, 3-3, 2-4, 3-1, 5-3) | — | 49-53% | la mentalità non sposta il possesso |
| Valore del possesso × qualità assoluta, 0,2 | 2,39 (stagioni 2,46, correlazione **0,54**) | 54,1% | 84,8% · 505 · 16 contro 76,8% · 341 · 14 |
| … solo sopra la media, 0,2 | 2,10 | 53,0% | 85,1% · 467 · 17 contro 81,0% · 408 · 10 |
| … relativo all'avversario, 0,5 | 1,80 | 57,7% | 88,8% · 637 · **5,5** contro 78,7% · 314 · 12 |
| … relativo, solo fra passaggi (non contro il tiro), 0,6 | 1,83 | 58,8% | 89,5% · 643 · **7,8** contro 78,4% · 299 · 12 |

Tutte le varianti che danno il possesso giusto tolgono i tiri alla squadra forte: in questo motore far girare palla
non crea occasioni, perché senza movimento senza palla i passaggi sicuri vanno indietro e di lato e la difesa non si
apre. Il lavoro è salvato in `docs/design/patches/possesso-qualita-v1.patch` (qualità di palleggio, Compostezza contro
la pressione, valore del possesso relativo all'avversario) per riprenderlo dopo l'intervento 7.

### Intervento 7 (movimento senza palla) anticipato — 25/09, fermo

Corse scelte a ogni azione nel motore (`positioning.ts`): la punta attacca la profondità o viene incontro, chi ha gli
inserimenti nel ruolo attacca la linea, il terzino sovrappone sul lato della palla, l'esterno davanti a lui stringe;
Intesa e Gioco di squadra nelle palle in profondità. Patch: `docs/design/patches/movimento-e-possesso-v1.patch`.

| Variante (4.000 partite, stagioni seme 42) | Gol | Possesso della più forte | Correlazione | Altro |
|---|---|---|---|---|
| Prima | 2,68 | 50,4% | 0,80 | |
| Solo corse | **3,03** | 50,2% | — | palle in profondità ancora 0,1 riuscite a partita (test della linea alta: t 1,5); test della stanchezza da t 4,4 a **1,8** |
| Corse + possesso (valore relativo, solo fra passaggi) 0,35 | 2,51 | 55,8% | — | precisione 82,6% |
| Corse + possesso 0,45 | 2,35 (stagioni 2,37) | 56,7% | **0,28** | contropiede 0,4%, xG 1,18 |

Conclusione: le corse creano occasioni ma la difesa non le segue (i gol salgono), e il possesso ottenuto alzando il
valore di tenere palla spezza il legame fra forza e risultati. In questo motore un'occasione vale solo per quanto la
palla avanza in un'azione: far girare palla non disordina la difesa, quindi non rende. Serve un meccanismo nuovo
(la difesa che si disordina durante il possesso e che segue le corse), da progettare prima di riprendere 7 e 2.
