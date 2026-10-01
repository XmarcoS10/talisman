// Pressione sul portatore (GUIDA §6.2 punto 2): i difensori entro `pressRadius` lo chiudono secondo Sacrificio,
// energia, istruzione di pressing e ruolo. Da qui nasce anche la "vista" su cui il portatore decide.
import { MATCH } from '../balance.ts';
import type { View } from './decision.ts';
import { len, segDist } from './pitch.ts';
import { cover, inTransition, type MatchState, type MP, type Team } from './state.ts';

export const PRESS = MATCH.pressLevels;
const FAR = MATCH.pressRadius * MATCH.pressRadius * 1.001;

/**
 * qualità medie di chi è in campo: palleggio (Passaggi, Tecnica, Primo controllo) e movimento senza palla (Movimento
 * senza palla, Primo controllo). Cambi ed espulsioni creano un nuovo `on`: lì si ricalcolano, non a ogni azione
 */
function quality(tm: Team) {
  if (tm.q?.on === tm.on) return tm.q;
  let pal = 0, att = 0;
  for (const m of tm.on) {
    const a = m.a;
    pal += (a.passing + a.technique + a.firstTouch) / 3;
    att += (a.offTheBall + a.firstTouch) / 2;
  }
  return (tm.q = { on: tm.on, pal: pal / tm.on.length, att: att / tm.on.length });
}

/** la difesa vista da chi attacca: posizioni, peso di intercetto (Anticipazione) e di marcatura */
function readDefence(st: MatchState, att: Team, def: Team, cv: number) {
  const { defX, defY, defAnt, defMark } = st;
  // qualità media di chi attacca senza palla (Movimento senza palla, Primo controllo): il metro di chi marca
  const qa = quality(att), attQ = qa.att;
  st.keepEdge = Math.max(0, qa.pal - quality(def).pal); // chi palleggia meglio fa girare palla
  // la difesa si riordina col tempo (fase di costruzione): il disordine lasciato dal giro palla svanisce
  st.dis *= Math.exp(-Math.max(0, st.t - st.disAt) / MATCH.disTau);
  st.disAt = st.t;
  const open = 1 - MATCH.disEffect * st.dis; // difesa aperta: marcatura, linee di passaggio e muro valgono meno
  defX.length = defY.length = defAnt.length = defMark.length = def.on.length;
  for (let i = 0; i < def.on.length; i++) {
    const m = def.on[i]!;
    defX[i] = 12 - m.x;
    defY[i] = 8 - m.y;
    defAnt[i] = (0.6 + 0.03 * m.a.anticipation) * cv * open;
    // chi marca bene sta addosso al ricevitore e fa da muro al tiro (motore-v2 §11: conta la qualità, non solo il corpo)
    defMark[i] = Math.max(0.3, 1 + MATCH.markSkill * ((m.a.marking + m.a.positioning) / 2 - attQ)) * cv * open;
  }
}

/** la difesa vista da chi attacca, la pressione sul portatore e il difensore più vicino (per il fallo di pressione) */
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
    if (d < MATCH.pressRadius) pressure += (1 - d / MATCH.pressRadius) * (0.7 + 0.03 * m.a.workRate) * (m.energy / 100) * PRESS[def.tactic.pressing]! * cv * cp * m.oPress; // ruolo senza palla
  }
  const c = st.carrier;
  const sign = st.s === 0 ? 1 : -1;
  const view: View = {
    carrier: c, isGK: c.pos === 'GK', bx, by, mates: att.on, defs: def.on, defX, defY, defAnt, defMark, pressure, block, keepEdge: st.keepEdge,
    offsideLine: Math.max(line, bx), tactic: att.tactic, mentality: att.mentality,
    wind: st.wx.cross,
    bonus: -st.wx.pass + (st.s === 0 ? MATCH.homeBoost : 0) + (sign * st.momentum / 100) * MATCH.momentumK * (1 - c.a.composure / 25)
      - (100 - c.energy) * MATCH.energySkill + c.mod,
    chain: st.chain,
    counter: trans ? Math.max(0, exposed - MATCH.counterFrom) : 0,
    fresh: trans,
  };
  return { view, pressure, closest, exposed: trans ? exposed : 0 };
}
