// La Primavera: risultati stabili (niente salvato, ma sempre uguali) e un vivaio migliore che vince di più.
import { describe, expect, it } from 'vitest';
import { advance, newWorld } from '../world.ts';
import { intakePreview, youthResult, youthStrength, youthTable } from './primavera.ts';

describe('Primavera (F10)', { timeout: 30000 }, () => {
  it('lo stesso risultato a ogni lettura, e solo per le gare già giocate', () => {
    const world = newWorld(9);
    world.manager.clubId = -1;
    const comp = world.competitions.ITA1!;
    expect(youthResult(world, comp.fixtures[0]!)).toBeNull();
    for (let i = 0; i < 6; i++) advance(world);
    const played = comp.fixtures.filter((f) => f.result);
    expect(played.length).toBeGreaterThan(0);
    for (const fx of played) expect(youthResult(world, fx)).toEqual(youthResult(world, fx));
    const table = youthTable(world, comp);
    expect(table.reduce((s, r) => s + r.p, 0)).toBe(played.length * 2);
  });

  it('strutture migliori, squadra giovanile più forte e annata più promettente', () => {
    const world = newWorld(9);
    const c = Object.values(world.clubs)[0]!;
    const before = [youthStrength(c), intakePreview(c).pa];
    c.youth.facilities += 5;
    expect(youthStrength(c)).toBeGreaterThan(before[0]!);
    expect(intakePreview(c).pa).toBeGreaterThan(before[1]!);
  });
});
