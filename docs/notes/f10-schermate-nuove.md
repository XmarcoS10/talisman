# F10 — Le schermate nuove (Tactic F.C. Manager)

Marco ha ridisegnato le schermate con Stitch (`docs/design/stitch/`). Decisioni del 21/09/2026:
nome **Tactic F.C. Manager**, sigla **TFM 27**; icona dell'app = proposta 2, logo = proposta 1;
**si costruiscono anche le funzioni nuove** che le schermate mostrano.

Restano ferme tre regole del progetto, e le schermate si adattano a loro:
- **Niente nomi veri** (regola 6): Serie B, Lega B, FIGC, Coppa Italia Frecciarossa, Atalanta, Sky Sport… diventano
  i nomi del mondo generato («Coppa nazionale», «Il Mattino di <città>»).
- **Niente valori veri dei giocatori altrui** (§7.6): nel mercato stelle e potenziale sono le stime degli osservatori,
  con la loro incertezza.
- **Il gioco non va su internet**: «cloud sync», «stato server», «regione» non si fanno. «Crittografato» neppure.

La cartella dati resta `talisman` (i salvataggi di prima si ritrovano) e anche gli identificatori interni.

## Fatto

| # | Parte | Cosa c'è di nuovo |
|---|---|---|
| 1 | Cornice | barra laterale a gruppi con icone (lucide), barra in alto TFM 27 con data e cassa, colori e caratteri dei disegni (Space Grotesk), suggerimenti ridisegnati |
| 2 | Rosa | schede Contratti e Report medico, filtri per reparto e «in scadenza», età media, monte ingaggi, under 21 |
| 3 | Classifiche | viste casa / trasferta / ultime 5 / xG, ultime 5, prossimo avversario, riquadri delle zone, marcatori, assist, medie voto, disciplina, rigori |
| 4 | Calendario | gara in evidenza, orari del calcio d'inizio, rivalità storiche, andata/ritorno e mesi, risultati della giornata, report sull'avversario con consiglio dell'analista, esportazione iCal; scheda **Coppa nazionale**; **test precampionato** |
| 5 | Finanze | riquadri, rendiconto con **proiezione di fine stagione** e stagioni chiuse, rate con creditori e debitori, **cassa mese per mese** |
| 6 | Dirigenza | riquadri, fiducia con giudizi a parole, rinegoziazione con cursore e **costo in anteprima**, storico, richieste; nuova richiesta **«espandi la rete scouting»** |
| 7 | Osservatori | riquadri (stipendi, posti nello staff, conoscenza per nazione, segnalati), incarichi, rapporti a schede con grado, mercato di osservatori e analisti |
| 8 | Vivaio | strutture e reclutamento, **anteprima della prossima annata**, minutaggio, **campionato Primavera**, nazionali, investimenti, responsabile del vivaio |
| 9 | Storie e stampa | conferenza a una domanda per volta con tono ed effetti, conferma; giornale con titolo; clima mediatico; cronaca di lega; filtri e ricerca |
| 10 | Mercato | filtri laterali con cursori e interruttori, ordinamento anche per scadenza, ricerca nella lista, pagine, esportazione CSV |
| 11 | Partita dal vivo | tabellone, barra dell'inerzia con gli eventi, **indicazioni dalla panchina** (incoraggia / chiedi di più / calma), regolazioni rapide, cronaca scorrevole |
| 12 | Nuova carriera | due passi: club a schede con filtri, poi dossier (bilancio, strutture, perni, modulo più adatto); **filosofia dell'allenatore** |
| 13 | Impostazioni e salvataggi | **5 slot** con nome, peso e tempo di gioco; apri/copia cartella; esporta/importa carriera (`.tfm`); **valuta**, **formato data**, schermo intero, **pausa sulle notizie importanti**, salvataggio automatico disattivabile, volume effetti separato, silenzio fuori finestra |

## Seconda passata: DESIGN.md e specifiche (21/09/2026)

Marco ha mandato `docs/design/DESIGN.md` e `docs/design/tfm_27_specifiche_complete_per_claude.md` (erano nello zip
di Stitch). Applicati:
- **Base grafica**: Space Grotesk (titoli), Hanken Grotesk (testo), JetBrains Mono (numeri); palette `#0f131d`,
  `#171b26`, verde `#00f59b`, ciano `#06b6d4`, ambra `#f59e0b`, rosso `#ef4444`; pannelli vetro (la sfocatura solo su
  modali, popup e barre: su tutti i pannelli rallentava il disegno senza vedersi); bottoni con alone, campi con bordo
  ciano al fuoco; tabelle a 36 px con righe alterne; ruoli colorati per reparto; voti a chip (8+ verde, 6,8-7,9
  ciano, 6-6,7 grigio, sotto 6 rosso); attributi 16-20 verde, 11-15 ambra, 1-7 rosso.
- **Scrivania**: riquadri, gara in arrivo con «Vai alla partita» e «Imposta formazione», notizie, mini classifica.
- **Tattica**: maglie numerate con anello doppio (condizione verde, familiarità col ruolo ciano), barra della
  familiarità col modulo, titolari e riserve con condizione e ruolo naturale.
- **Scheda giocatore**: intestazione con avatar, sei schede, radar ottagonale (stime per i giocatori altrui).
- **Spogliatoio** e **Allenamento**: riquadri e stile nuovo (i contenuti delle specifiche c'erano già).
- **Report partita**: migliore in campo, barre di confronto, voti colorati.
- **Mercato**: «Fai offerta» su ogni riga. **Salvataggi**: file `.dsa`, misura della finestra, controllo di integrità.
- Barra laterale richiudibile a 64 px, colonne impilate sotto i 1280 px.

Il nome resta **Tactic F.C. Manager**, come deciso da Marco il 21/09: le specifiche dicono ancora «Talisman
Football Manager 27». I nomi veri delle specifiche (Serie B, Virtus Roccabianca come esempio) restano quelli del mondo
generato; playoff e playout ancora da decidere.

## Le funzioni nuove nel motore

- **Coppa nazionale** (`engine/cup.ts`, schema 18): eliminazione diretta fra tutti i 40 club, partita secca, rigori
  se finisce pari. Le 8 più blasonate entrano agli ottavi (come nelle coppe vere: altrimenti le grandi giocano sei
  partite in più e la stagione le schiaccia). Turni infrasettimanali in `CUP.days`, premi alla vincitrice e alla
  finalista, albo d'oro. Le gare di coppa non contano nelle statistiche di campionato.
- **Amichevoli estive** (`engine/friendlies.ts`, schema 19): tre partite del club dell'utente col motore vero, con un
  generatore tutto loro (non spostano il caso del mondo). Solo risultati: la condizione estiva c'era già.
- **Primavera** (`engine/youth/primavera.ts`): derivata, non salvata. Ogni risultato nasce da un seme fisso e dalla
  forza del vivaio (strutture, reclutamento, blasone), valori che in stagione non cambiano.
- **Filosofia dell'allenatore** (schema 17, `STYLE` in balance.ts): gestore = morale +4 per tutti; tattico = moduli
  imparati il 30% più in fretta; scopritore = under 21 crescono il 15% di più. Solo per il club dell'utente.
- **Indicazioni dalla panchina** (`runMatch().shout`, `MATCH.shout*`): una ogni 15', piccola spinta al logit del
  giorno che dipende dal carattere; chiedere di più a chi regge male la pressione fa peggio.
- **Posti nello staff osservatori** (schema 16): la società ne concede 4, la richiesta «espandi la rete» ne aggiunge uno.
- **Cassa mese per mese** (schema 15) e **proiezione del conto** (`projection` in ledger.ts).

## Bilanciamento

`pnpm sim --seasons 10 --seed 42` dopo la coppa: gol 2,85, infortuni 17,9 (ritoccato `TRAIN.injuryBase` da
0,0028 a 0,0024 per le partite in più), **pareggi 21,9% e correlazione forza↔punti 0,74: appena sotto i target**
(22% e 0,75). Non è la coppa da sola: su 30 stagioni la correlazione è 0,68 anche **senza** coppa (0,64 con) — il
motore perde un po' di gerarchia sulle carriere lunghe, e su 10 stagioni questi due numeri ballano di ±0,02 col seme
(seme 7: 23,6% e 0,75, entrambi in target). Da guardare quando si ritara il motore partita, non adesso.

Provato e scartato: far fare turnover all'IA in coppa. Peggiora (0,63): i titolari tenuti fuori perdono minuti e
morale, e rendono meno in campionato.

## Non fatto (e perché)

- **Playoff e playout** della Serie B nei disegni: cambierebbero promozioni e retrocessioni del motore; è una scelta di
  regolamento, da decidere con Marco.
- **Meteo** in partita e **foto** (stadio, giornalisti, centro sportivo): servono immagini che non abbiamo.
- **Sovrapposizioni sul campo** (rete passaggi, zone di pressing, baricentro sopra il 2D): ci sono già nei grafici
  dell'analista, non sopra il campo.
- Scrivania, Tattica, Allenamento, Spogliatoio, Trattativa e Scheda giocatore non hanno un disegno: hanno preso lo
  stile nuovo dalla cornice e dai componenti comuni, senza cambiare disposizione.
