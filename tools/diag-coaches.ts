// Diagnosi degli allenatori (0.5.0): nessuno stile deve vincere di più a parità di rosa. Per ogni club di A e B:
// punti fatti meno punti attesi dalla forza dell'undici (retta sui dati della stagione), media per stile. Più esoneri.
// Uso: node tools/diag-coaches.ts [seme=42] [stagioni=6]
import { coachOf } from '../src/engine/coaches.ts';
import { pickXI, xiStrength } from '../src/engine/match.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from '../src/engine/world.ts';

const seed = Number(process.argv[2] ?? 42);
const seasons = Number(process.argv[3] ?? 6);
const w = newWorld(seed);
w.manager.clubId = -1;
const by = new Map<string, { n: number; res: number }>();
let sacked = 0;
for (let s = 0; s < seasons; s++) {
  const start = new Map<number, { str: number; style: string }>();
  while (!isSeasonOver(w)) {
    if (w.day === 0 || start.size === 0) {
      advance(w); // la prima giornata assegna gli allenatori alle carriere nuove
      for (const c of Object.values(w.clubs)) start.set(c.id, { str: xiStrength(pickXI(w, c)), style: coachOf(w, c.id)?.style ?? '-' });
      continue;
    }
    advance(w);
  }
  for (const id of ['ITA1', 'ITA2']) {
    const table = standings(w, w.competitions[id]!);
    const xs = table.map((r) => start.get(r.clubId)!.str), ys = table.map((r) => r.pts);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const k = xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    table.forEach((r, i) => {
      const st = start.get(r.clubId)!.style;
      const a = by.get(st) ?? { n: 0, res: 0 };
      a.n++; a.res += ys[i]! - (my + k * (xs[i]! - mx));
      by.set(st, a);
    });
  }
  sacked += Object.values(w.coaches).reduce((n, c) => n + c.career.filter((x) => x.sacked && x.season === w.season).length, 0);
  endSeason(w);
}
console.log('punti sopra (o sotto) le attese, per stile dell\'allenatore di inizio stagione:');
for (const [k, a] of [...by].sort((x, y) => y[1].res / y[1].n - x[1].res / x[1].n)) console.log(`  ${k.padEnd(11)} ${(a.res / a.n >= 0 ? '+' : '') + (a.res / a.n).toFixed(1)} punti (${a.n} stagioni di club)`);
console.log(`esoneri a stagione in A e B: ${(sacked / seasons).toFixed(1)}`);
