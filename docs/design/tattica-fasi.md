# Tattica con e senza palla (proposta, 30/09/2026)

Obiettivo: la novità principale della tattica di Football Manager 26. Si sceglie un modulo **con la palla** e uno
**senza palla**; in partita la squadra passa dall'uno all'altro a ogni cambio di possesso, e le transizioni (chi deve
rientrare, chi resta alto) nascono da lì.

## Come funziona oggi

Ogni giocatore ha una casa nel modulo (`MP.hx, hy`, da `FORMATIONS` in `match/tactics.ts`).
- Con la palla (`aimAtt`, `positioning.ts`): la casa più la spinta del ruolo, la mentalità, gli inserimenti.
- Senza palla (`shapeDef`): la stessa casa, accorciata (`defCompact`) e spostata verso la palla.

Quindi il blocco difensivo è sempre il modulo d'attacco compresso. Un 4-3-3 difende sempre come un 4-3-3 stretto,
mai come un 4-5-1 o un 4-4-2.

## Proposta

1. **Due moduli nella tattica.** `Tactic.formation` resta il modulo con la palla (quello che decide chi gioca dove,
   i ruoli e la familiarità). Nuovo `Tactic.formationOut`: il modulo senza palla, uguale al primo se non lo si sceglie.
2. **Ognuno ha due case.** Nuovi `MP.ox, oy`: la casa senza palla. Il giocatore dello slot *i* del modulo con palla va
   nello slot del modulo senza palla più vicino per posizione (abbinamento fisso, calcolato una volta per coppia di
   moduli, ad esempio l'ala del 4-3-3 diventa l'esterno di centrocampo del 4-4-2 e la punta resta punta).
   `shapeDef` usa `ox, oy` invece di `hx, hy`. Il resto del motore non cambia.
3. **Le transizioni vengono da sole.** I giocatori corrono già verso la casa a velocità limitata (`runTo`): chi con la
   palla sta molto lontano dalla sua casa senza palla ci mette di più a rientrare. Più diversi sono i due moduli, più
   la squadra è esposta al contropiede appena perde palla, e più guadagna quando la riconquista già messa bene.
4. **Due moduli nuovi, pensati per una fase sola**:
   - `3-2-5` con palla: tre dietro, due in mezzo, cinque davanti. È la costruzione tipica di FM26 e del calcio di oggi.
   - `5-4-1` senza palla: blocco basso.

   Si aggiungono ai moduli esistenti, ma gli allenatori dell'IA non li pescano a caso, così il caso del mondo non si
   sposta.
5. **L'IA**: nella prima versione gli allenatori dell'IA usano lo stesso modulo nelle due fasi, come oggi. Più avanti
   ogni stile potrà avere la sua coppia (possesso: 3-2-5 / 4-4-2; blocco basso: 4-3-3 / 5-4-1).

## Cosa cambia per chi gioca

- **Tattica**: sopra il campo un interruttore «Con palla / Senza palla». Si sceglie il modulo di ciascuna fase, e il
  campo mostra le stesse undici schede nelle posizioni dell'una o dell'altra.
- **Partita dal vivo**: nelle regolazioni rapide si può cambiare il modulo senza palla, e il campo 2D mostra la
  squadra che cambia forma a ogni cambio di possesso.
- **Familiarità**: conta la media fra i due moduli. Un modulo nuovo va quindi allenato anche se si usa in una fase sola.

## Misura (come per la fase di costruzione)

- **Nessun cambio per chi non lo usa**: con `formationOut` uguale a `formation` le case coincidono e il golden master
  resta identico. È il primo controllo.
- **Nessuna coppia dominante**: 3000 partite per coppia contro il 4-3-3 normale, tra cui 3-2-5/4-4-2, 4-3-3/4-5-1,
  4-2-3-1/4-4-2 e 3-2-5/5-4-1. Nessuna deve vincere più di 3-4 punti percentuali in più del modulo semplice; lo dirà
  uno strumento `tools/diag-phases.ts`, come quello delle istruzioni.
- **Report partite** nei target e **carriere di 25 stagioni** senza cali di correlazione.
- Regola delle tre iterazioni: se dopo tre tentativi di taratura una coppia resta troppo forte, ci si ferma e lo si
  scrive nel diario del motore.

## Salvataggi

Schema 33: `formationOut` uguale al modulo attuale per tutti i club. Le carriere vecchie giocano esattamente come prima.

## Limiti che resterebbero

- Ruoli e istruzioni individuali restano uno per giocatore, non uno per fase. In FM26 ogni giocatore ha un ruolo con
  palla e uno senza; qui sarebbe il passo successivo.
- I calci piazzati usano le posizioni di sempre.
