// Possesso di una forte contro una debole (Blocco 2b): quota dei passaggi, come Opta (e come il motore dal 25/09/2026).
// Uso: node tools/diag-possession.ts
import { matchSetups, pickXI, xiStrength } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';
const w = newWorld(42); w.manager.clubId = -1;
const ids = [...w.competitions.ITA1!.clubIds].sort((a, b) => xiStrength(pickXI(w, w.clubs[b]!)) - xiStrength(pickXI(w, w.clubs[a]!)));
let share = 0, shots = [0, 0], passes = [0, 0]; const N = 400;
for (let i = 0; i < N; i++) {
  const home = i % 2 === 0, si = home ? 0 : 1;
  const o = simulate(new Rng(i), matchSetups(w, home ? { day: 0, home: ids[1]!, away: ids[18]! } : { day: 0, home: ids[18]!, away: ids[1]! }));
  const s = o.result.stats[si]!, t = o.result.stats[1 - si]!;
  share += s.passes / (s.passes + t.passes) * 100; shots[0] += s.shots; shots[1] += t.shots; passes[0] += s.passes; passes[1] += t.passes;
}
console.log(`2ª contro 19ª: possesso (quota di passaggi) ${(share / N).toFixed(1)}% · tiri ${(shots[0] / N).toFixed(1)} contro ${(shots[1] / N).toFixed(1)} · passaggi ${(passes[0] / N).toFixed(0)} contro ${(passes[1] / N).toFixed(0)}`);
