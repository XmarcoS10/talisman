// Report delle statistiche per partita (Blocco 2b): `pnpm sim -- --match-stats 4000`. Target in docs/balance/targets.md,
// fonti in docs/design/motore-v2.md §1. Le partite si giocano in 16 blocchi paralleli (match-stats-worker.ts).
import { Worker } from 'node:worker_threads';
import type { MatchLog } from '../engine/match/state.ts';
import type { SideStats } from '../engine/model.ts';

/** quello che un blocco restituisce per ogni partita */
export interface Row { hg: number; ag: number; stats: [SideStats, SideStats]; log: [MatchLog, MatchLog]; ca: [number, number] }

const BLOCKS = 16;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const line = (name: string, v: number, lo: number, hi: number, fmt: (v: number) => string) =>
  `| ${name} | ${fmt(v)} | ${fmt(lo)} – ${fmt(hi)} | ${v >= lo && v <= hi ? '✅' : '❌'} |`;

async function play(seed: number, n: number): Promise<Row[]> {
  const sizes = Array.from({ length: BLOCKS }, (_, b) => Math.floor(n / BLOCKS) + (b < n % BLOCKS ? 1 : 0));
  const parts = await Promise.all(sizes.map((size, block) => new Promise<Row[]>((ok, ko) => {
    const w = new Worker(new URL('./match-stats-worker.ts', import.meta.url), { workerData: { seed, block, n: size } });
    w.once('message', (rows: Row[]) => { ok(rows); void w.terminate(); });
    w.once('error', ko);
  })));
  return parts.flat();
}

export async function matchStatsReport(seed: number, n: number): Promise<string[]> {
  const t0 = performance.now();
  const rows = await play(seed, n);
  const sum = (f: (s: SideStats, l: MatchLog) => number) => rows.reduce((a, r) => a + f(r.stats[0], r.log[0]) + f(r.stats[1], r.log[1]), 0);
  const per = (f: (s: SideStats, l: MatchLog) => number) => sum(f) / rows.length / 2; // per squadra a partita
  const goals = rows.reduce((a, r) => a + r.hg + r.ag, 0);
  const g = (k: keyof MatchLog['goals']) => sum((_, l) => l.goals[k]);
  const setPieces = g('corner') + g('pen') + g('fk');
  const strong = rows.filter((r) => Math.abs(r.ca[0] - r.ca[1]) >= 15);
  const possStrong = strong.reduce((a, r) => a + r.stats[r.ca[0] > r.ca[1] ? 0 : 1].possession, 0) / Math.max(1, strong.length) / 100;
  const n1 = (v: number) => v.toFixed(1);
  return [
    `# Statistiche per partita — ${rows.length} partite di Serie A, seme ${seed}`, '',
    '| Metrica (per squadra a partita) | Valore | Target | |', '|---|---|---|---|',
    line('Gol per partita', goals / rows.length, 2.5, 2.9, (v) => v.toFixed(2)),
    line('Passaggi tentati', per((s) => s.passes), 380, 520, (v) => v.toFixed(0)),
    line('Precisione passaggi', sum((s) => s.passesOk) / sum((s) => s.passes), 0.8, 0.86, pct),
    line('Cross tentati', per((_, l) => l.crosses), 12, 18, n1),
    line('Cross riusciti', sum((_, l) => l.crossesOk) / sum((_, l) => l.crosses), 0.2, 0.3, pct),
    line('Dribbling tentati', per((_, l) => l.dribbles), 11, 17, n1),
    line('Dribbling riusciti', sum((_, l) => l.dribblesOk) / sum((_, l) => l.dribbles), 0.4, 0.55, pct),
    line('Contrasti vinti', per((_, l) => l.tackles), 13, 18, n1),
    `| Intercetti | ${n1(per((_, l) => l.intercepts))} | | |`,
    line('Corner', per((s) => s.corners), 4, 6, n1),
    line('Fuorigioco', per((s) => s.offsides), 1, 2.5, n1),
    line('Tiri di testa sul totale dei tiri', sum((_, l) => l.headers) / sum((s) => s.shots), 0.15, 0.22, pct),
    line('Gol da piazzato (corner, punizione, rigore)', setPieces / goals, 0.25, 0.35, pct),
    `| Gol per origine: azione · cross · corner · rigore · punizione | ${[g('open'), g('cross'), g('corner'), g('pen'), g('fk')].map((x) => pct(x / goals)).join(' · ')} | | |`,
    line('Gol in contropiede', sum((_, l) => l.counterGoals) / goals, 0.05, 0.1, pct),
    line(`Possesso della nettamente più forte (CA medio +15, ${strong.length} partite)`, possStrong, 0.57, 0.63, pct),
    `| Palle in profondità tentate · riuscite | ${n1(per((_, l) => l.deep))} · ${pct(sum((_, l) => l.deepOk) / Math.max(1, sum((_, l) => l.deep)))} | | |`,
    `| Tempo (s, ${BLOCKS} blocchi in parallelo) | ${((performance.now() - t0) / 1000).toFixed(1)} | | |`,
  ];
}
