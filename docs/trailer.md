# Trailer della 0.2.0 — storyboard (60 secondi)

Un video di un minuto per itch.io, il sito e i social. Si apre dentro la partita 2D, che è la novità della 0.2.0. Poi
allarga sul resto del gioco: chi guarda deve capire in dieci secondi che si tratta di calcio. Dopo altri venti deve
capire che qui si allenano persone.

## Come si registra

- **Immagini**: il gioco vero, 1440×900, registrato come le clip del sito
  (`pnpm build && npx electron tools/clips.cjs`, cartella dati temporanea; i salvataggi veri non si toccano).
  - Le azioni di gioco escono già da `site/clips/` (gol su azione, gol da corner, parata).
  - Per le schermate di gestione bastano registrazioni di 3-4 secondi con lo stesso salvataggio (`tools/docs-save.json`).
- **Montaggio**: qualunque programma gratuito (Shotcut, DaVinci Resolve, Clipchamp di Windows).
  - Tagli netti.
  - Niente transizioni a effetto, al massimo una dissolvenza al nero alla fine.
- **Audio**: il suono della folla del gioco sotto le azioni, più una musica senza diritti (licenza CC0 o CC-BY,
  citata nella descrizione del video).
- **Testi a schermo**: carattere del gioco, bianco su una fascia scura, sempre in basso a sinistra.
  - Due versioni del video: italiana e inglese (qui sotto le due righe).
  - L'interfaccia registrata nella lingua del video: la lingua si cambia dalle Impostazioni.
- **Niente nomi veri**: club, città e giocatori sono quelli inventati del gioco.

## Inquadrature

| Tempo | Cosa si vede | Testo a schermo (IT / EN) | Audio |
| --- | --- | --- | --- |
| 0:00–0:04 | Nero, poi il campo 2D a tutto schermo, telecamera **ravvicinata**. Ripartenza: il portatore col nome sopra la testa e tre passaggi veloci. | — | Folla bassa, un fischio lontano |
| 0:04–0:09 | Stessa azione: cross alto, l'ombra della palla si allunga, duello aereo, colpo di testa, **gol**. | — | La folla esplode; entra la musica |
| 0:09–0:13 | **Replay** al rallentatore dello stesso gol, con la scritta del replay in alto. | «Ogni azione la calcola il motore. Tu la guardi.» / "Every move is calculated by the engine. You watch it happen." | Musica |
| 0:13–0:17 | **Parata**: tiro da dentro l'area, il portiere respinge e la palla torna in mezzo. | — | «Oooh» della folla |
| 0:17–0:21 | Pausa tattica. Si accende la **sovrapposizione** «linea e baricentro»: si alza la mentalità e la forma nuova si stacca da quella tratteggiata di prima. | «Cambi qualcosa. Lo vedi in campo.» / "Change something. See it on the pitch." | Musica, clic dei pulsanti |
| 0:21–0:24 | **Gol da corner** sul secondo palo, telecamera che **segue la palla**. | — | Folla |
| 0:24–0:27 | Tabellino di fine partita (voti, xG) che scorre. Taglio netto. | — | Fischio finale |
| 0:27–0:32 | **Spogliatoio**: il grafo dei rapporti, con un leader al centro e una faida in rosso. | «Non alleni una rosa. Alleni un gruppo di persone.» / "You don't manage a squad. You manage a group of people." | La musica cambia, più calma |
| 0:32–0:37 | **Conferenza stampa**: una domanda su un giocatore in crisi, le risposte con il loro effetto sul morale. | «La stampa racconta la tua stagione.» / "The press tells the story of your season." | Musica |
| 0:37–0:42 | **Mercato**: la ricerca con le stime a forbice, poi una trattativa con l'agente. | «Dei giocatori degli altri vedi solo stime.» / "Other clubs' players? You only see estimates." | Musica |
| 0:42–0:47 | **Classifica di Serie B** con la zona playoff e playout colorate. Poi la notizia di un club in amministrazione controllata. | «Tre campionati. Playoff, playout. Club che falliscono.» / "Three leagues. Play-offs, play-outs. Clubs that go bust." | Musica sale |
| 0:47–0:53 | Ritorno al campo 2D, telecamera **campo intero**: un'azione corale veloce e un tiro dal limite. La musica arriva al culmine. | — | Folla + musica |
| 0:53–0:57 | Logo di TFM 27 su fondo scuro. | «Gratis · Windows · italiano e inglese» / "Free · Windows · English and Italian" | Musica che chiude |
| 0:57–1:00 | Indirizzo del sito sotto il logo. | xmarcos10.github.io/talisman | Silenzio, poi un fischio |

## Note

- **I primi 4 secondi decidono**: niente logo in apertura, si parte dall'azione. Il logo arriva solo alla fine.
- **Una sola idea per testo**, al massimo otto parole: si legge in un secondo e mezzo.
- **Scegliere azioni pulite**: la palla sempre in vista e nessun giocatore sovrapposto al nome del portatore. Se
  un'azione registrata non è leggibile, meglio rifarla con un altro seme che tagliarla.
- **Il video deve reggere senza audio**: sui social parte muto, e i testi portano il senso anche da soli.
- **Formati**: 16:9 1920×1080 per itch.io e il sito. Per i social si può fare un taglio verticale di 30 secondi
  (0:00–0:24 più il logo).
