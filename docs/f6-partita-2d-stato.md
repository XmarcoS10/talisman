# F6 — Partita in 2D: cosa c'è, come funziona, cosa non va

Nota di stato scritta per farsi dare un parere esterno. Progetto: **Talisman**, manageriale di calcio gratuito,
Electron + React 19 + TypeScript strict + Vite, tutto in `D:\Fm27`. Regole del repo in `CLAUDE.md`, specifica in `GUIDA.md`
(la fase F6 corrisponde al prompt **P10** e alla specifica di schermata **§8.4**).

**Stato:** F6 committata (`c45a481`), test verdi (39), typecheck pulito, bilanciamento invariato (2,60 gol a partita).
**Giudizio dell'utente dopo la prova: "non si capisce cosa succede, troppo casino".** Questa nota serve a decidere come sistemarlo.

---

## 1. Da dove parte il 2D: il motore partita (L2)

Il motore non è fisico: è una **catena di decisioni del portatore di palla** su una griglia continua 12 × 8 zone
(1 zona ≈ 8,75 × 8,5 m). Ogni "azione" è un passaggio, un dribbling, un tiro o un cross, scelta con un softmax fra le
opzioni disponibili. Tra un'azione e l'altra tutti i 22 giocatori si spostano verso la loro posizione ideale del momento
(modulo + posizione della palla + ruolo) a velocità limitata.

Numeri misurati su una partita intera (seed fisso):

| Dato | Valore |
|---|---|
| Azioni (= fotogrammi disponibili per il 2D) | **811** |
| di cui passaggi | 778 (96%) |
| tiri | 26 (di cui 19 con xG ≥ 0,05) |
| cross | 5 · dribbling riusciti: 2 |
| Durata media di un'azione | **6,7 secondi di gioco** |
| Eventi "da timeline" (gol, cartellini, cambi, infortuni) | 13 |

## 2. Cosa è stato costruito nella fase F6

### Motore (`src/engine/`)
- `match/engine.ts`: la funzione `simulate()` è stata spezzata in `runMatch(rng, setups, trace?)`, che restituisce un
  oggetto **eseguibile azione per azione**: `tick()`, `done`, `minute()`, `score`, `events`, `teams`, `frames`,
  `sub(side, outId, inId)`, `rating(mp)`, `result()`. `simulate()` ora è `runMatch(...).result()`, quindi il resto del
  gioco (mondo che avanza, sim-cli, test) non cambia comportamento.
- `TeamSetup.auto = false` per la squadra dell'utente quando guarda: i cambi automatici del motore si spengono e li fa lui.
- **Registro per il 2D** (`TraceStep`, uno per azione): posizioni di **tutti** i giocatori in campo in coordinate globali
  (la squadra ospite viene specchiata), palla, destinazione, portatore, destinatario, esito, probabilità, xG, minuto,
  punteggio, momentum. Si crea solo se si passa un array `trace` (il resto del gioco non paga nulla).
- `world.ts`: `beginMatchDay()` (apre la giornata e restituisce la partita dell'utente da seguire) e `finishMatchDay()`
  (applica il risultato, gioca le altre partite, fa passare la settimana di allenamento/spogliatoio).

### Interfaccia (`src/ui/match/` e `src/ui/screens/`)
- `playback.ts` — **interpolazione**: costruisce una linea del tempo cumulata dai fotogrammi; `sample(T)` restituisce
  le posizioni interpolate dei giocatori (chi c'è in entrambi i fotogrammi "corre" verso la posizione nuova) e la palla,
  che percorre la traiettoria dell'azione nel primo 65% dell'intervallo e poi aspetta. `ensure()` fa avanzare la
  simulazione **solo quanto serve** alla riproduzione (così i cambi dell'utente contano davvero).
  Velocità attuali: `SPEEDS = [30, 60, 120]` **secondi di gioco per secondo reale** (1× = partita in ~3 minuti).
- `renderer.ts` — canvas 2D senza librerie: erba a strisce, segnature, dischi con numero e colori del kit, scia della palla,
  telecamera che insegue la palla con smorzamento (zoom 1,45) e resta dentro il campo.
- `screens/Live.tsx` — schermata: colonna sinistra `LiveBench.tsx` (undici in campo con condizione, voto live, cambi veri),
  centro con punteggio, campo, controlli (play/pausa, 1×/2×/4×, prossimo episodio, pausa tattica con mentalità e
  istruzioni, tutto il campo, salta al finale) e timeline cliccabile degli episodi; colonna destra `LiveAnalyst.tsx`.
- `analyst.ts` + `LiveAnalyst.tsx` — pannello con 4 tab (momentum, pressing con PPDA e terzi di campo, rete dei passaggi,
  duelli) e **66 regole** che producono una frase con un suggerimento, una ogni 5 minuti di gioco, senza ripetersi per 20.
- Testi in `src/ui/it.json`, stili in `app.css`, test in `src/ui/match/playback.test.ts`.

## 3. Perché "è un casino" — diagnosi

1. **Velocità troppo alta.** A 1× (30 s di gioco per secondo reale) un'azione media dura **0,22 secondi sullo schermo**:
   i giocatori sembrano teletrasportarsi e la palla salta da una parte all'altra. È il problema numero uno.
2. **Si vede tutto, anche il niente.** 778 passaggi su 811 azioni sono costruzione: FM mostra *momenti salienti*, noi
   mostriamo ogni singolo appoggio.
3. **Nessuna gerarchia visiva**: 22 dischi uguali, nessuna evidenza di chi ha la palla, nessuna distinzione forte tra
   "noi" e "loro" (i colori vengono dalle due maglie e possono somigliarsi).
4. **Nessun verso fisso**: la squadra dell'utente a volte attacca verso destra, a volte verso sinistra, e cambia nel
   secondo tempo.
5. **Niente parole**: non c'è una riga che dica "passaggio", "tiro", "fallo", "gol", quindi l'occhio deve indovinare.
6. **Telecamera che insegue** con zoom: con azioni da 0,2 s la panoramica diventa un tremolio.

## 4. Cosa NON è stato fatto (scelte dichiarate)
- Modalità "solo momenti salienti" (highlights).
- Texture dell'erba generata (ora strisce disegnate a codice).
- "Piani partita" condizionali (§6.4 della guida): rimandati.
- Numeri di maglia veri (ora numerazione per ordine di formazione).
- Commento testuale delle azioni, evidenziazione del portatore, verso d'attacco fisso.
- Misura dei fotogrammi al secondo: nel pannello browser integrato l'animazione va in pausa quando la finestra non è in
  primo piano, quindi va provata a mano con `pnpm app`.

## 5. Piano già proposto per sistemare (da validare o correggere)
1. **Velocità leggibili**: 1× ≈ 5-8 secondi di gioco per secondo reale (partita intera 12-18 minuti), con 2× e 4× per
   accelerare; il "salta al finale" resta.
2. **Modalità salienti come predefinita**: si riproducono solo i passaggi di gioco che portano a tiri, gol, cartellini,
   infortuni (finestra da ~8 secondi prima a ~3 dopo), il resto si salta. Serve una regola su cosa sia "saliente".
3. **Leggibilità del campo**: la squadra dell'utente attacca **sempre verso destra** (si specchia il campo quando serve),
   portatore evidenziato, avversari desaturati, freccia del verso d'attacco, meno testo sui dischi.
4. **Una riga di racconto** sotto il campo: "23' Rossi serve Bianchi", "tiro di Neri, parato", "GOL!".
5. **Telecamera più calma** (zoom minore, inseguimento più lento) o fissa sul campo intero come opzione predefinita.

## 6. Domande a cui serve una risposta
- La strada giusta è "highlights alla FM" o "partita intera ma lenta e leggibile"? O due modalità separate?
- Con 811 azioni e solo 26 tiri, cosa deve essere considerato "saliente" perché la partita resti emozionante ma non vuota?
- La leggibilità va cercata soprattutto con la grafica (colori, evidenze, telecamera) o con il testo (commento, eventi)?
- Vale la pena aggiungere fotogrammi intermedi nel motore (posizioni ogni ~1 s invece che una per azione) per avere
  movimenti più credibili, o basta interpolare meglio quello che c'è?

## 7. Vincoli del progetto da rispettare in qualunque proposta
- `src/engine/` è puro: niente React, DOM, Electron, `node:*`; niente `Math.random` né date reali (solo `Rng` seeded).
- Tutte le costanti di taratura in `src/engine/balance.ts`; i target in `docs/balance/targets.md` (`pnpm sim`).
- Testi in `src/ui/it.json` via `t()`, colori solo dai token di `tokens.css`, componenti React sotto le 200 righe.
- "Fatto" = `pnpm test` verde + `pnpm typecheck` pulito + report di `pnpm sim` nei target.
