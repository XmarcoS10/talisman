// La conferenza stampa: domande dalle storie, effetti dichiarati e applicati esattamente, Causal Log aggiornato.
import { describe, expect, it } from 'vitest';
import { PRESS } from '../balance.ts';
import { Rng } from '../rng.ts';
import { advance, isSeasonOver, newWorld } from '../world.ts';
import { answerPress, weekPress } from './press.ts';

const setup = () => {
  const world = newWorld(42);
  const comp = world.competitions.ITA1!;
  world.manager.clubId = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation)[9]!;
  world.manager.name = 'Marco Talisman';
  // si gioca finché nasce la prima conferenza
  while (!world.press && !isSeasonOver(world)) advance(world);
  return world;
};

describe('conferenze stampa (F8)', { timeout: 60000 }, () => {
  it('le domande nascono dalle storie aperte della nostra squadra', () => {
    const world = setup();
    expect(world.press).not.toBeNull();
    const room = world.press!;
    expect(room.questions.length).toBeGreaterThan(0);
    expect(room.questions.length).toBeLessThanOrEqual(PRESS.questions);
    for (const q of room.questions) {
      const arc = world.arcs.find((a) => a.id === q.arcId)!;
      expect(arc.state).toBe('open');
      expect(arc.subject.club === world.manager.clubId || arc.subject.rival === world.manager.clubId).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(4);
      expect(q.options.length).toBeLessThanOrEqual(6);
      expect(q.text).not.toMatch(/[{}[\]#]/);
      for (const o of q.options) expect(o.effects.length).toBeGreaterThan(0);
    }
  });

  it('la risposta applica esattamente gli effetti mostrati, una volta sola', () => {
    const world = setup();
    const room = world.press!;
    const qi = room.questions.findIndex((q) => q.options.some((o) => o.effects.some((e) => e.target === 'player')));
    const q = room.questions[Math.max(0, qi)]!;
    const oi = Math.max(0, q.options.findIndex((o) => o.effects.some((e) => e.target === 'player')));
    const o = q.options[oi]!;
    const pe = o.effects.find((e) => e.target === 'player');
    const p = pe ? world.players[pe.playerId!]! : null;
    const before = p?.psych.morale ?? 0;
    const board = { ...world.manager.board.trust };
    expect(answerPress(world, room.questions.indexOf(q), oi)).toBe(true);
    if (p && pe) {
      expect(p.psych.morale).toBeCloseTo(Math.max(0, Math.min(100, before + pe.delta)), 5);
      expect(world.causal.some((c) => c.playerId === p.id && c.key.startsWith('cause.press'))).toBe(true);
    }
    for (const e of o.effects) if (e.target === 'board' || e.target === 'fans' || e.target === 'press')
      expect(world.manager.board.trust[e.target]).toBeCloseTo(Math.max(0, Math.min(100, board[e.target] + e.delta)), 5);
    expect(answerPress(world, room.questions.indexOf(q), oi)).toBe(false); // una domanda, una risposta
  });

  it('pungolare in pubblico carica chi regge la pressione e abbatte chi non la regge', () => {
    const world = setup();
    const room = world.press!;
    for (const q of room.questions) {
      const arc = world.arcs.find((a) => a.id === q.arcId)!;
      if (arc.subject.player === undefined) continue;
      const p = world.players[arc.subject.player]!;
      const sting = q.options.flatMap((o) => o.effects).filter((e) => e.target === 'player' && e.playerId === p.id)
        .map((e) => e.delta).find((d) => d === PRESS.challengeUp || d === PRESS.challengeDown);
      if (sting === undefined) continue;
      expect(sting).toBe(p.personality.pressureTolerance >= PRESS.challengeTolerance ? PRESS.challengeUp : PRESS.challengeDown);
    }
  });

  it('senza storie non c\'è conferenza', () => {
    const world = newWorld(3);
    world.manager.clubId = world.competitions.ITA1!.clubIds[0]!;
    weekPress(world, new Rng(1));
    expect(world.press).toBeNull();
  });
});
