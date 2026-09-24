// Esecuzione dell'opzione scelta (GUIDA §6.2 punto 5): passaggio, dribbling, cross e tiro, con le conseguenze
// (intercetti, contrasti, fuorigioco, gol, parate, respinte, corner) e il fotogramma del registro.
import { MATCH } from '../balance.ts';
import { clamp } from '../util.ts';
import type { Option } from './decision.ts';
import { foul } from './events.ts';
import { inBox, len, segDist, shotGeometry } from './pitch.ts';
import { kickoff } from './positioning.ts';
import { PRESS } from './pressure.ts';
import { corner } from './setpieces.ts';
import { best, ev, gain, gx, gy, minute, nearest, type MatchState, type MP, type Team, type TraceStep } from './state.ts';

const TEMPO = [1.2, 1, 0.85];
type ShotKind = 'open' | 'header' | 'pen' | 'fk';

/** chi va a prendere un cross: testa, coraggio, e la punta di peso ha la precedenza */
const aerialScore = (m: MP) => m.p.attrs.heading + m.p.attrs.bravery / 2 + m.role.aerial;

function shotSkill(st: MatchState, sh: MP, kind: ShotKind) {
  const a = sh.p.attrs;
  if (kind === 'pen') return a.penalties;
  if (kind === 'fk') return a.freeKicks;
  if (kind === 'header') return a.heading;
  return shotGeometry(st.bx, st.by).dist > 18 ? a.longShots : a.finishing;
}

function scoreGoal(st: MatchState, sh: MP, xg: number, kind: ShotKind, assist: MP | null, sign: number) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  att.stats.onTarget++; sh.st.onTarget++; sh.st.goals++;
  st.score[st.s]++;
  if (assist) assist.st.assists++;
  for (const m of def.on) m.st.conceded++;
  ev(st, kind === 'pen' ? 'penGoal' : 'goal', st.s, sh, { xg, ...(assist ? { assistId: assist.p.id } : {}) });
  st.momentum = clamp(st.momentum + sign * MATCH.momentumGoal, -100, 100);
  st.t += MATCH.goalTime;
  kickoff(st, (1 - st.s) as 0 | 1);
}

/** tiro non a segno: parato (a volte in corner), respinto da un difensore (a volte in corner) o fuori */
function missed(st: MatchState, sh: MP, xg: number, kind: ShotKind, gk: MP | undefined) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const { rng } = st;
  if (kind === 'pen') ev(st, 'penMiss', st.s, sh, { xg });
  else if (xg >= 0.3) ev(st, 'chance', st.s, sh, { xg });
  st.t += MATCH.restartTime;
  if (rng.next() < MATCH.onTargetBase + MATCH.onTargetXg * xg) {
    att.stats.onTarget++; sh.st.onTarget++;
    if (gk) gk.st.saves++;
    if (rng.next() < MATCH.cornerAfterSave) corner(st);
    else gain(st, def, gk ?? nearest(def, 0.6, 4));
  } else if (kind !== 'pen' && rng.next() < MATCH.blockedShare) {
    if (rng.next() < MATCH.cornerAfterBlock) corner(st);
    else gain(st, def, nearest(def, 12 - st.bx, 8 - st.by, true));
  } else gain(st, def, gk ?? nearest(def, 0.6, 4));
}

export function shoot(st: MatchState, sh: MP, xg: number, kind: ShotKind) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const gk = def.on.find((m) => m.pos === 'GK');
  att.stats.shots++; sh.st.shots++; att.stats.xg += xg;
  const skill = shotSkill(st, sh, kind);
  const gkSkill = gk ? (gk.p.attrs.reflexes + gk.p.attrs.oneOnOnes + gk.p.attrs.handling) / 3 : 3;
  const pGoal = clamp(xg * (1 + MATCH.shotSkill * (skill - 11)) * (1 - MATCH.gkSkill * (gkSkill - 11)), 0.005, 0.97);
  const assist = st.lastPass && st.lastPass !== sh && kind !== 'pen' ? st.lastPass : null;
  if (assist) assist.st.keyPasses++;
  const sign = st.s === 0 ? 1 : -1;
  st.momentum = clamp(st.momentum + sign * MATCH.momentumShot, -100, 100);
  if (st.rng.next() < pGoal) scoreGoal(st, sh, xg, kind, assist, sign);
  else missed(st, sh, xg, kind, gk);
}

/** fotogramma per il replay 2D: tutti in campo in coordinate globali (la squadra 1 gioca a specchio) */
function frame(st: MatchState, o: Option): TraceStep {
  const ids: number[] = [], px: number[] = [], py: number[] = [];
  for (const tm of st.teams)
    for (const m of tm.on) {
      ids.push(m.p.id);
      px.push(tm.side === 0 ? m.x : 12 - m.x);
      py.push(tm.side === 0 ? m.y : 8 - m.y);
    }
  const f: TraceStep = {
    half: st.half, t: st.t, min: minute(st), side: st.s, kind: o.kind, bx: gx(st, st.bx), by: gy(st, st.by), pressure: 0,
    mom: Math.round(st.momentum), from: st.carrier.p.id, ids, px, py, n0: st.teams[0].on.length, score: [st.score[0], st.score[1]],
    ...(o.kind === 'pass' ? { tx: gx(st, o.tx), ty: gy(st, o.ty), p: o.p, to: (o.to as MP).p.id }
      : o.kind === 'dribble' ? { tx: gx(st, o.tx), ty: gy(st, o.ty), p: o.p }
      : o.kind === 'shot' ? { xg: o.xg } : { p: o.p }),
  };
  st.trace!.push(f);
  return f;
}

function doPass(st: MatchState, att: Team, def: Team, c: MP, o: Extract<Option, { kind: 'pass' }>, f: TraceStep | null) {
  const { rng } = st;
  att.stats.passes++; c.st.passes++;
  if (o.off > 0 && rng.next() < o.off) {
    att.stats.offsides++;
    st.t += MATCH.restartTime;
    gain(st, def, nearest(def, 12 - o.tx, 8 - o.ty));
  } else if (rng.next() < o.p) {
    att.stats.passesOk++; c.st.passesOk++;
    if (f) f.ok = true;
    st.lastPass = c;
    st.chain++;
    st.carrier = o.to as MP;
    st.bx = o.tx; st.by = o.ty;
    st.t += MATCH.passTime * TEMPO[att.tactic.tempo]! + MATCH.passTimePerZone * len(o.tx - c.x, o.ty - c.y);
  } else {
    // intercetto: il difensore più vicino alla linea di passaggio
    let w = def.on[0]!, bd = Infinity;
    for (let i = 0; i < def.on.length; i++) {
      const d = segDist(st.defX[i]!, st.defY[i]!, st.bx, st.by, o.tx, o.ty);
      if (d < bd) { bd = d; w = def.on[i]!; }
    }
    w.st.tackles++; def.stats.tackles++;
    st.t += MATCH.passTime + MATCH.turnoverTime;
    gain(st, def, w);
  }
}

function doDribble(st: MatchState, def: Team, c: MP, o: Extract<Option, { kind: 'dribble' }>, f: TraceStep | null) {
  const tk = o.tackler as MP | undefined;
  const foulP = MATCH.foulBase * (1 + MATCH.foulAggression * (tk ? tk.p.attrs.aggression - 11 : 0)) * PRESS[def.tactic.pressing]!
    * (inBox(st.bx, st.by) ? MATCH.foulInBox : 1) * (tk?.st.yellows ? MATCH.bookedCaution : 1);
  if (tk && st.rng.next() < foulP) foul(st, tk, c);
  else if (st.rng.next() < o.p) {
    c.st.dribbles++;
    if (f) f.ok = true;
    st.bx = o.tx; st.by = o.ty;
    st.lastPass = null;
    st.t += MATCH.dribbleTime;
  } else {
    const w = tk ?? nearest(def, 12 - st.bx, 8 - st.by);
    w.st.tackles++; def.stats.tackles++; c.st.duelsLost++;
    st.t += MATCH.turnoverTime + 1;
    gain(st, def, w);
  }
}

function doCross(st: MatchState, att: Team, def: Team, c: MP, o: Extract<Option, { kind: 'cross' }>, f: TraceStep | null) {
  att.stats.passes++; c.st.passes++;
  st.t += MATCH.passTime;
  if (st.rng.next() < o.p) {
    att.stats.passesOk++; c.st.passesOk++;
    if (f) f.ok = true;
    const inBoxMates = att.on.filter((m) => m !== c && m.pos !== 'GK' && m.x >= 9.5);
    const header = inBoxMates.length
      ? inBoxMates.reduce((a, b) => (aerialScore(b) > aerialScore(a) ? b : a))
      : best(att, (m) => m.p.attrs.heading, (m) => m !== c && m.pos !== 'GK');
    const dh = best(def, (m) => m.p.attrs.heading, (m) => m.pos !== 'GK');
    st.lastPass = c;
    st.bx = 10.8; st.by = 4;
    shoot(st, header, MATCH.headerXg * (1 + 0.06 * (header.p.attrs.heading - 11)) * (1 - 0.04 * (dh.p.attrs.heading - 11)), 'header');
  } else if (st.rng.next() < MATCH.cornerAfterClear) corner(st);
  else gain(st, def, nearest(def, 1.5, 4, true));
}

/** esegue l'opzione scelta dal portatore */
export function act(st: MatchState, att: Team, def: Team, c: MP, o: Option) {
  const f = st.trace ? frame(st, o) : null;
  if (o.kind === 'pass') doPass(st, att, def, c, o, f);
  else if (o.kind === 'dribble') doDribble(st, def, c, o, f);
  else if (o.kind === 'cross') doCross(st, att, def, c, o, f);
  else {
    const side = st.s; // dopo un gol kickoff() passa la palla all'altra squadra: l'esito va letto su chi ha tirato
    const before = st.score[side];
    shoot(st, c, o.xg, 'open');
    if (f) f.ok = st.score[side] > before;
  }
}
