// Record e storia (0.3.0): dopo una stagione giocata i record dicono il vero, e le carriere di prima si aprono.
import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from './save.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from './world.ts';

describe('record e storia', () => {
  const w = newWorld(42);
  const comp = w.competitions.ITA1!;
  const me = comp.clubIds[3]!;
  w.manager.clubId = me;
  while (!isSeasonOver(w)) advance(w);
  const table = standings(w, comp);
  const results = comp.fixtures.filter((fx) => fx.result);
  const cupSeason = w.cup;
  endSeason(w);

  it("la stagione dell'allenatore è quella della classifica", () => {
    expect(w.manager.seasons).toHaveLength(1);
    const s = w.manager.seasons[0]!;
    const row = table.findIndex((r) => r.clubId === me);
    expect(s).toMatchObject({ season: 2026, clubId: me, compId: comp.id, pos: row + 1, pts: table[row]!.pts });
    if (cupSeason?.season === 2026) expect(s.cup).not.toBeNull();
  });

  it('la vittoria più larga è davvero la più larga', () => {
    const r = w.records[me]!;
    const wins = results.flatMap((fx) => (fx.home === me ? [fx.result!.hg - fx.result!.ag] : fx.away === me ? [fx.result!.ag - fx.result!.hg] : []));
    const best = Math.max(...wins);
    if (best > 0) expect(r.bigWin!.gf - r.bigWin!.ga).toBe(best);
    const worst = Math.min(...wins);
    if (worst < 0) expect(r.bigLoss!.gf - r.bigLoss!.ga).toBe(worst);
  });

  it('miglior stagione e primi di sempre coerenti', () => {
    const champ = w.records[table[0]!.clubId]!;
    expect(champ.best).toMatchObject({ level: 1, pos: 1, pts: table[0]!.pts });
    for (const r of Object.values(w.records)) {
      expect(r.scorers.length).toBeLessThanOrEqual(10);
      for (let i = 1; i < r.scorers.length; i++) expect(r.scorers[i - 1]!.goals).toBeGreaterThanOrEqual(r.scorers[i]!.goals);
    }
    const goals = Object.values(w.records).flatMap((r) => r.scorers).reduce((m, l) => Math.max(m, l.goals), 0);
    expect(goals).toBeGreaterThan(5);
  });

  it("la cassa mese per mese della stagione nuova non eredita l'estate", () => {
    for (const c of Object.values(w.clubs)) expect(c.books.at(-1)!.monthly).toEqual([]);
  });

  it('una carriera del formato 28 si apre coi primi di sempre ricostruiti', () => {
    const raw = JSON.parse(serialize(w));
    raw.schemaVersion = 28;
    delete raw.records;
    delete raw.manager.seasons;
    const old = deserialize(JSON.stringify(raw));
    expect(old.manager.seasons).toHaveLength(w.manager.board.verdicts.length);
    expect(old.manager.seasons[0]).toMatchObject({ compId: null, pts: null });
    expect(old.records[me]!.apps.length).toBeGreaterThan(0);
    expect(old.records[me]!.bigWin).toBeNull();
  });
});

