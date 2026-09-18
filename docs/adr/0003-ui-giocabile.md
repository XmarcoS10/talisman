# ADR 0003 — Prima build giocabile (F4)

**Data:** 18/09/2026 · **Stato:** accettato

## Fatto
- **Tattica**: campo con i titolari, assegnazione trascinando o cliccando (slot → giocatore), ruolo per slot, mentalità
  e 5 istruzioni; "Scegli i migliori"; avvisi per indisponibili. 27 ruoli nel motore con effetti misurati.
- **Formazione dell'utente** usata davvero in partita, con sostituzioni automatiche e notizie.
- **Rosa** con viste (Generale, Statistiche, Tecnici, Mentali, Fisici, Portiere), ordinamento su ogni colonna.
- **Club** di qualunque squadra (da Classifiche, ricerca, profilo giocatore).
- **Ricerca globale** con "/", **Spazio** per avanzare/chiudere.
- **Salvataggi**: 3 slot + esporta/importa su file (passa dalle migrazioni); salvataggi v3.
- **Calendario**: dopo ogni giornata il gioco va al giorno della partita successiva, così forma e infortuni mostrati
  sono quelli reali al momento di scegliere la formazione.

## Rimandato rispetto al prompt P5
| Cosa | Perché / quando |
|---|---|
| Zustand + motore in Web Worker | lo stato React basta; l'avanzamento dura ~120 ms: il Worker servirà col 2D (F6) o se il mondo cresce |
| TanStack Table, 40 colonne e viste salvabili | 6 viste fisse coprono l'uso; tabelle virtualizzate con lo scouting (F7) |
| Istruzioni individuali, familiarità tattica, piani partita | familiarità con l'allenamento (F5), piani partita con la panchina live (F6) |
| Eventi che bloccano l'avanzamento | oggi le assenze si gestiscono da sole con notizia; blocchi veri con conferenze/trattative (F7-F8) |
| Salvataggi su file nativi (preload Electron) | localStorage + esporta/importa bastano finché il mondo pesa ~1-2 MB |
