# Note di rilascio

## 0.1.0 — prima versione di collaudo

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
