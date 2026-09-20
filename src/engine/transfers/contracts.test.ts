// Contratti: rinnovi che si possono rifiutare, svincolati, parametro zero, prestiti con condizioni.
import { describe, expect, it } from 'vitest';
import { CONTRACT } from '../balance.ts';
import { canPlay } from '../match.ts';
import type { Club, Player } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { acceptsRenewal, askingWage, isFree, loanOut, movePreSigned, preContracts, release, renew, returnLoans, signFree, years } from './contracts.ts';

const setup = () => {
  const world = newWorld(5);
  world.manager.clubId = -1;
  const clubs = Object.values(world.clubs);
  return { world, clubs, club: clubs[0]!, other: clubs[30]! };
};
const someone = (club: Club, world: ReturnType<typeof setup>['world']) => world.players[club.playerIds[7]!]! as Player;

describe('contratti (F7)', () => {
  it('ai giovani si offre lungo, ai vecchi corto', () => {
    const { world, club } = setup();
    const p = someone(club, world);
    p.birthYear = world.season - 20;
    expect(years(p, world.season)).toBe(CONTRACT.yearsYoung);
    p.birthYear = world.season - 33;
    expect(years(p, world.season)).toBe(CONTRACT.yearsOld);
  });

  it('rifiuta se gli offri poco, se è scontento, o se il club non è all\'altezza', () => {
    const { world, club } = setup();
    const p = someone(club, world);
    p.psych.morale = 70;
    p.psych.wantsOut = false;
    const ask = askingWage(world, p, club);
    expect(acceptsRenewal(world, p, club, ask).ok).toBe(true);
    expect(acceptsRenewal(world, p, club, Math.round(ask * 0.5))).toEqual({ ok: false, why: 'wage' });
    p.psych.morale = 20;
    expect(acceptsRenewal(world, p, club, ask)).toEqual({ ok: false, why: 'unhappy' });
    p.psych.morale = 70;
    p.ca = 190; // fuori categoria per un club qualunque
    p.personality.ambition = 20;
    const small = Object.values(world.clubs).sort((a, b) => a.reputation - b.reputation)[0]!;
    expect(acceptsRenewal(world, p, small, askingWage(world, p, small))).toEqual({ ok: false, why: 'ambition' });
  });

  it('il leale si accontenta di meno', () => {
    const { world, club } = setup();
    const p = someone(club, world);
    p.psych.morale = 70;
    const low = Math.round(askingWage(world, p, club) * 0.8);
    p.personality.loyalty = 5;
    expect(acceptsRenewal(world, p, club, low).ok).toBe(false);
    p.personality.loyalty = 20;
    expect(acceptsRenewal(world, p, club, low).ok).toBe(true);
  });

  it('rinnovare allunga la scadenza e può mettere la clausola rescissoria', () => {
    const { world, club } = setup();
    const p = someone(club, world);
    renew(world, new Rng(1), p, club, 1_000_000, true);
    expect(p.contract.until).toBe(world.season + years(p, world.season));
    expect(p.contract.release).toBeGreaterThan(0);
    renew(world, new Rng(1), p, club, 1_000_000, false);
    expect(p.contract.release).toBeNull();
  });

  it('lo svincolato esce dalla rosa e può firmare altrove', () => {
    const { world, club, other } = setup();
    const p = someone(club, world);
    p.psych.morale = 80;
    p.psych.wantsOut = false;
    release(world, club, p);
    expect(isFree(p)).toBe(true);
    expect(club.playerIds).not.toContain(p.id);
    expect(Object.keys(p.rel).length).toBe(0);
    expect(signFree(world, new Rng(2), p, other)).toBe(true);
    expect(p.clubId).toBe(other.id);
    expect(p.contract.wage).toBeGreaterThan(0);
  });

  it('a gennaio si firma a parametro zero, e a giugno si parte davvero', () => {
    const { world } = setup();
    for (const p of Object.values(world.players)) {
      p.contract.until = world.season - 1; // tutti in scadenza
      p.psych.morale = 80;
      p.personality.ambition = 5;
    }
    const signed = preContracts(world, new Rng(3));
    expect(signed).toBeGreaterThan(0);
    const one = Object.values(world.players).find((p) => p.contract.preSigned !== null)!;
    const to = one.contract.preSigned!;
    const from = one.clubId!;
    expect(world.clubs[to]!.reputation).toBeGreaterThan(world.clubs[from]!.reputation);
    expect(movePreSigned(world, new Rng(4))).toBe(signed);
    expect(one.clubId).toBe(to);
    expect(world.clubs[from]!.playerIds).not.toContain(one.id);
  });

  it('il prestito ha condizioni: non lo schieri contro chi lo possiede, e poi torna', () => {
    const { world, club, other } = setup();
    const p = someone(club, world);
    loanOut(world, new Rng(5), p, other, { noPlayVsOwner: true });
    expect(p.clubId).toBe(other.id);
    expect(other.playerIds).toContain(p.id);
    expect(canPlay(other, p)).toBe(true);
    expect(canPlay(other, p, club.id)).toBe(false); // non contro il proprietario
    world.season++;
    expect(returnLoans(world, new Rng(6))).toBeGreaterThan(0);
    expect(p.clubId).toBe(club.id);
    expect(p.contract.loan).toBeNull();
  });

  it('col riscatto obbligatorio il prestito non torna: si paga e resta', () => {
    const { world, club, other } = setup();
    const p = someone(club, world);
    const cash = other.balance, ownerCash = club.balance;
    loanOut(world, new Rng(5), p, other, { buy: 5_000_000, obligation: true });
    world.season++;
    returnLoans(world, new Rng(6));
    expect(p.clubId).toBe(other.id);
    expect(other.balance).toBe(cash - 5_000_000);
    expect(club.balance).toBe(ownerCash + 5_000_000);
  });
});
