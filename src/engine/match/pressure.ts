// Pressione sul portatore (GUIDA §6.2 punto 2): i difensori entro `pressRadius` lo chiudono secondo Sacrificio,
// energia, istruzione di pressing e ruolo. Da qui nasce anche la "vista" su cui il portatore decide.
import { MATCH } from '../balance.ts';
import type { View } from './decision.ts';
import { len, segDist } from './pitch.ts';
import { cover, inTransition, type MatchState, type MP, type Team } from './state.ts';

export const PRESS = MATCH.pressLevels;
const FAR = MATCH.pressRadius * MATCH.pressRadius * 1.001;

/** la difesa vista da chi attacca, la pressione sul portatore e il difensore più vicino (per il fallo di pressione) */
/** la difesa vista da chi attacca: posizioni, peso di intercetto (Anticipazione) e di marcatura */
function readDefence(st: MatchState, att: Team, def: Team, cv: number) {
  const { defX, defY, defAnt, defMark } = st;
  // qualità media di chi attacca senza palla (Movimento senza palla, Primo controllo): il metro di chi marca
  let attQ = 0;
  for (const a of att.on) attQ += (a.p.attrs.offTheBall + a.p.attrs.firstTouch) / 2;
  attQ /= att.on.length;
  defX.length = defY.length = defAnt.length = defMark.length = def.on.length;
  for (let i = 0; i < def.on.length; i++) {
    const m = def.on[i]!;
    defX[i] = 12 - m.x;
    defY[i] = 8 - m.y;
    defAnt[i] = (0.6 + 0.03 * m.p.attrs.anticipation) * cv;
    // chi marca bene sta addosso al ricevitore e fa da muro al tiro (motore-v2 §11: conta la qualità, non solo il corpo)
    defMark[i] = Math.max(0.3, 1 + MATCH.markSkill * ((m.p.attrs.marking + m.p.attrs.positioning) / 2 - attQ)) * cv;
  }
}

export function readPlay(st: MatchState): { view: View; pressure: number; closest: MP | undefined; exposed: number } {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const { bx, by, defX, defY, defAnt, defMark } = st;
  const cv = cover(def);
  readDefence(st, att, def, cv);
  // nei secondi dopo aver perso palla chi difende ripiega o aggredisce secondo l'istruzione
  const trans = inTransition(st);
  const cp = trans ? [MATCH.cpRetreat, 1, MATCH.cpPress][def.tactic.counterPress ?? 1]! : 1;
  let pressure = 0, line = 6, exposed = 0, closest: MP | undefined, cd: number = MATCH.pressRadius, block = 0;
  const shooting = bx >= MATCH.shotMinX;
  for (let i = 0; i < def.on.length; i++) {
    const m = def.on[i]!;
    if (m.pos !== 'GK') line = Math.max(line, defX[i]!);
    if (m.pos !== 'GK' && defX[i]! < bx) exposed++; // rimasto oltre la palla: non difende la porta
    // corpi fra la palla e il centro della porta: tolgono xG al tiro e lo murano
    if (shooting && m.pos !== 'GK' && defX[i]! > bx) {
      const d = segDist(defX[i]!, defY[i]!, bx, by, 12, 4);
      if (d < MATCH.blockRadius) block += (1 - d / MATCH.blockRadius) * defMark[i]!;
    }
    // lontano dal portatore: né pressione né "più vicino". Il margine tiene esatto il confronto sul bordo
    const qx = defX[i]! - bx, qy = defY[i]! - by;
    if (qx * qx + qy * qy > FAR) continue;
    const d = len(qx, qy);
    if (d < cd && m.pos !== 'GK') { cd = d; closest = m; }
    if (d < MATCH.pressRadius) pressure += (1 - d / MATCH.pressRadius) * (0.7 + 0.03 * m.p.attrs.workRate) * (m.energy / 100) * PRESS[def.tactic.pressing]! * cv * cp * m.role.press;
  }
  const c = st.carrier;
  const sign = st.s === 0 ? 1 : -1;
  const view: View = {
    carrier: c, isGK: c.pos === 'GK', bx, by, mates: att.on, defs: def.on, defX, defY, defAnt, defMark, pressure, block,
    offsideLine: Math.max(line, bx), tactic: att.tactic, mentality: att.mentality,
    wind: st.wx.cross,
    bonus: -st.wx.pass + (st.s === 0 ? MATCH.homeBoost : 0) + (sign * st.momentum / 100) * MATCH.momentumK * (1 - c.p.attrs.composure / 25)
      - (100 - c.energy) * MATCH.energySkill + c.mod,
    chain: st.chain,
    counter: trans ? Math.max(0, exposed - MATCH.counterFrom) : 0,
  };
  return { view, pressure, closest, exposed: trans ? exposed : 0 };
}
