// La coppia estrema (motore-v2 §13): prima contro ultima per blasone, 300 partite. Gol, xG, tiri, passaggi.
// Uso: [M=3] [NOTRAITS=1] [OV="longMaxX=5.5,markSkill=0.1"] [OUT=1: punte della debole «Resta alto»] node tools/diag-pair.ts [seme]
import { MATCH } from '../src/engine/balance.ts';
import { applyMatch, matchSetups } from '../src/engine/match.ts';
import { runMatch } from '../src/engine/match/engine.ts';
import type { Fixture } from '../src/engine/model.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

for (const kv of (process.env.OV ?? '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); (MATCH as unknown as Record<string, number>)[k!] = Number(v); }
const w = newWorld(Number(process.argv[2] ?? 42)); w.manager.clubId = -1;
if (process.env.NOTRAITS) for (const p of Object.values(w.players)) p.traits = []; // NOTRAITS=1: senza tratti
const A = w.competitions.ITA1!.clubIds;
const byRep = [...A].sort((a, b) => w.clubs[b]!.reputation - w.clubs[a]!.reputation);
const [S, W] = [byRep[0]!, byRep.at(-1)!];
const rng = new Rng(42);
const n = 300, T = { gs: 0, gw: 0, xs: 0, xw: 0, ss: 0, sw: 0, ps: 0, pw: 0, win: 0, draw: 0 };
for (let i = 0; i < n; i++) {
  for (const p of Object.values(w.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; }
  const fx: Fixture = i % 2 ? { day: 0, home: S, away: W } : { day: 0, home: W, away: S };
  const su = matchSetups(w, fx);
  if (process.env.M) for (const x of su) x.mentality = Number(process.env.M); // M=3: mentalità uguale per tutte e due
  if (process.env.OUT) for (const e of su[fx.home === W ? 0 : 1].xi) if (e.slot.pos === 'ST') e.oop = 'outlet';
  applyMatch(w, rng, fx, runMatch(rng, su).result());
  const r = fx.result!, s = fx.home === S ? 0 : 1, g = [r.hg, r.ag], a = r.stats[s]!, b = r.stats[1 - s]!;
  T.gs += g[s]!; T.gw += g[1 - s]!; T.xs += a.xg; T.xw += b.xg; T.ss += a.shots; T.sw += b.shots; T.ps += a.passes; T.pw += b.passes;
  if (g[s]! > g[1 - s]!) T.win++; else if (g[s] === g[1 - s]) T.draw++;
}
const f = (v: number, d = 2) => (v / n).toFixed(d);
console.log(`vince ${(100 * T.win / n).toFixed(0)}% pari ${(100 * T.draw / n).toFixed(0)}% · gol ${f(T.gs)}-${f(T.gw)} · xG ${f(T.xs)}-${f(T.xw)} · tiri ${f(T.ss, 1)}-${f(T.sw, 1)} · passaggi ${f(T.ps, 0)}-${f(T.pw, 0)}`);
