// Diagnosi P11: cosa appiattisce la Serie A? Reputazione, cassa, monte ingaggi e forza dei club, e dove finiscono i migliori.
import { pickXI, xiStrength } from '../src/engine/match.ts';
import { advance, endSeason, isSeasonOver, newWorld } from '../src/engine/world.ts';
const seed = Number(process.argv[2] ?? 42), seasons = Number(process.argv[3] ?? 12);
const w = newWorld(seed);
const pearson = (a: number[], b: number[]) => {
  const m = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = m(a), mb = m(b); let n = 0, da = 0, db = 0;
  a.forEach((v, i) => { n += (v - ma) * (b[i]! - mb); da += (v - ma) ** 2; db += (b[i]! - mb) ** 2; });
  return n / Math.sqrt(da * db);
};
const sd = (x: number[]) => { const m = x.reduce((s, v) => s + v, 0) / x.length; return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / x.length); };
const f = (x: number) => x.toFixed(1);
for (let s = 0; s < seasons; s++) {
  const A = w.competitions.ITA1!;
  const cl = A.clubIds.map((id) => w.clubs[id]!);
  const str = cl.map((c) => xiStrength(pickXI(w, c)));
  const rep = cl.map((c) => c.reputation);
  const wage = cl.map((c) => c.playerIds.reduce((t, id) => t + w.players[id]!.contract.wage, 0) / 1e6);
  const bal = cl.map((c) => c.balance / 1e6);
  // i 60 migliori giocatori del mondo: in che club (per reputazione) stanno
  const top = Object.values(w.players).filter((p) => p.clubId !== null).sort((a, b) => b.ca - a.ca).slice(0, 60);
  const inTop5 = top.filter((p) => { const r = [...cl].sort((a, b) => b.reputation - a.reputation).slice(0, 5).map((c) => c.id); return r.includes(p.clubId!); }).length;
  const ages = top.reduce((t, p) => t + (w.season - p.birthYear), 0) / 60;
  console.log(s, 'sdStr', f(sd(str)), 'sdRep', f(sd(rep)), 'rep~str', pearson(rep, str).toFixed(2), 'wage~str', pearson(wage, str).toFixed(2),
    'sdWage', f(sd(wage)), 'bal min/max', f(Math.min(...bal)), f(Math.max(...bal)), 'top60 nei 5 big', inTop5, 'etàTop', f(ages), 'caTop60', f(top.reduce((t, p) => t + p.ca, 0) / 60));
  while (!isSeasonOver(w)) advance(w);
  endSeason(w);
}
