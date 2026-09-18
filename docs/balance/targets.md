# Target di bilanciamento (GUIDA §14.1)

Il contratto con cui si giudica ogni build. Verifica: `pnpm sim -- --seasons 10 --seed 42`.

| Metrica | Target | Stato 18/09/2026 (motore L0) |
|---|---|---|
| Gol per partita (Serie A) | 2,5 – 2,9 | ✅ 2,65 |
| Vittorie in casa | 42 – 46% | ✅ 43-44% |
| Correlazione forza rosa ↔ punti | 0,75 – 0,85 | ✅ 0,80-0,84 |
| Scudetti diversi in 10 stagioni | ≥ 4 | ✅ 4-6 |
| Punti del campione | 70 – 100 | ✅ 83-92 |
| Infortuni per squadra/stagione | 12 – 18 | — (F5) |
| xG medio per squadra | 1,2 – 1,5 | — (F3) |
| Trasferimenti per finestra (Serie A) | 90 – 160 | — (F7) |
| Monte ingaggi / fatturato | 55 – 80% | — (F8) |
| Crescita media giovane PA alto | +25 CA in 5 anni | da misurare |
| Tempo avanzamento giornata | < 400 ms | ✅ ~4 ms |
| Tempo stagione batch | < 25 s | ✅ 0,07 s |
