// I conti devono tornare: quello che entra e quello che esce, e le sanzioni che si possono togliere.
import { describe, expect, it } from 'vitest';
import { FIN } from '../balance.ts';
import type { Fixture } from '../model.ts';
import { Rng } from '../rng.ts';
import { release } from '../transfers/contracts.ts';
import { advance, endSeason, isSeasonOver, newWorld } from '../world.ts';
import { books, checkFFP, gate, income, profit, projection, revenue, settleInstalments, trimWages, wageBill, weekCosts } from './ledger.ts';

const setup = () => {
  const world = newWorld(5);
  world.manager.clubId = -1;
  return { world, club: Object.values(world.clubs)[0]! };
};

describe('finanze (F8)', { timeout: 30000 }, () => {
  it('una settimana costa stipendi, struttura e stadio', () => {
    const { world, club } = setup();
    const before = club.balance;
    weekCosts(world, 1);
    const b = books(club, world.season);
    expect(b.wages).toBeGreaterThan(0);
    expect(b.staff).toBeGreaterThan(0);
    expect(b.stadium).toBeGreaterThan(0);
    expect(club.balance).toBe(before - b.wages - b.staff - b.stadium);
    expect(b.monthly[0]).toBe(club.balance); // la cassa del mese per il grafico
  });

  it('la proiezione parte da quello che è già successo e stima il resto della stagione', () => {
    const { world, club } = setup();
    weekCosts(world, 1);
    const now = books(club, world.season);
    const p = projection(world, club, 1, 20);
    expect(p.wages).toBeGreaterThan(now.wages);
    expect(p.tv).toBeGreaterThan(0);
    expect(p.prize).toBeGreaterThan(projection(world, club, 20, 20).prize); // chi sta in alto incassa di più
    expect(now.tv).toBe(0); // la proiezione non tocca il conto vero
  });

  it('la partita in casa incassa, e incassa di più se arriva una grande', () => {
    const { world } = setup();
    const clubs = Object.values(world.clubs).sort((a, b) => b.reputation - a.reputation);
    const home = clubs[10]!;
    const big: Fixture = { day: 0, home: home.id, away: clubs[0]!.id };
    const small: Fixture = { day: 0, home: home.id, away: clubs[clubs.length - 1]!.id };
    const a = gate(world, big);
    const b = gate(world, small);
    expect(a).toBeGreaterThan(b);
    expect(books(home, world.season).gate).toBe(a + b);
  });

  it('le rate si pagano e si incassano una per stagione', () => {
    const { world, club } = setup();
    const other = Object.values(world.clubs)[1]!;
    club.debts.push({ to: other.id, amount: 5_000_000, seasons: 2 });
    other.credits.push({ to: other.id, amount: 5_000_000, seasons: 2 });
    const cash = club.balance, theirs = other.balance;
    settleInstalments(world);
    expect(club.balance).toBe(cash - 5_000_000);
    expect(other.balance).toBe(theirs + 5_000_000);
    expect(club.debts[0]!.seasons).toBe(1);
    settleInstalments(world);
    expect(club.debts).toHaveLength(0); // finite
  });

  it('il fatturato non conta le plusvalenze, che non si ripetono', () => {
    const { world, club } = setup();
    const b = books(club, world.season);
    b.tv = 40_000_000;
    b.transfersIn = 30_000_000;
    world.season++;
    expect(income(club.books[0]!)).toBe(70_000_000);
    expect(revenue(world, club)).toBe(40_000_000);
  });

  it('le sanzioni salgono di gradino e si tolgono quando i conti rientrano', () => {
    const { world, club } = setup();
    books(club, world.season - 1).tv = 1000; // fatturato ridicolo: tutti sforano
    club.books[0]!.season = world.season - 1;
    checkFFP(world);
    expect(club.sanction.kind).toBe('warning');
    checkFFP(world);
    expect(club.sanction.kind).toBe('freeze');
    checkFFP(world);
    expect(club.sanction.kind).toBe('points');
    expect(club.sanction.points).toBe(FIN.ffpPoints);
    club.books[0]!.tv = 900_000_000; // fatturato enorme: rientrati
    checkFFP(world);
    expect(club.sanction.kind).toBe('freeze');
    checkFFP(world);
    checkFFP(world);
    expect(club.sanction.kind).toBe('none');
    expect(club.sanction.points).toBe(0);
  });

  it('chi sfora il tetto taglia gli ingaggi, ma non si riduce sotto la rosa minima', () => {
    const { world, club } = setup();
    books(club, world.season - 1).tv = 1_000_000;
    club.books[0]!.season = world.season - 1;
    const before = wageBill(world, club);
    const cut = trimWages(world, (c, id) => release(world, c, world.players[id]!));
    expect(cut).toBeGreaterThan(0);
    expect(wageBill(world, club)).toBeLessThan(before);
    expect(club.playerIds.length).toBeGreaterThanOrEqual(FIN.minSquad);
  });

  it('una stagione intera lascia libri coerenti e nessun club con i conti impossibili', { timeout: 90_000 }, () => { // ~11 s da sola, di più con gli altri test in parallelo
    const world = newWorld(9);
    world.manager.clubId = -1;
    while (!isSeasonOver(world)) advance(world);
    endSeason(world);
    for (const c of Object.values(world.clubs)) {
      const b = c.books.find((x) => x.season === world.season - 1)!;
      expect(b.gate).toBeGreaterThan(0);
      expect(b.tv).toBeGreaterThan(0);
      expect(b.wages).toBeGreaterThan(0);
      expect(Number.isFinite(profit(b))).toBe(true);
      expect(wageBill(world, c) / revenue(world, c)).toBeLessThan(1.3);
    }
  });
});
