// Le stelle sono relative al campionato dell'utente: poche da 5, la metà sopra le 3, e una scala che non si
// affolla in alto quando il talento cresce.
import { describe, expect, it } from 'vitest';
import { newWorld } from '../engine/world.ts';
import { toStars } from './stars.ts';

describe('stelle relative al campionato', () => {
  const world = newWorld(42);
  const a = Object.values(world.competitions).find((c) => c.level === 1)!;
  const b = Object.values(world.competitions).find((c) => c.level === 2)!;
  world.manager.clubId = a.clubIds[0]!;
  const cas = (ids: number[]) => ids.flatMap((id) => world.clubs[id]!.playerIds.map((p) => world.players[p]!.ca));
  const share = (xs: number[], f: (s: number) => boolean) => xs.filter((ca) => f(toStars(world, ca))).length / xs.length;

  it('nel proprio campionato: pochi campioni, la metà sopra le 3 stelle', () => {
    const own = cas(a.clubIds);
    expect(share(own, (s) => s === 5)).toBeLessThan(0.05);
    expect(share(own, (s) => s >= 4.5)).toBeLessThan(0.12);
    expect(share(own, (s) => s >= 3)).toBeGreaterThan(0.4);
    expect(share(own, (s) => s >= 3)).toBeLessThan(0.6);
  });

  it('la serie inferiore, vista dalla A, sta più in basso; dalla B torna sulla sua scala', () => {
    const low = cas(b.clubIds);
    const inA = share(low, (s) => s >= 3);
    world.manager.clubId = b.clubIds[0]!;
    const inB = share(low, (s) => s >= 3);
    world.manager.clubId = a.clubIds[0]!;
    expect(inA).toBeLessThan(0.25);
    expect(inB).toBeGreaterThan(0.4);
  });

  it('un talento che cresce di 30 punti in tutto il campionato non sposta le stelle', () => {
    const before = cas(a.clubIds).map((ca) => toStars(world, ca));
    for (const id of a.clubIds) for (const p of world.clubs[id]!.playerIds) world.players[p]!.ca += 30;
    world.season++; // le soglie si ricalcolano a ogni stagione
    expect(cas(a.clubIds).map((ca) => toStars(world, ca))).toEqual(before);
  });
});
