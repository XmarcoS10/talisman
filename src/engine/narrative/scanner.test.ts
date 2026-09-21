// Lo scanner deve produrre storie varie, coerenti e senza ripetizioni, e ogni regola deve avere i suoi testi.
import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import { advance, isSeasonOver, newWorld } from '../world.ts';
import { expand } from './text.ts';
import { GRAMMAR, RULES, TEMPLATES, varsFor } from './scanner.ts';

const season = (seed: number) => {
  const world = newWorld(seed);
  const comp = world.competitions.ITA1!;
  world.manager.clubId = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation)[9]!;
  world.manager.name = 'Marco Talisman';
  while (!isSeasonOver(world)) advance(world);
  return world;
};

describe('motore narrativo (F8)', { timeout: 60000 }, () => {
  it('quaranta regole, ognuna con un id unico e almeno il testo di apertura', () => {
    expect(RULES.length).toBe(40);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(40);
    for (const r of RULES) expect(TEMPLATES[`${r.id}.open`]?.length ?? 0).toBeGreaterThan(0);
  });

  it('ogni template si espande senza lasciare segnaposti né parentesi', () => {
    const world = newWorld(3);
    const [a, b] = world.competitions.ITA1!.clubIds;
    const p = world.players[world.clubs[a!]!.playerIds[0]!]!;
    const fake = {
      id: 1, rule: 'x', subject: { club: a!, rival: b!, player: p.id }, stage: 0, state: 'open' as const, opened: 0, until: 0, lines: [],
      data: { n: 5, g: 3, gf: 2, ga: 1, pos: 4, age: 18, days: 70, apps: 7, team: 20, top: 12, min: 89, trust: 20,
        distacco: 'a due punti', fine: 'a tre giornate dalla fine', mentor: 'Carlo Rossi', other: 'Luca Bianchi', kind: 'freeze' },
    };
    const vars = varsFor(world, fake);
    const rng = new Rng(9);
    for (const [key, list] of Object.entries(TEMPLATES))
      for (const tpl of list)
        for (let i = 0; i < 4; i++) {
          const s = expand(tpl, vars, GRAMMAR, rng);
          expect(s, `${key}: ${s}`).not.toMatch(/[{}[\]#]/);
          expect(s, `${key}: ${s}`).not.toMatch(/\s{2}|\s[,.]/);
          expect(s.charAt(0), `${key}: ${s}`).toBe(s.charAt(0).toUpperCase());
        }
  });

  it('una stagione produce almeno otto archi diversi, e nessuna frase più di tre volte', () => {
    const world = season(42);
    expect(new Set(world.arcs.map((a) => a.rule)).size).toBeGreaterThanOrEqual(8);
    const count = new Map<string, number>();
    for (const a of world.arcs) for (const l of a.lines) count.set(l.text, (count.get(l.text) ?? 0) + 1);
    expect(Math.max(...count.values())).toBeLessThanOrEqual(3);
    // e ce ne sono anche sulla squadra dell'utente
    expect(world.arcs.some((a) => a.subject.club === world.manager.clubId)).toBe(true);
  });

  it('gli archi hanno un esito: qualcuno si chiude bene, qualcuno male', () => {
    const world = season(7);
    const states = new Set(world.arcs.map((a) => a.state));
    expect(states.has('won')).toBe(true);
    expect(states.has('lost')).toBe(true);
    for (const a of world.arcs) expect(a.lines.length).toBeGreaterThanOrEqual(a.state === 'faded' ? 0 : 1);
  });
});
