// L'IA di mercato deve essere plausibile: buchi veri, budget rispettati, acquisti che si sentono in spogliatoio.
import { describe, expect, it } from 'vitest';
import { CLUB_AI } from '../balance.ts';
import type { Club, Player } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { agentOf } from './agents.ts';
import { needs, plan, sellWillingness, shortlist, taste, transferBudget, wageRoom } from './club-ai.ts';
import { emptyOffer } from './negotiation.ts';
import { runWindow, transfer } from './market.ts';

const setup = () => {
  const world = newWorld(5);
  world.manager.clubId = -1; // nessun club umano
  const clubs = Object.values(world.clubs);
  return { world, clubs, club: clubs[0]! };
};

describe('IA di mercato (F7)', () => {
  it('un ruolo svuotato diventa il bisogno più urgente', () => {
    const { world, club } = setup();
    const before = needs(world, club).find((n) => n.pos === 'DC')!;
    club.playerIds = club.playerIds.filter((id) => world.players[id]!.position !== 'DC');
    const after = needs(world, club).find((n) => n.pos === 'DC')!;
    expect(after.urgency).toBeGreaterThan(before.urgency);
    expect(needs(world, club)[0]!.pos).toBe('DC');
    expect(after.have).toBeLessThan(before.have); // restano solo gli adattati
  });

  it('budget e monte ingaggi sono quelli del club, e il ricco ha più spazio del povero', () => {
    const { world, clubs } = setup();
    const [rich, poor] = [...clubs].sort((a, b) => b.reputation - a.reputation).slice(0, 1)
      .concat([...clubs].sort((a, b) => a.reputation - b.reputation)[0]!) as [Club, Club];
    expect(transferBudget(world, rich)).toBeGreaterThan(transferBudget(world, poor));
    expect(transferBudget(world, rich)).toBeLessThan(rich.balance);
    // il monte ingaggi libero è quello che resta sotto il tetto: svuotata la rosa, è tutto disponibile
    const bill = rich.playerIds.reduce((a, id) => a + world.players[id]!.contract.wage, 0);
    const room = wageRoom(world, rich);
    rich.playerIds = [];
    expect(wageRoom(world, rich)).toBeCloseTo(room + bill, 0);
    expect(Object.values(world.clubs).filter((c) => wageRoom(world, c) > 0).length).toBeGreaterThan(30);
  });

  it('la filosofia cambia il gusto, non la forza', () => {
    const { world, club } = setup();
    const young = Object.values(world.players).find((p) => world.season - p.birthYear <= 19)!;
    const old = Object.values(world.players).find((p) => world.season - p.birthYear >= 32)!;
    club.philosophy = 'youth';
    expect(taste(club, young, world.season)).toBeGreaterThan(taste(club, old, world.season));
    club.philosophy = 'veterans';
    expect(taste(club, old, world.season)).toBeGreaterThan(taste(club, young, world.season));
    club.philosophy = 'balanced';
    expect(taste(club, old, world.season)).toBe(1);
  });

  it('chi è fuori rosa si cede volentieri, il titolare no', () => {
    const { world, club } = setup();
    const players = club.playerIds.map((id) => world.players[id]!);
    const key = players.filter((p) => p.position === 'ST').sort((a, b) => b.ca - a.ca)[0]!;
    expect(sellWillingness(world, club, key)).toBeLessThan(0.2);
    club.excluded.push(key.id);
    expect(sellWillingness(world, club, key)).toBe(CLUB_AI.sellExcluded);
    club.excluded = [];
    key.psych.wantsOut = true;
    expect(sellWillingness(world, club, key)).toBe(CLUB_AI.sellWantsOut);
  });

  it('la lista propone solo chi migliora la rosa, costa meno del budget e non è già nostro', () => {
    const { world, club } = setup();
    const need = needs(world, club)[0]!;
    const list = shortlist(world, club, need, transferBudget(world, club));
    for (const p of list) {
      expect(p.clubId).not.toBe(club.id);
      expect(p.positions[need.pos] ?? 0).toBeGreaterThanOrEqual(4);
    }
    expect(shortlist(world, club, need, 0).length).toBe(0); // senza soldi non c'è lista
  });

  it('un acquisto sposta soldi, contratto e spogliatoio', () => {
    const { world, clubs } = setup();
    const buyer = clubs[0]!;
    const seller = clubs[5]!;
    const p = seller.playerIds.map((id) => world.players[id]!).sort((a, b) => b.ca - a.ca)[0]! as Player;
    const rival = buyer.playerIds.map((id) => world.players[id]!)
      .find((q) => (q.positions[p.position] ?? 0) >= 4 && q.ca < p.ca - 10);
    const moraleBefore = rival?.psych.morale ?? 0;
    const cash = buyer.balance, sellerCash = seller.balance;
    const agent = agentOf(world, p)!;
    const before = agent.memory[buyer.id] ?? 0;
    transfer(world, new Rng(1), p, buyer, { ...emptyOffer(20_000_000), agentFee: 1_000_000 }, 2_000_000);
    expect(p.clubId).toBe(buyer.id);
    expect(buyer.playerIds).toContain(p.id);
    expect(seller.playerIds).not.toContain(p.id);
    expect(buyer.balance).toBe(cash - 21_000_000);
    expect(seller.balance).toBe(sellerCash + 20_000_000);
    expect(p.contract.wage).toBe(2_000_000);
    expect(p.contract.until).toBeGreaterThan(world.season);
    expect(Object.keys(p.rel).length).toBeGreaterThan(0); // è entrato nel gruppo
    expect(agent.memory[buyer.id] ?? 0).toBeGreaterThan(before);
    if (rival) expect(rival.psych.morale).toBeLessThan(moraleBefore); // la concorrenza si sente
  });

  it('una finestra produce affari, rispetta le rose e non tocca il club dell\'utente', () => {
    const { world, clubs } = setup();
    world.manager.clubId = clubs[0]!.id;
    const mine = [...clubs[0]!.playerIds];
    const done = runWindow(world, new Rng(7));
    expect(done).toBeGreaterThan(0);
    expect(clubs[0]!.playerIds).toEqual(mine); // la mia rosa non la tocca nessuno
    for (const c of clubs) {
      expect(c.playerIds.length).toBeLessThanOrEqual(CLUB_AI.squadMax + 1);
      for (const id of c.playerIds) expect(world.players[id]!.clubId).toBe(c.id);
    }
  });
});
