// Lo scanner deve produrre storie varie, coerenti e senza ripetizioni, e ogni regola deve avere i suoi testi.
import { describe, expect, it } from 'vitest';
import { GRAMMARS, langVars, render, TEXTS } from './say.ts';
import { advance, isSeasonOver, newWorld } from '../world.ts';
import { RULES, TEMPLATES, varsFor } from './scanner.ts';

const season = (seed: number) => {
  const world = newWorld(seed);
  const comp = world.competitions.ITA1!;
  world.manager.clubId = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation)[9]!;
  world.manager.name = 'Marco Talisman';
  while (!isSeasonOver(world)) advance(world);
  return world;
};

describe('motore narrativo (F8)', { timeout: 60000 }, () => {
  it('quarantuno regole (41ª: il commissariamento, Blocco 4), ognuna con un id unico e almeno il testo di apertura', () => {
    expect(RULES.length).toBe(41);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(41);
    for (const r of RULES) expect(TEMPLATES[`${r.id}.open`]?.length ?? 0).toBeGreaterThan(0);
  });

  it('italiano e inglese hanno gli stessi testi (Blocco 5)', () => {
    expect(Object.keys(TEXTS.en).sort()).toEqual(Object.keys(TEXTS.it).sort());
    expect(Object.keys(GRAMMARS.en).sort()).toEqual(Object.keys(GRAMMARS.it).sort());
  });

  it('ogni testo, in italiano e in inglese, si scrive senza segnaposti, parentesi o variabili mancanti', () => {
    const world = newWorld(3);
    const [a, b] = world.competitions.ITA1!.clubIds;
    const p = world.players[world.clubs[a!]!.playerIds[0]!]!;
    const fake = {
      id: 1, rule: 'x', subject: { club: a!, rival: b!, player: p.id }, stage: 0, state: 'open' as const, opened: 0, until: 0, lines: [],
      data: { n: 5, g: 3, gf: 2, ga: 1, pos: 4, age: 18, days: 70, apps: 7, team: 20, top: 12, min: 89, trust: 20,
        gapPts: 2, left: 3, high: 1, mentor: 'Carlo Rossi', other: 'Luca Bianchi', kind: 'freeze' },
    };
    const raw = varsFor(world, fake);
    for (const lang of ['it', 'en'] as const) {
      const vars = langVars(raw, lang);
      for (const [key, list] of Object.entries(TEXTS[lang])) {
        // ogni {variabile} usata dal testo esiste in questa lingua (una mancante sparirebbe in silenzio)
        for (const tpl of [...list, ...Object.values(GRAMMARS[lang]).flat()])
          for (const m of tpl.matchAll(/\{(\w+)\}/g)) expect(vars[m[1]!], `${lang} ${key}: {${m[1]}}`).toBeDefined();
        for (let i = 1; i <= 12; i++) {
          const s = render({ key, seed: i * 7919, v: raw }, lang);
          expect(s, `${lang} ${key}: ${s}`).not.toMatch(/[{}[\]#§]/);
          expect(s, `${lang} ${key}: ${s}`).not.toMatch(/\s{2}|\s[,.]/);
          expect(s.charAt(0), `${lang} ${key}: ${s}`).toBe(s.charAt(0).toUpperCase());
        }
      }
    }
  });

  it('la stessa frase salvata si riscrive uguale, e in inglese non è italiana', () => {
    const world = season(7);
    const lines = world.arcs.flatMap((a) => a.lines.map((l) => l.text));
    expect(lines.length).toBeGreaterThan(20);
    for (const l of lines) {
      expect(render(l, 'it')).toBe(render(l, 'it'));
      expect(render(l, 'en')).not.toBe(render(l, 'it'));
      expect(render(l, 'en')).not.toMatch(/ (della|dello|alla|nella|dopo|partite|squadra) /);
    }
  });

  it('una stagione produce almeno otto archi diversi, e nessuna frase più di tre volte', () => {
    const world = season(42);
    expect(new Set(world.arcs.map((a) => a.rule)).size).toBeGreaterThanOrEqual(8);
    const count = new Map<string, number>();
    for (const a of world.arcs) for (const l of a.lines) count.set(render(l.text), (count.get(render(l.text)) ?? 0) + 1);
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
