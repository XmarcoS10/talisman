// Sovrapposizioni tattiche (Blocco 3, punto 5): devono mostrare la differenza quando cambio un'istruzione.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../../engine/match.ts';
import { runMatch } from '../../engine/match/engine.ts';
import { Rng } from '../../engine/rng.ts';
import { newWorld } from '../../engine/world.ts';
import { duration } from './playback.ts';
import { Overlays } from './overlays.ts';

/** linea difensiva media della squadra di casa su 6 partite, con la linea scelta */
function lineWith(level: number) {
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    const w = newWorld(31);
    const [home, away] = w.competitions.ITA1!.clubIds;
    w.clubs[home!]!.tactic.line = level;
    const run = runMatch(new Rng(70 + i), matchSetups(w, { day: 0, home: home!, away: away! }, true), []);
    run.result();
    const ov = new Overlays(0);
    let n = 0, part = 0;
    for (let T = 60; T < duration(run); T += 60) { ov.update(run, T); part += ov.shape!.line[0]; n++; } // come la vede chi guarda
    sum += part / n;
  }
  return sum / 6;
}

describe('sovrapposizioni tattiche', { timeout: 120_000 }, () => {
  it('con la linea alta la linea difensiva disegnata sta più avanti', () => {
    const high = lineWith(2), low = lineWith(0);
    console.log(`linea difensiva: alta ${high.toFixed(2)}, bassa ${low.toFixed(2)} (zone da 0 a 12)`);
    expect(high - low).toBeGreaterThan(0.2); // ~2,5 m: sul campo sono 15-20 pixel, e il «prima» tratteggiato li fa vedere
  });

  it('il «prima» resta 10 minuti dopo un cambio e poi sparisce', () => {
    const w = newWorld(31);
    const [home, away] = w.competitions.ITA1!.clubIds;
    const run = runMatch(new Rng(5), matchSetups(w, { day: 0, home: home!, away: away! }, true), []);
    run.result();
    const ov = new Overlays(0);
    const at = (min: number) => run.track.find((p) => p.min >= min)!.at;
    ov.update(run, at(30));
    ov.snapshot(30);
    expect(ov.ghost?.min).toBe(30);
    ov.update(run, at(38));
    expect(ov.ghost).not.toBeNull();
    ov.update(run, at(42));
    expect(ov.ghost).toBeNull();
    expect(ov.passes.length).toBeGreaterThan(10);
    expect(ov.passes.every((p) => p.t >= 42 * 60 - 600 - 60)).toBe(true); // solo gli ultimi 10 minuti
  });
});
