// Laboratorio di bilanciamento: simula senza UI e confronta con docs/balance/targets.md.
// Stagioni: pnpm sim -- --seasons 10 --seed 42 [--report out.md]
// Partite:  pnpm sim -- --matches 10000 --seed 42 [--report out.md]
// Mercato:  pnpm sim -- --market 5
// Storie:   pnpm sim -- --stories 3
// Persone:  pnpm sim -- --dev 10 · pnpm sim -- --psych 20 (people.ts)
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pickXI, playMatch, xiStrength } from '../engine/match.ts';
import type { Fixture, SideStats, WorldState } from '../engine/model.ts';
import { Rng } from '../engine/rng.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from '../engine/world.ts';
import { marketReport } from './market.ts';
import { storiesReport } from './stories.ts';
import { devReport, psychReport } from './people.ts';

// pnpm 12 passa il `--` di `pnpm sim -- --seasons 10` così com'è
const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'),
  options: { seasons: { type: 'string' }, matches: { type: 'string' }, dev: { type: 'string' }, psych: { type: 'string' }, market: { type: 'string' }, stories: { type: 'string' }, seed: { type: 'string', default: '42' }, report: { type: 'string' } },
});
const seed = Number(values.seed);
const t0 = performance.now();
const world = newWorld(seed);

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
function pearson(xs: number[], ys: number[]) {
  const mx = avg(xs), my = avg(ys);
  let num = 0, dx = 0, dy = 0;
  xs.forEach((x, i) => { const y = ys[i]!; num += (x - mx) * (y - my); dx += (x - mx) ** 2; dy += (y - my) ** 2; });
  return num / Math.sqrt(dx * dy);
}

/** metriche per partita, raccolte da qualunque elenco di risultati */
class Agg {
  n = 0; goals = 0; home = 0; draw = 0; xg = 0; shots = 0; onTarget = 0; passes = 0; passesOk = 0; fouls = 0; yellows = 0; reds = 0;
  corners = 0; offsides = 0; possMax = 0; injuries = 0; pens = 0;
  add(fx: Fixture) {
    const r = fx.result!;
    this.n++; this.goals += r.hg + r.ag;
    if (r.hg > r.ag) this.home++; else if (r.hg === r.ag) this.draw++;
    for (const s of r.stats as SideStats[]) {
      this.xg += s.xg; this.shots += s.shots; this.onTarget += s.onTarget; this.passes += s.passes; this.passesOk += s.passesOk;
      this.fouls += s.fouls; this.yellows += s.yellows; this.reds += s.reds; this.corners += s.corners; this.offsides += s.offsides;
    }
    this.possMax += Math.max(r.stats[0].possession, r.stats[1].possession);
    this.injuries += r.events.filter((e) => e.type === 'injury').length;
    this.pens += r.events.filter((e) => e.type === 'penGoal' || e.type === 'penMiss').length;
  }
}

const row = (name: string, value: number, lo: number, hi: number, fmt = (v: number) => v.toFixed(2)) =>
  `| ${name} | ${fmt(value)} | ${fmt(lo)} – ${fmt(hi)} | ${value >= lo && value <= hi ? '✅' : '❌'} |`;
const info = (name: string, value: string, note = '') => `| ${name} | ${value} | ${note} | |`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function matchRows(a: Agg) {
  const per = (v: number) => v / a.n;
  return [
    row('Gol per partita', per(a.goals), 2.5, 2.9),
    row('Vittorie in casa', per(a.home), 0.42, 0.46, pct),
    row('Pareggi', per(a.draw), 0.22, 0.3, pct),
    row('xG per squadra', per(a.xg) / 2, 1.2, 1.5),
    row('Tiri per squadra', per(a.shots) / 2, 10, 15, (v) => v.toFixed(1)),
    row('Tiri in porta per squadra', per(a.onTarget) / 2, 3.5, 5.5, (v) => v.toFixed(1)),
    row('Passaggi per squadra', per(a.passes) / 2, 350, 550, (v) => v.toFixed(0)),
    row('Precisione passaggi', a.passesOk / a.passes, 0.78, 0.88, pct),
    row('Falli per partita', per(a.fouls), 22, 30, (v) => v.toFixed(1)),
    row('Gialli per partita', per(a.yellows), 3.5, 5.5, (v) => v.toFixed(1)),
    row('Rossi per partita', per(a.reds), 0.1, 0.3),
    row('Corner per squadra', per(a.corners) / 2, 4, 6, (v) => v.toFixed(1)),
    info('Fuorigioco per squadra', (per(a.offsides) / 2).toFixed(1), '~2'),
    info('Rigori per partita', per(a.pens).toFixed(2), '~0,3'),
    info('Possesso medio della squadra dominante', `${per(a.possMax).toFixed(1)}%`, '~58%'),
  ];
}

function seasonsReport(seasons: number) {
  let maxPts = 0;
  const champions: string[] = [];
  const champPts: number[] = [];
  const corrs: number[] = [];
  const agg = new Agg();
  const injuriesPerTeam: number[] = [];
  // tutti gli infortuni (partita + allenamento): ogni infortunio crea un nuovo oggetto condition.injury
  const lastInj = new Map<number, unknown>();
  let allInjuries = 0;
  const morale: number[] = [];
  for (let s = 0; s < seasons; s++) {
    const serieA = world.competitions.ITA1!;
    const strength = new Map(serieA.clubIds.map((id) => [id, xiStrength(pickXI(world, world.clubs[id]!))]));
    while (!isSeasonOver(world)) {
      advance(world);
      for (const p of Object.values(world.players)) {
        const inj = p.condition.injury;
        if (inj && inj !== lastInj.get(p.id)) allInjuries++;
        lastInj.set(p.id, inj);
      }
    }
    for (const p of Object.values(world.players)) morale.push(p.psych.morale);
    for (const fx of serieA.fixtures) agg.add(fx);
    injuriesPerTeam.push(agg.injuries / 20 / (s + 1));
    const table = standings(world, serieA);
    maxPts = Math.max(maxPts, table[0]!.pts);
    champPts.push(table[0]!.pts);
    corrs.push(pearson(table.map((r) => strength.get(r.clubId)!), table.map((r) => r.pts)));
    champions.push(world.clubs[table[0]!.clubId]!.name);
    endSeason(world);
  }
  const ms = performance.now() - t0;
  return [
    `# Report simulazione — ${seasons} stagioni, seed ${seed}`, '',
    '| Metrica (Serie A) | Valore | Target | |', '|---|---|---|---|',
    ...matchRows(agg),
    info('Infortuni in partita per squadra/stagione', (agg.injuries / 20 / seasons).toFixed(1), ''),
    row('Infortuni totali per squadra/stagione (tutte le leghe)', allInjuries / Object.keys(world.clubs).length / seasons, 12, 18, (v) => v.toFixed(1)),
    info('Morale a fine stagione: media · 10° · 90° percentile', ((q) => `${avg(morale).toFixed(0)} · ${q(0.1)} · ${q(0.9)}`)(
      (x: number) => [...morale].sort((a, b) => a - b)[Math.floor(x * morale.length)]!.toFixed(0)), ''),
    row('Correlazione forza ↔ punti', avg(corrs), 0.75, 0.85),
    row('Campioni diversi', new Set(champions).size, Math.min(4, seasons), seasons, (v) => String(v)),
    row('Punti massimi del campione', maxPts, 70, 100, (v) => String(v)),
    row('Tempo per stagione (s)', ms / 1000 / seasons, 0, 25),
    '', "## Albo d'oro",
    ...champions.map((c, i) => `- ${world.season - seasons + i}/${String(world.season - seasons + i + 1).slice(2)}: ${c} (${champPts[i]} pt)`),
  ];
}

function matchesReport(n: number) {
  const rng = new Rng(seed);
  const serieA = world.competitions.ITA1!.clubIds;
  const agg = new Agg();
  // test della "squadra molto più forte": prima contro ultima per reputazione
  const byRep = [...serieA].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation);
  let strongWins = 0, strongGames = 0;
  const fresh = (w: WorldState) => { for (const p of Object.values(w.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; } };
  for (let i = 0; i < n; i++) {
    const home = rng.pick(serieA);
    let away = rng.pick(serieA);
    while (away === home) away = rng.pick(serieA);
    const fx: Fixture = { day: 0, home, away };
    fresh(world); // partite isolate: tutti riposati e disponibili
    playMatch(world, rng, fx);
    agg.add(fx);
  }
  const tMatches = performance.now() - t0;
  for (let i = 0; i < 400; i++) {
    const [strong, weak] = [byRep[0]!, byRep[byRep.length - 1]!];
    const fx: Fixture = i % 2 ? { day: 0, home: strong, away: weak } : { day: 0, home: weak, away: strong };
    fresh(world);
    playMatch(world, rng, fx);
    const r = fx.result!;
    strongGames++;
    if ((fx.home === strong && r.hg > r.ag) || (fx.away === strong && r.ag > r.hg)) strongWins++;
  }
  return [
    `# Report partite — ${n} partite di Serie A, seed ${seed}`, '',
    '| Metrica | Valore | Target | |', '|---|---|---|---|',
    ...matchRows(agg),
    row('Vittorie della più forte contro la più debole', strongWins / strongGames, 0.65, 0.8, pct),
    row(`Tempo per ${n} partite (s)`, tMatches / 1000, 0, (20 * n) / 10000, (v) => v.toFixed(1)),
  ];
}

const report = (values.dev ? devReport(seed, Number(values.dev)) : values.psych ? psychReport(seed, Number(values.psych))
  : values.market ? marketReport(seed, Number(values.market))
  : values.stories ? storiesReport(seed, Number(values.stories))
  : values.matches ? matchesReport(Number(values.matches)) : seasonsReport(Number(values.seasons ?? 10))).join('\n');
console.log(report);
if (values.report) writeFileSync(values.report, report + '\n');
