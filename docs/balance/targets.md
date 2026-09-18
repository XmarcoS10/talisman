# Target di bilanciamento (GUIDA §14.1)

Il contratto con cui si giudica ogni build.
Verifica: `pnpm sim -- --matches 3000` e `pnpm sim -- --seasons 10 --seed 42`. Report completi in questa cartella (`f3-*.md`).

| Metrica | Target | Stato 18/09/2026 (motore L2, F3) |
|---|---|---|
| Gol per partita (Serie A) | 2,5 – 2,9 | ✅ 2,62-2,72 |
| Vittorie in casa | 42 – 46% | ✅ 43-45% |
| Pareggi | 22 – 30% | ⚠️ 22,8% partite singole, 21-22% in stagione |
| xG medio per squadra | 1,2 – 1,5 | ✅ 1,32 |
| Tiri / in porta per squadra | 10-15 / 3,5-5,5 | ✅ 15,0 / 5,1 |
| Passaggi per squadra · precisione | 350-550 · 78-88% | ✅ 412 · 79% |
| Falli · gialli · rossi per partita | 22-30 · 3,5-5,5 · 0,1-0,3 | ✅ 23 · 3,7 · 0,15 |
| Corner per squadra | 4 – 6 | ✅ 4,7 |
| Più forte contro più debole (vittorie) | 65 – 80% | ✅ 71% |
| Correlazione forza rosa ↔ punti | 0,75 – 0,85 | ⚠️ 0,71-0,78 |
| Scudetti diversi in 10 stagioni | ≥ 4 | ❌ 3 (dinastie: servono mercato F7 e rotazioni F5) |
| Punti del campione | 70 – 100 | ⚠️ 98-106 |
| Infortuni per squadra/stagione | 12 – 18 | 13,4 solo in partita (+ allenamento in F5) |
| Trasferimenti per finestra (Serie A) | 90 – 160 | — (F7) |
| Monte ingaggi / fatturato | 55 – 80% | — (F8) |
| Crescita media giovane PA alto | +25 CA in 5 anni | da misurare (F5) |
| Voto medio in pagella | ~6,6-6,8 | ✅ 6,65 |
| Tempo avanzamento giornata | < 400 ms | ✅ ~100 ms |
| Tempo stagione batch | < 25 s | ✅ ~3,7 s |
| 10.000 partite | < 20 s | ❌ ~46 s |
