# Target di bilanciamento (GUIDA §14.1)

Il contratto con cui si giudica ogni build.
Verifica: `pnpm sim -- --matches 3000` e `pnpm sim -- --seasons 10 --seed 42`. Report completi in questa cartella (`f4-*.md`).

| Metrica | Target | Stato F4 (motore L2 + ruoli) |
|---|---|---|
| Gol per partita (Serie A) | 2,5 – 2,9 | ✅ 2,70 |
| Vittorie in casa | 42 – 46% | ✅ 44% |
| Pareggi | 22 – 30% | ✅ 22-24% |
| xG medio per squadra | 1,2 – 1,5 | ✅ 1,33 |
| Tiri / in porta per squadra | 10-15 / 3,5-5,5 | ✅ 14,7 / 5,0 |
| Passaggi per squadra · precisione | 350-550 · 78-88% | ✅ ~410 · 79% |
| Falli · gialli · rossi per partita | 22-30 · 3,5-5,5 · 0,1-0,3 | ✅ 23 · 3,7 · 0,14 |
| Corner per squadra | 4 – 6 | ✅ 5,1 |
| Più forte contro più debole (vittorie) | 65 – 80% | ⚠️ 64-71% (al limite, rumore ±2,5%) |
| Correlazione forza rosa ↔ punti | 0,75 – 0,85 | ⚠️ 0,85 (al limite) |
| Scudetti diversi in 10 stagioni | ≥ 4 | ✅ 4 |
| Punti del campione | 70 – 100 | ✅ max 95 |
| Equilibrio dei moduli (punti/partita, stessa rosa) | ±0,3 dalla media | ✅ 1,26-1,66 |
| Equilibrio dei ruoli (varianti sul 4-3-3) | ±0,3 dalla base 1,60 | ⚠️ 1,29-1,84 (quinti forti, ala invertita debole) |
| Infortuni per squadra/stagione | 12 – 18 | 13,4 solo in partita (+ allenamento in F5) |
| Trasferimenti per finestra (Serie A) | 90 – 160 | — (F7) |
| Monte ingaggi / fatturato | 55 – 80% | — (F8) |
| Crescita media giovane PA alto | +25 CA in 5 anni | da misurare (F5) |
| Voto medio in pagella | ~6,6-6,8 | ✅ 6,65 |
| Tempo avanzamento giornata (UI, con salvataggio) | < 400 ms (P5: < 100 ms) | ✅/⚠️ ~120 ms |
| Tempo stagione batch | < 25 s | ✅ ~3,5 s |
| 10.000 partite | < 20 s | ❌ ~45 s |
