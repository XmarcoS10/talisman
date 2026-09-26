# Piano dei prossimi aggiornamenti (0.2.1 → 0.5.0)

Scelte di Marco del 26/09/2026, su `docs/consegna-opus.md` §17. Ordine per rischio crescente (§18): prima quello che
non tocca il motore, per ultimo quello che tocca il motore partita.

| Uscita | Contenuto | Tocca il motore? | Stima |
|---|---|---|---|
| **0.2.1** | Nazionali col motore vero (già nel codice) | no (già fatto) | ~1 h |
| **0.3.0** «il gioco si spiega» | Test sulle schermate, record e storia, CSV, tema chiaro, tutorial | no | ~1,5 settimane |
| **0.4.0** «un mondo più largo» | Altre nazioni con vivai propri, import del database della community | sì, `newWorld` | ~1 settimana |
| **0.5.0** «la panchina viva» | Allenatori IA, cronaca radiofonica, arbitri, meteo e terreno | sì, motore partita | ~2 settimane |

Scartati per ora: coppe europee ed editor del mondo (A).
Fuori codice, da fare in parallelo (Marco): **collaudo esterno** con tre persone durante la 0.3.0.

Per ogni intervento: file toccati · migrazione · golden master · come si verifica · cosa può rompere.
«Fatto» resta: test verdi + typecheck pulito + report nei target.

---

## 0.2.1 — pubblicare quello che c'è

1. `package.json` 0.2.1, note di rilascio IT/EN (nazionali giocate dal motore, pannello nel Vivaio), `pnpm dist:win`,
   release su GitHub, sito aggiornato.
   · Migrazione: no (lo schema 28 c'è già) · Golden: no · Rompe: niente.

---

## 0.3.0 — il gioco si spiega

### 3.1 Test di montaggio sulle schermate (debito voce 1)
- **Come**: `renderToString` di `react-dom/server` su un mondo generato dal seme 42, in ambiente Node, **senza
  dipendenze nuove** (niente jsdom né testing-library). Prende le schermate che vanno in errore al primo disegno, che
  è il caso più comune. Le interazioni (clic) restano fuori; si aggiungono se serve.
- **Schermate**: Scrivania, Rosa, Tattica, Scheda giocatore, Classifiche, Mercato (più le nuove di questa uscita).
- File: `src/ui/screens/screens.test.tsx` (nuovo).
- Migrazione: no · Golden: no · Verifica: `pnpm test` · Rompe: niente (se una schermata usa `window` al montaggio
  il test lo segnala: si sistema la schermata, non il test).

### 3.2 Record e storia di carriera (club + allenatore + giocatori)
- **Dati nuovi** (le stagioni passate non si ricavano dopo, quindi si salvano):
  - `manager.seasons[]`: stagione, club, campionato, posizione, punti, coppa (turno raggiunto), esito
    (confermato/esonerato/dimesso).
  - `club.records`: vittoria più larga, sconfitta più larga, più punti in una stagione, marcatore di sempre (gol
    totali col club), più presenze. Aggiornati in `endSeason` e dopo ogni partita di campionato.
  - Record personali dei giocatori: si ricavano da `player.history` (già salvato) + stagione in corso → **derivati,
    non salvati**.
- File: `model.ts`, `world.ts` (`endSeason`), `match.ts` (applicazione al mondo), `save.ts`, schermata nuova
  `src/ui/screens/Records.tsx` (sotto le 200 righe; se serve si spezza in Club/Allenatore/Giocatori), `it.json`/`en.json`.
- **Migrazione 28→29**: `manager.seasons = []`, `club.records` ricostruiti da quello che c'è (`history`,
  `cupWinners`, `player.history`); quello che manca resta vuoto.
- Golden: no, **a patto** che l'aggiornamento dei record non peschi da `Rng` (non deve). Verifica: test su una
  stagione giocata (record coerenti con i risultati) + golden invariato + `pnpm sim -- --seasons 10` invariato.
- Rompe: schema (migrazione), chiavi i18n.

### 3.3 Esportazione CSV
- La funzione `download` e il formato ci sono già in `Market.tsx`: si sposta in un piccolo modulo comune e si
  riusa. Esporta: **rosa con statistiche** (valori veri: sono giocatori dell'utente, §7.6 non si applica),
  **classifiche** dei tre campionati, **finanze** (mese per mese e per stagione), **record e storia**.
- **Attenzione §7.6**: le classifiche e i record contengono solo risultati, mai valori di giocatori altrui.
- File: `Market.tsx`, `Squad.tsx`, `Tables.tsx`, `Finances.tsx` (nome da verificare), `Records.tsx`, util comune.
- Migrazione: no · Golden: no · Verifica: test sul formato (separatore, virgolette, lettere accentate per Excel:
  BOM UTF-8) · Rompe: niente.

### 3.4 Tema chiaro (Scuro / Chiaro / Come il sistema)
- `settings.ts`: `theme: 'dark' | 'light' | 'system'`, di base `dark`. Un attributo `data-theme` sulla radice;
  `tokens.css` ridefinisce i colori per il chiaro.
- **Il costo vero**: in `app.css` ci sono ~48 colori scritti a mano e 13 in `match/renderer.ts` (più 1 in
  `ClubPicker.tsx`). Vanno portati sui token prima, altrimenti il chiaro esce a macchie. È anche un rispetto
  arretrato della regola 11.
- Campo 2D: resta erba verde in tutti e due i temi, cambiano solo cornici e sovrapposizioni. Stemmi e maglie non
  cambiano (hanno i colori del club).
- Controllo: contrasto WCAG sui token chiari, foto di 6 schermate nei due temi con `tools/shots-docs.cjs`.
- Migrazione: no (impostazione del giocatore, non del mondo) · Golden: no · Rompe: leggibilità (si guarda con le
  foto), chiavi i18n.

### 3.5 Tutorial rivisto — ultimo intervento
- Si scrive sugli appunti dei collaudatori (`docs/collaudo.md`): guida della prima partita (5 passi) e 12
  suggerimenti. Se il collaudo non è finito quando il resto è pronto, la 0.3.0 esce senza e il tutorial va nella 0.3.1.
- File: componente della guida, `settings.ts` (se servono suggerimenti nuovi), `it.json`/`en.json`.
- Migrazione: no · Golden: no · Rompe: chiavi i18n.

---

## 0.4.0 — un mondo più largo

### 4.1 Altre nazioni con vivai propri
- `newWorld`: la quota di italiani scende (oggi 62%); le altre nazioni hanno abbastanza giocatori forti da fare un
  undici credibile. Opzione pulita: ogni nazione ha una «riserva» di giocatori nei club stranieri costruiti al volo
  come le nazionali (id negativi, non salvati) oppure salvati come club fuori dai tre campionati — **scelta da
  presentare a Marco con i numeri** quando ci arriviamo.
- Vivaio: le annate dei club IA pescano nazionalità con pesi nuovi.
- **Target**: gol delle nazionali da 3,9 verso ~2,9; tutto il resto di `targets.md` invariato (correlazione
  forza-punti, economia, carriere da 25 stagioni).
- Migrazione: dipende dalla scelta sopra; i salvataggi vecchi tengono il loro mondo. Golden: probabilmente sì
  (cambiano le rose generate). Verifica: `--seasons 10`, `--career 25` su tre semi, `--market 5`, report gol nazionali.
- Rompe: determinismo dei mondi nuovi (voluto), bilanciamento. **Regola delle 3 iterazioni.**

### 4.2 Import del database della community
- Un file JSON nel formato `WorldState` (o un suo sottoinsieme: nomi, città, colori, stemmi) che sostituisce quelli
  inventati. La migrazione e il controllo di integrità esistono già: si passa di lì.
- Sicurezza: il file arriva da fuori → validazione completa, dimensioni massime, stemmi solo come immagini (niente
  SVG con script), nessun codice eseguito.
- Noi non distribuiamo nomi veri: nel repository solo un file di esempio inventato.
- Migrazione: no · Golden: no · Rompe: niente se la validazione è stretta.

---

## 0.5.0 — la panchina viva

Ordine interno: prima quello che non tocca il motore partita.

1. **Allenatori IA con carriera**: entità nuova `coaches` (nome, reputazione, stile preferito, club), esoneri
   secondo le stesse barre della dirigenza, panchine che cambiano, notizie. Lo stile dell'allenatore guida modulo e
   mentalità del club IA. **`Rng` proprio** (lezione 1). Migrazione sì. Golden no se lo stile di partenza riproduce
   le tattiche di oggi. Verifica: correlazione forza-punti invariata.
2. **Cronaca radiofonica**: racconto testuale delle partite non guardate, scritto dai `beats` del registro
   (già usati da `commentary.ts`) al momento della lettura, come le storie. Costa riaccendere il registro solo per le
   partite che l'utente apre, a posteriori, rigiocandole dal seme. Migrazione no · Golden no.
3. **Arbitri con personalità**: severità su falli e cartellini, leva piccola (lezione 8). Golden da rigenerare
   apposta. Target: falli, cartellini, rigori per partita dentro `targets.md`.
4. **Meteo e terreno**: pioggia/vento/campo pesante su precisione dei passaggi e stanchezza, leve piccole. Golden da
   rigenerare. Verifica: `--match-stats 4000`, gol per partita, `pnpm bench` ≤ 4,2 ms.

---

## Rischi trasversali

- **Determinismo**: ogni sistema nuovo che pesca a caso durante la stagione prende un `Rng` proprio.
- **Schema**: una migrazione per uscita al massimo dove possibile (29 nella 0.3.0).
- **Prestazioni**: `pnpm bench` ≤ 4,2 ms dopo ogni intervento sul motore.
- **i18n**: ogni stringa nuova in `it.json` ed `en.json` insieme.
