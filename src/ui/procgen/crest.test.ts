// GP1: stemmi deterministici, tutti diversi, leggeri, leggibili.
import { describe, expect, it } from 'vitest';
import { newWorld } from '../../engine/world.ts';
import { contrast } from './color.ts';
import { crestShape, crestSvg } from './crest.ts';

const fake = (id: number) => ({ id, colors: ['#1f7a4d', '#f2f2f2', '#0f131d'] as [string, string, string], founded: 1900 + (id % 80) });

describe('stemmi generati (GP1)', () => {
  it('stesso club, stesso stemma', () => {
    expect(crestSvg(fake(7))).toBe(crestSvg(fake(7)));
  });

  it('200 club: nessuna forma ripetuta, e ognuno sotto i 2 KB', () => {
    const shapes = new Set<string>();
    for (let id = 0; id < 200; id++) {
      shapes.add(JSON.stringify(crestShape(id)));
      expect(crestSvg(fake(id)).length).toBeLessThan(2048);
    }
    expect(shapes.size).toBe(200);
  });

  it('usa tutte le forme, le partizioni e i simboli', () => {
    const s = new Set<number>(), p = new Set<number>(), y = new Set<number>();
    for (let id = 0; id < 960; id++) { const c = crestShape(id); s.add(c.shield); p.add(c.pattern); y.add(c.symbol); }
    expect([s.size, p.size, y.size]).toEqual([8, 12, 10]);
  });

  it('il simbolo si legge sul campo anche coi colori del mondo generato', () => {
    const world = newWorld(3);
    for (const club of Object.values(world.clubs)) {
      const fill = /<path d="M[^"]*" fill="(#[0-9a-f]{6})" fill-rule/i.exec(crestSvg(club))?.[1];
      expect(fill).toBeDefined();
      expect(contrast(club.colors[0], fill!)).toBeGreaterThanOrEqual(2.5);
    }
  });
});
