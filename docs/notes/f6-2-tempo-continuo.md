# F6.2 — Il campo si muove davvero

Seguito di [F6.1](f6-1-leggibilita.md). Lì avevo elencato sette cose che restavano illeggibili e le avevo ricondotte
tutte alla stessa radice: **il motore produce 811 posizioni per 90 minuti (0,15 al secondo)**. Qui quella radice è stata
tolta.

## Cosa è cambiato

| Prima (F6.1) | Adesso |
|---|---|
| ≈850 fotogrammi a partita, uno per azione | **22.600 fotogrammi**, uno ogni 0,25 s di gioco |
| 0,15 posizioni al secondo | **4 al secondo** |
| I 22 scivolano in linea retta fra due azioni | Ognuno corre verso la posizione ideale **ricalcolata a ogni passo**, mentre la palla è in volo |
| La palla viaggia a velocità costante | Parte, accelera e **frena** sull'arrivo |
| Falli, rimesse ed esultanze: buco nero, il gioco salta | Si vedono, scorrendo 8× più in fretta |
| Interpolazione fatta nella grafica | Il **motore** produce le posizioni; la grafica sceglie il fotogramma e basta |

Una partita dura ora ≈12 minuti reali a 1× (prima 16): il gioco fermo non si guarda a velocità piena.

## Il vincolo rispettato: il bilanciamento è identico

Questo era il rischio vero. Ho misurato che lasciare decidere ai passi intermedi le posizioni vere **sposta i numeri**:

| | Gol/partita | Tiri/squadra | Tempo |
|---|---|---|---|
| Motore com'era | 2,77 | 14,5 | 4,7 ms |
| Con posizioni fini autorevoli | **2,48** | 13,8 | 44 ms |

I difensori, riposizionandosi mentre il pallone vola, difendono meglio. Sarebbe anche più realistico, ma costerebbe una
ritaratura completa e 12 volte il tempo di calcolo su un `pnpm sim` che è già fuori target sul tempo.

La soluzione adottata: **le posizioni di fine intervallo sono quelle del motore**, calcolate prima e con lo stesso
identico consumo di casualità; i passi intermedi raccontano il percorso e si ricongiungono a quelle con peso crescente.
Risultato misurato su 200 partite: stessa partita con e senza traccia → **2,68 gol, 14,35 tiri, 411,94 passaggi, 78,7% di
precisione: cifra per cifra gli stessi numeri**.

## Verifiche

- `pnpm typecheck` pulito, `pnpm test` **41 test verdi**.
- `pnpm sim -- --matches 1000 --seed 42`: **2,60 gol a partita**, invariato. `--seasons 10`: **2,57**, invariato.
- Test nuovo: fra due fotogrammi nessuno si sposta di più di **0,6 zone** (≈5 m in un quarto di secondo): i giocatori
  corrono, non compaiono altrove.
- Salti della palla oltre 1,5 zone fra due fotogrammi: **0** (erano 8, tutti sul calcio d'inizio dopo un gol).
- Costo: 4,8 ms a partita simulata (invariato), 62 ms per una partita seguita dal vivo, 7,6 MB di fotogrammi tenuti in
  memoria solo mentre la guardi.
- A vista nel pannello browser: la partita parte, il racconto scrive «1' A. Galli serve G. Rizzo», i giocatori si
  spostano fra un fotogramma e l'altro, la durata stimata dice 12 minuti.

## Cosa resta da giudicare a mano

Come in F6.1 non ho potuto guardare l'animazione scorrere: il pannello browser ferma il disegno quando la finestra non è
davanti. Restano da giudicare con `pnpm app`:

- se ora il movimento **sembra calcio** (corse, coperture, inserimenti) o ancora un formicaio ordinato;
- se 12 minuti a 1× sono una durata che si regge, o se serve una modalità "solo azioni pericolose";
- se il gioco fermo a 8× disturba (sfarfallio) o riposa.

## Cosa resta illeggibile

Dei sette punti di F6.1, quattro sono risolti (movimento vero, pause che esistono, palla che decelera, intenzione fuori
dalla palla). Restano:

1. **I duelli non si vedono.** Un contrasto è ancora un cambio di proprietario: nessuno stende nessuno, nessuno vince
   un rimpallo.
2. **Le parate non si vedono.** Il portiere non si tuffa: la palla riparte da lui.
3. **Cambi, infortuni e cartellini** non hanno rappresentazione sul campo.
4. **La palla è un punto che striscia sull'erba**: niente altezza, niente rimbalzo, i cross e i lanci sono rasoterra.
5. **I piazzati restano astratti**: un corner è una probabilità di colpo di testa, non undici uomini che si dispongono.

Tutti e cinque, a differenza di prima, sono lavoro di *rappresentazione*, non limiti del motore: l'informazione c'è già
nel `TraceStep` (chi contrasta, chi para, chi entra). Sono candidati per una rifinitura in F9, non per una riscrittura.
