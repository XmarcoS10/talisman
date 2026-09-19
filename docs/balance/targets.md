# Target di bilanciamento (GUIDA §14.1)

Il contratto con cui si giudica ogni build.
Verifica: `pnpm sim -- --matches 3000`, `pnpm sim -- --seasons 10 --seed 42`, `pnpm sim -- --dev 10`, `pnpm sim -- --psych 20`.
Report completi in questa cartella (`f5-*.md`, `development.md`, `psychology.md`).

| Metrica | Target | Stato F5 (persone) |
|---|---|---|
| Gol per partita (Serie A) | 2,5 – 2,9 | ✅ 2,57 stagioni · 2,61 partite isolate |
| Vittorie in casa | 42 – 46% | ✅ 43-44% |
| Pareggi | 22 – 30% | ✅ 24% |
| xG medio per squadra | 1,2 – 1,5 | ✅ 1,30 |
| Tiri / in porta per squadra | 10-15 / 3,5-5,5 | ✅ 14,4 / 4,9 |
| Passaggi per squadra · precisione | 350-550 · 78-88% | ✅ ~415 · 79% |
| Falli · gialli · rossi per partita | 22-30 · 3,5-5,5 · 0,1-0,3 | ✅ 23 · 3,7 · 0,15 |
| Corner per squadra | 4 – 6 | ✅ 4,9 |
| Più forte contro più debole (vittorie) | 65 – 80% | ⚠️ 80-83% (in F4 era 64-71%: il mondo generato conta ±5%) |
| Correlazione forza rosa ↔ punti | 0,75 – 0,85 | ✅ 0,83 |
| Scudetti diversi in 10 stagioni | ≥ 4 | ✅ 5 |
| Punti del campione | 70 – 100 | ✅ max 96 |
| Equilibrio dei moduli (punti/partita, stessa rosa) | ±0,3 dalla media | ✅ 1,26-1,66 (F4) |
| Equilibrio dei ruoli (varianti sul 4-3-3) | ±0,3 dalla base 1,60 | ⚠️ 1,29-1,84 (F4) |
| Infortuni per squadra/stagione (partita + allenamento) | 12 – 18 | ✅ 16,5 |
| Giovani ad alto potenziale che crescono (+10 CA in 5 anni) | 70 – 90% | ✅ 90% (al limite: 88-95% secondo il mondo) |
| Crescita media giovane PA alto | ~ +25 CA in 5 anni | ✅ +23 |
| Età d'inizio declino (variazione media < 0) | 29 – 32 | ✅ 30 |
| Età media del picco | 27 – 30 | ✅ 27,1 (al limite) |
| Impatto del morale sui punti (pessimo vs ottimo) | 6 – 15% | ✅ 13,0% |
| Niente cicli esplosivi del morale | media lontana da 0 e 100 | ✅ media 56, 10°-90° percentile 46-66 |
| Trasferimenti per finestra (Serie A) | 90 – 160 | — (F7) |
| Monte ingaggi / fatturato | 55 – 80% | — (F8) |
| Voto medio in pagella | ~6,6-6,8 | ✅ 6,65 (F4) |
| Tempo avanzamento giornata (UI, con salvataggio) | < 400 ms (P5: < 100 ms) | ✅/⚠️ ~150 ms |
| Partita live: fotogrammi coerenti e simulazione pigra | test verdi | ✅ `playback.test.ts` |
| Partita live: fps con 4× | > 55 fps | da provare a mano (il browser ferma l'animazione in secondo piano) |
| Tempo stagione batch | < 25 s | ✅ ~3,9 s |
| 10.000 partite | < 20 s | ❌ ~41 s |
