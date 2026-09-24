# Note di rilascio

## 0.1.1 — per il collaudo esterno

La versione da dare ai tester (istruzioni e modulo in `docs/collaudo.md`). I salvataggi della 0.1.0 si aprono:
passano al formato 20.

- **Offerte per i tuoi giocatori**: nelle finestre di mercato gli altri club ti fanno offerte, e decidi tu dalla
  Scrivania: accetti, rifiuti o chiedi di più. Se un giocatore sognava quel club e gli dici di no, se lo ricorda.
- **Mercato dell'IA più vivo**: i club grandi riescono a comprare i titolari dei piccoli, e il campionato non si
  appiattisce dopo qualche stagione.
- **Stemmi** tutti diversi (8 scudi, 12 partizioni, 10 simboli), **maglie** con 15 disegni e seconda maglia (in partita
  le squadre non si confondono più), **volti** dei giocatori secondo nazionalità, età e altezza.
- **Grafica generata**: sfondi delle schermate, illustrazioni delle storie e grana dell'erba sul campo 2D.
- Modelli di segnalazione su GitHub per bug e impressioni.

## 0.1.0 — Tactic F.C. Manager (TFM 27)

Il gioco cambia nome (prima era Talisman) e faccia: tutte le schermate rifatte sui disegni di Marco. I salvataggi di
prima si ritrovano. Novità di gioco:

- **Coppa nazionale** a eliminazione diretta, con rigori, premi e albo d'oro; **amichevoli estive**.
- **Campionato Primavera** del vivaio e anteprima della prossima annata.
- **Filosofia dell'allenatore** da scegliere a inizio carriera: gestore, tattico o scopritore di talenti.
- **Indicazioni dalla panchina** in partita: incoraggia, chiedi di più, calma.
- Finanze con proiezione di fine stagione e cassa mese per mese; richiesta alla dirigenza per allargare lo staff
  osservatori; classifiche casa/trasferta/forma/xG; report sull'avversario; esportazione del calendario.
- **5 slot** con nome e tempo di gioco, valuta e formato data a scelta, pausa sulle notizie importanti.

### Prima versione di collaudo

La prima versione da far provare a persone che non hanno scritto il gioco. Obiettivo del collaudo (GUIDA §9, F9):
tre tester esterni completano una stagione senza chiedere aiuto.

### Cosa c'è

- Installer per Windows (`TFM27-Setup.exe`, 113 MB): si installa nella cartella dell'utente, senza
  permessi di amministratore; aggiornamento automatico spento. Funziona senza internet: i caratteri sono nel gioco.

- Due campionati inventati, Serie A e Serie B, venti squadre ciascuno, promozioni e retrocessioni.
- Partita dal vivo in 2D con panchina, pausa tattica, analista; oppure simulata all'istante.
- Tattica con cinque moduli e i ruoli per ogni posizione; allenamento a dodici sedute settimanali.
- Spogliatoio: grafo dei rapporti, leader, faide, morale contagioso, promesse.
- Mercato con trattative, agenti, contratti, prestiti, parametro zero; osservatori e stime al posto dei valori veri.
- Finanze per cassa con fair play finanziario; dirigenza con obiettivo rinegoziabile ed esonero.
- Vivaio con annate estive; nazionali con pause, Europeo e Mondiale.
- Quaranta tipi di storie e le conferenze stampa che ne nascono.
- Suggerimenti alla prima apertura di ogni schermata e una prima partita guidata.
- Salvataggi su file, registro degli errori e diagnostica esportabile.

### Limiti noti

- **L'installer non è firmato**: Windows mostrerà l'avviso «editore sconosciuto» (SmartScreen). Firmarlo richiede un
  certificato di firma del codice, che si compra; per il collaudo basta cliccare «Ulteriori informazioni → Esegui comunque».
- **La versione Linux (AppImage)** è configurata ma va costruita su Linux (`pnpm dist:linux`): da Windows non si può.
- Le partite delle nazionali non si guardano: si calcolano con un modello semplificato.
- L'intelligenza artificiale non fa offerte per i giocatori dell'utente (manca la schermata per accettarle).
- Il mercato dell'IA è prudente: i club accumulano cassa e le bancarotte, possibili come regola, non succedono.
- La partita in 2D è leggibile ma essenziale: duelli, parate e piazzati non hanno ancora una rappresentazione propria.
- Una simulazione di 10.000 partite richiede circa 47 secondi, oltre l'obiettivo di 20: non si nota giocando.

### Per chi aggiorna da versioni di sviluppo

I salvataggi vecchi si aprono: passano dalle migrazioni fino al formato 14. Nell'app desktop, alla prima apertura, gli
slot vengono copiati dall'archivio del browser a file veri; la copia vecchia resta come riserva.
