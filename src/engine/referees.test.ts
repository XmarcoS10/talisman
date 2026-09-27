// Arbitri (0.5.0): ricavati dal seme, fissi per partita, e quello severo ammonisce di più.
import { describe, expect, it } from 'vitest';
import { REFEREE } from './balance.ts';
import { matchSetups } from './match.ts';
import { simulate } from './match/engine.ts';
import { refereeFor, refFactor, referees } from './referees.ts';
import { Rng } from './rng.ts';
import { newWorld } from './world.ts';

describe('arbitri', () => {
  const w = newWorld(12);
  w.manager.clubId = -1;
  const comp = w.competitions.ITA1!;

  it('stesso mondo, stessi arbitri; stessa partita, stesso arbitro; di giornata in giornata cambiano', () => {
    expect(referees(newWorld(12))).toEqual(referees(w));
    const fx = comp.fixtures[0]!;
    expect(refereeFor(w, fx)).toEqual(refereeFor(w, fx));
    const used = new Set(comp.fixtures.map((f) => refereeFor(w, f).id));
    expect(used.size).toBeGreaterThan(REFEREE.count / 2);
    for (const r of referees(w)) expect(refFactor(r)).toBeGreaterThanOrEqual(REFEREE.min - 1e-9);
  });

  it("l'arbitro severo ammonisce di più a parità di partite", () => {
    const cards = (ref: number) => {
      const rng = new Rng(77);
      let n = 0;
      for (const fx of comp.fixtures.slice(0, 150)) {
        const setups = matchSetups(w, fx).map((s) => ({ ...s, ref })) as ReturnType<typeof matchSetups>;
        const r = simulate(rng, setups).result;
        n += r.stats[0].yellows + r.stats[1].yellows;
      }
      return n;
    };
    expect(cards(REFEREE.max)).toBeGreaterThan(cards(REFEREE.min) * 1.2);
  }, 60_000);
});
