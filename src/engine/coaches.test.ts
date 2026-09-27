// Allenatori dei club IA (0.5.0): uno per club, lo stile decide la tattica, gli esoneri rispettano il tempo di grazia.
import { describe, expect, it } from 'vitest';
import { COACH } from './balance.ts';
import { coachOf, coachTactics } from './coaches.ts';
import { deserialize, serialize } from './save.ts';
import { advance, isSeasonOver, newWorld } from './world.ts';

describe('allenatori dei club IA', () => {
  const w = newWorld(8);
  w.manager.clubId = w.competitions.ITA1!.clubIds[5]!;
  advance(w); // la prima giornata assegna le panchine

  it("un allenatore per ogni club dell'IA, nessuno sulla panchina dell'utente, un gruppo di liberi", () => {
    for (const c of Object.values(w.clubs)) {
      const n = Object.values(w.coaches).filter((k) => k.clubId === c.id).length;
      expect(n).toBe(c.id === w.manager.clubId ? 0 : 1);
    }
    expect(Object.values(w.coaches).filter((k) => k.clubId === null).length).toBeGreaterThanOrEqual(COACH.pool);
  });

  it('lo stile decide istruzioni e mentalità', () => {
    const club = w.clubs[w.competitions.ITA1!.clubIds[0]!]!;
    const coach = coachOf(w, club.id)!;
    coach.style = 'pressing';
    coachTactics(w, club);
    expect(club.tactic.pressing).toBe(2);
    coach.style = 'attacking';
    coachTactics(w, club);
    expect([club.tactic.pressing, club.tactic.width, club.tactic.mentality]).toEqual([1, 2, 4]);
  });

  it('in una stagione qualcuno salta, non troppi, e i club restano con un allenatore', () => {
    while (!isSeasonOver(w)) advance(w);
    const sacked = Object.values(w.coaches).flatMap((c) => c.career.filter((x) => x.sacked));
    expect(sacked.length).toBeGreaterThan(0);
    expect(sacked.length).toBeLessThan(30);
    for (const c of Object.values(w.clubs)) if (c.id !== w.manager.clubId) expect(coachOf(w, c.id)).toBeDefined();
  }, 60_000);

  it('una carriera del formato 29 riceve gli allenatori alla prima giornata', () => {
    const raw = JSON.parse(serialize(newWorld(9)));
    raw.schemaVersion = 29;
    delete raw.coaches; delete raw.nextCoachId;
    const old = deserialize(JSON.stringify(raw));
    expect(old.coaches).toEqual({});
    old.manager.clubId = -1;
    advance(old);
    expect(Object.values(old.clubs).every((c) => coachOf(old, c.id))).toBe(true);
  });
});
