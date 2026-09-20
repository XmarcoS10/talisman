# Report mercato — 5 stagioni, seed 42

| Metrica | Valore | Target | |
|---|---|---|---|
| Acquisti per finestra estiva | 87 | 20 – 90 | ✅ |
| Inflazione dei prezzi sull'intero periodo | 1.04× | 0.70× – 1.40× | ✅ |
| Monte ingaggi su fatturato (media) | 27% | 15% – 75% | ✅ |
| Monte ingaggi su fatturato (massimo) | 66% | 0% – 85% | ✅ |
| Club sopra l'85% per più di due stagioni | 0 | 0 – 0 | ✅ |
| Età media delle rose | 25.9 | 24.0 – 28.0 | ✅ |
| Top 50 nei dieci club più blasonati | 88% | 40% – 95% | ✅ |
| Giocatori in prestito | 30 | 5 – 120 | ✅ |
| Svincolati rimasti senza squadra | 5 | 0 – 60 | ✅ |
| Club col bilancio in rosso | 0 | raro | |
| Cassa media dei club | 29.1M |  | |

## Stagione per stagione
- 2026/27: 95 acquisti · valore medio 8.0M · ingaggi/fatturato 27% (max 86%) · età 25.8 · 11 in prestito · 0 svincolati
- 2027/28: 87 acquisti · valore medio 8.4M · ingaggi/fatturato 27% (max 80%) · età 26.0 · 29 in prestito · 5 svincolati
- 2028/29: 76 acquisti · valore medio 8.4M · ingaggi/fatturato 26% (max 81%) · età 26.1 · 31 in prestito · 5 svincolati
- 2029/30: 87 acquisti · valore medio 8.5M · ingaggi/fatturato 27% (max 69%) · età 25.9 · 38 in prestito · 8 svincolati
- 2030/31: 90 acquisti · valore medio 8.8M · ingaggi/fatturato 26% (max 66%) · età 25.7 · 40 in prestito · 8 svincolati

## Note oneste su questo report

- **La migrazione dei migliori non è merito del mercato.** Alla creazione del mondo l'88-92% dei primi 50
  giocatori è già nei dieci club più blasonati, perché è lì che vengono generati. Dopo cinque stagioni di
  mercato la quota non si muove: il criterio «migrano verso i ricchi ma non nel 100% dei casi» è rispettato,
  ma chi lo rispetta è il generatore, non l'IA. Da rimisurare quando ci saranno coppe e premi.
- **Nessun club va in rosso** perché non esistono ancora le finanze vere (§7.7, F8): non ci sono stipendi
  pagati mese per mese né incassi. Il bilancio scende solo quando si compra. «Bancarotta rara ma possibile»
  oggi non è verificabile.
- **Il fatturato è una stima** da capienza dello stadio e blasone (`CLUB_AI.revenuePerSeat`,
  `revenuePerRep2`), non un conto economico. Serve a dare un tetto al monte ingaggi, e quel tetto è
  l'unica cosa che oggi impedisce ai club forti di rinnovare tutti a qualunque cifra.
- **Le rate non esistono nel libro mastro**: in trattativa una dilazione vale meno per il venditore, ma il
  cartellino si paga tutto subito. Anche questo aspetta le finanze.
- **I rinnovi del club dell'utente li fa l'assistente**, finché non c'è la schermata contratti: le notizie
  avvisano di ogni rinnovo e di ogni scadenza, ma le decisioni non sono ancora tue.
