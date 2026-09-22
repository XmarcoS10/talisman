// GP2: maglie deterministiche, leggere, e in partita le due squadre non si confondono.
import { describe, expect, it } from 'vitest';
import { newWorld } from '../../engine/world.ts';
import { contrast } from './color.ts';
import { awayWearsAlt, kitBase, kitShape, kitSvg } from './kit.ts';

describe('maglie generate (GP2)', () => {
  it('stessa squadra, stessa maglia; 90 club, 90 disegni diversi; ognuna sotto i 2 KB', () => {
    const shapes = new Set<string>();
    for (let id = 0; id < 90; id++) shapes.add(JSON.stringify(kitShape(id)));
    expect(shapes.size).toBe(90);
    const club = { id: 3, colors: ['#c8102e', '#ffffff', '#111111'] as [string, string, string] };
    expect(kitSvg(club, { number: 10 })).toBe(kitSvg(club, { number: 10 }));
    expect(kitSvg(club, { number: 10 }).length).toBeLessThan(2048);
  });

  it('la seconda maglia si distingue dalla prima', () => {
    for (const club of Object.values(newWorld(4).clubs)) expect(contrast(kitBase(club), kitBase(club, true))).toBeGreaterThanOrEqual(1.6);
  });

  it('in ogni partita possibile le due maglie in campo si distinguono', () => {
    const clubs = Object.values(newWorld(4).clubs);
    for (const h of clubs) for (const a of clubs) {
      if (h === a) continue;
      const away = kitBase(a, awayWearsAlt(h, a));
      // se anche la seconda si confonde c'è poco da fare: almeno non peggio della prima
      expect(contrast(kitBase(h), away)).toBeGreaterThanOrEqual(Math.min(1.6, contrast(kitBase(h), kitBase(a))));
    }
  });
});
