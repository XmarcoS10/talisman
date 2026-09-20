// La nebbia deve essere onesta: stabile, più fitta su chi non conosci, e con errori sistematici veri.
import { describe, expect, it } from 'vitest';
import { SCOUT } from '../balance.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { estimate, knowledge, metrics, personalityKnown, publicKnowledge, range } from './fog.ts';
import { assign, gain, hire, makeScout, scoutsOf, watched, weekScouting } from './scouts.ts';

const setup = () => {
  const world = newWorld(5);
  const clubs = Object.values(world.clubs);
  world.manager.clubId = clubs[0]!.id;
  return { world, clubs, mine: clubs[0]!, other: clubs[7]! };
};

describe('informazione imperfetta (F7)', () => {
  it('dei miei so tutto, degli altri no', () => {
    const { world, mine, other } = setup();
    const own = world.players[mine.playerIds[0]!]!;
    const alien = world.players[other.playerIds[0]!]!;
    expect(knowledge(world, own)).toBe(100);
    expect(estimate(world, own, 'passing')).toEqual({ mid: own.attrs.passing, band: 0 });
    expect(knowledge(world, alien)).toBeLessThan(SCOUT.publicCap + 1);
    expect(estimate(world, alien, 'passing').band).toBeGreaterThan(0);
  });

  it('la stima non balla: riaprire la scheda non cambia il numero', () => {
    const { world, other } = setup();
    const p = world.players[other.playerIds[3]!]!;
    const a = estimate(world, p, 'finishing');
    const b = estimate(world, p, 'finishing');
    expect(a).toEqual(b);
    expect(range(world, p, 'ca')).toEqual(range(world, p, 'ca'));
  });

  it('il giocatore famoso si conosce meglio dello sconosciuto', () => {
    const { world, other } = setup();
    const p = world.players[other.playerIds[2]!]!;
    const before = publicKnowledge(world, p);
    p.stats.apps = 60;
    p.history.push({ season: world.season - 1, clubId: other.id, apps: 38, goals: 10, ca: p.ca });
    expect(publicKnowledge(world, p)).toBeGreaterThan(before);
  });

  it('la stima sta vicino al vero, ma non ci prende sempre', () => {
    const { world, other } = setup();
    const players = Object.values(world.players).filter((p) => p.clubId !== null && p.clubId !== world.manager.clubId);
    let wrong = 0;
    for (const p of players.slice(0, 200)) {
      const e = estimate(world, p, 'passing');
      expect(Math.abs(e.mid - p.attrs.passing)).toBeLessThanOrEqual(e.band + 1);
      if (e.mid !== p.attrs.passing) wrong++;
    }
    expect(wrong).toBeGreaterThan(50); // se ci prendesse sempre, non sarebbe una stima
  });

  it("l'osservatore dirada la nebbia sull'incarico che gli dai", () => {
    const { world, mine, other } = setup();
    const s = scoutsOf(world, mine)[0]!;
    assign(world, s.id, { kind: 'club', clubId: other.id });
    const list = watched(world, s);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => p.clubId === other.id)).toBe(true);
    const p = list[0]!;
    const before = knowledge(world, p);
    for (let i = 0; i < 12; i++) weekScouting(world, new Rng(i + 1));
    expect(knowledge(world, p)).toBeGreaterThan(before);
    expect(range(world, p, 'ca')[1] - range(world, p, 'ca')[0]).toBeLessThan(SCOUT.caBand * 2);
    expect(world.known[p.id]!.reports.length).toBeGreaterThan(0); // ha anche scritto
  });

  it('conoscendolo si capisce anche che tipo è', () => {
    const { world, mine, other } = setup();
    const s = scoutsOf(world, mine)[0]!;
    const p = world.players[other.playerIds[1]!]!;
    assign(world, s.id, { kind: 'player', playerId: p.id });
    expect(personalityKnown(world, p)).toBe(false);
    for (let i = 0; i < 30; i++) weekScouting(world, new Rng(i + 1));
    expect(personalityKnown(world, p)).toBe(true);
  });

  it('chi ha più giudizio e più contatti in casa sua lavora più in fretta', () => {
    const { world } = setup();
    const good = makeScout(new Rng(1), 900, null);
    const bad = makeScout(new Rng(2), 901, null);
    good.judgeAbility = good.judgePotential = 18;
    bad.judgeAbility = bad.judgePotential = 4;
    const p = Object.values(world.players)[0]!;
    good.contacts = { ...good.contacts, [p.nation]: 90 };
    bad.contacts = { ...bad.contacts, [p.nation]: 90 };
    expect(gain(good, p)).toBeGreaterThan(gain(bad, p));
    const far = { ...good, contacts: { ...good.contacts, [p.nation]: 0 } };
    expect(gain(good, p)).toBeGreaterThan(gain(far, p));
  });

  it('si può assumere un osservatore libero', () => {
    const { world, mine } = setup();
    const free = Object.values(world.scouts).find((s) => s.clubId === null)!;
    expect(hire(world, mine, free.id)).toBe(true);
    expect(mine.scoutIds).toContain(free.id);
    expect(hire(world, mine, free.id)).toBe(false); // non è più libero
  });

  it('i numeri per 90 minuti dicono da quanto campione vengono', () => {
    const { world, other } = setup();
    const p = world.players[other.playerIds[4]!]!;
    p.stats.apps = 3;
    p.stats.goals = 3;
    expect(metrics(p).goals).toBe(1);
    expect(metrics(p).small).toBe(true); // tre partite non sono un campione
    p.stats.apps = 30;
    expect(metrics(p).small).toBe(false);
  });
});
