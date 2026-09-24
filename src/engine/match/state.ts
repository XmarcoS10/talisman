// Stato esplicito di una partita (Blocco 2a): tutto quello che il motore ricorda fra un'azione e l'altra sta qui,
// e i moduli (posizionamento, pressione, esecuzione, eventi, piazzati, cambi, voti) lo ricevono come parametro.
import { FLAGS, MATCH } from '../balance.ts';
import type { Club, MatchEvent, MatchEventType, MatchResult, Player, Position, SideStats, Tactic } from '../model.ts';
import type { Rng } from '../rng.ts';
import type { OnPitch } from './decision.ts';
import { len } from './pitch.ts';
import { ROLES, type RoleId } from './roles.ts';
import type { Slot } from './tactics.ts';

export interface PStats {
  passes: number; passesOk: number; keyPasses: number; shots: number; onTarget: number; goals: number; assists: number;
  tackles: number; dribbles: number; duelsLost: number; saves: number; fouls: number; yellows: number; red: boolean; injured: boolean; conceded: number;
  injuryCtx: 'contact' | 'muscle' | 'relapse';
  from: number; // minuti in campo: da … a
  to: number;
}

export interface MP extends OnPitch {
  pos: Position;
  hx: number; // posizione base nel modulo
  hy: number;
  roleId: RoleId;
  marked: number; // contrassegno interno della marcatura
  tx: number; // posizione ideale del momento (verso cui corre)
  ty: number;
  jx: number; // smarcamento casuale dell'azione in corso (estratto una volta per azione)
  jy: number;
  on: boolean;
  st: PStats;
}

export interface TeamSetup {
  club: Club;
  tactic: Tactic;
  mentality: number;
  xi: { player: Player; slot: Slot; role: RoleId }[];
  bench: Player[];
  familiarity: number; // 0-100, col modulo in uso
  injuryP: (p: Player) => { muscle: number; relapse: number }; // rischio personale di infortunio in partita
  auto?: boolean; // false: cambi e mentalità li decide l'utente dal vivo (schermata Live)
}

export interface Team {
  side: 0 | 1;
  tactic: Tactic;
  baseMentality: number; // quella decisa dall'allenatore
  mentality: number; // quella in campo, adattata al punteggio
  on: MP[];
  bench: Player[];
  played: MP[];
  subs: number;
  stats: SideStats;
  fam: number;
  auto: boolean; // false = i cambi li fa l'utente dalla panchina (F6)
}

/**
 * registro delle azioni: diagnostica del bilanciamento e sorgente del replay 2D (F6).
 * Posizioni e palla sono in coordinate di campo "globali": x 0-12 verso la porta della squadra 1, y 0-8.
 */
export interface TraceStep {
  half: number;
  t: number; // secondi dall'inizio del tempo
  min: number;
  side: 0 | 1; // chi ha la palla
  kind: 'pass' | 'dribble' | 'shot' | 'cross';
  bx: number;
  by: number;
  tx?: number;
  ty?: number;
  p?: number;
  xg?: number;
  pressure: number;
  mom: number; // momentum (+ casa, − ospiti)
  from: number; // id del portatore
  to?: number; // id del destinatario (passaggio)
  ok?: boolean; // azione riuscita
  ids: number[]; // giocatori in campo, prima quelli della squadra 0
  px: number[];
  py: number[];
  n0: number; // quanti dei primi `ids` sono della squadra 0
  score: [number, number];
}

/**
 * fotogramma di posizione: il campo ogni `MATCH.frameTick` secondi di gioco (F6.2).
 * Coordinate globali come TraceStep. È la sorgente del 2D: fra un fotogramma e l'altro non succede nulla.
 */
export interface PosFrame {
  at: number; // secondi di riproduzione cumulati (il gioco fermo è compresso)
  min: number;
  half: number;
  ids: number[]; // condiviso finché la formazione non cambia
  n0: number;
  xy: Float32Array; // x e y alternate, nell'ordine di `ids`
  bx: number;
  by: number;
  carrier: number; // id di chi ha la palla, 0 se è in viaggio
  to: number; // id di chi la sta aspettando, 0 se nessuno
  sc0: number; // punteggio in questo momento
  sc1: number;
  step: number; // indice del TraceStep in corso, per il racconto
  dead: boolean; // gioco fermo
}

export interface SimOutput {
  result: MatchResult;
  played: [MP[], MP[]]; // tutti quelli scesi in campo, con statistiche
}

export type Shout = 'encourage' | 'demand' | 'calm';

/** infortunio "senza contatto" programmato prima del fischio d'inizio (o ricaduta di chi è rientrato da poco) */
export interface Scheduled { who: MP; team: Team; at: number; ctx: 'muscle' | 'relapse' }

export interface MatchState {
  rng: Rng;
  setups: [TeamSetup, TeamSetup];
  teams: [Team, Team];
  events: MatchEvent[];
  score: [number, number];
  s: 0 | 1; // squadra in possesso
  bx: number; // palla, nel sistema di chi attacca
  by: number;
  carrier: MP;
  lastPass: MP | null;
  chain: number; // passaggi consecutivi nel possesso attuale
  momentum: number; // + casa, − ospiti
  half: number;
  t: number;
  length: number; // durata del tempo in corso, recupero compreso
  scheduled: Scheduled[];
  // posizionamento
  lastPlace: number;
  markStamp: number;
  holder: MP | null; // chi tiene la palla adesso (nessuno mentre è in viaggio)
  meet: MP | null; // chi la sta aspettando
  snap: boolean; // il portatore sta sulla palla; nei passi intermedi ci corre invece di comparirci
  // registro e traccia densa (F6.2): solo per la partita guardata
  trace: TraceStep[] | undefined;
  track: PosFrame[];
  playAt: number; // secondi di riproduzione già emessi
  lastBall: { x: number; y: number }; // palla globale a inizio intervallo
  lastStep: number; // ultima azione già raccontata: un intervallo a vuoto non la ripercorre
  ids0: number[];
  idsDirty: boolean;
  // la difesa vista da chi attacca: tre liste riusate a ogni azione invece di crearne tre nuove (≈320.000 a stagione)
  defX: number[];
  defY: number[];
  defAnt: number[];
  pendingDrain: [number, number];
  subIdx: number;
  shoutAt: [number, number];
  output: SimOutput | null;
}

export const newPStats = (from: number): PStats => ({ passes: 0, passesOk: 0, keyPasses: 0, shots: 0, onTarget: 0, goals: 0, assists: 0, tackles: 0, dribbles: 0, duelsLost: 0, saves: 0, fouls: 0, yellows: 0, red: false, injured: false, conceded: 0, injuryCtx: 'contact', from, to: 90 });
const newSide = (): SideStats => ({ possession: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0 });

/** logit personale del giorno, centrato sul giocatore "normale" (morale 65, condizione ≥ 80, modulo conosciuto) */
const dayMod = (p: Player, fam: number) =>
  (FLAGS.psychology ? MATCH.moraleK * (p.psych.morale - 65) : 0) - MATCH.sharpK * Math.max(0, 80 - p.condition.sharpness)
  - MATCH.famK * Math.max(0, 1 - fam / 90);
export const mp = (player: Player, slot: Slot, role: RoleId, fam: number, from = 0): MP =>
  ({ p: player, pos: slot.pos, hx: slot.x, hy: slot.y, roleId: role, role: ROLES[role], marked: 0, x: slot.x, y: slot.y, tx: slot.x, ty: slot.y,
    jx: 0, jy: 0, energy: player.condition.fitness, mod: dayMod(player, fam), on: true, st: newPStats(from) });

export function createState(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): MatchState {
  const teams = setups.map((s, i) => {
    const on = s.xi.map((e) => mp(e.player, e.slot, e.role, s.familiarity));
    return { side: i as 0 | 1, tactic: s.tactic, baseMentality: s.mentality, mentality: s.mentality, on, bench: [...s.bench], played: [...on], subs: MATCH.maxSubs, stats: newSide(), fam: s.familiarity, auto: s.auto !== false };
  }) as [Team, Team];
  return {
    rng, setups, teams, events: [], score: [0, 0], s: 0, bx: 6, by: 4, carrier: teams[0].on[0]!, lastPass: null, chain: 0, momentum: 0,
    half: 1, t: 0, length: 0, scheduled: [], lastPlace: 0, markStamp: 0, holder: null, meet: null, snap: true,
    trace, track: [], playAt: 0, lastBall: { x: 6, y: 4 }, lastStep: -1, ids0: [], idsDirty: true,
    defX: [], defY: [], defAnt: [], pendingDrain: [0, 0], subIdx: 0, shoutAt: [0, 0], output: null,
  };
}

export const minute = (st: MatchState) => Math.min(Math.floor(st.t / 60) + 1, 45) + (st.half - 1) * 45;
export const clock = (st: MatchState) => st.half * 10000 + st.t;
export const ev = (st: MatchState, type: MatchEventType, side: 0 | 1, player: MP, extra: Partial<MatchEvent> = {}) =>
  st.events.push({ min: minute(st), side, type, playerId: player.p.id, ...extra });
// dal sistema di chi attacca alle coordinate globali (la squadra 1 gioca a specchio)
export const gx = (st: MatchState, x: number) => (st.s === 0 ? x : 12 - x);
export const gy = (st: MatchState, y: number) => (st.s === 0 ? y : 8 - y);
/** impegno difensivo: con mentalità offensiva si rientra meno e si pressa peggio */
export const cover = (tm: Team) => 1 - MATCH.mentalityCover * (tm.mentality - 3);

export function nearest(tm: Team, x: number, y: number, skipGK = false): MP {
  let best: MP = tm.on[0]!, bd = Infinity;
  for (const m of tm.on) {
    if (skipGK && m.pos === 'GK') continue;
    const d = len(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

export const best = (tm: Team, f: (m: MP) => number, filter: (m: MP) => boolean = () => true) =>
  tm.on.filter(filter).reduce((a, b) => (f(b) > f(a) ? b : a), tm.on[0]!);

/** la squadra `tm` prende palla col giocatore `m`, dove si trova */
export function gain(st: MatchState, tm: Team, m: MP) {
  st.s = tm.side;
  st.carrier = m;
  st.bx = m.x;
  st.by = m.y;
  st.lastPass = null;
  st.chain = 0;
}
