# F6.1 — Quick wins di leggibilità

Obiettivo: rendere comprensibile il 2D esistente **senza toccare il motore** (`src/engine/` letto, mai modificato) e senza
cambiare il modello dati. Bilanciamento invariato per costruzione.

## Cosa è cambiato

| # | Cosa | Dove |
|---|---|---|
| 1 | **Verso d'attacco fisso**: la squadra dell'utente attacca sempre verso destra. Lo specchiamento (`x → 12 − x`, `y → 8 − y`) avviene in `sample()`, cioè nel livello di presentazione. Vale in entrambi i tempi perché il motore **non cambia campo all'intervallo**: nel suo sistema la squadra 0 attacca sempre verso `x = 12`, quindi basta specchiare quando l'utente è la squadra ospite. | `ui/match/playback.ts` |
| 2 | **Velocità**: `SPEEDS = [6, 12, 30]` secondi di gioco per secondo reale (prima 30/60/120), etichette `1× / 2× / 5×` e durata stimata accanto ai pulsanti ("partita ≈ 16 min" a 1×). A 1× un'azione media (6,7 s di gioco) dura **1,1 s sullo schermo**, prima durava 0,22 s. | `playback.ts`, `screens/Live.tsx`, `it.json` |
| 3 | **Gerarchia visiva**: portatore con anello bianco e raggio +25%, destinatario del passaggio in volo che lampeggia, avversari smorzati verso il grigio (45%) e con bordo più sottile, numero disegnato solo se il raggio supera i 9 px. | `ui/match/renderer.ts` |
| 4 | **Telecamera**: di default ferma su tutto il campo; l'inseguimento resta come opzione con zoom massimo 1,20 e smorzamento dimezzato (k = dt × 1,25). | `renderer.ts`, `Live.tsx` |
| 5 | **Riga di racconto** sotto il campo, generata dal fotogramma corrente: "23' Rossi serve Bianchi", "Tiro di Neri", "GOL!", "Cross di X", "Dribbling riuscito di X", "Palla persa da X". Ultime 3 righe, la più recente evidenziata, il gol in grande. Nessuna stringa nei TSX: tutto in `it.json` via `t()`. | `ui/match/commentary.ts`, `Live.tsx`, `it.json` |
| 6 | **Etichetta del verso d'attacco** sul campo: "VEN attacca →". | `Live.tsx` + `app.css` |

## Verifiche fatte

- `pnpm typecheck` pulito, `pnpm test` **40 test verdi** (39 + 1 nuovo).
- Test nuovo (`ui/match/playback.test.ts`, "in trasferta il campo si specchia"): con l'utente alla squadra ospite, in
  entrambi i tempi una nostra azione offensiva ha la palla presentata oltre `x = 9` mentre nel sistema grezzo sta sotto
  `x = 3`, il nostro portiere resta sotto `x = 4`, e ogni coordinata presentata è esattamente lo specchio di quella grezza.
- `pnpm sim -- --matches 1000 --seed 42`: **2,60 gol a partita, invariato** (nessuna riga del motore toccata).
- Costo di simulazione + interpolazione per fotogramma disegnato: **0,002 ms** (misurato riproducendo una partita intera
  a 60 fps: 57.393 fotogrammi in 122 ms). Il collo di bottiglia non è il calcolo, sono 22 cerchi disegnati sul canvas.
- Controllo a vista di un fotogramma nel pannello browser: verso d'attacco corretto, portatore e ricevente evidenti,
  avversari smorzati, riga di racconto e durata stimata al posto giusto.

## Cosa NON ho potuto misurare (e va provato a mano)

Non ho eseguito `pnpm app` con un occhio umano davanti: il pannello browser integrato **mette in pausa l'animazione quando
la finestra non è in primo piano**, quindi non ho mai visto la partita scorrere davvero. Restano da giudicare:

- la fluidità percepita a 1× e se il movimento dei giocatori sembra corsa o scivolamento;
- se ora i passaggi si "leggono" uno per uno;
- se la riga di racconto aiuta o distrae.

## Cosa resta illeggibile anche dopo queste modifiche

Onestamente: le quick wins tolgono il caos, **non** rendono la partita raccontata bene. Con una posizione ogni 6,7 secondi:

1. **Tutti si muovono insieme, in linea retta.** Fra due azioni i 22 scivolano verso le nuove posizioni con velocità
   costante: non si vedono scatti, coperture, smarcamenti — solo interpolazione.
2. **Le pause del gioco non esistono come immagine.** Falli, fuorigioco, rimesse, corner e punizioni consumano tempo
   (22 s a episodio) ma non producono fotogrammi: il gioco "salta" e nessuno spiega perché.
3. **I duelli sono invisibili.** Un pallone perso appare come un cambio di proprietario senza contrasto.
4. **Le parate non si vedono.** Dopo un tiro la palla ricompare altrove: non c'è il portiere che respinge.
5. **Cambi, infortuni e cartellini** non hanno rappresentazione sul campo (solo nella timeline e nella panchina).
6. **Niente palla che rimbalza o rallenta**: traiettorie dritte a velocità costante, anche sui lanci lunghi.
7. **Nessuna intenzione fuori dalla palla**: chi attacca la profondità e chi copre non si distingue.

Tutti e sette i punti hanno la stessa radice: **il motore produce 811 posizioni per 90 minuti (0,15 al secondo)**, e nessun
lavoro di presentazione può inventare quello che il motore non ha deciso. È l'argomento a favore del passaggio a un motore
a tempo continuo (tick fisso, ~200 ms) per la fase successiva: a quel punto la grafica racconterebbe movimenti veri invece
di interpolare fra decisioni lontane.
