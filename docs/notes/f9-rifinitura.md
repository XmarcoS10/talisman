# F9 — Rifinitura e release

Fase chiusa lato codice. Restano i due criteri di accettazione che può verificare solo una persona.

## I nove punti di P13

| # | Punto | Stato |
|---|---|---|
| 1 | Suggerimenti contestuali, 12, disattivabili, salvati nelle impostazioni | fatto — `src/ui/Hint.tsx`, `settings.ts` |
| 2 | Prima partita guidata | fatto — cinque passi in Scrivania (`Guide.tsx`) |
| 3 | Creazione carriera con filtri e descrizione della sfida | fatto — `ClubPicker.tsx`; in più: lo slot da sovrascrivere si sceglie, non si perde una carriera per sbaglio |
| 4 | Glossario e coerenza dei testi | fatto — `docs/glossario.md`; corretti gli articoli davanti ai nomi delle squadre in notizie e schermate |
| 5 | Audio con volumi separati | fatto — sintetizzato, nessun file esterno (`audio.ts`) |
| 6 | Prestazioni: un giorno e un salvataggio da 100 MB, tre colli di bottiglia | fatto — vedi sotto |
| 7 | Installer Windows NSIS e Linux AppImage, niente aggiornamento automatico, sotto 250 MB | Windows fatto (113 MB); Linux configurato, va costruito su Linux |
| 8 | Registro errori su file ed «Esporta diagnostica» | fatto — `electron/main.cjs`, `diag.ts` |
| 9 | README, LICENSE, licenze degli asset, note di rilascio | fatto — GPL-3.0 scelta da Marco |

## Prestazioni, in numeri

- Un giorno di calendario: **113 ms** di mediana, 234 ms il peggiore. Quasi tutto è motore partita.
- Un salvataggio da **100 MB** (63.000 giocatori): lettura del mondo 0,5 s, scrittura 0,7 s.
- I tre colli di bottiglia risolti: l'elenco degli slot leggeva ogni salvataggio intero sei volte a ogni ridisegno
  (ora legge un'intestazione di ~100 caratteri); ogni piccola modifica salvava il mondo intero (ora un attimo dopo
  l'ultima, e subito a ogni avanzamento e all'uscita); il motore creava tre liste per ogni azione (ora le riusa,
  risultati identici bit per bit).

## Verificato a mano

- Il gioco nel browser: suggerimenti, guida, creazione carriera, impostazioni, caricamento dal nuovo formato di slot.
- L'app desktop impacchettata (`release/win-unpacked/Talisman.exe`): si avvia, scrive il registro, nessun errore né
  avviso di sicurezza.

## Non verificato — tocca a te

1. **L'installer su una macchina pulita** (criterio di P13). Io l'ho costruito e l'app impacchettata parte su questo
   computer, ma non ho potuto installarlo su un altro.
2. **Tre tester esterni che completano una stagione senza chiederti aiuto** (criterio di P13 e della GUIDA).
3. **La firma dell'installer** (la GUIDA dice «build firmata»): serve un certificato di firma del codice, che si compra.
   Senza, Windows avvisa «editore sconosciuto».
4. **La pagina itch.io**: il testo è in `docs/itch.md`, la pubblicazione la fai tu.
5. **La grafica finale** (nella riga F9 della GUIDA, non nel prompt P13): non l'ho toccata. Il gioco usa ancora gli
   stemmi generati e il campo disegnato.
