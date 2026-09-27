// Meteo (0.5.0): dipende dal mese, è fisso per partita, e la pioggia rende la palla a terra meno precisa.
import { describe, expect, it } from 'vitest';
import { matchSetups } from './match.ts';
import { simulate } from './match/engine.ts';
import { Rng } from './rng.ts';
import { CALM, monthOf, weatherFor, weatherFx } from './weather.ts';
import { newWorld } from './world.ts';

describe('meteo e terreno', () => {
  const w = newWorld(21);
  w.manager.clubId = -1;
  const clubs = w.competitions.ITA1!.clubIds;
  const kinds = (days: number[]) => days.flatMap((day) => clubs.map((home) => weatherFor(w, { day, home, away: 0 }).kind));

  it("il caldo d'estate, il freddo e il campo pesante d'inverno; sempre lo stesso per la stessa partita", () => {
    expect(monthOf(0)).toBe(0);
    expect(monthOf(140)).toBe(5); // gennaio
    const summer = kinds([0, 7, 14, 21]), winter = kinds([105, 112, 140, 147, 175]);
    expect(summer).toContain('heat');
    expect(summer).not.toContain('cold');
    expect(winter).toContain('cold');
    expect(winter).not.toContain('heat');
    const fx = { day: 140, home: clubs[0]!, away: clubs[1]! };
    expect(weatherFor(w, fx)).toEqual(weatherFor(w, fx));
  });

  it('con la pioggia forte si sbagliano più passaggi, a parità di partite', () => {
    const acc = (wx: typeof CALM) => {
      const rng = new Rng(5);
      let ok = 0, all = 0;
      for (const fx of w.competitions.ITA1!.fixtures.slice(0, 120)) {
        const r = simulate(rng, matchSetups(w, fx).map((s) => ({ ...s, wx })) as ReturnType<typeof matchSetups>).result;
        ok += r.stats[0].passesOk + r.stats[1].passesOk; all += r.stats[0].passes + r.stats[1].passes;
      }
      return ok / all;
    };
    expect(acc(weatherFx({ kind: 'storm', heavy: true }))).toBeLessThan(acc(CALM) - 0.005);
  }, 60_000);
});
