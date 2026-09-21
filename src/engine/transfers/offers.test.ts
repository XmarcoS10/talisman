// Le offerte dell'IA per i giocatori dell'utente: arrivano nelle finestre, decide l'utente, e il giocatore se ne ricorda.
import { describe, expect, it } from 'vitest';
import { OFFERS } from '../balance.ts';
import { Rng } from '../rng.ts';
import { deserialize, serialize } from '../save.ts';
import { advance, endSeason, isSeasonOver, newWorld } from '../world.ts';
import { acceptOffer, counterOffer, expireOffers, keen, makeOffer, rejectOffer } from './offers.ts';

const setup = () => {
  const world = newWorld(5);
  const clubs = Object.values(world.clubs).sort((a, b) => a.reputation - b.reputation);
  world.manager.clubId = clubs[0]!.id; // l'utente allena il club meno blasonato
  const mine = clubs[0]!, big = clubs.at(-1)!;
  const star = mine.playerIds.map((id) => world.players[id]!).sort((a, b) => b.ca - a.ca)[0]!;
  big.balance = 500e6;
  return { world, mine, big, star, rng: new Rng(1) };
};

describe('offerte per i giocatori dell\'utente', () => {
  it('accettare vende il giocatore e incassa la cifra', () => {
    const { world, mine, big, star, rng } = setup();
    expect(makeOffer(world, big, star, 100e6, 0.8)).toBe(true);
    const o = world.offers[0]!;
    expect(o.fee).toBeLessThanOrEqual(o.max);
    const cash = mine.balance;
    expect(acceptOffer(world, rng, o)).toBe(true);
    expect(star.clubId).toBe(big.id);
    expect(mine.balance).toBe(cash + o.fee);
    expect(world.offers).toHaveLength(0);
  });

  it('un no a un club che il giocatore sognava gli pesa', () => {
    const { world, big, star, rng } = setup();
    star.personality.ambition = 18;
    expect(keen(world, star, big)).toBe(true);
    makeOffer(world, big, star, 100e6, 0.8);
    const morale = star.psych.morale;
    rejectOffer(world, world.offers[0]!);
    expect(star.psych.morale).toBe(Math.max(0, morale - OFFERS.blockedMorale));
    expect(world.causal.at(-1)?.key).toBe('cause.offerBlocked');
  });

  it('controproposta: entro il massimo si chiude, poco sopra rilanciano una volta, troppo se ne vanno', () => {
    const { world, big, star, rng } = setup();
    makeOffer(world, big, star, 100e6, 0.8);
    const o = world.offers[0]!;
    expect(counterOffer(world, rng, o, o.max * 1.1)).toBe('raise');
    expect(o.fee).toBe(o.max);
    expect(counterOffer(world, rng, o, o.max * 1.05)).toBe('walk'); // il secondo rilancio non c'è
    expect(star.clubId).toBe(world.manager.clubId);

    const s2 = setup();
    makeOffer(s2.world, s2.big, s2.star, 100e6, 0.8);
    const o2 = s2.world.offers[0]!;
    expect(counterOffer(s2.world, s2.rng, o2, o2.max)).toBe('accept');
    expect(s2.star.clubId).toBe(s2.big.id);
  });

  it('scadono, ce ne sono al massimo tre, e passano dal salvataggio', () => {
    const { world, mine, big, rng } = setup();
    const squad = mine.playerIds.map((id) => world.players[id]!);
    for (const p of squad) makeOffer(world, big, p, 100e6, 0.5);
    expect(world.offers).toHaveLength(OFFERS.max);
    expect(deserialize(serialize(world)).offers).toEqual(world.offers);
    world.day += OFFERS.days + 1;
    expireOffers(world);
    expect(world.offers).toHaveLength(0);
  });

  it('nelle finestre vere i club IA fanno offerte al club dell\'utente', () => {
    const world = newWorld(5);
    let seen = 0;
    for (let s = 0; s < 1; s++) { // inverno e poi estate
      while (!isSeasonOver(world)) { advance(world); seen = Math.max(seen, world.offers.length); }
      endSeason(world);
      seen = Math.max(seen, world.offers.length);
    }
    expect(world.news.some((n) => n.key === 'news.offerIn')).toBe(true);
    expect(seen).toBeGreaterThan(0);
  }, 60_000);
});
