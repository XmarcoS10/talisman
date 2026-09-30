// Discorsi alla squadra (0.8.0): le regole di reazione e l'effetto del discorso di fine partita.
import { describe, expect, it } from 'vitest';
import { fullTimeTalk, reactions, talkResponse } from './talks.ts';
import { newWorld } from './world.ts';

const w = newWorld(11);
const club = w.clubs[w.competitions.ITA1!.clubIds[2]!]!;
w.manager.clubId = club.id;
const p = w.players[club.playerIds[0]!]!;

describe('discorsi alla squadra', () => {
  it('lodare convince chi vince, non chi perde', () => {
    expect(talkResponse(p, 'praise', 1)).toBeGreaterThan(0);
    expect(talkResponse(p, 'praise', -1)).toBeLessThan(0);
  });

  it('pretendere pesa su chi regge male la pressione', () => {
    const fragile = { ...p, personality: { ...p.personality, pressureTolerance: 5 } };
    const pro = { ...p, personality: { ...p.personality, pressureTolerance: 15, professionalism: 16 } };
    expect(talkResponse(fragile, 'demand', -1)).toBeLessThan(0);
    expect(talkResponse(pro, 'demand', -1)).toBe(1);
  });

  it('la delusione quando si vince si prende sempre male', () => {
    expect(talkResponse(p, 'disappointed', 2)).toBe(-1);
  });

  it('il discorso di fine partita muove morale e fiducia, e lo scrive nel profilo', () => {
    const before = club.playerIds.map((id) => w.players[id]!.psych.morale);
    const causes = w.causal.length;
    const rs = fullTimeTalk(w, club, 'praise', 2);
    const after = club.playerIds.map((id) => w.players[id]!.psych.morale);
    expect(rs.every((r) => r === 1)).toBe(true);
    expect(after.every((m, i) => m >= before[i]!)).toBe(true);
    expect(w.causal.length - causes).toBe(club.playerIds.length);
    expect(reactions(rs)).toEqual({ good: rs.length, flat: 0, bad: 0 });
  });
});
