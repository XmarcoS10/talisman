# Talisman

**Un gioco manageriale di calcio, gratuito, in italiano.**
*A free football management game. The game is in Italian.*

> In FM alleni una rosa. Qui alleni un gruppo di persone.

Talisman è un gioco alla Football Manager con un'idea diversa al centro: i giocatori sono persone. Hanno amici e
rivali nello spogliatoio, un morale che si trasmette agli altri, promesse che si ricordano — e agenti che se le
ricordano per loro. La società ti dà un obiettivo, ma è un contratto che puoi rinegoziare.

## Cosa c'è

- **Partite dal vivo in 2D**, con la panchina per i cambi, la pausa tattica e un analista che commenta i dati.
- **Lo spogliatoio**: amicizie, rivalità, leader, faide, promesse. Il morale di uno contagia gli altri.
- **Allenamento e crescita**: dodici sedute a settimana, curve d'età vere, infortuni con ricadute, mentori per i giovani.
- **Mercato**: trattative con prezzo nascosto e pazienza, rate, bonus, percentuali di rivendita, prestiti, parametro zero,
  agenti con memoria.
- **Informazione imperfetta**: dei giocatori degli altri vedi solo stime. Gli osservatori le rendono più precise, ma
  qualcuno sbaglia sempre nella stessa direzione.
- **Storie e stampa**: quaranta tipi di storie nascono da quello che succede in campionato; i giornalisti ti fanno
  domande su quelle, e le risposte hanno effetti che vedi prima di scegliere.
- **Finanze, dirigenza, vivaio, nazionali**: conti per cassa, fair play finanziario, annate del settore giovanile,
  Europeo e Mondiale.

Il mondo è inventato: club, città e giocatori non esistono. Chi vuole i nomi veri potrà caricarli da sé.

## Come si gioca

Scarica la versione per il tuo sistema, installala e aprila. La prima partita ti accompagna con una guida di cinque
passi; ogni schermata spiega sé stessa la prima volta che la apri.

I salvataggi sono file sul tuo computer. Se qualcosa non va, in **Salvataggi e impostazioni** c'è
**Esporta diagnostica**: crea un file con versioni ed errori recenti da mandare a chi ti aiuta. Il gioco non manda
niente da solo.

## Per chi vuole mettere le mani nel codice

Serve Node 24 e pnpm.

```bash
pnpm install
pnpm dev        # nel browser
pnpm app        # come app desktop
pnpm test       # i test
pnpm sim -- --seasons 10 --seed 42   # il laboratorio di bilanciamento
```

La struttura e le regole del progetto sono in `CLAUDE.md`; le decisioni di progetto in `docs/adr/`; i numeri del
bilanciamento in `docs/balance/`.

## Licenza

Il codice è distribuito con la **GNU General Public License, versione 3** (`LICENSE`): puoi usarlo, studiarlo,
modificarlo e ridistribuirlo, ma chi distribuisce una versione modificata deve farlo con la stessa licenza e con il
codice. Il gioco resta gratuito. Licenze di caratteri e librerie in `assets/LICENSES.md`.
