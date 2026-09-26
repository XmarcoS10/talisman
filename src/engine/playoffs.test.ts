// Serie C di contorno, playoff e playout della Serie B (Blocco 4).
import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from './save.ts';
import { advance, endSeason, isSeasonOver, newWorld, standings } from './world.ts';

describe('playoff, playout e Serie C', { timeout: 120_000 }, () => {
  it('playoff dalla 3ª all\'8ª, playout 16ª-17ª: salgono le prime due più chi vince, scendono le ultime tre più chi perde', () => {
    const w = newWorld(11);
    w.manager.clubId = -1;
    while (!isSeasonOver(w)) advance(w);
    const b = w.competitions.ITA2!;
    const table = standings(w, b).map((r) => r.clubId);
    const po = w.playoffs!;
    expect(po.seeds).toEqual(table.slice(2, 8));
    expect(po.ties.filter((f) => f.stage === 'playoff')).toHaveLength(2 + 4 + 2); // preliminare, semifinali, finale
    expect(po.ties.every((f) => f.result)).toBe(true);
    expect(po.seeds).toContain(po.winner);
    if (po.playout) expect(po.playout).toContain(po.relegated);
    else expect(po.relegated).toBe(table[16]);
    // gli spareggi non entrano nelle presenze di campionato: al massimo 38 per chiunque
    for (const id of b.clubIds) for (const pid of w.clubs[id]!.playerIds) expect(w.players[pid]!.stats.apps).toBeLessThanOrEqual(38);
    const sum = endSeason(w);
    expect(sum.promoted.slice(0, 3)).toEqual([table[0], table[1], po.winner]);
    expect(sum.relegated.slice(3)).toEqual([...table.slice(-3), po.relegated]);
    for (const c of Object.values(w.competitions)) expect(c.clubIds).toHaveLength(20);
  });

  it('con gli spareggi spenti salgono le prime tre e scendono le ultime quattro', () => {
    const w = newWorld(12);
    w.manager.clubId = -1;
    w.rules.playoffs = false;
    while (!isSeasonOver(w)) advance(w);
    expect(w.playoffs).toBeNull();
    const table = standings(w, w.competitions.ITA2!).map((r) => r.clubId);
    const sum = endSeason(w);
    expect(sum.promoted.slice(0, 3)).toEqual(table.slice(0, 3));
    expect(sum.relegated.slice(3)).toEqual(table.slice(-4));
  });

  it('la Serie C non si gioca, finché non ci finisce il club dell\'utente', () => {
    const w = newWorld(13);
    const c = w.competitions.ITA3!;
    expect(c.fixtures).toHaveLength(0);
    w.manager.clubId = c.clubIds[5]!;
    while (!isSeasonOver(w)) advance(w);
    endSeason(w);
    const now = Object.values(w.competitions).find((x) => x.clubIds.includes(w.manager.clubId))!;
    expect(now.fixtures.length).toBe(380); // si gioca davvero: in C o in B se è salito
  });

  it('una carriera di prima (schema 24) si apre, e alla prima fine stagione arriva la Serie C', () => {
    const w = newWorld(14);
    const raw = JSON.parse(serialize(w));
    for (const id of raw.competitions.ITA3.clubIds) {
      for (const pid of raw.clubs[id].playerIds) delete raw.players[pid];
      delete raw.clubs[id];
    }
    delete raw.competitions.ITA3;
    raw.cup = null; // il tabellone di coppa di questo mondo nuovo cita i club della C appena tolti
    raw.competitions.ITA2.relegate = 0;
    delete raw.rules;
    delete raw.playoffs;
    raw.schemaVersion = 24;
    const old = deserialize(JSON.stringify(raw));
    expect(old.rules.playoffs).toBe(true);
    expect(old.competitions.ITA2!.relegate).toBe(4);
    old.manager.clubId = -1;
    while (!isSeasonOver(old)) advance(old);
    endSeason(old);
    expect(Object.keys(old.competitions)).toContain('ITA3');
    for (const c of Object.values(old.competitions)) expect(c.clubIds).toHaveLength(20);
  });
});
