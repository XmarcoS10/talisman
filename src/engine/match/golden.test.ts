// Golden master del motore partita (Blocco 2a): 1.000 partite a semi fissi devono dare esattamente gli stessi
// risultati, statistiche, eventi e voti; 30 di queste, giocate col registro acceso (la partita guardata in 2D),
// lo stesso registro e la stessa traccia di posizioni. Durante una ristrutturazione l'impronta non deve cambiare.
// Quando un cambiamento del motore è voluto: GOLDEN=update pnpm vitest run golden, e una riga nel commit che dice perché.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../match.ts';
import type { Fixture } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { runMatch, type SimOutput, type TraceStep } from './engine.ts';

const FILE = new URL('./golden.json', import.meta.url);
const N = 1000, TRACED = 30; // la traccia densa costa ~0,2 s a partita: 30 bastano a coprire la strada del 2D

// numeri arrotondati a 6 decimali: la stessa partita deve dare lo stesso testo su ogni macchina
const r6 = (_k: string, v: unknown) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e6) / 1e6 : v);

function fingerprint() {
  const world = newWorld(2026);
  world.manager.clubId = -1;
  const clubs = Object.values(world.competitions).flatMap((c) => c.clubIds);
  const fixture = (i: number): Fixture => {
    const home = clubs[(i * 7) % clubs.length]!;
    let away = clubs[(i * 13 + 5) % clubs.length]!;
    if (away === home) away = clubs[(i * 13 + 6) % clubs.length]!;
    return { day: 0, home, away };
  };
  const out = (o: SimOutput) => ({ ...o.result, played: o.played.map((side) => side.map((m) => [m.p.id, m.pos, m.st])) });

  const results = createHash('sha256');
  const sum = { goals: 0, shots: 0, passes: 0, events: 0, actions: 0, frames: 0 };
  const plain: string[] = [];
  for (let i = 0; i < N; i++) {
    const o = runMatch(new Rng(10_000 + i), matchSetups(world, fixture(i))).result();
    const text = JSON.stringify(out(o), r6);
    results.update(text);
    if (i < TRACED) plain.push(text);
    sum.goals += o.result.hg + o.result.ag;
    sum.events += o.result.events.length;
    for (const s of o.result.stats) { sum.shots += s.shots; sum.passes += s.passes; }
  }
  // la stessa partita guardata dal vivo: registro e traccia densa, e risultato identico a quella simulata
  const traced = createHash('sha256');
  let sameResults = true;
  for (let i = 0; i < TRACED; i++) {
    const trace: TraceStep[] = [];
    const run = runMatch(new Rng(10_000 + i), matchSetups(world, fixture(i)), trace);
    const o = run.result();
    if (JSON.stringify(out(o), r6) !== plain[i]) sameResults = false;
    traced.update(JSON.stringify(trace, r6));
    for (const f of run.track) {
      traced.update(JSON.stringify([f.at, f.min, f.half, f.ids, f.n0, f.bx, f.by, f.carrier, f.to, f.sc0, f.sc1, f.step, f.dead], r6));
      traced.update(new Uint8Array(f.xy.buffer, f.xy.byteOffset, f.xy.byteLength));
    }
    sum.actions += trace.length;
    sum.frames += run.track.length;
  }
  return { results: results.digest('hex'), traced: traced.digest('hex'), sameResults, summary: sum };
}

describe('golden master del motore partita', () => {
  it(`${N} partite (e ${TRACED} guardate dal vivo) danno esattamente gli stessi risultati di prima`, () => {
    const now = fingerprint();
    expect(now.sameResults).toBe(true); // guardarla o simularla è la stessa partita
    if (process.env.GOLDEN === 'update') writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
    const saved = JSON.parse(readFileSync(FILE, 'utf8')) as typeof now;
    // prima il riassunto, così un fallimento dice cosa è cambiato; poi le impronte
    expect(now.summary).toEqual(saved.summary);
    expect(now.results).toBe(saved.results);
    expect(now.traced).toBe(saved.traced);
  }, 180_000);
});
