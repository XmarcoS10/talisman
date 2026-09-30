// Tratti del giocatore (0.10.0): nascono da soli senza toccare il caso, si imparano in allenamento, gli opposti si escludono.
import { describe, expect, it } from 'vitest';
import { mp } from './match/state.ts';
import { TRAIT_BIT, bornTraits, conflicts, learnRate, startLearning, teachable, weekTraits } from './traits.ts';
import { advance, newWorld } from './world.ts';

const w = newWorld(21);
w.manager.clubId = w.competitions.ITA1!.clubIds[3]!;
const squad = () => w.clubs[w.manager.clubId]!.playerIds.map((id) => w.players[id]!);

describe('tratti del giocatore', () => {
  it('nascono dal giocatore (sempre gli stessi), non per tutti, e mai due opposti', () => {
    const all = Object.values(w.players);
    const withT = all.filter((p) => p.traits.length > 0).length;
    expect(withT / all.length).toBeGreaterThan(0.2);
    expect(withT / all.length).toBeLessThan(0.8);
    for (const p of all.slice(0, 300)) {
      expect(bornTraits(p)).toEqual(p.traits);
      for (const a of p.traits) for (const b of p.traits) expect(conflicts(a, b)).toBe(false);
      if (p.traits.includes('rushesOut')) expect(p.position).toBe('GK'); // solo i portieri escono dai pali
    }
  });

  it("si insegna un tratto e dopo qualche settimana è suo, con la notizia", () => {
    const p = squad().find((x) => x.position !== 'GK' && teachable(x).includes('longShots'))!;
    p.psych.morale = 70;
    startLearning(p, 'longShots');
    expect(p.learning?.trait).toBe('longShots');
    const weeks = Math.ceil(100 / learnRate(w, p));
    expect(weeks).toBeGreaterThan(4);
    expect(weeks).toBeLessThan(40);
    for (let i = 0; i < weeks; i++) weekTraits(w, p);
    expect(p.traits).toContain('longShots');
    expect(p.learning).toBeNull();
    expect(w.news.at(-1)?.key).toBe('news.traitLearned');
  });

  it('non si insegna il contrario di un tratto che ha, e col morale basso non impara', () => {
    const p = squad().find((x) => x.position !== 'GK')!;
    p.traits = ['killerBalls'];
    expect(teachable(p)).not.toContain('simplePasses');
    p.psych.morale = 20;
    expect(learnRate(w, p)).toBe(0);
  });

  it('il mondo avanza coi tratti (allenamento settimanale compreso)', () => {
    const p = squad().find((x) => x.position !== 'GK' && teachable(x).length > 0)!;
    p.psych.morale = 80;
    startLearning(p, teachable(p)[0]!);
    for (let i = 0; i < 3; i++) advance(w);
    expect((p.learning?.progress ?? 100) > 0).toBe(true);
  }, 60_000);

  it("l'istruzione «entrate decise» vale in partita come il tratto «entra in scivolata»", () => {
    const w = newWorld(3);
    const p = { ...Object.values(w.players)[0]!, traits: [] };
    const slot = { pos: 'DC' as const, x: 2, y: 4 };
    expect(mp(p, slot, 'cb', 90, 0, {}).tr & TRAIT_BIT.divesIn).toBe(0);
    expect(mp(p, slot, 'cb', 90, 0, { tackle: true }).tr & TRAIT_BIT.divesIn).toBe(TRAIT_BIT.divesIn);
  });
});
