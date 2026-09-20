# Report mercato â€” 5 stagioni, seed 42

| Metrica | Valore | Target | |
|---|---|---|---|
| Acquisti per finestra estiva | 83 | 20 â€“ 90 | âœ… |
| Inflazione dei prezzi sull'intero periodo | 1.00Ã— | 0.70Ã— â€“ 1.40Ã— | âœ… |
| Monte ingaggi su fatturato (media) | 26% | 15% â€“ 75% | âœ… |
| Monte ingaggi su fatturato (massimo) | 69% | 0% â€“ 85% | âœ… |
| Club sopra l'85% per piÃ¹ di due stagioni | 0 | 0 â€“ 0 | âœ… |
| EtÃ  media delle rose | 25.8 | 24.0 â€“ 28.0 | âœ… |
| Top 50 nei dieci club piÃ¹ blasonati | 90% | 40% â€“ 95% | âœ… |
| Giocatori in prestito | 33 | 5 â€“ 120 | âœ… |
| Svincolati rimasti senza squadra | 7 | 0 â€“ 60 | âœ… |
| Club col bilancio in rosso | 0 | raro | |
| Cassa media dei club | 29.3M |  | |

## Stagione per stagione
- 2026/27: 92 acquisti Â· valore medio 8.3M Â· ingaggi/fatturato 26% (max 87%) Â· etÃ  25.7 Â· 16 in prestito Â· 0 svincolati
- 2027/28: 79 acquisti Â· valore medio 8.4M Â· ingaggi/fatturato 27% (max 85%) Â· etÃ  25.8 Â· 31 in prestito Â· 3 svincolati
- 2028/29: 78 acquisti Â· valore medio 8.2M Â· ingaggi/fatturato 26% (max 73%) Â· etÃ  26.0 Â· 38 in prestito Â· 4 svincolati
- 2029/30: 85 acquisti Â· valore medio 8.1M Â· ingaggi/fatturato 26% (max 68%) Â· etÃ  25.9 Â· 41 in prestito Â· 14 svincolati
- 2030/31: 81 acquisti Â· valore medio 8.4M Â· ingaggi/fatturato 25% (max 69%) Â· etÃ  25.6 Â· 39 in prestito Â· 15 svincolati

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
