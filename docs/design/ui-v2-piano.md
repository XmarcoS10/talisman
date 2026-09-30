# Interfaccia v2: piano di costruzione (30/09/2026)

Riferimenti: le 17 schermate di Stitch in `docs/design/stitch-v2/` (stile «Pitch Command Editorial», `DESIGN.md`),
la struttura e l'HUD di Openfoot Manager, l'obiettivo Football Manager 26. Il codice di Stitch non si usa: si
ricostruisce in React sui token di `tokens.css`, schermata per schermata, senza toccare il motore.

## Cosa si prende e da dove

| Da | Cosa |
|---|---|
| Stitch | Palette (rosso primario, verde positivo, fondo blu notte), caratteri Barlow Condensed / Inter / JetBrains Mono, titoli in maiuscolo condensato, riquadri con barra del titolo, pastiglie di stato, tabelle fitte |
| Openfoot | Cornice: barra laterale richiudibile con allenatore e club; barra in alto con titolo e data della schermata, ricerca, «Salva», grande «Continua» con menu; filtri a pastiglie per categoria sopra le liste; posta divisa per tipo |
| FM26 | Scrivania a riquadri personalizzabili; partita a tutto schermo senza barra laterale |

## Regole fisse (errori ricorrenti di Stitch da non portare nel gioco)

- Solo nomi inventati: niente club, città, sponsor («Serie A Enilive») o arbitri con sezioni reali.
- Niente funzioni che il gioco non ha: scommesse, discorsi alla squadra (finché non si fanno), staff con nomi, orari,
  audio della radiocronaca, 3D, liste dei tesserati, extracomunitari, date di nascita complete.
- Numeri solo dal motore; dei giocatori degli altri club solo stime (regola §7.6).
- Nessun testo troncato o che esce dai bottoni a 1280×800; cifre su una riga.
- Valori alti in verde, bassi in rosso.

## Fasi

1. **Cornice e token**: nuova palette e caratteri (tema scuro e chiaro, contrasto in `tokens.test.ts`); barra laterale
   con icone e allenatore; barra in alto alla Openfoot con titolo della schermata, «Salva» e «Continua ▾»
   (continua / fino alla prossima partita / fino a fine mese).
2. **Scrivania personalizzabile**: griglia a 12 colonne, riquadri S/M/L, modifica con trascinamento, galleria dei
   widget, layout Allenatore / Direttore sportivo / Essenziale / Il mio; disposizione salvata in `settings.ts`.
3. **Partita dal vivo** a tutto schermo; **Resoconto** come finestra.
4. **Rosa**, **Scheda giocatore**, **Tattica**.
5. **Calendario**, **Mercato**, **Finanze**.
6. **Nuova carriera** e le schermate senza disegno (Allenamento, Spogliatoio, Vivaio, Osservatori, Dirigenza, Storie,
   Classifiche, Record, Impostazioni, Coppa), con gli stessi componenti.

Ogni fase: test verdi, typecheck, collaudo nell'app a 1280×800 in tema scuro e chiaro, foto nel registro. Si pubblica
a fine fase 2 (0.7.0) e poi a ogni fase.
