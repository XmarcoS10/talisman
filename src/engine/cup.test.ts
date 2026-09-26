// La Coppa nazionale: tabellone completo, nessun pareggio senza rigori, una vincitrice, statistiche di campionato pulite.
import { describe, expect, it } from 'vitest';
import { CUP } from './balance.ts';
import { tieWinner } from './cup.ts';
import { advance, isSeasonOver, newWorld } from './world.ts';

describe('Coppa nazionale (F10)', { timeout: 60000 }, () => {
  it('si gioca tutta dentro la stagione, e ogni turno dimezza chi resta', () => {
    const world = newWorld(33);
    world.manager.clubId = -1;
    const cup = world.cup!;
    const n = Object.keys(world.clubs).length;
    expect(cup.rounds[0]!.ties.length * 2 + cup.byes.length).toBe(n);
    expect(cup.rounds.at(-1)!.day).toBe(CUP.days.at(-1));
    while (!isSeasonOver(world)) advance(world);
    let alive = cup.rounds[0]!.ties.length;
    for (let r = 1; r < cup.rounds.length; r++) {
      expect(cup.rounds[r]!.ties.length * 2).toBe(alive + (r === cup.byesAt ? cup.byes.length : 0));
      alive = cup.rounds[r]!.ties.length;
    }
    // le teste di serie entrano più tardi: nessuna di loro gioca il primo turno
    for (const fx of cup.rounds[0]!.ties) expect(cup.byes).not.toContain(fx.home);
    for (const round of cup.rounds) for (const fx of round.ties) expect(tieWinner(fx)).not.toBeNull();
    expect(cup.rounds.at(-1)!.ties.length).toBe(1);
    expect(cup.winner).toBe(tieWinner(cup.rounds.at(-1)!.ties[0]!));
    expect(world.cupWinners.at(-1)?.clubId).toBe(cup.winner);
  });

  it('le partite di coppa non entrano nelle presenze di campionato', () => {
    const world = newWorld(34);
    world.manager.clubId = -1;
    while (!isSeasonOver(world)) advance(world);
    for (const comp of Object.values(world.competitions)) {
      if (!comp.fixtures.length) continue; // la Serie C di contorno non gioca (chi ci arriva a gennaio porta le sue presenze)
      const games = new Map<number, number>();
      for (const fx of comp.fixtures) for (const id of [fx.home, fx.away]) games.set(id, (games.get(id) ?? 0) + 1);
      for (const id of comp.clubIds) for (const pid of world.clubs[id]!.playerIds)
        expect(world.players[pid]!.stats.apps).toBeLessThanOrEqual(games.get(id)!);
    }
  });
});

describe('amichevoli estive (F10)', () => {
  it('tre risultati per il club dell\'utente, sempre uguali, senza toccare il caso del mondo né le statistiche', async () => {
    const { preseason } = await import('./friendlies.ts');
    const world = newWorld(35);
    world.manager.clubId = world.competitions.ITA1!.clubIds[0]!;
    const rng = JSON.stringify(world.rng);
    preseason(world);
    const first = JSON.stringify(world.friendlies);
    preseason(world);
    expect(JSON.stringify(world.friendlies)).toBe(first);
    expect(world.friendlies!.games.length).toBe(3);
    expect(JSON.stringify(world.rng)).toBe(rng);
    expect(Object.values(world.players).every((p) => p.stats.apps === 0)).toBe(true);
  });
});

describe('integrità del mondo (F10)', () => {
  it('un mondo nuovo e uno giocato sono integri; un riferimento rotto si vede', async () => {
    const { integrity } = await import('./save.ts');
    const world = newWorld(36);
    world.manager.clubId = world.competitions.ITA1!.clubIds[0]!;
    for (let i = 0; i < 4; i++) advance(world);
    const ok = integrity(world);
    expect(ok.problems).toEqual([]);
    expect(ok.checks).toBeGreaterThan(1000);
    const p = Object.values(world.players).find((x) => x.clubId !== null)!;
    p.clubId = 999;
    expect(integrity(world).problems.length).toBeGreaterThan(0);
  });
});
