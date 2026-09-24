// Motore partita L2 a zone (GUIDA §6.2): una sequenza di decisioni del portatore di palla, con le posizioni dei 22
// che si muovono fra un'azione e l'altra. Lo stato sta in `state.ts`; qui c'è il ciclo: posizioni, pressione,
// scelta, esecuzione, tempo che passa (docs/03-match-engine.md).
import { MATCH } from '../balance.ts';
import type { MatchEvent, Player } from '../model.ts';
import type { Rng } from '../rng.ts';
import { choose, options } from './decision.ts';
import { drain, dueInjuries, foul, scheduleInjuries } from './events.ts';
import { act } from './execute.ts';
import { inBox } from './pitch.ts';
import { kickoff, settle } from './positioning.ts';
import { PRESS, readPlay } from './pressure.ts';
import { finish, rate } from './ratings.ts';
import { createState, minute, type MatchState, type MP, type PosFrame, type Shout, type SimOutput, type Team, type TeamSetup, type TraceStep } from './state.ts';
import { autoSubs, gameState, substitute } from './subs.ts';

export type { MP, PosFrame, PStats, Shout, SimOutput, Team, TeamSetup, TraceStep } from './state.ts';

/** partita eseguibile azione per azione: la usa la schermata Live (F6) */
export interface MatchRun {
  tick(): void;
  readonly done: boolean;
  minute(): number;
  readonly score: [number, number];
  readonly events: MatchEvent[];
  readonly teams: [Team, Team];
  readonly frames: TraceStep[];
  /** posizioni continue per il 2D: vuoto se la partita non traccia */
  readonly track: PosFrame[];
  /** cambio deciso dall'allenatore: chi esce, chi entra (stesso ruolo) */
  sub(side: 0 | 1, outId: number, inId: number): boolean;
  /** indicazione dalla panchina; false se è troppo presto per un'altra */
  shout(side: 0 | 1, kind: Shout): boolean;
  /** minuto da cui si può dare la prossima indicazione */
  nextShout(side: 0 | 1): number;
  rating(m: MP): number;
  /** gioca fino alla fine e restituisce il risultato */
  result(): SimOutput;
}

/**
 * chi risponde a un'indicazione: incoraggiare aiuta chi è giù di morale, chiedere di più spinge i professionisti
 * e pesa su chi regge male la pressione, calmare serve alle teste calde. Restituisce il moltiplicatore di MATCH.shoutBoost
 * (negativo = la prende male).
 */
export function shoutResponse(p: Player, kind: Shout): number {
  const c = p.personality;
  if (kind === 'encourage') return p.psych.morale < 60 ? 1 : 0.4;
  if (kind === 'demand') return c.pressureTolerance <= 8 ? -MATCH.shoutBackfire / MATCH.shoutBoost : c.professionalism >= 12 ? 1 : 0.5;
  return c.temperament >= 14 ? 1 : 0.3;
}

/** partita simulata tutta d'un fiato (mondo che avanza, sim-cli, test) */
export function simulate(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): SimOutput {
  return runMatch(rng, setups, trace).result();
}

/** un'azione del portatore: posizioni, pressione, fallo di pressione o scelta ed esecuzione, tempo che passa */
function step(st: MatchState) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  settle(st);
  const { view, pressure, closest } = readPlay(st);
  const t0 = st.t;
  const c = st.carrier;
  st.poss.acts++;
  // fallo "di pressione": il difensore più vicino ferma l'azione (in area si sta più attenti)
  const pressFoul = MATCH.pressFoul * pressure * PRESS[def.tactic.pressing]! * (inBox(st.bx, st.by) ? MATCH.foulInBox : 1)
    * (closest?.st.yellows ? MATCH.bookedCaution : 1);
  if (closest && st.rng.next() < pressFoul) foul(st, closest, c);
  else act(st, att, def, c, choose(st.rng, options(view), st.carrier, pressure));

  // tempo che passa: possesso, stanchezza (applicata a blocchi di un minuto), momentum
  const dt = st.t - t0;
  att.stats.possession += dt;
  st.pendingDrain[st.s] += dt;
  st.pendingDrain[st.s === 0 ? 1 : 0] += dt * PRESS[def.tactic.pressing]!; // chi pressa si stanca di più
  if (st.pendingDrain[0] + st.pendingDrain[1] >= 120) drain(st);
  st.momentum *= MATCH.momentumDecay;
}

function startHalf(st: MatchState, h: number) {
  st.half = h;
  st.t = 0;
  st.length = 45 * 60 + (h === 1 ? st.rng.int(0, 3) : st.rng.int(2, 6)) * 60;
  kickoff(st, h === 1 ? 0 : 1);
}

/** una azione del portatore, più quello che succede intorno (stato della partita, cambi, infortuni) */
function tick(st: MatchState) {
  if (st.output) return;
  step(st);
  const min = minute(st);
  gameState(st, min);
  autoSubs(st, min);
  dueInjuries(st, min);
  if (st.t >= st.length) { if (st.half === 1) startHalf(st, 2); else finish(st); }
}

export function runMatch(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): MatchRun {
  const st = createState(rng, setups, trace);
  scheduleInjuries(st);
  startHalf(st, 1);
  const { teams } = st;
  return {
    tick: () => tick(st),
    get done() { return st.output !== null; },
    minute: () => minute(st),
    score: st.score,
    events: st.events,
    teams,
    frames: trace ?? [],
    track: st.track,
    shout(side, kind) {
      if (minute(st) < st.shoutAt[side]!) return false;
      st.shoutAt[side] = minute(st) + MATCH.shoutEvery;
      for (const m of teams[side].on) m.mod += MATCH.shoutBoost * shoutResponse(m.p, kind);
      return true;
    },
    nextShout: (side) => st.shoutAt[side]!,
    sub(side, outId, inId) {
      const tm = teams[side];
      const out = tm.on.find((m) => m.p.id === outId);
      const inP = tm.bench.find((b) => b.id === inId);
      return out && inP ? substitute(st, tm, out, inP) : false;
    },
    rating(m) {
      const i = teams[0].played.includes(m) ? 0 : 1;
      return rate(m, st.score[i]! - st.score[1 - i]!, st.score[1 - i]!);
    },
    result() {
      while (!st.output) tick(st);
      return st.output;
    },
  };
}
