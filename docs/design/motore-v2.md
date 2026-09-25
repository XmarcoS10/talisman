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

---

## 7. Proposta: la difesa che si disordina (da approvare prima di riprendere 7 e 2)

**Il pezzo che manca.** Oggi un'occasione vale solo per quanto la palla avanza in un'azione. Nel calcio vero il giro
palla serve a spostare la difesa: un cambio di gioco la fa scivolare, un passaggio che taglia una linea la scavalca,
un uomo saltato o un marcatore trascinato via da una corsa aprono uno spazio. Il vantaggio dura pochi secondi, poi la
difesa si riorganizza.

**Il meccanismo.** Ogni squadra che difende ha un **disordine** `dis` fra 0 e 1, che vive dentro il possesso
dell'avversario:

| Cosa lo alza | Di quanto (da tarare) |
|---|---|
| Passaggio riuscito che cambia lato (spostamento laterale ≥ 3 zone) | + 0,15 × (Visione e Passaggi del portatore) |
| Passaggio riuscito che supera almeno un difensore (linea saltata) | + 0,10 per difensore superato |
| Dribbling riuscito (uomo saltato) | + 0,20 |
| Corsa senza palla vinta: l'attaccante batte in velocità (Accelerazione, Velocità, Movimento senza palla) chi lo segue (Posizionamento, Anticipo, Velocità) | + 0,15 |

| Cosa lo abbassa | |
|---|---|
| Il tempo: la difesa si riorganizza | × e^(−t/τ), τ ≈ 8 s, più veloce con Concentrazione e Posizionamento alti |
| La palla recuperata | a zero |

**Gli effetti.** Il disordine riduce l'efficacia dei difensori sulle linee di passaggio e sulla marcatura
(`defAnt × (1 − k·dis)`), la pressione sul portatore e la precisione dei loro interventi, e aumenta l'xG dei tiri
(spazio: `+ xgDis · dis` sul logit). Nell'utilità di un passaggio entra il disordine che produce: così chi sa
palleggiare fa girare palla **perché rende**, non perché gliel'abbiamo detto con una costante. Le corse
(intervento 7) diventano duelli di velocità con chi le segue: vinte creano disordine e palle in profondità vere,
perse non fanno danno. La linea alta contro punte veloci perde più duelli: è il test che oggi fallisce.

**Perché dovrebbe tenere i numeri.** La squadra più forte palleggia meglio (precisione) e crea più disordine; la
debole fa pochi passaggi riusciti di fila e il disordine che crea svanisce prima. Il possesso si sposta verso chi è
più bravo **e** si trasforma in occasioni, quindi la correlazione forza↔punti non dovrebbe scendere.

**Come lo misuro, in quest'ordine**, fermandomi se un target verde diventa rosso:
1. Solo il disordine (senza corse né possesso): gol, xG, correlazione sulle stagioni, `--match-stats`.
2. Più le corse (patch dell'intervento 7) con i difensori che le seguono: test della linea alta, gol, fuorigioco.
3. Più la qualità del passaggio (patch dell'intervento 2, **senza** il valore del possesso gonfiato): possesso della
   più forte, precisione, correlazione.

**Rischio**: alto, tocca il cuore del modello. **Costo**: un giorno di lavoro, circa +10% di tempo per partita
(budget 15%).

### Intervento 3 (dribbling e 1 contro 1) — 25/09, fermo su due target

Chi punta: Dribbling 0,4, Tecnica, Agilità, Accelerazione 0,2; chi difende: Contrasto 0,4, Posizionamento e Anticipo
0,3; esiti uomo saltato, fallo subito, palla persa; più il contrasto sul portatore pressato (Contrasto, Posizionamento,
Anticipo contro Tecnica, Compostezza, Equilibrio). Patch: `docs/design/patches/dribbling-v1.patch`
(dribBase 0,5 · dribBeat 0,004 · pressTackle 0,035 · tackleSkill 0,04).

| | Prima | Dopo |
|---|---|---|
| Dribbling tentati · riusciti | 3,9 · 34% | **15,5 · 43%** ✅ |
| Contrasti vinti | 1,7 | **15,5** ✅ |
| Fuorigioco | 2,5 | 2,4 ✅ |
| Gol (4.000 partite · stagioni 42 · 7) | 2,68 · 2,66 · 2,80 | 2,67 · 2,50 · 2,76 ✅ |
| Falli per partita | 23 | 28 ✅ (Serie A ~26) |
| Correlazione (42 · 7) | 0,78 · 0,74 | 0,77 · 0,77 ✅ |
| Campioni diversi · punti massimi (42 · 7) | 5-6 · 94-95 | 8 · 91 / 6 · 93 ✅ (con tackleSkill 0,08: 3 · 102 / 5 · 105 ❌) |
| **Infortuni per squadra/stagione (42 · 7)** | 18,0 · 17,6 | **20,8 · 20,1** ❌ |
| **Test della stanchezza (t)** | 4,4 | **1,8** ❌ |

Più contrasti → più falli (realistici) → più infortuni da contatto, con la stessa probabilità per fallo di prima. La
stanchezza era già un effetto di un solo punto di precisione (tutti fra 76 e 80 di energia al 75'): con più
turnover la nasconde il rumore.

### La difesa che si disordina (§7), primo passo — 25/09, fermo

Patch: `docs/design/patches/disordine-v1.patch` (disordine 0-1 della squadra senza palla, alzato da cambi di gioco,
linee saltate e dribbling, calo col tempo secondo Concentrazione e Posizionamento, effetti su intercetti, pressione e xG).

| Variante (4.000 partite) | Gol | Precisione | Fuorigioco | Possesso della più forte |
|---|---|---|---|---|
| Prima | 2,62 | 79,0% | 2,4 ✅ | 51% |
| Disordine (xG 0,6, efficacia 0,5) | **2,98** | 77,5% | **2,8** | 51,1% |
| Disordine (xG 0,2, efficacia 0,2) | 2,72 | 77,3% | **2,7** | 50,8% |
| Disordine senza effetto sull'xG | 2,65 | 77,4% | **2,8** | 50,9% |

Il disordine non sposta il possesso e, premiando i passaggi che tagliano le linee, rende il gioco più verticale:
precisione giù, fuorigioco su (verde → rosso). Fermo al primo passo.

**La misura che spiega tutto** (`tools/diag-possession.ts`, 2ª contro 19ª della A, 400 partite): possesso a tempo
51,2%, ma **a quota di passaggi (come Opta) 41,1%**: la forte fa 306 passaggi e **29 tiri**, la debole 439 e 9.
Due prove che non cambiano niente: la mentalità che non tocca la pressione (51,0%), una soglia di xG minima per tirare
0,03 / 0,05 / 0,07 (la forte tira ancora 28 / 26 / 23 volte, possesso Opta 41-42%, gol fino a 2,36).

Conclusione: la squadra forte non tira per disperazione, **arriva in zona tiro troppo facilmente**, perché la debole
non si chiude in un blocco basso e compatto; e quando ha palla la debole la fa girare con calma nella sua metà invece
di giocare lungo. Nel motore la mentalità prudente vuol dire "attento a non perderla", non "chiuditi e riparti".

---

## 8. Proposta: cosa vuol dire la mentalità (da approvare prima del codice)

**Il problema** (§6, ultima prova): la squadra forte arriva in zona tiro troppo facilmente e ha il 41% dei passaggi
(Opta: la prima della A ne ha il ~60%). Nel motore la mentalità prudente vuol dire "non perderla", quella offensiva
"rischia e tira". Nel calcio vero chi è prudente **si chiude e riparte**, chi è propositivo **tiene palla e pressa**.

**Oggi, per livello di mentalità sopra 3** (`balance.ts`): in possesso +0,1 zone di salita, −4% di paura di perderla,
+4% di voglia di tirare; senza palla linea +0,25 zone, blocco −4% compatto, e **−15% di impegno difensivo, pressione
compresa**. Risultato al rovescio: la squadra forte (mentalità 4) pressa meno della debole (mentalità 2).

**La proposta, in due passi misurati separatamente:**

1. **Possesso misurato come Opta** (quota dei passaggi, non tempo con palla, che oggi conta anche 22 s di gioco fermo
   dopo ogni tiro o fallo subito). Cambia solo il numero: il gioco no. Serve perché il target (57-63%) è quello di Opta,
   e perché nel tabellino il possesso deve dire la stessa cosa che dice in TV.
2. **La mentalità cambia comportamento, non solo quantità:**

| | Prudente (1-2) | Equilibrata (3) | Propositiva (4-5) |
|---|---|---|---|
| Linea e blocco senza palla | bassa, corta: anche le punte rientrano, pochi spazi fra le linee | come oggi | alta, uomini avanti |
| Pressione | solo nella propria metà campo | come oggi | anche alta, più intensa (non meno, come oggi) |
| In possesso | palla lunga presto verso chi attacca la profondità, poca costruzione dal basso | come oggi | costruzione paziente: il possesso vale di più **nella propria metà** (dove perderla costa), non vicino all'area |
| Prezzo della scelta | rischia poco dietro, ma crea poco e concede il possesso | | crea di più, ma chi sale lascia spazio alle spalle: contropiedi subiti |

L'impegno difensivo (`cover`) continua a scendere con la mentalità offensiva, ma solo per **rientri e marcature**,
non per la pressione. Quello che cambia davvero per il gioco: davanti a un blocco basso e corto le linee di passaggio
in avanti sono affollate (i termini di corsia e marcatura del passaggio pesano di più) e la squadra forte deve far
girare palla; la debole, quando recupera, gioca lungo e la perde spesso, o riparte: è da qui che nascono i contropiedi
che oggi mancano (2,4% contro 5-10%).

**Come lo misuro**, fermandomi se un target verde diventa rosso:
- passo 1: `--match-stats` e stagioni (cambia solo il possesso riportato: il golden master cambia per il campo
  `possession`, i gol no);
- passo 2: possesso Opta della più forte (57-63%), gol, contropiedi (5-10%), correlazione su 3 semi, e **punti a partita
  per mentalità a parità di rosa** (`tools/diag-match.ts`: oggi la prudente vince, 1,40 contro 1,26-1,29): nessuna deve
  dominare, perché questo è anche l'intervento 9 (equilibrio di moduli e mentalità).

**Rischio**: alto, l'IA sceglie la mentalità in ogni partita, quindi cambia tutto il campionato. **Costo**: mezza
giornata per il passo 2, più le tarature. Dopo, su questa base, si riprendono corse (7), qualità del passaggio (2) e
disordine, che oggi non rendevano perché mancava il blocco basso da scardinare.

### Mentalità (§8) — 25/09

**Passo 1, fatto:** possesso misurato come Opta (quota dei passaggi). La nettamente più forte passa da 50,4% (tempo)
a **44,5%**; la 2ª contro la 19ª al 41%.

**Passo 2, fermo.** Ablazione (4.000 partite; tra parentesi la 2ª contro la 19ª):

| Variante | Gol | Possesso della più forte | Altro |
|---|---|---|---|
| Tutto (pressione, blocco, costruzione, palla lunga) | 2,97 | 51,5% (47%) | dribbling 20,2, fuorigioco 3,3 ❌ |
| Solo pressione (sale con la mentalità, la prudente non pressa in alto) | 3,00 | 42,2% (39%) | la forte tira 34 volte |
| Pressione + blocco basso e corto | 3,26 | 42,5% | |
| Solo costruzione paziente 0,15 + palla lunga 0,003 | 2,53 | 54,1% (52%) | fuorigioco 3,0 ❌ |
| Costruzione 0,15 + palla lunga 0,0015 | 2,54 | 51,3% (48%) | fuorigioco 2,7 ❌ |
| **Costruzione 0,25, niente palla lunga** | 2,53 | 50,4% (47%) | stagioni: correlazione 0,71 / 0,75 / 0,77 ❌, punti 103 ❌ |
| Costruzione 0,25 + disordine (xG 0,3 / 0,6) | 2,70 / 2,91 | 49,4% | precisione 77,6%, fuorigioco 2,8-2,9 ❌ |

Patch: `docs/design/patches/mentalita-costruzione-v1.patch`. In questo motore pressione e blocco basso **aiutano**
la squadra forte ad arrivare al tiro (la debole che non pressa le lascia spazio, il blocco basso non toglie xG
perché l'xG vede solo la pressione, non i corpi davanti al tiro); la pazienza sposta il possesso ma, come il valore
del possesso (§6), toglie efficacia alla forte e abbassa la correlazione.

**Bilancio dei tentativi sul possesso** (valore del possesso, qualità del passaggio, corse, disordine, mentalità): il
possesso della squadra forte si sposta al massimo di 5-10 punti e ogni volta a spese di un altro target. Il modello a
catena di azioni fa decidere al portatore dove va la palla, ma non ha una fase di costruzione contro un blocco
schierato: finché non c'è, un possesso realistico e un campionato realistico non stanno insieme.

---

## 9. Rimandato (decisione di Marco, 25/09): la fase di costruzione

Possesso realistico (57-63% per la più forte), corse senza palla (intervento 7) e possesso legato alla qualità
(intervento 2) restano aperti. Serve un pezzo di modello che oggi non c'è: una **fase di costruzione contro un blocco
schierato** (linee difensive da superare, spazi fra le linee, disordine che nasce dal giro palla) e un **xG che conta
i difensori fra chi tira e la porta** (oggi vede solo la pressione). Materiale pronto in `docs/design/patches/`:
qualità del passaggio, corse, disordine, costruzione paziente, con le misure al §6. Da progettare come proposta per
dopo la 0.2.0, o per il suo finale se resta tempo.

### Intervento 4 (cross e duello aereo) — 25/09, fermo sulla precisione delle stagioni

Cross alto (anche anticipato dalla trequarti) e palla bassa all'indietro dal fondo; il cross arriva (Cross, pressione),
il portiere può uscire (Uscite alte, Comando dell'area), poi duello aereo (Colpo di testa, Coraggio, Forza, altezza:
nel modello non esiste Elevazione) o anticipo sulla palla bassa; respinta in corner o seconda palla al limite.
Cross riuscito = trova un compagno, come Opta. Patch: `docs/design/patches/cross-v1.patch` (con `match/aerial.ts`).

| 4.000 partite | Prima | Dopo |
|---|---|---|
| Cross tentati · riusciti | 5,7 · 49% ❌ | **15,5 · 22%** ✅ |
| Tiri di testa sul totale | 28,5% ❌ | 24,2% (il resto viene dai corner: intervento 8) |
| Corner · gol · gol da piazzato | 4,4 · 2,62 · 28,9% | 4,5 · 2,60 · 26,3% ✅ |
| Dribbling tentati | 15,7 | 12,4 ✅ |
| Test di buon senso | 4 su 4 | 4 su 4 (ampiezza: 23,6 cross contro 10,0) |
| Tempo | uguale (misurato contro la versione registrata nelle stesse condizioni) |

Stagioni 42 / 7 / 99: gol 2,64 / 2,68 / 2,88, correlazione 0,82 / 0,85 / 0,84. **Fuori target**: precisione dei
passaggi 77,6 / 77,9 / 77,9% (target 78-88; i cross contano come passaggi e ne riesce uno su cinque, come nei dati
Opta), e col seme 99 pareggi 20,3%, tiri 15,3, punti massimi 102. Alzare la precisione di base (passBase 4,0 → 4,3)
peggiora il resto: gol 2,42, corner sotto 4, correlazione 0,75.

### Intervento 5 (portiere) — 25/09, pronto ma fermo sulle stagioni

Parata secondo il tipo di tiro (ravvicinato: Uno contro uno, Riflessi, Uscite basse; rigore: Riflessi, Concentrazione;
altri: Riflessi, Posizionamento, Concentrazione), presa o respinta (Presa, forza del tiro), respinta in corner o
ribattuta, uscita sulle palle in profondità (Uscite basse, portiere libero), rinvio lungo (Rinvio, Colpo di testa di chi
riceve, istruzione di verticalità). Patch: `docs/design/patches/portiere-v1.patch` (con `match/keeper.ts`); valori:
presa 0, respinta in corner 0,85, ribattuta 0,12 (xG 0,25), uscita 0,06 + 0,012/punto + 0,08 libero, rinvio 0,03.

4.000 partite: tutto come prima (cross 15,7 · 22%, dribbling 12,6, contrasti 14,1, corner 4,2, gol 2,73), rinvii lunghi
3,9 a squadra, gol da piazzato 25,0% (bordo), precisione 77,1%. Test di buon senso: **la linea alta ora concede il
doppio delle palle in profondità** (0,18 contro 0,08, t 4,2: va tolto `.fails`), portiere t 4,4. Tempo +9%.
Stagioni 42 / 7 / 99: gol 2,81 / **2,94** / 2,79, pareggi **21,2 / 21,4** / 22,9%, tiri **15,2 / 15,7** / 14,6,
correlazione 0,82 / 0,76 / 0,78, punti massimi 103 (seme 99). I tiri per squadra crescono a ogni intervento
(14,1 prima del Blocco 2b; Serie A ~12,5).

### Metodo per il resto del 2b (decisione di Marco, 25/09)

Un intervento si registra quando i suoi target migliorano e nessun target si rompe in modo netto; i valori che escono
di poco (entro ~5% dal bordo, come pareggi, tiri e punti massimi che oscillano col seme) si annotano nel commit. Alla
fine del 2b una **ritaratura complessiva** esplicita, con il via di Marco: tiri, gol, pareggi, precisione riportati nel
target con poche costanti globali, una per commit, tutte misurate su 3 semi.
