// Diagnosi delle nazionali (0.4.0): gol a partita per fascia di divario e forza delle nazioni stagione dopo stagione.
// Uso: node tools/diag-nations.ts [seme=42] [stagioni=6]
import { NATIONS } from '../src/engine/names.ts';
import { strength } from '../src/engine/nations/squad.ts';
import { advance, endSeason, isSeasonOver, newWorld } from '../src/engine/world.ts';

const seed = Number(process.argv[2] ?? 42);
const seasons = Number(process.argv[3] ?? 6);
const w = newWorld(seed);
w.manager.clubId = -1;
const codes = Object.keys(NATIONS);
const buckets = [[0, 8], [8, 20], [20, 99]] as const;
const acc = buckets.map(() => ({ n: 0, g: 0 }));
// l'archivio tiene solo le ultime 60 partite: si contano man mano, a ogni giorno giocato e a fine stagione
const count = (str: Map<string, number>, fresh: { a: string; b: string; ga: number; gb: number }[]) => {
  for (const m of fresh) {
    const gap = Math.abs((str.get(m.a) ?? 0) - (str.get(m.b) ?? 0));
    const i = buckets.findIndex(([lo, hi]) => gap >= lo && gap < hi);
    acc[i]!.n++; acc[i]!.g += m.ga + m.gb;
  }
};
const step = (str: Map<string, number>, f: () => void) => {
  const last = w.intl.at(-1);
  f();
  const from = last ? w.intl.lastIndexOf(last) + 1 : 0;
  count(str, w.intl.slice(from));
};
for (let s = 0; s < seasons; s++) {
  const str = new Map(codes.map((c) => [c, strength(w, c)]));
  const share = (lv: number) => {
    const ps = Object.values(w.players).filter((p) => p.clubId !== null && w.competitions[w.clubs[p.clubId]!.compId]?.level === lv);
    return `${(ps.filter((p) => p.nation !== 'ITA').length / ps.length * 100).toFixed(0)}%`;
  };
  console.log(`${w.season}: stranieri A ${share(1)} B ${share(2)} C ${share(3)} · ` + codes.map((c) => `${c} ${str.get(c)!.toFixed(0)}`).join(' '));
  while (!isSeasonOver(w)) step(str, () => advance(w));
  step(str, () => endSeason(w)); // il torneo estivo
}
const all = acc.reduce((a, b) => ({ n: a.n + b.n, g: a.g + b.g }), { n: 0, g: 0 });
console.log(`gol a partita ${(all.g / all.n).toFixed(2)} su ${all.n} partite · ` + buckets.map(([lo, hi], i) => `divario ${lo}-${hi}: ${(acc[i]!.g / acc[i]!.n).toFixed(2)} (${acc[i]!.n})`).join(' · '));
