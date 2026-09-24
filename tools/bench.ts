// Benchmark del motore partita (Blocco 2a): millisecondi a partita, solo simulazione (formazioni preparate prima).
// Uso: pnpm bench [--matches 2000] [--max 4.2]. Esce con errore se la media supera --max (nella CI, più lenta: --max 7).
// È una guardia contro i peggioramenti: ogni meccanica nuova del Blocco 2b può aggiungere al massimo il 15%.
import { parseArgs } from 'node:util';
import { matchSetups } from '../src/engine/match.ts';
import { simulate } from '../src/engine/match/engine.ts';
import { Rng } from '../src/engine/rng.ts';
import { newWorld } from '../src/engine/world.ts';

const { values } = parseArgs({ args: process.argv.slice(2).filter((a) => a !== '--'), options: { matches: { type: 'string', default: '2000' }, max: { type: 'string', default: '4.2' } } });
const n = Number(values.matches), max = Number(values.max);
const world = newWorld(42);
world.manager.clubId = -1;
const clubs = world.competitions.ITA1!.clubIds;
const setups = Array.from({ length: n }, (_, i) => matchSetups(world, { day: 0, home: clubs[i % 20]!, away: clubs[(i * 7 + 3) % 20 === i % 20 ? (i + 1) % 20 : (i * 7 + 3) % 20]! }));
for (let i = 0; i < 200; i++) simulate(new Rng(i), setups[i]!); // riscaldamento del JIT
const t0 = performance.now();
for (let i = 0; i < n; i++) simulate(new Rng(1000 + i), setups[i]!);
const ms = (performance.now() - t0) / n;
console.log(`${ms.toFixed(2)} ms a partita (${n} partite) · 10.000 partite ≈ ${(ms * 10).toFixed(1)} s · limite ${max} ms`);
if (ms > max) { console.error(`Troppo lento: ${ms.toFixed(2)} ms a partita, il limite è ${max}.`); process.exit(1); }
