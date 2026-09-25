// Piazzati (Blocco 2b, intervento 8): corner sul primo palo, sul secondo o corto; punizione diretta dello
// specialista contro la barriera o calciata in area; rigore del rigorista. I battitori li sceglie l'allenatore
// (tactic.takers), altrimenti il migliore in campo per quel fondamentale.
import { MATCH } from '../balance.ts';
import type { Player } from '../model.ts';
import { claims, headerDuel } from './aerial.ts';
import { shoot } from './execute.ts';
import { inBox, sigmoid } from './pitch.ts';
import { best, gain, nearest, type MatchState, type MP, type Team } from './state.ts';
import { beat } from './trace.ts';

type Taker = 'corners' | 'freeKicks' | 'penalties';
const SKILL: Record<Taker, (p: Player) => number> = {
  corners: (p) => p.attrs.corners,
  freeKicks: (p) => p.attrs.freeKicks,
  penalties: (p) => 0.7 * p.attrs.penalties + 0.3 * p.attrs.composure,
};

/** chi batte: quello scelto in Tattica se è in campo, altrimenti il più bravo nel fondamentale */
export function taker(tm: Team, kind: Taker): MP {
  const id = tm.tactic.takers?.[kind];
  return tm.on.find((m) => m.p.id === id) ?? best(tm, (m) => SKILL[kind](m.p), (m) => m.pos !== 'GK');
}

/** palla alta in area da fermo: la battuta (Calci d'angolo o Calci piazzati), il portiere che può uscire, il duello */
function delivery(st: MatchState, att: Team, def: Team, from: MP, skill: number, base: number, xgMul: number, origin: 'corner' | 'fk') {
  if (st.rng.next() >= sigmoid(MATCH.spDelivery + MATCH.crossSkill * (skill - 11))) { gain(st, def, nearest(def, 1.2, 4, true)); return; }
  const gk = def.on.find((m) => m.pos === 'GK');
  if (claims(st, gk)) { beat(st, 'claim', gk!, undefined, true); gain(st, def, gk!); return; }
  headerDuel(st, att, def, from, 0, base, xgMul, origin);
}

export function corner(st: MatchState) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  att.stats.corners++;
  st.t += MATCH.restartTime;
  const tk = taker(att, 'corners');
  beat(st, 'corner', tk, undefined, true);
  const r = st.rng.next();
  if (r < MATCH.cornerShort) { // battuto corto: si riparte dalla bandierina
    st.carrier = nearest(att, 10.5, 1); st.bx = 10.5; st.by = 1; st.lastPass = null;
    return;
  }
  const near = r < MATCH.cornerShort + MATCH.cornerNear; // primo palo: spizzata, duello più facile, tiro peggiore
  delivery(st, att, def, tk, tk.p.attrs.corners, MATCH.duelBase + MATCH.cornerDuel + (near ? MATCH.nearPostDuel : 0), MATCH.cornerXg * (near ? MATCH.nearPostXg : 1), 'corner');
}

/** punizione dal limite: tira lo specialista; la barriera può respingere (a volte in corner) */
function directFreeKick(st: MatchState, att: Team, def: Team) {
  const tk = taker(att, 'freeKicks');
  st.lastPass = null;
  beat(st, 'freeKick', tk);
  if (st.rng.next() < MATCH.fkWall) {
    beat(st, 'wall', nearest(def, 12 - st.bx, 8 - st.by, true), tk);
    att.stats.shots++; tk.st.shots++; att.stats.xg += MATCH.fkXg;
    if (st.rng.next() < MATCH.fkWallCorner) corner(st);
    else gain(st, def, nearest(def, 12 - st.bx, 8 - st.by, true));
    return;
  }
  shoot(st, tk, MATCH.fkXg * (1 + 0.08 * (tk.p.attrs.freeKicks - 11)), 'fk', 'fk');
}

/** dopo un fallo subito: rigore se in area; dal limite punizione diretta; dalla trequarti palla in area */
export function afterFoul(st: MatchState, att: Team) {
  const def = st.teams[1 - st.s]!;
  if (inBox(st.bx, st.by)) {
    const tk = taker(att, 'penalties');
    beat(st, 'penalty', tk);
    shoot(st, tk, MATCH.penaltyXg, 'pen', 'pen');
  } else if (st.bx >= 8 && Math.abs(st.by - 4) < 2.5 && st.rng.next() < MATCH.fkShot) {
    directFreeKick(st, att, def);
  } else if (st.bx >= MATCH.fkCrossX && st.rng.next() < MATCH.fkCross) {
    const tk = taker(att, 'freeKicks');
    beat(st, 'freeKick', tk, undefined, true);
    delivery(st, att, def, tk, tk.p.attrs.freeKicks, MATCH.duelBase, 1, 'fk');
  }
}
