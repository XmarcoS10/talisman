// Un blocco di partite isolate per `pnpm sim -- --match-stats` (match-stats.ts): formazioni scelte dall'IA, tutti
// riposati, niente mondo che cambia fra una partita e l'altra. Il blocco ha il suo seme.
import { parentPort, workerData } from 'node:worker_threads';
import { matchSetups } from '../engine/match.ts';
import { simulate } from '../engine/match/engine.ts';
import { Rng } from '../engine/rng.ts';
import { newWorld } from '../engine/world.ts';
import type { Row } from './match-stats.ts';

const { seed, block, n } = workerData as { seed: number; block: number; n: number };
const world = newWorld(seed);
world.manager.clubId = -1;
for (const p of Object.values(world.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; }
const rng = new Rng(seed * 7919 + block);
const serieA = world.competitions.ITA1!.clubIds;
const rows: Row[] = [];
for (let i = 0; i < n; i++) {
  const home = rng.pick(serieA);
  let away = rng.pick(serieA);
  while (away === home) away = rng.pick(serieA);
  const setups = matchSetups(world, { day: 0, home, away });
  const out = simulate(rng, setups);
  const ca = setups.map((s) => s.xi.reduce((a, e) => a + e.player.ca, 0) / s.xi.length) as [number, number];
  rows.push({ hg: out.result.hg, ag: out.result.ag, stats: out.result.stats, log: out.log, ca });
}
parentPort!.postMessage(rows);
