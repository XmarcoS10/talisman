// Tabellino (Blocco 3, punto 8): i numeri contati dal registro devono coincidere con quelli del motore a fine partita.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../../engine/match.ts';
import { runMatch } from '../../engine/match/engine.ts';
import { Rng } from '../../engine/rng.ts';
import { newWorld } from '../../engine/world.ts';
import { sheet } from './sheet.ts';

describe('tabellino', () => {
  it('gol, tiri, tiri in porta, xG e passaggi dal registro coincidono col risultato del motore', () => {
    const w = newWorld(8);
    const ids = w.competitions.ITA1!.clubIds;
    for (let i = 0; i < 5; i++) {
      const run = runMatch(new Rng(40 + i), matchSetups(w, { day: 0, home: ids[i]!, away: ids[i + 5]! }, true), []);
      const out = run.result();
      const { sides, shots } = sheet(run.frames, run.frames.length - 1);
      for (const s of [0, 1] as const) {
        const st = out.result.stats[s]!;
        expect(sides[s].goals).toBe(s === 0 ? out.result.hg : out.result.ag);
        expect(sides[s].shots).toBe(st.shots);
        expect(sides[s].onTarget).toBe(st.onTarget);
        expect(sides[s].xg).toBeCloseTo(st.xg, 2); // il risultato tiene due decimali
        expect(sides[s].passes).toBe(st.passes);
        expect(sides[s].passesOk).toBe(st.passesOk);
      }
      expect(shots.length).toBe(sides[0].shots + sides[1].shots);
    }
  });
});
