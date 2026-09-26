// Carriere lunghe (Blocco 4): pnpm sim -- --career 25 --seed 42
// Il mondo deve invecchiare bene: la correlazione forza↔punti resta fra 0,75 e 0,85, i 60 migliori non crescono più di
// 3 punti di abilità rispetto alla prima stagione, il distacco fra Serie A e Serie B resta stabile (±5).
import { pickXI, xiStrength } from '../engine/match.ts';
import type { WorldState } from '../engine/model.ts';
import { revenue, wageBill } from '../engine/finance/ledger.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from '../engine/world.ts';

const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
function pearson(xs: number[], ys: number[]) {
  const mx = avg(xs), my = avg(ys);
  let num = 0, dx = 0, dy = 0;
  xs.forEach((x, i) => { const y = ys[i]!; num += (x - mx) * (y - my); dx += (x - mx) ** 2; dy += (y - my) ** 2; });
  return num / Math.sqrt(dx * dy);
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1] ?? 0;

export interface SeasonRow {
  season: number; corr: number; top60: number; a: number; b: number; players: number; retired: number;
  inDebt: number; wageShare: number; sanctions: number; champion: string; ageAvg: number;
}

/** fotografia del mondo a fine stagione, prima che endSeason la cambi */
function snapshot(world: WorldState, strength: Map<number, number>): Omit<SeasonRow, 'retired'> {
  const a = world.competitions.ITA1!, b = world.competitions.ITA2!;
  const table = standings(world, a);
  const cas = Object.values(world.players).filter((p) => p.clubId !== null).map((p) => p.ca).sort((x, y) => y - x);
  const xi = (ids: number[]) => avg(ids.map((id) => xiStrength(pickXI(world, world.clubs[id]!))));
  const clubs = Object.values(world.clubs);
  const withClub = Object.values(world.players).filter((p) => p.clubId !== null);
  return {
    season: world.season,
    corr: pearson(table.map((r) => strength.get(r.clubId)!), table.map((r) => r.pts)),
    top60: avg(cas.slice(0, 60)),
    a: xi(a.clubIds), b: xi(b.clubIds),
    players: withClub.length,
    ageAvg: avg(withClub.map((p) => world.season - p.birthYear)),
    inDebt: clubs.filter((c) => c.balance < 0).length,
    wageShare: median(clubs.map((c) => wageBill(world, c) / Math.max(1, revenue(world, c)))),
    sanctions: clubs.filter((c) => c.sanction.kind !== 'none').length,
    champion: world.clubs[table[0]!.clubId]!.name,
  };
}

export function careerRows(seed: number, seasons: number, onSeason?: (r: SeasonRow) => void): SeasonRow[] {
  const world = newWorld(seed);
  world.manager.clubId = -1; // nessun utente: il mondo va da solo
  const rows: SeasonRow[] = [];
  for (let s = 0; s < seasons; s++) {
    const strength = new Map(world.competitions.ITA1!.clubIds.map((id) => [id, xiStrength(pickXI(world, world.clubs[id]!))]));
    while (!isSeasonOver(world)) advance(world);
    const snap = snapshot(world, strength);
    const sum = endSeason(world);
    const row = { ...snap, retired: sum.retired };
    rows.push(row);
    onSeason?.(row);
  }
  return rows;
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

export function careerReport(seed: number, seasons: number): string[] {
  const t0 = performance.now();
  const rows = careerRows(seed, seasons, (r) => process.stderr.write(`${r.season} `));
  process.stderr.write('\n');
  const first = rows[0]!, last = rows[rows.length - 1]!;
  const gap = (r: SeasonRow) => r.a - r.b;
  const corr = avg(rows.map((r) => r.corr));
  const drift = Math.max(...rows.map((r) => r.top60)) - first.top60;
  const gapDrift = Math.max(...rows.map((r) => Math.abs(gap(r) - gap(first))));
  const ok = (b: boolean) => (b ? '✅' : '❌');
  return [
    `# Carriera lunga — ${seasons} stagioni, seme ${seed}`, '',
    '| Obiettivo | Valore | Target | |', '|---|---|---|---|',
    `| Correlazione forza ↔ punti (media) | ${f2(corr)} | 0,75 – 0,85 | ${ok(corr >= 0.75 && corr <= 0.85)} |`,
    `| 60 migliori: crescita massima sulla prima stagione | ${f1(drift)} | ≤ 3 | ${ok(drift <= 3)} |`,
    `| Distacco Serie A – Serie B: scarto massimo dalla prima stagione | ${f1(gapDrift)} | ≤ 5 | ${ok(gapDrift <= 5)} |`,
    `| Campioni diversi | ${new Set(rows.map((r) => r.champion)).size} | | |`,
    `| Tempo per stagione (s) | ${f1((performance.now() - t0) / 1000 / seasons)} | | |`, '',
    '| Stagione | Corr. | 60 migliori | XI Serie A | XI Serie B | Distacco | Giocatori | Età media | Ritirati | Club in rosso | Ingaggi/fatturato | Sanzioni FFP | Campione |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.season} | ${f2(r.corr)} | ${f1(r.top60)} | ${f1(r.a)} | ${f1(r.b)} | ${f1(gap(r))} | ${r.players} | ${f1(r.ageAvg)} | ${r.retired} | ${r.inDebt} | ${f2(r.wageShare)} | ${r.sanctions} | ${r.champion} |`),
    '', `Prima → ultima: 60 migliori ${f1(first.top60)} → ${f1(last.top60)}, distacco ${f1(gap(first))} → ${f1(gap(last))}.`,
  ];
}
