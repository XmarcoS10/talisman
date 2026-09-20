// La trattativa condotta dall'utente: due sì per chiudere, il club e il giocatore.
import { describe, expect, it } from 'vitest';
import type { Player } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { askingWage } from './contracts.ts';
import { dropTalk, sendOffer, startTalk, talkFor } from './market.ts';
import { emptyOffer } from './negotiation.ts';

const setup = () => {
  const world = newWorld(5);
  const clubs = Object.values(world.clubs);
  world.manager.clubId = clubs[0]!.id;
  const me = clubs[0]!;
  me.balance = 400_000_000; // per questa prova i soldi non sono il problema
  const target = world.players[clubs[9]!.playerIds[6]!]! as Player;
  target.psych.morale = 80;
  target.psych.wantsOut = false;
  target.personality.ambition = 5;
  return { world, me, target };
};

describe('trattativa dell\'utente (F7)', () => {
  it('si apre, si vede la richiesta, e il prezzo di riserva resta nascosto', () => {
    const { world, target } = setup();
    const t = startTalk(world, new Rng(1), target)!;
    expect(t).not.toBeNull();
    expect(talkFor(world, target)).toBe(t);
    expect(t.ask).toBeGreaterThan(t.reserve); // quello che chiedono non è quello che accetterebbero
    expect(world.talks).toHaveLength(1);
  });

  it('un\'offerta bassa fa rilanciare, una seria chiude', () => {
    const { world, me, target } = setup();
    const t = startTalk(world, new Rng(1), target)!;
    const low = sendOffer(world, new Rng(2), target, emptyOffer(Math.round(t.reserve * 0.4)), askingWage(world, target, me));
    expect(low.kind).toBe('counter');
    expect(low.signed).toBe(false);
    expect(target.clubId).not.toBe(me.id);
    const good = sendOffer(world, new Rng(3), target, emptyOffer(Math.round(t.ask * 1.1)), askingWage(world, target, me));
    expect(good.signed).toBe(true);
    expect(target.clubId).toBe(me.id);
    expect(me.playerIds).toContain(target.id);
    expect(world.talks).toHaveLength(0); // la trattativa si chiude da sola
  });

  it('il club può dire sì e il giocatore no: lo stipendio è cosa sua', () => {
    const { world, me, target } = setup();
    const t = startTalk(world, new Rng(1), target)!;
    const r = sendOffer(world, new Rng(3), target, emptyOffer(Math.round(t.ask * 1.2)), 1000);
    expect(r.kind).toBe('accept');
    expect(r.signed).toBe(false);
    expect(r.why).toBe('wage');
    expect(target.clubId).not.toBe(me.id);
  });

  it('senza i soldi in cassa non si manda niente', () => {
    const { world, me, target } = setup();
    me.balance = 1_000_000;
    startTalk(world, new Rng(1), target);
    const r = sendOffer(world, new Rng(2), target, emptyOffer(50_000_000), askingWage(world, target, me));
    expect(r.why).toBe('cash');
    expect(r.signed).toBe(false);
  });

  it('lasciar perdere chiude la trattativa e l\'agente se lo ricorda', () => {
    const { world, me, target } = setup();
    startTalk(world, new Rng(1), target);
    const agent = world.agents[target.agentId!]!;
    const before = agent.memory[me.id] ?? 0;
    dropTalk(world, target);
    expect(talkFor(world, target)).toBeNull();
    expect(agent.memory[me.id] ?? 0).toBeLessThan(before);
  });
});
