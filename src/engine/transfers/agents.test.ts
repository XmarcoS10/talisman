// Gli agenti devono avere una memoria che pesa e iniziative che si vedono.
import { describe, expect, it } from 'vitest';
import { AGENT } from '../balance.ts';
import type { Player } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { agentOf, commission, makeAgent, proposals, remember, renewalWage, weekAgents } from './agents.ts';

const w = () => newWorld(5);

describe('agenti (F7)', () => {
  it('ogni giocatore ha un agente e ogni agente il suo portafoglio', () => {
    const world = w();
    const players = Object.values(world.players);
    expect(players.every((p) => p.agentId !== null)).toBe(true);
    const agents = Object.values(world.agents);
    expect(agents.length).toBeGreaterThan(10);
    const clients = agents.reduce((a, x) => a + x.clientIds.length, 0);
    expect(clients).toBe(players.length); // nessuno senza agente, nessuno con due
    for (const a of agents) {
      expect(a.clientIds.length).toBeGreaterThanOrEqual(1);
      expect(a.clientIds.length).toBeLessThanOrEqual(AGENT.portfolio[1]);
      for (const id of a.clientIds) expect(agentOf(world, world.players[id]!)!.id).toBe(a.id);
    }
  });

  it('la memoria resta tra −100 e 100 e i rapporti neutri non si salvano', () => {
    const a = makeAgent(new Rng(1), 1);
    remember(a, 7, -40);
    expect(a.memory[7]).toBe(-40);
    remember(a, 7, -500);
    expect(a.memory[7]).toBe(-100);
    remember(a, 7, 100);
    expect(a.memory[7]).toBeUndefined(); // tornato neutro: via dalla memoria
  });

  it('chi ce l\'ha con te chiede più commissione, chi è avido pure', () => {
    const mild = makeAgent(new Rng(1), 1);
    const greedy = makeAgent(new Rng(1), 2);
    mild.greed = 5;
    greedy.greed = 20;
    expect(commission(greedy, 10_000_000, 3)).toBeGreaterThan(commission(mild, 10_000_000, 3));
    const base = commission(mild, 10_000_000, 3);
    remember(mild, 3, -80);
    expect(commission(mild, 10_000_000, 3)).toBeGreaterThan(base * 1.5);
  });

  it("una promessa rotta finisce nella memoria dell'agente", async () => {
    const world = w();
    const club = Object.values(world.clubs)[0]!;
    world.manager.clubId = club.id;
    const p = world.players[club.playerIds[5]!]!;
    const a = agentOf(world, p)!;
    const before = a.memory[club.id] ?? 0;
    // la promessa si verifica dopo la partita: finestra scaduta senza presenze = rotta
    world.promises.push({ playerId: p.id, kind: 'starter', need: 6, left: 1, apps: 0 });
    const { afterMatch } = await import('../morale.ts');
    afterMatch(world, club, new Map(), false);
    expect(a.memory[club.id] ?? 0).toBeLessThan(before);
    expect(p.psych.wantsOut).toBe(true);
  });

  it('il rinnovo si chiede sopra lo stipendio equo, e l\'avidità pesa', () => {
    const world = w();
    const p = Object.values(world.players)[0]!;
    const mild = makeAgent(new Rng(1), 1);
    const greedy = makeAgent(new Rng(1), 2);
    mild.greed = 3;
    greedy.greed = 20;
    expect(renewalWage(greedy, p, world.season, 60)).toBeGreaterThan(renewalWage(mild, p, world.season, 60));
    expect(renewalWage(mild, p, world.season, 60)).toBeGreaterThan(p.contract.wage * 0.5);
  });

  it('propone solo assistiti scontenti, e non a chi non stima', () => {
    const world = w();
    const [c0, c1] = Object.values(world.clubs);

    const a = Object.values(world.agents).find((x) => x.clientIds.length >= 4)!;
    const p = world.players[a.clientIds[0]!]! as Player;
    const to = p.clubId === c1!.id ? c0!.id : c1!.id;
    p.psych.minutes = 0.9; // gioca sempre: nessuno lo muove
    p.psych.wantsOut = false;
    expect(proposals(world, a, to).map((x) => x.id)).not.toContain(p.id);
    p.psych.wantsOut = true; // ha chiesto di andarsene: ora sì
    expect(proposals(world, a, to).map((x) => x.id)).toContain(p.id);
    expect(proposals(world, a, to).every((x) => x.clubId !== to)).toBe(true);
    remember(a, to, -100);
    expect(proposals(world, a, to).length).toBe(0); // con chi non stima non lavora
  });

  it('la settimana degli agenti produce mosse e stempera la memoria', () => {
    const world = w();
    const a = Object.values(world.agents)[0]!;
    remember(a, 3, 60);
    const rng = new Rng(9);
    let moves = 0;
    for (let i = 0; i < 6; i++) moves += weekAgents(world, rng).length;
    expect(moves).toBeGreaterThan(0);
    expect(a.memory[3]!).toBeLessThan(60); // la memoria si stempera
  });
});
