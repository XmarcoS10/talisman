# Partita 2D: perché non si capisce e come renderla pulita (piano, 01/10)

Richiesta di Marco: «come si vede l'engine continua a non capirsi niente»; che i moduli si riconoscano in campo.
Analisi fatta guardando la partita vera: video e fotogrammi con `tools/match-film.cjs` (finestra registrata in WebM,
un fotogramma del campo ogni secondo o ogni 0,25 s), misure sul registro del campo con `tools/diag-shape.ts` (forma)
e `tools/diag-avgpos.ts` (posizioni medie per ruolo, come la mappa di FM).

## Cosa si vede oggi

1. **Squadra lunga e sfilacciata.** Senza palla i dieci di movimento occupano **46 m** in lunghezza (reale 30-40):
   la difesa resta bassa e le punte alte. Con palla 59 m in lunghezza ma solo **49 m** in larghezza (reale 55-65).
2. **I difensori centrali non salgono mai.** Posizione media 22-24 m dalla propria porta *sia con palla sia senza*;
   nella realtà con la squadra in attacco la linea sta a 40-50 m. Linea difensiva media a 25 m dalla porta.
3. **Il modulo si sbriciola in coppie.** Nella propria metà campo ognuno prende l'attaccante più vicino (`markUp`):
   la linea da cinque o da quattro non esiste più, restano coppie difensore-attaccante sparse. Da qui anche le
   **0,2 coppie di pallini sovrapposti per istante** (numeri illeggibili, «2/11», «3/10»).
4. **Il tridente del 4-3-3 non rientra né pressa insieme**: senza palla resta a 70 m, 47 m davanti alla difesa.
5. **I moduli però ci sono**: in media il 4-4-2 senza palla fa due linee da quattro (21-24 m e 41-46 m) e due punte
   a 60 m; il 4-3-3 ha il vertice basso e i tre davanti. Il problema è che il blocco non si muove come un blocco.
6. **Lettura dello schermo**: in vista Completa il campo è piccolo (circa metà della finestra), la pioggia disegna
   righe sopra tutto, le scritte («FALLO», cartellino) coprono palla e giocatori, i numeri sono quelli dello slot.

7. **Passaggi al rallentatore.** La palla viaggia sempre per il 60% dell'azione (`MATCH.ballFlight`), qualunque sia
   la distanza: un passaggio di 15 m in un'azione di 3 s va a 5 m/s (reale 15-25). Circa 200 passaggi lenti a
   partita; il 9% dei passaggi arriva a più di 2 m dal ricevitore (fino a 14 m: la palla «si incolla» al giocatore).
8. **Contrasti a distanza.** Il difensore parte in media da 4 m (64% dei contrasti oltre 3 m) e non va verso la palla:
   è la palla che scivola da lui, come un passaggio all'avversario.
9. **Intercetti che cambiano direzione.** La palla vola verso il destinatario previsto, poi a metà strada cambia
   direzione verso chi la intercetta; l'anello del possesso passa a lui prima che la palla arrivi (per l'8% del tempo
   la palla è a più di 1,5 m da chi «la porta»).
10. **Il gol non si vede.** La palla arriva sulla linea e in 0,6 s si riparte dal centrocampo con tutti già al loro
    posto: il tempo morto è compresso, niente palla in rete, niente pausa. Anche per questo ~10 salti di giocatori a
    partita.
11. **Tiro uguale a un passaggio** (nessuna scia né effetto); il portiere a volte finisce col pallino oltre la linea.
12. **Bordi**: chi è sulla linea laterale è tagliato a metà dal bordo del campo, nome compreso; gruppi di 3-4 pallini
    uno sull'altro dove c'è la palla.

Misure: `tools/diag-glitches.ts` (campiona la riproduzione come lo schermo, ogni 0,1 s); momenti al rallentatore
(contrasto, intercetto, tiro, gol, un fotogramma ogni 0,1 s) con `tools/match-moments.cjs`.

Causa nel codice (`match/positioning.ts`): le posizioni seguono la palla con coefficienti fissi e piccoli
(senza palla 0,45 zone per zona di palla, con palla `role.follow` ≈ 0,5), invece di agganciare tutti a una
**linea difensiva** che si sposta con la palla e da cui le altre linee stanno a distanza fissa.

## Il piano

### Fase 1 — leggere lo schermo (solo interfaccia, il motore non cambia) — FATTA nella 0.14.1
Pulsante «Campo grande» (`settings.bigPitch`, classe `.live.big`), margine `PAD` in `renderer.ts` (`fitScale`),
pallini scostati solo nel disegno (`spread`), sovrapposizione «Reparti» (`units`, ruoli in `Look.pos`), pioggia sotto i
giocatori e più leggera, fallo e cartellino accanto al giocatore (`fx.ts`). La linea del modulo resta da provare a occhio.

- **Campo grande**: in vista Completa il campo prende lo spazio dei pannelli laterali (pannelli richiudibili, come FM).
- **Bordi**: un margine attorno al campo, così chi è sulla linea laterale si vede intero.
- **Pallini che non si coprono**: nel disegno, chi è a meno di un pallino da un altro viene scostato di quel poco
  che serve (le posizioni del motore restano quelle).
- **Meno rumore**: pioggia più leggera e sotto i giocatori; scritte di fallo e cartellino accanto, non sopra.
- **Forma visibile a richiesta**: sovrapposizione «linee del modulo» che unisce i reparti (difesa, centrocampo,
  attacco) di ciascuna squadra, così si legge 4-4-2 o 3-5-2 a colpo d'occhio.
- Verifica: `tools/match-film.cjs`, sovrapposizioni misurate sul disegno = 0, foto prima/dopo.

### Fase 2 — passaggi, contrasti, tiri e gol (racconto del motore: il bilanciamento NON cambia) — FATTA nella 0.14.2
`ballPlan` e `shotTarget` in `positioning.ts`, velocità `MATCH.ballPass/ballLong/ballShot`, `ballGlue`, `tackleContest`,
`goalHold`. Misure `diag-glitches` (6 partite), prima → dopo: palla che salta 2,2 → 0 a partita; passaggi lenti
207 → 0,5; presi a più di 2 m 9,1 → 3,7%; palla lontana da chi la porta 8,1 → 2,1% del tempo; gol con la palla in
rete 0 → 20 su 20. Golden master: risultati identici, cambia solo l'impronta della traccia. Restano ~10 salti di
giocatori a partita (calci d'inizio e cambi) e il portiere a volte oltre la linea.

Tutto in `replay` di `match/positioning.ts`, che racconta come si arriva alle posizioni già decise dal motore (il
vincolo scritto lì: le posizioni di fine intervallo restano quelle del motore, stesso consumo di caso).
- **Palla alla velocità giusta**: il volo dura distanza / velocità (passaggio 15-22 m/s, lancio 20-25, tiro 25-30,
  conduzione col passo di chi corre), non il 60% fisso dell'azione; il resto è controllo e conduzione.
- **Intercetto vero**: la palla va verso il destinatario e si ferma dove la prende il difensore, sulla traiettoria;
  l'anello del possesso passa quando la palla arriva.
- **Contrasto vero**: il difensore va addosso al portatore, la palla resta al portatore fino al contatto e poi
  schizza al vincitore (o lì vicino).
- **Gol**: la palla entra in rete, gioco fermo di 2-3 s di riproduzione con la scritta, i giocatori tornano nella
  propria metà camminando, poi il calcio d'inizio. Stesso trattamento leggero per rimesse e falli.
- **Tiro riconoscibile**: palla più veloce con scia; portiere che resta davanti alla linea.
- Misure (`diag-glitches`): passaggi lenti ~0, presi a più di 2 m < 1%, palla lontana da chi la porta < 1% del
  tempo, contrasti entro 1,5 m, salti di giocatori 0 fuori dai cambi; golden master invariato.

### Fase 3 — il blocco che si muove insieme (motore) — FATTA nella 0.15.0
`aimAtt` e `shapeDef` in `positioning.ts`: linea arretrata a `blockAttGap`/`blockDefGap` dietro la palla fra un minimo e
un massimo, reparti a distanza fissa (`blockAttDepth`, `blockDefDepth`), marcatura a zona (`inMarkZone`: l'uomo solo
entro `markNearBall` dalla palla o con la linea sotto `markBoxX`). Forma (`diag-shape`): senza palla 46 × 36 m → 37 × 38,
con palla 59 × 49 → 55 × 53; test `match/shape.test.ts`. Ritaratura: attaccanti più alti (`blockAttDepth` 1),
`xgBase` −0,99 → −0,87, `pressFoul` 0,045 → 0,04, pioggia sui passaggi 0,12/0,30 → 0,15/0,38. Batteria in
`motore-v2.md` §14.

- **Linea difensiva agganciata alla palla**: altezza = palla meno 25-30 m (con palla meno 35-45 m), fra un minimo
  vicino all'area e un massimo verso la metà campo, spostata dall'istruzione Linea difensiva e dalla mentalità.
- **Reparti a distanza fissa dalla linea** (difesa → centrocampo → attacco, 10-15 m l'uno dall'altro) presi dal
  modulo: il modulo diventa la *forma* del blocco, non una posizione assoluta.
- **Difesa a zona**: si tiene il proprio posto nella linea; si prende l'uomo solo vicino alla palla, in area o con
  l'istruzione «marca stretto».
- **Punte senza palla**: rientrano col blocco, tranne chi ha il ruolo «Resta alto»; col pressing alto pressano
  insieme alla squadra invece di aspettare.
- **Ampiezza con palla**: terzini ed esterni larghi fino a 55-65 m di squadra.
- Misure: `diag-shape` nei valori reali (senza palla 30-40 × 35-45 m, con palla 45-55 × 55-65 m, linea a 25-35 m
  dietro la palla), `diag-avgpos` con le linee dei moduli riconoscibili, poi la batteria di bilanciamento
  (`tools/battery.sh`): cambiando le posizioni cambiano linee di passaggio, pressione e fuorigioco, quindi va
  ritarato. Golden master aggiornato apposta.

### Fase 4 — rifinitura — FATTA nella 0.15.1
Salti dei giocatori: nessuno oltre 2 m in 0,1 s (restano ~11 scatti da 12-15 m/s quando si ricongiungono alle
posizioni del motore a fine azione). Portiere oltre la linea: non più presente dalla 0.15.0. Tiro parato: la palla si
ferma sulle mani del portiere, quello fuori accanto al palo (`shotTarget`). `xgBase` −0,87 → −0,84: stagioni gol
2,55, pareggi 22,9%, correlazione 0,80; carriere 0,74 / 0,73.
- **Test della forma**: un test che fallisce se un 4-4-2 senza palla non ha due linee da quattro o se il blocco
  supera 40 m (la forma non deve più rompersi senza che ce ne accorgiamo).
- **Transizioni leggibili**: dopo la palla persa si vede chi contrapressa e chi rientra (la logica c'è già).
- **Palla**: ombra e altezza nei lanci, il destinatario evidenziato.
- Nuovo video e confronto con quello di oggi.

Ordine consigliato: Fase 1 e Fase 2 subito (rischio zero per il bilanciamento: sono schermo e racconto), poi la
Fase 3 (il cuore, con le misure e la ritaratura), poi la 4.
