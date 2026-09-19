# ADR 0005 — Partita in 2D e pannello analista (F6)

**Data:** 20/09/2026 · **Stato:** accettato

## Fatto
- **Motore eseguibile azione per azione**: `runMatch()` in `match/engine.ts` restituisce un controllo (`tick`, `sub`,
  `minute`, `score`, `result`). `simulate()` è ora solo `runMatch(...).result()`, quindi il mondo che avanza e il sim-cli
  non cambiano comportamento.
- **Registro per il 2D**: ogni azione produce un `TraceStep` con le posizioni di tutti i giocatori in campo in coordinate
  globali, la palla, il portatore, il destinatario, l'esito, il minuto, il punteggio e il momentum.
- **Interpolazione** (`ui/match/playback.ts`): tra un fotogramma e il successivo i giocatori *corrono* verso la posizione
  nuova e la palla viaggia sulla traiettoria dell'azione (passaggio, conduzione, tiro), poi aspetta. La grafica non è la
  verità: racconta la verità di L2.
- **Campo** (`ui/match/renderer.ts`): canvas 2D senza librerie, telecamera che insegue la palla con smorzamento e non esce
  dal campo, dischi con numero e colori del kit, scia della palla.
- **Schermata Live**: panchina a sinistra (condizione, voto, cambi), campo e controlli al centro (play/pausa, 1×/2×/4×,
  prossimo episodio, pausa tattica, tutto il campo, salta al finale), timeline degli episodi cliccabile, pannello analista
  a destra con 4 tab (momentum, pressing con PPDA e zone, rete dei passaggi, duelli).
- **Frase dell'analista**: 66 regole sui dati live (`ui/match/analyst.ts` + testi in `it.json`), una ogni 5 minuti di gioco,
  ognuna con un suggerimento concreto; non si ripete la stessa per 20 minuti.
- **Giornata seguita dal vivo**: `beginMatchDay()` / `finishMatchDay()` in `world.ts`. La partita dell'utente si gioca
  mentre la guarda, le altre alla fine; poi settimana di allenamento e spogliatoio come sempre.

## Scelte e semplificazioni
| Cosa | Perché |
|---|---|
| La simulazione avanza "quanto serve" alla riproduzione | niente attesa iniziale: il primo fotogramma è pronto subito e i cambi dell'utente contano davvero |
| Un fotogramma per azione (≈1.200 a partita), non un tick fisso | il movimento continuo lo fa l'interpolazione; il registro resta leggero e non si salva |
| Erba disegnata a strisce invece della texture da ComfyUI | la texture si può aggiungere dopo senza toccare il resto |
| Cambi e istruzioni dal vivo cambiano la tattica del club | come in FM: quello che decidi in panchina resta |
| Niente numeri di maglia nel modello | numerati per ordine di formazione; i numeri veri arrivano col database della community |
| "Piani partita" (fino a 3 piani condizionali) | rimandati: prima si guarda una partita vera e si capisce quali piani servono davvero |
| Uscire dal gioco durante una partita seguita | il salvataggio resta a prima della partita: si rigioca la giornata, nessun dato incoerente |

## Verifica
`src/ui/match/playback.test.ts`: fotogrammi coerenti (22 giocatori dentro il campo, tempo che non torna indietro),
simulazione pigra, cambio dalla panchina che entra davvero, almeno 60 regole dell'analista senza ripetizioni.
I fotogrammi al secondo vanno provati a mano: il browser ferma l'animazione quando la finestra non è in primo piano.
