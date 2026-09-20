# ADR 0006 — Mercato, agenti, contratti, scouting (F7)

**Data:** 20/09/2026 · **Stato:** accettato

## Fatto
- **Valore** (`transfers/valuation.ts`): derivato, mai salvato. CA, potenziale, età, contratto residuo, ruolo,
  nazione, reputazione del club, forma, richiesta di cessione, inflazione. Il premio di necessità dell'acquirente
  sta fuori: è cosa della trattativa, non del giocatore.
- **Trattativa** (`negotiation.ts`): concessioni alternate, prezzo di riserva nascosto, pazienza che si consuma
  (e crolla sui rilanci irrisori), rottura con riapertura dopo due settimane, clausola rescissoria che chiude la
  discussione. Offerta multi-parametro (rate, bonus, % rivendita, contropartite, prestito con diritto o obbligo,
  commissione) tradotta in contanti di oggi dal venditore.
- **Agenti** (`agents.ts`): avidità, onestà, rete di contatti, memoria per club che ricorda promesse mantenute e
  rotte. Chiedono rinnovi, propongono assistiti, spingono per le uscite.
- **IA di mercato** (`club-ai.ts` + `market.ts`): filosofia del club, buchi per ruolo con urgenza, budget dalla
  cassa, tetto al monte ingaggi stimato sul fatturato, lista dei nomi che migliorano davvero. Finestra estiva e
  finestra di gennaio.
- **Contratti** (`contracts.ts`): rinnovi rifiutabili (stipendio, malumore, ambizione), clausole, svincolati,
  parametro zero da gennaio, prestiti con minuti garantiti e divieto di giocare contro il proprietario.
- **Scouting** (`scouting/`): conoscenza 0-100, stime con banda, osservatori con giudizio, rete geografica ed
  errore sistematico, incarichi, rapporti, metriche per 90 minuti col campione.
- **Schermate**: Mercato (filtri), Trattativa (tutti i parametri), Osservatori, pannello Contratto.

## Scelte e semplificazioni
| Cosa | Perché |
|---|---|
| Il valore è derivato a ogni chiamata, mai salvato | regola 4 del progetto: nessun valore derivato nel salvataggio |
| Le stime dello scouting sono deterministiche (hash), non casuali | se ballassero, bastava riaprire la scheda dieci volte e fare la media: la nebbia sarebbe finta |
| L'errore dell'osservatore ha una parte sistematica, non solo rumore | è quello che rende possibili le bufale di mercato, che sono una feature (§7.6) |
| L'IA lavora sui valori veri, la nebbia è solo dell'utente | l'onniscienza dell'IA non si vede, e simularle una nebbia costerebbe memoria per 1.000 giocatori × 40 club |
| Il fatturato è stimato da stadio e blasone | le finanze vere sono F8; serviva solo un tetto al monte ingaggi |
| Le rate valgono meno in trattativa ma si pagano subito in cassa | il libro mastro con le scadenze arriva con le finanze |
| L'IA non compra dal club dell'utente | manca la schermata per accettare offerte: meglio niente che decidere al posto suo |
| Il mercato non compra dalle rose sotto i 22 uomini | senza questo vincolo le squadre si svuotavano e il campionato si squilibrava |

## Verifica
`pnpm sim -- --market 5` → `docs/balance/market.md`, con i criteri di accettazione di P9 e le note oneste su
quello che ancora non è verificabile (bancarotte, migrazione dei migliori). Test: valutazione, trattativa,
agenti, IA di mercato, contratti, nebbia, trattativa dell'utente.
