// Diagnosi P11: per ogni stagione, correlazione forza↔punti, dispersione della forza e forza media della Serie A.
import { pickXI, xiStrength } from '../src/engine/match.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from '../src/engine/world.ts';
const seed = Number(process.argv[2] ?? 42), seasons = Number(process.argv[3] ?? 25);
const w = newWorld(seed);
const pearson = (a: number[], b: number[]) => {
  const m = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = m(a), mb = m(b); let n = 0, da = 0, db = 0;
  a.forEach((v, i) => { n += (v - ma) * (b[i]! - mb); da += (v - ma) ** 2; db += (b[i]! - mb) ** 2; });
  return n / Math.sqrt(da * db);
};
const sd = (x: number[]) => { const m = x.reduce((s, v) => s + v, 0) / x.length; return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / x.length); };
for (let s = 0; s < seasons; s++) {
  const A = w.competitions.ITA1!, B = w.competitions.ITA2!;
  const st = new Map(A.clubIds.map((id) => [id, xiStrength(pickXI(w, w.clubs[id]!))]));
  const sB = B.clubIds.map((id) => xiStrength(pickXI(w, w.clubs[id]!)));
  while (!isSeasonOver(w)) advance(w);
  const t = standings(w, A);
  const end = new Map(A.clubIds.map((id) => [id, xiStrength(pickXI(w, w.clubs[id]!))]));
  const v = [...st.values()];
  console.log(s, 'corr', pearson(t.map((r) => st.get(r.clubId)!), t.map((r) => r.pts)).toFixed(2),
    'corrFine', pearson(t.map((r) => end.get(r.clubId)!), t.map((r) => r.pts)).toFixed(2),
    'sdA', sd(v).toFixed(2), 'medA', (v.reduce((a, b) => a + b, 0) / 20).toFixed(1), 'medB', (sB.reduce((a, b) => a + b, 0) / 20).toFixed(1),
    'pts', t[0]!.pts, t[19]!.pts);
  endSeason(w);
}
