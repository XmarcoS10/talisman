# Report mercato — 5 stagioni, seed 42

| Metrica | Valore | Target | |
|---|---|---|---|
| Acquisti per finestra estiva | 79 | 20 – 90 | ✅ |
| Inflazione dei prezzi sull'intero periodo | 0.87× | 0.70× – 1.40× | ✅ |
| Monte ingaggi su fatturato (media) | 25% | 15% – 75% | ✅ |
| Monte ingaggi su fatturato (massimo) | 73% | 0% – 85% | ✅ |
| Club sopra l'85% per più di due stagioni | 0 | 0 – 0 | ✅ |
| Età media delle rose | 25.9 | 24.0 – 28.0 | ✅ |
| Top 50 nei dieci club più blasonati | 92% | 40% – 95% | ✅ |
| Club col bilancio in rosso | 0 | raro | |
| Cassa media dei club | 29.0M |  | |

## Stagione per stagione
- 2026/27: 94 acquisti · valore medio 7.6M · ingaggi/fatturato 27% (max 86%) · età 25.8
- 2027/28: 75 acquisti · valore medio 7.6M · ingaggi/fatturato 26% (max 83%) · età 26.0
- 2028/29: 70 acquisti · valore medio 7.3M · ingaggi/fatturato 26% (max 84%) · età 26.1
- 2029/30: 76 acquisti · valore medio 7.2M · ingaggi/fatturato 24% (max 78%) · età 26.1
- 2030/31: 82 acquisti · valore medio 7.3M · ingaggi/fatturato 22% (max 73%) · età 25.7

## Note oneste su questo report

- **La migrazione dei migliori non è merito del mercato.** Alla creazione del mondo il 92% dei primi 50
  giocatori è già nei dieci club più blasonati, perché è lì che vengono generati. Dopo cinque stagioni di
  mercato è ancora il 92%: il criterio «migrano verso i ricchi ma non nel 100% dei casi» è rispettato, ma
  chi lo rispetta è il generatore, non l'IA di mercato. Da rimisurare quando ci saranno le coppe e i premi.
- **Nessun club va in rosso** perché non esistono ancora le finanze vere (§7.7, F8): non ci sono stipendi
  pagati mese per mese, né incassi. Il bilancio scende solo quando si compra. «Bancarotta rara ma possibile»
  è un criterio che oggi non può essere verificato.
- **Il fatturato è una stima** da capienza dello stadio e blasone (`CLUB_AI.revenuePerSeat`,
  `revenuePerRep2`), non un conto economico. Serve solo a dare un tetto al monte ingaggi.
- **Le rate non esistono nel libro mastro**: in trattativa una dilazione vale meno per il venditore, ma il
  cartellino si paga tutto subito. Anche questo aspetta le finanze.
