// Diagnosi della forza (0.13.x): vittorie, pareggi e sconfitte della più forte per fascia di differenza di forza
// dell'undici (xiStrength), su partite isolate di Serie A con tutti riposati. Uso: node tools/diag-strength.ts [seme] [partite]
import { pickXI, playMatch, xiStrength } from '../src/engine/match.ts';
import type { Fixture } from '../src/engine/model.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

import { MATCH } from '../src/engine/balance.ts';
for (const kv of (process.env.OV ?? '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); (MATCH as unknown as Record<string, number>)[k!] = Number(v); }
const seed = Number(process.argv[2] ?? 42), n = Number(process.argv[3] ?? 3000);
const w = newWorld(seed);
w.manager.clubId = -1;
const rng = new Rng(seed * 7 + 1);
const A = w.competitions.ITA1!.clubIds;
const str = new Map(A.map((id) => [id, xiStrength(pickXI(w, w.clubs[id]!))]));
const sorted = [...str.values()].sort((a, b) => b - a);
// K < 1: prova di compressione degli attributi verso 11 (solo per misurare: le forze sopra restano quelle vere)
const K = Number(process.env.K ?? 1);
if (K !== 1) for (const p of Object.values(w.players)) for (const k of Object.keys(p.attrs) as (keyof typeof p.attrs)[]) p.attrs[k] = 11 + (p.attrs[k] - 11) * K;
const goals = { n: 0, g: 0, d: 0 };
const big = { n: 0, xs: 0, xw: 0, ss: 0, sw: 0, ps: 0 }; // scarto 13+: xG, tiri e possesso (passaggi) della più forte e della più debole
console.log(`forza undici Serie A: prima ${sorted[0]!.toFixed(1)}, ultima ${sorted.at(-1)!.toFixed(1)}, scarto ${(sorted[0]! - sorted.at(-1)!).toFixed(1)}`);
const edges = [2, 4, 6, 9, 13, 99];
const b = edges.map(() => ({ n: 0, w: 0, d: 0 }));
for (let i = 0; i < n; i++) {
  const home = rng.pick(A);
  let away = rng.pick(A);
  while (away === home) away = rng.pick(A);
  for (const p of Object.values(w.players)) { p.condition.fitness = Number(process.env.FIT ?? 100); p.condition.injuryDays = 0; p.discipline.ban = 0; }
  const fx: Fixture = { day: 0, home, away };
  playMatch(w, rng, fx);
  const diff = str.get(home)! - str.get(away)!;
  const k = edges.findIndex((e) => Math.abs(diff) < e);
  const r = fx.result!, g = diff >= 0 ? r.hg - r.ag : r.ag - r.hg;
  if (Math.abs(diff) >= 13) {
    const [S, W] = diff >= 0 ? [r.stats[0], r.stats[1]] : [r.stats[1], r.stats[0]];
    big.n++; big.xs += S.xg; big.xw += W.xg; big.ss += S.shots; big.sw += W.shots; big.ps += S.passes / (S.passes + W.passes);
  }
  goals.n++; goals.g += r.hg + r.ag; if (r.hg === r.ag) goals.d++;
  b[k]!.n++; if (g > 0) b[k]!.w++; else if (g === 0) b[k]!.d++;
}
let lo = 0;
for (const [i, x] of b.entries()) {
  console.log(`scarto ${lo}-${edges[i]}: ${x.n} partite · più forte vince ${(100 * x.w / x.n).toFixed(0)}% · pari ${(100 * x.d / x.n).toFixed(0)}% · perde ${(100 * (x.n - x.w - x.d) / x.n).toFixed(0)}%`);
  lo = edges[i]!;
}
console.log(`gol a partita ${(goals.g / goals.n).toFixed(2)} · pareggi ${(100 * goals.d / goals.n).toFixed(1)}%`);
console.log(`scarto 13+: xG ${(big.xs / big.n).toFixed(2)} - ${(big.xw / big.n).toFixed(2)} · tiri ${(big.ss / big.n).toFixed(1)} - ${(big.sw / big.n).toFixed(1)} · possesso della più forte ${(100 * big.ps / big.n).toFixed(0)}%`);
