// Staff dell'utente (0.8.x): nasce da solo, si assume, il medico accelera le guarigioni, e il caso del mondo non si sposta.
import { describe, expect, it } from 'vitest';
import { heal } from './injuries.ts';
import { ensureStaff, hireStaff, STAFF_ROLES, staffEdge, staffOf, staffWages } from './staff.ts';
import { advance, newWorld } from './world.ts';

const mine = () => { const w = newWorld(9); w.manager.clubId = w.competitions.ITA1!.clubIds[5]!; return w; };

describe('staff', () => {
  it('un vice, un preparatore e un medico medi, più i candidati', () => {
    const w = mine();
    ensureStaff(w);
    for (const role of STAFF_ROLES) {
      expect(staffOf(w, w.manager.clubId, role)?.skill).toBe(10);
      expect(Object.values(w.staff).filter((m) => m.clubId === null && m.role === role).length).toBeGreaterThan(0);
    }
    expect(staffWages(w, w.manager.clubId)).toBeGreaterThan(0);
    expect(staffWages(w, w.competitions.ITA1!.clubIds[0]!)).toBe(0);
  });

  it('assumere mette il nuovo al posto del vecchio', () => {
    const w = mine();
    ensureStaff(w);
    const cand = Object.values(w.staff).find((m) => m.clubId === null && m.role === 'physio')!;
    const old = staffOf(w, w.manager.clubId, 'physio')!;
    expect(hireStaff(w, cand.id)).toBe(true);
    expect(staffOf(w, w.manager.clubId, 'physio')!.id).toBe(cand.id);
    expect(old.clubId).toBeNull();
  });

  it('un medico bravo accorcia la guarigione', () => {
    const w = mine();
    ensureStaff(w);
    staffOf(w, w.manager.clubId, 'physio')!.skill = 20;
    expect(staffEdge(w, w.manager.clubId, 'physio')).toBe(1);
    const p = w.players[w.clubs[w.manager.clubId]!.playerIds[0]!]!;
    p.condition.injuryDays = 20;
    heal(p, 8 * 1.25);
    expect(p.condition.injuryDays).toBe(10);
  });

  it('lo staff non sposta il caso del mondo', () => {
    const a = mine(), b = mine();
    ensureStaff(b);
    for (let i = 0; i < 3; i++) { advance(a); advance(b); }
    expect(b.rng).toEqual(a.rng);
  }, 60_000);
});
