// Vivaio e nazionali: annate plausibili, il colpo di fortuna raro, convocati che si stancano, tornei con un vincitore.
import { describe, expect, it } from 'vitest';
import { NATIONAL, YOUTH } from '../balance.ts';
import { callUp, internationalBreak, summerTournament, tournament } from '../nations/nations.ts';
import { Rng } from '../rng.ts';
import { value } from '../transfers/valuation.ts';
import { newWorld } from '../world.ts';
import { intake, intakeSize, youthPa } from './intake.ts';

describe('vivaio (F8)', () => {
  it('l\'annata ha ragazzi di 15-16 anni, per lo più italiani, e si inserisce nel gruppo', () => {
    const world = newWorld(5);
    const club = Object.values(world.clubs)[0]!;
    const before = club.playerIds.length;
    const kids = intake(world, new Rng(1), club);
    expect(kids.length).toBeGreaterThanOrEqual(YOUTH.base);
    expect(club.playerIds.length).toBe(before + kids.length);
    for (const p of kids) {
      const age = world.season - p.birthYear;
      expect(age).toBeGreaterThanOrEqual(YOUTH.age[0]);
      expect(age).toBeLessThanOrEqual(YOUTH.age[1]);
      expect(p.pa).toBeGreaterThanOrEqual(p.ca);
      expect(p.clubId).toBe(club.id);
    }
    expect(kids.some((p) => Object.keys(p.rel).length > 0)).toBe(true);
  });

  it('strutture e blasone fanno ragazzi migliori, e il reclutamento ne porta di più', () => {
    const world = newWorld(5);
    const [a, b] = Object.values(world.clubs);
    a!.youth = { facilities: 20, recruitment: 20 };
    a!.reputation = 90;
    b!.youth = { facilities: 3, recruitment: 3 };
    b!.reputation = 30;
    const avg = (c: typeof a) => { const r = new Rng(3); let s = 0; for (let i = 0; i < 400; i++) s += youthPa(c!, r).pa; return s / 400; };
    expect(avg(a)).toBeGreaterThan(avg(b) + 30);
    expect(intakeSize(a!, new Rng(1))).toBeGreaterThan(intakeSize(b!, new Rng(1)));
  });

  it('il colpo di fortuna è raro ma può capitare anche al club più piccolo', () => {
    const world = newWorld(5);
    const small = Object.values(world.clubs).sort((x, y) => x.reputation - y.reputation)[0]!;
    const rng = new Rng(9);
    let jackpots = 0;
    for (let i = 0; i < 5000; i++) if (youthPa(small, rng).jackpot) jackpots++;
    expect(jackpots).toBeGreaterThan(0);
    expect(jackpots / 5000).toBeLessThan(0.03);
  });
});

describe('nazionali (F8)', () => {
  it('il ct convoca i migliori della sua nazione, e la pausa stanca e dà presenze', () => {
    const world = newWorld(5);
    const squad = callUp(world, 'ITA');
    expect(squad.length).toBe(NATIONAL.squad);
    expect(squad.every((p) => p.nation === 'ITA')).toBe(true);
    const others = Object.values(world.players).filter((p) => p.nation === 'ITA' && !squad.includes(p) && p.clubId !== null);
    expect(Math.min(...squad.map((p) => p.ca))).toBeGreaterThanOrEqual(Math.max(...others.map((p) => p.ca)));
    const fatigue = squad[0]!.condition.fatigue;
    internationalBreak(world, new Rng(2));
    expect(squad[0]!.intl.caps).toBeGreaterThan(0);
    expect(squad[0]!.condition.fatigue).toBeGreaterThan(fatigue);
    expect(world.nations.ITA!.callups).toHaveLength(NATIONAL.squad);
  });

  it('un torneo ha un vincitore solo, e l\'Europeo è solo europeo', () => {
    const world = newWorld(5);
    const euro = tournament(world, new Rng(4), 'euro');
    expect(['ITA', 'ESP', 'FRA', 'POR', 'NED', 'SRB', 'CRO', 'SWE']).toContain(euro.winner);
    expect([...euro.places.values()].filter((p) => p === 'winner')).toHaveLength(1);
    const world2 = tournament(world, new Rng(5), 'world');
    expect([...world2.places.values()].filter((p) => p === 'final')).toHaveLength(1);
  });

  it('vincere un torneo fa salire il valore dei campioni', () => {
    const world = newWorld(5);
    world.season = 2028; // estate dell'Europeo
    const before = new Map(Object.values(world.players).map((p) => [p.id, value(p, world.season)]));
    summerTournament(world, new Rng(6));
    const champions = Object.values(world.players).filter((p) => p.intl.titles > 0);
    expect(champions.length).toBeGreaterThan(0);
    for (const p of champions) expect(value(p, world.season)).toBeGreaterThanOrEqual(before.get(p.id)!);
    world.season = 2029; // niente torneo negli anni dispari
    const caps = champions[0]!.intl.caps;
    summerTournament(world, new Rng(7));
    expect(champions[0]!.intl.caps).toBe(caps);
  });
});
