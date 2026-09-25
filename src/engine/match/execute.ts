// Esecuzione dell'opzione scelta (GUIDA §6.2 punto 5): passaggio, dribbling, cross e tiro, con le conseguenze
// (intercetti, contrasti, fuorigioco, gol, parate, respinte, corner) e il fotogramma del registro.
import { MATCH } from '../balance.ts';
import { clamp } from '../util.ts';
import type { Option } from './decision.ts';
import { foul } from './events.ts';
import { inBox, len, segDist, shotGeometry } from './pitch.ts';
import { kickoff } from './positioning.ts';
import { PRESS } from './pressure.ts';
import { cross } from './aerial.ts';
import { afterSave, keeperSkill, sweeps } from './keeper.ts';
import { corner } from './setpieces.ts';
import { beat, frame } from './trace.ts';
import { best, ev, gain, gx, gy, minute, nearest, type MatchState, type MP, type Origin, type Team, type TraceStep } from './state.ts';

const TEMPO = [1.2, 1, 0.85];
type ShotKind = 'open' | 'header' | 'pen' | 'fk';

function shotSkill(st: MatchState, sh: MP, kind: ShotKind) {
  const a = sh.p.attrs;
  if (kind === 'pen') return a.penalties;
  if (kind === 'fk') return a.freeKicks;
  if (kind === 'header') return a.heading;
  return shotGeometry(st.bx, st.by).dist > 18 ? a.longShots : a.finishing;
}

/** contropiede: il possesso è nato nella propria metà campo da meno di 15 s, con al massimo 4 azioni */
const counter = (st: MatchState) => st.poss.half === st.half && st.poss.x < 6 && st.t - st.poss.t <= 15 && st.poss.acts <= 4;

function scoreGoal(st: MatchState, sh: MP, xg: number, kind: ShotKind, assist: MP | null, sign: number, origin: Origin) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  att.log.goals[origin]++;
  beat(st, 'goal', sh);
  if ((origin === 'open' || origin === 'cross') && counter(st)) att.log.counterGoals++;
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
    afterSave(st, att, def, gk, xg);
  } else if (kind !== 'pen' && rng.next() < MATCH.blockedShare) {
    beat(st, 'block', nearest(def, 12 - st.bx, 8 - st.by, true), sh);
    if (rng.next() < MATCH.cornerAfterBlock) corner(st);
    else gain(st, def, nearest(def, 12 - st.bx, 8 - st.by, true));
  } else { beat(st, 'miss', sh); gain(st, def, gk ?? nearest(def, 0.6, 4)); }
}

export function shoot(st: MatchState, sh: MP, xg: number, kind: ShotKind, origin: Origin) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const gk = def.on.find((m) => m.pos === 'GK');
  att.stats.shots++; sh.st.shots++; att.stats.xg += xg;
  beat(st, 'shot', sh, undefined, kind === 'header', xg);
  if (kind === 'header') att.log.headers++;
  const skill = shotSkill(st, sh, kind);
  const gkSkill = keeperSkill(gk, kind === 'pen', xg);
  const pGoal = clamp(xg * (1 + MATCH.shotSkill * (skill - 11)) * (1 - MATCH.gkSkill * (gkSkill - 11)), 0.005, 0.97);
  const assist = st.lastPass && st.lastPass !== sh && kind !== 'pen' ? st.lastPass : null;
  if (assist) assist.st.keyPasses++;
  const sign = st.s === 0 ? 1 : -1;
  st.momentum = clamp(st.momentum + sign * MATCH.momentumShot, -100, 100);
  if (st.rng.next() < pGoal) scoreGoal(st, sh, xg, kind, assist, sign, origin);
  else missed(st, sh, xg, kind, gk);
}

function doPass(st: MatchState, att: Team, def: Team, c: MP, o: Extract<Option, { kind: 'pass' }>, f: TraceStep | null) {
  const { rng } = st;
  att.stats.passes++; c.st.passes++;
  if (o.deep) att.log.deep++;
  if (o.long) att.log.longKicks++;
  // palla in profondità: il portiere può uscire e prenderla prima
  const keeper = o.deep ? sweeps(st, def) : null;
  if (keeper) { def.log.sweeps++; beat(st, 'sweep', keeper); st.t += MATCH.passTime; gain(st, def, keeper); return; }
  const late = minute(st) >= 70 ? att.log.late : null;
  if (late) late[0]++;
  if (o.off > 0 && rng.next() < o.off) {
    att.stats.offsides++;
    beat(st, 'offside', o.to as MP);
    st.t += MATCH.restartTime;
    gain(st, def, nearest(def, 12 - o.tx, 8 - o.ty));
  } else if (rng.next() < o.p) {
    att.stats.passesOk++; c.st.passesOk++;
    if (o.deep) att.log.deepOk++;
    if (late) late[1]++;
    if (f) f.ok = true;
    st.lastPass = c;
    st.chain++;
    st.carrier = o.to as MP;
    st.bx = o.tx; st.by = o.ty;
    const quick = st.counterNow ? MATCH.transTempo : 1; // la ripartenza contro una difesa scoperta non si ferma a pensare
    st.t += (MATCH.passTime * TEMPO[att.tactic.tempo]! + MATCH.passTimePerZone * len(o.tx - c.x, o.ty - c.y)) * quick;
  } else {
    // intercetto: il difensore più vicino alla linea di passaggio
    let w = def.on[0]!, bd = Infinity;
    for (let i = 0; i < def.on.length; i++) {
      const d = segDist(st.defX[i]!, st.defY[i]!, st.bx, st.by, o.tx, o.ty);
      if (d < bd) { bd = d; w = def.on[i]!; }
    }
    w.st.tackles++; def.stats.tackles++;
    def.log.intercepts++; def.log.regains++; def.log.regainX += w.x;
    beat(st, 'intercept', w, c);
    st.t += MATCH.passTime + MATCH.turnoverTime;
    gain(st, def, w);
  }
}

function doDribble(st: MatchState, def: Team, c: MP, o: Extract<Option, { kind: 'dribble' }>, f: TraceStep | null) {
  const tk = o.tackler as MP | undefined;
  st.teams[st.s].log.dribbles++;
  const foulP = MATCH.foulBase * (1 + MATCH.foulAggression * (tk ? tk.p.attrs.aggression - 11 : 0)) * PRESS[def.tactic.pressing]!
    * (inBox(st.bx, st.by) ? MATCH.foulInBox : 1) * (tk?.st.yellows ? MATCH.bookedCaution : 1);
  if (tk && st.rng.next() < foulP) foul(st, tk, c);
  else if (st.rng.next() < o.p) {
    c.st.dribbles++;
    st.teams[st.s].log.dribblesOk++;
    if (tk) beat(st, 'beat', c, tk);
    if (f) f.ok = true;
    st.bx = o.tx; st.by = o.ty;
    st.lastPass = null;
    st.t += MATCH.dribbleTime;
  } else {
    const w = tk ?? nearest(def, 12 - st.bx, 8 - st.by);
    w.st.tackles++; def.stats.tackles++; c.st.duelsLost++;
    def.log.tackles++; def.log.regains++; def.log.regainX += w.x;
    beat(st, 'tackle', w, c);
    st.t += MATCH.turnoverTime + 1;
    gain(st, def, w);
  }
}

function doCross(st: MatchState, att: Team, def: Team, c: MP, o: Extract<Option, { kind: 'cross' }>, f: TraceStep | null) {
  att.stats.passes++; c.st.passes++;
  att.log.crosses++;
  st.t += MATCH.passTime;
  if (!cross(st, att, def, c, o.p, o.low)) return;
  att.stats.passesOk++; c.st.passesOk++;
  att.log.crossesOk++;
  if (f) f.ok = true;
}

/** esegue l'opzione scelta dal portatore */
export function act(st: MatchState, att: Team, def: Team, c: MP, o: Option) {
  const f = st.trace ? frame(st, o.kind, o.kind === 'pass' ? { tx: gx(st, o.tx), ty: gy(st, o.ty), p: o.p, to: (o.to as MP).p.id, ...(o.long ? { high: true } : {}) }
    : o.kind === 'dribble' ? { tx: gx(st, o.tx), ty: gy(st, o.ty), p: o.p }
    : o.kind === 'shot' ? { xg: o.xg } : { p: o.p, ...(o.low ? {} : { high: true }) }) : null;
  if (o.kind === 'pass' && o.long) beat(st, 'longKick', c, o.to as MP, true);
  if (o.kind === 'pass') doPass(st, att, def, c, o, f);
  else if (o.kind === 'dribble') doDribble(st, def, c, o, f);
  else if (o.kind === 'cross') doCross(st, att, def, c, o, f);
  else {
    const side = st.s; // dopo un gol kickoff() passa la palla all'altra squadra: l'esito va letto su chi ha tirato
    const before = st.score[side];
    shoot(st, c, o.xg, 'open', 'open');
    if (f) f.ok = st.score[side] > before;
  }
}
