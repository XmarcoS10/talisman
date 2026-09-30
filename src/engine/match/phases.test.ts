// Tattica con e senza palla (FM26): abbinamento degli slot fra i due moduli, ruoli senza palla, cambio dal vivo.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../match.ts';
import { ALL_FORMATIONS } from '../model.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { runMatch } from './engine.ts';
import { OOP_ROLES } from './roles.ts';
import { FORMATIONS, phaseMap } from './tactics.ts';

describe('tattica a due fasi', () => {
  it("ogni slot con palla ha uno slot senza palla suo, il portiere resta portiere, stesso modulo = stesso slot", () => {
    for (const a of ALL_FORMATIONS) for (const b of ALL_FORMATIONS) {
      const m = phaseMap(a, b);
      expect(new Set(m).size).toBe(11);
      expect(m.every((j) => j >= 0 && j < 11)).toBe(true);
      FORMATIONS[a].forEach((s, i) => expect(FORMATIONS[b][m[i]!]!.pos === 'GK').toBe(s.pos === 'GK'));
      if (a === b) expect(m).toEqual(FORMATIONS[a].map((_, i) => i));
    }
  });

  it("l'ala del 4-3-3 senza palla fa l'esterno di centrocampo del 4-4-2", () => {
    const m = phaseMap('4-3-3', '4-4-2');
    const amr = FORMATIONS['4-3-3'].findIndex((s) => s.pos === 'AMR');
    expect(FORMATIONS['4-4-2'][m[amr]!]!.pos).toBe('MR');
  });

  it('nel motore: case senza palla dal secondo modulo, ruolo senza palla, e cambio dal vivo', () => {
    const w = newWorld(8);
    const [h, a] = w.competitions.ITA1!.clubIds;
    const club = w.clubs[h!]!;
    Object.assign(club.tactic, { formation: '4-3-3', formationOut: '5-4-1', rolesOut: Array(11).fill('press') });
    const run = runMatch(new Rng(3), matchSetups(w, { day: 0, home: h!, away: a! }), []);
    const m = phaseMap('4-3-3', '5-4-1');
    for (const p of run.teams[0].on) {
      const s = FORMATIONS['5-4-1'][m[p.si]!]!;
      expect([p.ox, p.oy]).toEqual([s.x, s.y]);
      if (p.pos !== 'GK') expect(p.oPress).toBeCloseTo(p.role.press * OOP_ROLES.press.press);
    }
    run.formationOut(0, '4-4-2');
    const m2 = phaseMap('4-3-3', '4-4-2');
    for (const p of run.teams[0].on) expect(p.ox).toBe(FORMATIONS['4-4-2'][m2[p.si]!]!.x);
    run.result();
    expect(run.done).toBe(true);
  });
});
