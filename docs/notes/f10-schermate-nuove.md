# F10 — Le schermate nuove (Tactic F.C. Manager)

Marco ha ridisegnato le schermate con Stitch (`docs/design/stitch/`). Decisioni del 21/09/2026:
nome **Tactic F.C. Manager**, sigla **TFM 27**; icona dell'app = proposta 2, logo = proposta 1;
**si costruiscono anche le funzioni nuove** che le schermate mostrano.

Restano ferme due regole del progetto, e le schermate si adattano a loro:
- **Niente nomi veri** (regola 6): Serie B, Lega B, FIGC, Coppa Italia Frecciarossa, Atalanta, Sky Sport… diventano
  nomi inventati o generici (le leghe del mondo generato, «Coppa nazionale», «la federazione»).
- **Niente valori veri dei giocatori altrui** (§7.6): nel mercato stelle e valori sono le stime degli osservatori,
  con la loro incertezza. La colonna c'è, il numero è una stima.
- **Il gioco non va su internet**: «cloud sync», «stato server», «regione» non si fanno. «Crittografato» neppure
  (a un file di carriera non serve).

## Ordine di lavoro

| # | Parte | Cosa c'è di nuovo oltre allo stile |
|---|---|---|
| 1 | Cornice: barra laterale a gruppi con icone, barra in alto (logo TFM 27, ricerca, data, cassa) | nuovi colori e icone |
| 2 | Rosa | schede Generale / Contratti / Forma e statistiche / Report medico, filtri per reparto e «in scadenza» |
| 3 | Classifiche | riquadri delle zone, ultime 5, prossimo avversario, marcatori, assist, media voto, disciplina, viste casa/trasferta/forma |
| 4 | Calendario | gara in evidenza, risultati della giornata, report sull'avversario (modulo probabile, uomo pericoloso, precedenti), orari, derby, amichevoli estive, esportazione iCal |
| 5 | Finanze | riquadri, entrate/uscite per voce, stagioni passate, rate, andamento mese per mese |
| 6 | Dirigenza | capitale politico, rinegoziazione con cursore, storico delle stagioni, richieste a costo |
| 7 | Osservatori | budget scouting, posti nello staff, conoscenza per nazione, report con consiglio, mercato degli osservatori e analisti |
| 8 | Vivaio | strutture, reclutamento, prossima annata con anteprima, minutaggio, convocati in nazionale, responsabile del vivaio, tornei giovanili |
| 9 | Storie e stampa | schede squadra / campionato / rassegna, filtri, giornale con titolo, clima mediatico, cronaca di lega |
| 10 | Mercato | filtri laterali (ruolo, nazionalità, età, valore, ingaggio, in scadenza, disponibili, profili noti), ordinamenti, pagine |
| 11 | Partita dal vivo | nuova disposizione: panchina con voti, statistiche, analista, regolazioni rapide, cronaca scorrevole |
| 12 | Nuova carriera | due passi: scelta club a schede con filtri, poi dossier (bilancio, strutture, perni della rosa, moduli consigliati), nome e filosofia |
| 13 | Impostazioni e salvataggi | 5 slot con nome, dimensione e tempo di gioco; esporta/importa carriera; valuta; formato data; schermo intero; pausa sulle notizie importanti; volumi separati per stadio ed effetti |

Scrivania, Tattica, Allenamento, Spogliatoio, Trattativa e Scheda giocatore non hanno ancora un disegno: prendono lo
stile nuovo dalla cornice e dai componenti comuni, senza cambiare disposizione.

Ogni parte: test verdi, typecheck pulito, report del sim nei target se tocca il motore, un commit.
