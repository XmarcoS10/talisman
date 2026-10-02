// La conferenza stampa: domande dalle storie, effetti dichiarati e applicati esattamente, Causal Log aggiornato.
import { describe, expect, it } from 'vitest';
import { render } from '../narrative/say.ts';
import { PRESS } from '../balance.ts';
import { Rng } from '../rng.ts';
import { advance, isSeasonOver, newWorld } from '../world.ts';
import { matchSetups } from '../match.ts';
import { answerPress, rivalFire, weekPress } from './press.ts';

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
      for (const lang of ['it', 'en'] as const) {
        expect(render(q.text, lang)).not.toMatch(/[{}[\]#]/);
        expect(render(q.asker, lang).length).toBeGreaterThan(3);
        for (const o of q.options) expect(render(o.text, lang).length).toBeGreaterThan(3);
      }
      for (const o of q.options) expect(o.effects.length).toBeGreaterThan(0);
      // ogni risposta ha il suo tipo, e dentro una domanda non se ne ripete nessuno (prima: tre «Motivante»)
      expect(new Set(q.options.map((o) => o.key)).size).toBe(q.options.length);
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

describe('conferenza pre-partita (0.16.0)', { timeout: 120000 }, () => {
  it("prima di un big match c'è la domanda sull'avversario; la spavalderia lo carica in campo", () => {
    const world = newWorld(42);
    const comp = world.competitions.ITA1!;
    const byRep = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation);
    world.manager.clubId = byRep[12]!;
    world.manager.name = 'Marco Talisman';
    const big = new Set(byRep.slice(0, PRESS.bigRank));
    let q = null;
    while (!isSeasonOver(world) && !(q = world.press?.questions.find((x) => x.vs !== undefined) ?? null)) advance(world);
    expect(q).not.toBeNull();
    expect(big.has(q!.vs!) || world.clubs[q!.vs!]!.city === world.clubs[world.manager.clubId]!.city).toBe(true);
    const qi = world.press!.questions.indexOf(q!);
    const oi = q!.options.findIndex((o) => o.key === 'preConfident');
    expect(answerPress(world, qi, oi)).toBe(true);
    expect(rivalFire(world, q!.vs!, q!.matchDay!)).toBe(PRESS.rivalFire);
    const fx = Object.values(world.competitions).flatMap((c) => c.fixtures).find((f) => f.day === q!.matchDay && (f.home === q!.vs || f.away === q!.vs))!;
    const su = matchSetups(world, fx);
    const opp = su.find((s) => s.club.id === q!.vs)!, mine = su.find((s) => s.club.id === world.manager.clubId)!;
    expect(opp.boost).toBeGreaterThan(0);
    expect(mine.boost).toBe(0);
  });
});
