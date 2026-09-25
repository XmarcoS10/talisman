// La regola dei salienti (highlights.ts): una partita in Salienti dura 4-7 minuti reali e contiene tutti i gol.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../../engine/match.ts';
import { runMatch } from '../../engine/match/engine.ts';
import { Rng } from '../../engine/rng.ts';
import { newWorld } from '../../engine/world.ts';
import { duration } from './playback.ts';
import { Reel, realMinutes, type ViewMode } from './highlights.ts';

const N = 30;

function watch(i: number, mode: ViewMode) {
  const w = newWorld(23);
  const ids = w.competitions.ITA1!.clubIds;
  const run = runMatch(new Rng(900 + i), matchSetups(w, { day: 0, home: ids[i % 20]!, away: ids[(i + 7) % 20]! }, true), []);
  const reel = new Reel(mode);
  while (!run.done) { run.tick(); reel.update(run); }
  reel.update(run);
  return { run, reel, minutes: realMinutes(reel, duration(run)) };
}

describe('salienti', { timeout: 120_000 }, () => {
  it('una partita in Salienti dura 4-7 minuti reali e si vedono tutti i gol', () => {
    const mins: number[] = [];
    for (let i = 0; i < N; i++) {
      const { run, reel, minutes } = watch(i, 'highlights');
      mins.push(minutes);
      // ogni gol cade dentro un saliente: l'azione del gol e il momento in cui la palla entra
      run.frames.forEach((f, k) => {
        if (!f.beats?.some((b) => b.kind === 'goal')) return;
        const at = run.track.find((p) => p.step === k)!.at;
        expect(reel.clips.some((c) => c.from <= at && at < c.to), `gol al ${f.min}' della partita ${i}`).toBe(true);
      });
    }
    mins.sort((a, b) => a - b);
    console.log(`Salienti: ${mins[0]!.toFixed(1)}-${mins[mins.length - 1]!.toFixed(1)} minuti reali, mediana ${mins[N >> 1]!.toFixed(1)}`);
    for (const m of mins) { expect(m).toBeGreaterThanOrEqual(4); expect(m).toBeLessThanOrEqual(7); }
  });

  it('Estesa mostra più azioni di Salienti', () => {
    const a = watch(3, 'highlights'), b = watch(3, 'extended');
    console.log(`partita 3: Salienti ${a.reel.clips.length} azioni (${a.minutes.toFixed(1)} min), Estesa ${b.reel.clips.length} (${b.minutes.toFixed(1)} min)`);
    expect(b.minutes).toBeGreaterThan(a.minutes);
  });
});
