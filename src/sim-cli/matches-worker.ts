// Un blocco di partite isolate per `pnpm sim -- --matches` (Blocco 2a): gira in un thread a parte, così 10.000 partite
// si giocano in parallelo. Il blocco ha il suo seme: il risultato dipende dal seme, non da quanti core ha la macchina.
import { parentPort, workerData } from 'node:worker_threads';
import { playMatch } from '../engine/match.ts';
import type { Fixture } from '../engine/model.ts';
import { Rng } from '../engine/rng.ts';
import { newWorld } from '../engine/world.ts';

const { seed, block, n } = workerData as { seed: number; block: number; n: number };
const world = newWorld(seed);
const rng = new Rng(seed * 1000 + block);
const serieA = world.competitions.ITA1!.clubIds;
const out: Fixture[] = [];
for (let i = 0; i < n; i++) {
  const home = rng.pick(serieA);
  let away = rng.pick(serieA);
  while (away === home) away = rng.pick(serieA);
  const fx: Fixture = { day: 0, home, away };
  for (const p of Object.values(world.players)) { p.condition.fitness = 100; p.condition.injuryDays = 0; p.discipline.ban = 0; } // tutti riposati e disponibili
  playMatch(world, rng, fx);
  out.push(fx);
}
parentPort!.postMessage(out);
