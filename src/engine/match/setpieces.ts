// Piazzati: corner, rigore e punizione dopo un fallo.
import { MATCH } from '../balance.ts';
import { shoot } from './execute.ts';
import { inBox } from './pitch.ts';
import { best, gain, nearest, type MatchState, type Team } from './state.ts';

export function corner(st: MatchState) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  att.stats.corners++;
  const taker = best(att, (m) => m.p.attrs.corners, (m) => m.pos !== 'GK');
  const r = st.rng.next();
  if (r < MATCH.cornerHeader) {
    const header = best(att, (m) => m.p.attrs.heading + m.p.attrs.strength / 2, (m) => m !== taker && m.pos !== 'GK');
    st.lastPass = taker;
    st.bx = 10.9; st.by = 4;
    shoot(st, header, MATCH.cornerHeaderXg * (1 + 0.06 * (header.p.attrs.heading - 11)), 'header', 'corner');
  } else if (r < MATCH.cornerHeader + 0.2) {
    st.carrier = nearest(att, 10.5, 1); st.bx = 10.5; st.by = 1; st.lastPass = null; // battuto corto
  } else gain(st, def, nearest(def, 1.5, 4, true));
  st.t += MATCH.restartTime;
}

/** dopo un fallo subito: rigore se in area, a volte punizione diretta dal limite */
export function afterFoul(st: MatchState, att: Team) {
  if (inBox(st.bx, st.by)) {
    const taker = best(att, (m) => m.p.attrs.penalties);
    shoot(st, taker, MATCH.penaltyXg, 'pen', 'pen');
  } else if (st.bx >= 8 && Math.abs(st.by - 4) < 2.5 && st.rng.next() < MATCH.fkShot) {
    st.lastPass = null;
    const taker = best(att, (m) => m.p.attrs.freeKicks);
    shoot(st, taker, MATCH.fkXg * (1 + 0.08 * (taker.p.attrs.freeKicks - 11)), 'fk', 'fk');
  }
}
