// Difetti trovati nel collaudo del 28/09 (stagione intera giocata nell'app): sigle dei club uguali, clic a vuoto su
// «Avanza» nei giorni senza la propria squadra, report sulla prima partita senza l'allenatore avversario.
import { describe, expect, it } from 'vitest';
import { coachOf } from './coaches.ts';
import { preseason } from './friendlies.ts';
import { advanceToMine, isSeasonOver, newWorld } from './world.ts';

describe('collaudo 28/09', () => {
  it('ogni club ha una sigla sua', () => {
    for (const seed of [1, 7, 42]) {
      const codes = Object.values(newWorld(seed).clubs).map((c) => c.shortName);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it('a carriera firmata gli avversari hanno già l\'allenatore', () => {
    const w = newWorld(3);
    w.manager.clubId = w.competitions.ITA1!.clubIds[4]!;
    preseason(w);
    for (const id of w.competitions.ITA1!.clubIds) expect(coachOf(w, id) !== undefined).toBe(id !== w.manager.clubId);
  });

  it('«Avanza» si ferma solo alla propria partita o a fine stagione', () => {
    const w = newWorld(5);
    const me = w.competitions.ITA1!.clubIds[10]!;
    w.manager.clubId = me;
    let clicks = 0;
    while (!isSeasonOver(w) && clicks < 200) {
      const played = advanceToMine(w);
      clicks++;
      const mine = played.some((f) => f.home === me || f.away === me);
      expect(mine || isSeasonOver(w) || w.press !== null || w.offers.length > 0).toBe(true);
    }
    expect(isSeasonOver(w)).toBe(true);
    expect(clicks).toBeLessThanOrEqual(38 + 8); // 38 giornate più qualche turno di coppa
  }, 120_000);
});
