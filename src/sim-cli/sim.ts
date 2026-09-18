// Laboratorio di bilanciamento: simula N stagioni senza UI e confronta con docs/balance/targets.md.
// Uso: pnpm sim -- --seasons 10 --seed 42 [--report out.md]
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pickXI } from '../engine/match.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from '../engine/world.ts';

const { values } = parseArgs({ options: { seasons: { type: 'string', default: '10' }, seed: { type: 'string', default: '42' }, report: { type: 'string' } } });
const seasons = Number(values.seasons);
const t0 = performance.now();
const world = newWorld(Number(values.seed));

let matches = 0, goals = 0, homeWins = 0, draws = 0, maxPts = 0;
const champions: string[] = [];
const corrs: number[] = [];

function pearson(xs: number[], ys: number[]) {
  const m = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = m(xs), my = m(ys);
  let num = 0, dx = 0, dy = 0;
  xs.forEach((x, i) => { const y = ys[i]!; num += (x - mx) * (y - my); dx += (x - mx) ** 2; dy += (y - my) ** 2; });
  return num / Math.sqrt(dx * dy);
}

for (let s = 0; s < seasons; s++) {
  const serieA = world.competitions.ITA1!;
  const strength = new Map(serieA.clubIds.map((id) => {
    const xi = pickXI(world, world.clubs[id]!);
    return [id, xi.reduce((a, e) => a + e.rating, 0) / xi.length];
  }));
  while (!isSeasonOver(world)) advance(world);
  for (const fx of serieA.fixtures) {
    const { hg, ag } = fx.result!;
    matches++; goals += hg + ag;
    if (hg > ag) homeWins++; else if (hg === ag) draws++;
  }
  const table = standings(world, serieA);
  maxPts = Math.max(maxPts, table[0]!.pts);
  corrs.push(pearson(table.map((r) => strength.get(r.clubId)!), table.map((r) => r.pts)));
  champions.push(world.clubs[table[0]!.clubId]!.name);
  endSeason(world);
}

const ms = performance.now() - t0;
const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const row = (name: string, value: number, lo: number, hi: number, fmt = (v: number) => v.toFixed(2)) =>
  `| ${name} | ${fmt(value)} | ${fmt(lo)} – ${fmt(hi)} | ${value >= lo && value <= hi ? '✅' : '❌'} |`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const report = [
  `# Report simulazione — ${seasons} stagioni, seed ${values.seed}`,
  '',
  '| Metrica (Serie A) | Valore | Target | |',
  '|---|---|---|---|',
  row('Gol per partita', goals / matches, 2.5, 2.9),
  row('Vittorie in casa', homeWins / matches, 0.42, 0.46, pct),
  `| Pareggi | ${pct(draws / matches)} | ~25% | |`,
  row('Correlazione forza ↔ punti', avg(corrs), 0.75, 0.85),
  row('Campioni diversi', new Set(champions).size, 4, seasons, (v) => String(v)),
  row('Punti massimi del campione', maxPts, 70, 100, (v) => String(v)),
  row('Tempo per stagione (s)', ms / 1000 / seasons, 0, 25, (v) => v.toFixed(2)),
  '',
  '## Albo d\'oro',
  ...champions.map((c, i) => `- ${world.season - seasons + i}/${String(world.season - seasons + i + 1).slice(2)}: ${c}`),
].join('\n');

console.log(report);
if (values.report) writeFileSync(values.report, report + '\n');
