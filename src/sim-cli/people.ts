// Report della fase F5 (persone): sviluppo per età e ruolo, test A/B della psicologia.
// pnpm sim -- --dev 10 [--report docs/balance/development.md]
// pnpm sim -- --psych 20 [--report docs/balance/psychology.md]
import { FLAGS } from '../engine/balance.ts';
import type { Position, WorldState } from '../engine/model.ts';
import { age } from '../engine/players.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from '../engine/world.ts';

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = (a: number[]) => Math.sqrt(avg(a.map((v) => (v - avg(a)) ** 2)));
const GROUP: Record<Position, string> = {
  GK: 'Portieri', DL: 'Difensori', DC: 'Difensori', DR: 'Difensori', DM: 'Centrocampisti', ML: 'Centrocampisti', MC: 'Centrocampisti',
  MR: 'Centrocampisti', AML: 'Attaccanti', AMC: 'Attaccanti', AMR: 'Attaccanti', ST: 'Attaccanti',
};
const playSeason = (w: WorldState, before?: () => void) => { while (!isSeasonOver(w)) { before?.(); advance(w); } };

/** curve medie di crescita: variazione di CA in un anno per età e reparto, coorte dei giovani ad alto potenziale */
export function devReport(seed: number, seasons: number): string[] {
  const w = newWorld(seed);
  const byAge = new Map<string, number[]>(); // "reparto|età" → delta CA annui
  const young = Object.values(w.players).filter((p) => age(p, w.season) <= 19 && p.pa >= 130);
  const start = new Map(young.map((p) => [p.id, p.ca]));
  const after5 = new Map<number, number>();
  const peakAges: number[] = [];
  const best = new Map<number, { ca: number; age: number }>();
  for (let s = 0; s < seasons; s++) {
    const before = new Map(Object.values(w.players).map((p) => [p.id, p.ca]));
    playSeason(w);
    endSeason(w); // lo sviluppo continua nel precampionato: si misura da estate a estate
    for (const p of Object.values(w.players)) {
      const b = before.get(p.id);
      if (b === undefined) continue;
      const a = age(p, w.season) - 1;
      const key = `${GROUP[p.position]}|${a}`;
      byAge.set(key, [...(byAge.get(key) ?? []), p.ca - b]);
      const cur = best.get(p.id);
      if (!cur || p.ca > cur.ca) best.set(p.id, { ca: p.ca, age: a + 1 });
    }
    if (s === 4) for (const p of young) if (w.players[p.id]) after5.set(p.id, w.players[p.id]!.ca);
  }
  // picco: solo chi è stato osservato dai 25 ai 33 anni
  for (const p of Object.values(w.players)) {
    const b = best.get(p.id);
    const a = age(p, w.season);
    if (b && a >= 33 && a - seasons <= 25) peakAges.push(b.age);
  }
  const groups = ['Portieri', 'Difensori', 'Centrocampisti', 'Attaccanti'];
  const ages = Array.from({ length: 19 }, (_, i) => 16 + i);
  const cell = (g: string, a: number) => { const v = byAge.get(`${g}|${a}`); return v && v.length >= 5 ? avg(v).toFixed(1) : '·'; };
  // età in cui la variazione media diventa negativa (tutti i reparti)
  const all = (a: number) => groups.flatMap((g) => byAge.get(`${g}|${a}`) ?? []);
  const declineAt = ages.find((a) => a >= 24 && avg(all(a)) < 0) ?? NaN;
  const gains = [...after5].map(([id, ca]) => ca - start.get(id)!);
  const grew = gains.filter((g) => g >= 10).length / (gains.length || 1);
  const ok = (v: number, lo: number, hi: number) => (v >= lo && v <= hi ? '✅' : '❌');
  return [
    `# Sviluppo dei giocatori — ${seasons} stagioni, seed ${seed}`, '',
    'Generato da `pnpm sim -- --dev 10 --report docs/balance/development.md` (GUIDA §13 P6).', '',
    '| Metrica | Valore | Target | |', '|---|---|---|---|',
    `| Giovani (≤19, PA ≥ 130) cresciuti di almeno 10 CA in 5 anni | ${(grew * 100).toFixed(0)}% (${gains.length}) | 70 – 90% | ${ok(grew, 0.7, 0.9)} |`,
    `| Crescita media degli stessi in 5 anni | +${avg(gains).toFixed(1)} CA | ~ +25 | ${ok(avg(gains), 18, 32)} |`,
    `| Età in cui la variazione media diventa negativa | ${declineAt} | 29 – 32 | ${ok(declineAt, 29, 32)} |`,
    `| Età media del picco (osservati 25→33) | ${avg(peakAges).toFixed(1)} (${peakAges.length}) | 27 – 30 | ${ok(avg(peakAges), 27, 30)} |`,
    '', '## Variazione media di CA in un anno, per età e reparto', '',
    `| Età | ${groups.join(' | ')} |`, `|---|${groups.map(() => '---').join('|')}|`,
    ...ages.map((a) => `| ${a} | ${groups.map((g) => cell(g, a)).join(' | ')} |`),
  ];
}

type SeasonStats = { pts: number[]; goals: number; games: number };
function seasonStats(w: WorldState): SeasonStats {
  const comp = w.competitions.ITA1!;
  const table = standings(w, comp);
  return { pts: table.map((r) => r.pts), goals: table.reduce((s, r) => s + r.gf, 0), games: comp.fixtures.length };
}

/** A/B: psicologia attiva contro spenta, e squadra col morale bloccato a 20 contro 90 */
export function psychReport(seed: number, seasons: number): string[] {
  const run = (on: boolean) => {
    FLAGS.psychology = on;
    const w = newWorld(seed);
    const out: SeasonStats[] = [];
    for (let s = 0; s < seasons; s++) { playSeason(w); out.push(seasonStats(w)); endSeason(w); }
    return out;
  };
  const on = run(true), off = run(false);
  FLAGS.psychology = true;
  const summary = (xs: SeasonStats[]) => ({
    goals: avg(xs.map((x) => x.goals / x.games)), spread: avg(xs.map((x) => sd(x.pts))),
    champ: avg(xs.map((x) => x.pts[0]!)), last: avg(xs.map((x) => x.pts.at(-1)!)),
  });
  const a = summary(on), b = summary(off);

  // morale pessimo contro ottimo: stessa squadra di metà classifica, stessa stagione, morale bloccato
  const locked = (value: number, s: number) => {
    const w = newWorld(seed + s);
    const ids = [...w.competitions.ITA1!.clubIds].sort((x, y) => w.clubs[y]!.reputation - w.clubs[x]!.reputation);
    const clubs = ids.slice(7, 12).map((id) => w.clubs[id]!); // 5 squadre di metà classifica per ridurre il rumore
    const lock = () => { for (const c of clubs) for (const id of c.playerIds) w.players[id]!.psych.morale = value; };
    playSeason(w, lock);
    const table = standings(w, w.competitions.ITA1!);
    return avg(clubs.map((c) => table.find((r) => r.clubId === c.id)!.pts));
  };
  const n = Math.max(6, Math.round(seasons / 2));
  const low: number[] = [], high: number[] = [];
  for (let s = 0; s < n; s++) { low.push(locked(20, s)); high.push(locked(90, s)); }
  const impact = (avg(high) - avg(low)) / ((avg(high) + avg(low)) / 2);
  const ok = impact >= 0.06 && impact <= 0.15 ? '✅' : '❌';
  const f = (v: number) => v.toFixed(2);
  return [
    `# Psicologia — test A/B, ${seasons} stagioni, seed ${seed}`, '',
    'Generato da `pnpm sim -- --psych 20 --report docs/balance/psychology.md` (GUIDA §13 P7).',
    'Con la psicologia spenta il morale e le relazioni non entrano in partita (FLAGS.psychology).', '',
    '| Serie A, media per stagione | Psicologia attiva | Spenta |', '|---|---|---|',
    `| Gol per partita | ${f(a.goals)} | ${f(b.goals)} |`,
    `| Deviazione standard dei punti in classifica | ${f(a.spread)} | ${f(b.spread)} |`,
    `| Punti del campione | ${a.champ.toFixed(1)} | ${b.champ.toFixed(1)} |`,
    `| Punti dell'ultima | ${a.last.toFixed(1)} | ${b.last.toFixed(1)} |`,
    '', `## Morale pessimo contro ottimo (${n} stagioni, 5 squadre di metà classifica bloccate insieme)`, '',
    '| Morale bloccato | Punti medi | Min – max |', '|---|---|---|',
    `| 20 | ${avg(low).toFixed(1)} | ${Math.min(...low).toFixed(1)} – ${Math.max(...low).toFixed(1)} |`,
    `| 90 | ${avg(high).toFixed(1)} | ${Math.min(...high).toFixed(1)} – ${Math.max(...high).toFixed(1)} |`,
    '', `**Impatto sui punti: ${(impact * 100).toFixed(1)}%** (target 6 – 15%) ${ok}`,
  ];
}

