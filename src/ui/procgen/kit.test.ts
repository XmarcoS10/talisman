// GP2: maglie deterministiche, leggere, e in partita le due squadre non si confondono.
import { describe, expect, it } from 'vitest';
import { newWorld } from '../../engine/world.ts';
import { contrast, deltaE } from './color.ts';
import { KIT_APART, kitBase, kitShape, kitSvg, matchKits } from './kit.ts';

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

  it('in ogni partita possibile le due squadre in campo si distinguono: maglie lontane o bordo (Blocco 3)', () => {
    const clubs = Object.values(newWorld(4).clubs);
    let alt = 0, ring = 0;
    for (const h of clubs) for (const a of clubs) {
      if (h === a) continue;
      const k = matchKits(h, a);
      expect(k.colors[0]).toBe(kitBase(h));
      if (k.alt) alt++;
      if (k.ring[1]) ring++;
      // o le maglie sono lontane a occhio, o l'ospite ha il bordo
      expect(deltaE(k.colors[0], k.colors[1]) >= KIT_APART || k.ring[1]).toBe(true);
    }
    console.log(`${clubs.length * (clubs.length - 1)} partite: seconda maglia in ${alt}, bordo in ${ring}`);
  });
});
