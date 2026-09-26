# Backlog

Quello che manca o che si vuole fare, in ordine di priorità. Le idee nuove vanno in fondo; se ne discute nelle
[Discussioni](https://github.com/XmarcoS10/talisman/discussions), i problemi vanno nelle
[segnalazioni](https://github.com/XmarcoS10/talisman/issues). Aggiornato il 26/09/2026 (dopo la 0.2.0 e le nazionali).

## Tocca a Marco (non è codice)

- **Collaudo esterno**: tre persone, una stagione intera, senza chiedere aiuto. Istruzioni pronte in `docs/collaudo.md`.
  È il criterio di «fatto» della fase 9 della GUIDA, e l'unica cosa che dice davvero cosa non si capisce.
- **Pagina itch.io**: testo pronto in italiano e in inglese (`docs/itch.md`), la pubblicazione è dal suo account.
- **Annuncio e video**: storyboard da 60 secondi in `docs/trailer.md`, clip della partita già pronte.
- **Firma dell'installer**: serve un certificato a pagamento; senza, Windows mostra «editore sconosciuto».
- **Versione Linux**: il pacchetto AppImage è configurato, ma va costruito su un computer Linux (`pnpm dist:linux`).

## Prima della 1.0

- **Test dell'interfaccia**: oggi il motore è coperto, le schermate no (`docs/tech-debt.md`, voce 1).
- **Distacco fra Serie A e Serie B**: oscilla nelle prime 5-10 stagioni prima di assestarsi
  (`docs/balance/2026-09-26.md`). Da riguardare con una taratura dedicata, non è un errore.
- **Partite delle nazionali in diretta**: si giocano col motore vero e se ne vedono risultati e marcatori, ma non si
  seguono sul campo 2D come quelle di club (il campo dal vivo è legato al club dell'utente).
- **Più gol del normale nelle partite delle nazionali** (3,9 contro i 2,5 dei club): in questo mondo il talento è
  concentrato in una nazione sola, quindi i divari sono enormi. Si sistema dando più peso alle altre nazioni nella
  generazione del mondo.

## Dopo la 1.0 (GUIDA, appendice B)

Altre leghe (sono soprattutto dati) · editor del mondo nel gioco · import dei database della community · modalità
sfida («salva il club dal fallimento») · storico pluridecennale con statistiche di carriera · più allenatori sullo
stesso computer · modalità «solo direttore sportivo» · allenatori dell'IA con carriere e reputazione · meteo e
terreno · arbitri con personalità · cronaca radiofonica · statistiche esportabili in CSV · tema chiaro · spagnolo.

## Fatto (per non riproporlo)

Carriere lunghe e inflazione del talento, bancarotte, playoff e playout, Serie C, partita 2D rifatta (salienti,
telecamere, replay, sovrapposizioni, animazioni, racconto), istruzioni individuali e piani partita, offerte dell'IA
per i tuoi giocatori, motore in un thread a parte, interfaccia e storie in inglese, velocità del motore
(10.000 partite in 6,5 s), grafica generata e pipeline degli asset, partite delle nazionali col motore vero.
