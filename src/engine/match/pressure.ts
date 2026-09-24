// Pressione sul portatore (GUIDA §6.2 punto 2): i difensori entro `pressRadius` lo chiudono secondo Sacrificio,
// energia, istruzione di pressing e ruolo. Da qui nasce anche la "vista" su cui il portatore decide.
import { MATCH } from '../balance.ts';
import type { View } from './decision.ts';
import { len } from './pitch.ts';
import { cover, type MatchState, type MP } from './state.ts';

export const PRESS = [0.8, 1, 1.25];
const FAR = MATCH.pressRadius * MATCH.pressRadius * 1.001;

/** la difesa vista da chi attacca, la pressione sul portatore e il difensore più vicino (per il fallo di pressione) */
export function readPlay(st: MatchState): { view: View; pressure: number; closest: MP | undefined } {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const { bx, by, defX, defY, defAnt } = st;
  const cv = cover(def);
  defX.length = defY.length = defAnt.length = def.on.length;
  for (let i = 0; i < def.on.length; i++) {
    const m = def.on[i]!;
    defX[i] = 12 - m.x;
    defY[i] = 8 - m.y;
    defAnt[i] = (0.6 + 0.03 * m.p.attrs.anticipation) * cv;
  }
  let pressure = 0, line = 6, closest: MP | undefined, cd: number = MATCH.pressRadius;
  for (let i = 0; i < def.on.length; i++) {
    const m = def.on[i]!;
    if (m.pos !== 'GK') line = Math.max(line, defX[i]!);
    // lontano dal portatore: né pressione né "più vicino". Il margine tiene esatto il confronto sul bordo
    const qx = defX[i]! - bx, qy = defY[i]! - by;
    if (qx * qx + qy * qy > FAR) continue;
    const d = len(qx, qy);
    if (d < cd && m.pos !== 'GK') { cd = d; closest = m; }
    if (d < MATCH.pressRadius) pressure += (1 - d / MATCH.pressRadius) * (0.7 + 0.03 * m.p.attrs.workRate) * (m.energy / 100) * PRESS[def.tactic.pressing]! * cv * m.role.press;
  }
  const c = st.carrier;
  const sign = st.s === 0 ? 1 : -1;
  const view: View = {
    carrier: c, isGK: c.pos === 'GK', bx, by, mates: att.on, defs: def.on, defX, defY, defAnt, pressure,
    offsideLine: Math.max(line, bx), tactic: att.tactic, mentality: att.mentality,
    bonus: (st.s === 0 ? MATCH.homeBoost : 0) + (sign * st.momentum / 100) * MATCH.momentumK * (1 - c.p.attrs.composure / 25)
      - (100 - c.energy) * MATCH.energySkill + c.mod,
    chain: st.chain,
  };
  return { view, pressure, closest };
}
