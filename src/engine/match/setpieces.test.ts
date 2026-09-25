// Battitori dei piazzati (Blocco 2b, intervento 8): quello scelto in Tattica se è in campo, altrimenti il migliore.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../match.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { runMatch } from './engine.ts';
import { taker } from './setpieces.ts';

describe('battitori dei piazzati', () => {
  it('batte chi è scelto in Tattica; se non è in campo, il migliore nel fondamentale', () => {
    const w = newWorld(8);
    w.manager.clubId = -1;
    const [home, away] = w.competitions.ITA1!.clubIds;
    const run = runMatch(new Rng(1), matchSetups(w, { day: 0, home: home!, away: away! }));
    const tm = run.teams[0];
    const outfield = tm.on.filter((m) => m.pos !== 'GK');
    const worst = outfield.reduce((a, b) => (b.p.attrs.penalties < a.p.attrs.penalties ? b : a));
    const bestPen = outfield.reduce((a, b) => (0.7 * b.p.attrs.penalties + 0.3 * b.p.attrs.composure > 0.7 * a.p.attrs.penalties + 0.3 * a.p.attrs.composure ? b : a));
    expect(taker(tm, 'penalties')).toBe(bestPen);
    tm.tactic.takers = { penalties: worst.p.id };
    expect(taker(tm, 'penalties')).toBe(worst);
    tm.tactic.takers = { penalties: -1 }; // scelto ma non in campo
    expect(taker(tm, 'penalties')).toBe(bestPen);
  });
});
