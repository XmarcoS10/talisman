# Backlog

Quello che manca o che si vuole fare, in ordine di priorità. Le idee nuove vanno in fondo; se ne discute nelle
[Discussioni](https://github.com/XmarcoS10/talisman/discussions), i problemi vanno nelle
[segnalazioni](https://github.com/XmarcoS10/talisman/issues). Aggiornato il 27/09/2026 (dopo la 0.5.1).

## Tocca a Marco (non è codice)

- **Collaudo esterno**: tre persone, una stagione intera, senza chiedere aiuto. Istruzioni pronte in `docs/collaudo.md`.
  È il criterio di «fatto» della fase 9 della GUIDA, e l'unica cosa che dice davvero cosa non si capisce.
- **Pagina itch.io**: testo pronto in italiano e in inglese (`docs/itch.md`), la pubblicazione è dal suo account.
- **Annuncio e video**: storyboard da 60 secondi in `docs/trailer.md`, clip della partita già pronte.
- **Firma dell'installer**: serve un certificato a pagamento; senza, Windows mostra «editore sconosciuto».
- **Versione Linux**: il pacchetto AppImage è configurato, ma va costruito su un computer Linux (`pnpm dist:linux`).

## Prima della 1.0

- **Test dell'interfaccia**: prova di montaggio di 17 schermate (`screens.test.tsx`) e dei clic principali
  (`clicks.test.tsx`: nuova carriera, tattica, rosa, calendario, record, impostazioni). Mancano mercato, trattative,
  partita dal vivo e conferenze stampa.
- **Capocannonieri e possesso** (0.5.1): dopo il movimento senza palla il capocannoniere fa ancora 45-57 gol (reale
  22-36), le punte tirano il 62-66% (target 35-50%) e la squadra nettamente più forte ha il 43% dei passaggi (target
  57-63%). Misure e tentativi in `docs/design/motore-v2.md` §11; strumento `node tools/diag-box.ts`.
- **Distanza fra i mondi**: nella 0.5.1 il seme 7 segna 2,32 gol a partita e il seme 99 pareggia il 21,4%; da seguire.
- **Distacco fra Serie A e Serie B**: oscilla nelle prime 5-10 stagioni prima di assestarsi
  (`docs/balance/2026-09-26.md`). Da riguardare con una taratura dedicata, non è un errore.
- **Partite delle nazionali in diretta**: si giocano col motore vero e se ne vedono risultati e marcatori, ma non si
  seguono sul campo 2D come quelle di club (il campo dal vivo è legato al club dell'utente).
- **Tutorial riscritto**: ultimo punto della 0.3.0, aspetta le note del collaudo esterno.

## Dopo la 1.0 (GUIDA, appendice B)

Altre leghe (sono soprattutto dati) · editor del mondo nel gioco · modalità sfida («salva il club dal fallimento») ·
più allenatori sullo stesso computer · modalità «solo direttore sportivo» · spagnolo.

## Fatto (per non riproporlo)

Carriere lunghe e inflazione del talento, bancarotte, playoff e playout, Serie C, partita 2D rifatta (salienti,
telecamere, replay, sovrapposizioni, animazioni, racconto), istruzioni individuali e piani partita, offerte dell'IA
per i tuoi giocatori, motore in un thread a parte, interfaccia e storie in inglese, velocità del motore
(10.000 partite in 6,5 s), grafica generata e pipeline degli asset, partite delle nazionali col motore vero (e gol delle nazionali nei target con
le nazionalità come la Serie A vera), record e storia, CSV, tema chiaro, database della community e convertitore,
allenatori dell'IA, arbitri, meteo e terreno, radiocronaca, movimento senza palla (0.3.0-0.5.1).
