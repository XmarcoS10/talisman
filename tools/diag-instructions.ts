// Diagnosi delle istruzioni di squadra (0.5.0): ogni livello (0 e 2) contro il normale (1), a rose pari, 1.200 partite
// per casella. Nessun livello deve vincere o perdere da solo: neutro ≈ 1,37 punti a partita. Uso: node tools/diag-instructions.ts
import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';
const w = newWorld(42); w.manager.clubId = -1;
const rng = new Rng(5); const clubs = w.competitions.ITA1!.clubIds;
const fresh = () => { for (const p of Object.values(w.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; } };
const keys = ['pressing', 'tempo', 'width', 'line', 'directness', 'counterPress'] as const;
for (const k of keys) for (const v of [0, 2]) {
  let pts = 0, n = 0, gd = 0;
  for (let i = 0; i < 1200; i++) {
    const h = rng.pick(clubs); let a = rng.pick(clubs); while (a === h) a = rng.pick(clubs);
    const test = i % 2 ? h : a;
    for (const id of [h, a]) Object.assign(w.clubs[id]!.tactic, { mentality: 3, pressing: 1, tempo: 1, width: 1, line: 1, directness: 1, counterPress: 1 });
    (w.clubs[test]!.tactic as Record<string, number>)[k] = v;
    fresh();
    const r = simulate(rng, matchSetups(w, { day: 0, home: h, away: a })).result;
    const [f, g] = test === h ? [r.hg, r.ag] : [r.ag, r.hg];
    pts += f > g ? 3 : f === g ? 1 : 0; gd += f - g; n++;
  }
  console.log(`${k} ${v} contro 1: ${(pts / n).toFixed(2)} punti a partita (neutro ~1,37), differenza reti ${(gd / n >= 0 ? '+' : '') + (gd / n).toFixed(2)}`);
}
