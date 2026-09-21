// La dirigenza: quattro barre con memoria, e un contratto esplicito che si può rinegoziare.
import { describe, expect, it } from 'vitest';
import { BOARD } from '../balance.ts';
import { newWorld } from '../world.ts';
import { hire } from '../scouting/scouts.ts';
import { dealCost, endSeasonBoard, expected, fairPosition, newBoard, renegotiate, request, weekBoard } from './board.ts';

const setup = () => {
  const world = newWorld(5);
  const comp = world.competitions.ITA1!;
  // l'utente allena la squadra col blasone più basso della Serie A
  const worst = [...comp.clubIds].sort((a, b) => world.clubs[a]!.reputation - world.clubs[b]!.reputation)[0]!;
  world.manager.clubId = worst;
  world.manager.board = newBoard();
  return { world, club: world.clubs[worst]! };
};

describe('dirigenza (F8)', () => {
  it("l'obiettivo di default è la posizione che il club merita per blasone", () => {
    const { world, club } = setup();
    expect(fairPosition(world, club)).toBe(20); // ultima per reputazione
    expect(expected(world, club)).toBe(20);
  });

  it('la fiducia si muove piano: una settimana non ribalta niente', () => {
    const { world } = setup();
    const b = world.manager.board;
    const before = b.trust.board;
    weekBoard(world);
    expect(b.trust.board).not.toBe(before);
    expect(Math.abs(b.trust.board - before)).toBeLessThan(20); // memoria: niente salti
    for (let i = 0; i < 30; i++) weekBoard(world);
    expect(b.trust.board).toBeGreaterThan(0);
    expect(b.trust.board).toBeLessThanOrEqual(100);
  });

  it('chiedere tempo e un obiettivo più comodo costa fiducia; alzare l\'asticella la fa salire', () => {
    const { world, club } = setup();
    const b = world.manager.board;
    const before = b.trust.board;
    expect(renegotiate(world, 2, 15)).toBe(true); // 15° invece del 20°: obiettivo più alto
    expect(b.trust.board).toBeGreaterThan(before - 1); // costo basso o negativo
    expect(expected(world, club)).toBe(15); // ora vale l'accordo
    const b2 = newBoard();
    world.manager.board = b2;
    expect(renegotiate(world, 3, 20)).toBe(true);
    expect(b2.trust.board).toBeLessThan(BOARD.start); // tempo e comodità si pagano
  });

  it('lo staff osservatori ha i posti concessi dalla società, e una richiesta ne aggiunge uno', () => {
    const { world, club } = setup();
    const free = () => Object.values(world.scouts).find((s) => s.clubId === null)!;
    while (club.scoutIds.length < world.manager.board.scoutSlots) expect(hire(world, club, free().id)).toBe(true);
    expect(hire(world, club, free().id)).toBe(false); // pieno
    expect(request(world, 'scouts').ok).toBe(true);
    expect(hire(world, club, free().id)).toBe(true);
  });

  it("il costo del contratto si vede prima di chiederlo, ed è quello che si paga", () => {
    const { world, club } = setup();
    const before = world.manager.board.trust.board;
    const cost = dealCost(world, club, 1, 18);
    expect(renegotiate(world, 1, 18)).toBe(true);
    expect(world.manager.board.trust.board).toBeCloseTo(before - cost);
  });

  it('senza credito non si rinegozia', () => {
    const { world } = setup();
    world.manager.board.trust.board = BOARD.sackAt + 1;
    expect(renegotiate(world, 3, 20)).toBe(false);
  });

  it('le richieste costano capitale politico, e con la dirigenza contro non passano', () => {
    const { world } = setup();
    const b = world.manager.board;
    const cap = b.capital;
    const ok = request(world, 'budget');
    expect(ok.ok).toBe(true);
    expect(ok.amount).toBeGreaterThan(0);
    expect(b.capital).toBe(cap - BOARD.costBudget);
    b.capital = 100;
    b.trust.board = BOARD.warnAt - 1;
    expect(request(world, 'facility').ok).toBe(false); // prima i risultati
    b.capital = 0;
    expect(request(world, 'sale').ok).toBe(false); // e senza capitale non si chiede nulla
  });

  it('il verdetto di giugno registra la stagione e può portare all\'esonero', () => {
    const { world } = setup();
    const b = world.manager.board;
    b.trust.board = 25;
    endSeasonBoard(world);
    expect(b.verdicts).toHaveLength(1);
    expect(b.verdicts[0]!.expected).toBe(20);
    expect(b.capital).toBeGreaterThan(BOARD.capitalStart - BOARD.costBudget);
    // obiettivo impossibile e fiducia già bassa: a giugno si saluta
    b.deal = { seasons: 1, position: 1 };
    b.trust.board = BOARD.sackAt + 2;
    endSeasonBoard(world);
    expect(b.sacked).toBe(true);
  });

  it('dentro un accordo di transizione un anno storto pesa la metà', () => {
    const { world } = setup();
    const plain = newBoard();
    world.manager.board = plain;
    world.manager.board.deal = { seasons: 0, position: 0 };
    endSeasonBoard(world);
    const withoutDeal = plain.trust.board;
    const shielded = newBoard();
    world.manager.board = shielded;
    shielded.deal = { seasons: 2, position: 20 };
    endSeasonBoard(world);
    expect(shielded.trust.board).toBeGreaterThanOrEqual(withoutDeal);
    expect(shielded.deal.seasons).toBe(1); // l'accordo consuma una stagione
  });
});
