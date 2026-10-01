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

Causa nel codice (`match/positioning.ts`): le posizioni seguono la palla con coefficienti fissi e piccoli
(senza palla 0,45 zone per zona di palla, con palla `role.follow` ≈ 0,5), invece di agganciare tutti a una
**linea difensiva** che si sposta con la palla e da cui le altre linee stanno a distanza fissa.

## Il piano

### Fase 1 — leggere lo schermo (solo interfaccia, il motore non cambia)
- **Campo grande**: in vista Completa il campo prende lo spazio dei pannelli laterali (pannelli richiudibili, come FM).
- **Pallini che non si coprono**: nel disegno, chi è a meno di un pallino da un altro viene scostato di quel poco
  che serve (le posizioni del motore restano quelle).
- **Meno rumore**: pioggia più leggera e sotto i giocatori; scritte di fallo e cartellino accanto, non sopra.
- **Forma visibile a richiesta**: sovrapposizione «linee del modulo» che unisce i reparti (difesa, centrocampo,
  attacco) di ciascuna squadra, così si legge 4-4-2 o 3-5-2 a colpo d'occhio.
- Verifica: `tools/match-film.cjs`, sovrapposizioni misurate sul disegno = 0, foto prima/dopo.

### Fase 2 — il blocco che si muove insieme (motore)
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

### Fase 3 — rifinitura
- **Test della forma**: un test che fallisce se un 4-4-2 senza palla non ha due linee da quattro o se il blocco
  supera 40 m (la forma non deve più rompersi senza che ce ne accorgiamo).
- **Transizioni leggibili**: dopo la palla persa si vede chi contrapressa e chi rientra (la logica c'è già).
- **Palla**: ombra e altezza nei lanci, scia del passaggio, il destinatario evidenziato.
- Nuovo video e confronto con quello di oggi.

Ordine consigliato: Fase 1 subito (rischio zero, si vede la differenza), poi Fase 2 (il cuore, con le misure), poi 3.
