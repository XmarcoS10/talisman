// Stato esplicito di una partita (Blocco 2a): tutto quello che il motore ricorda fra un'azione e l'altra sta qui,
// e i moduli (posizionamento, pressione, esecuzione, eventi, piazzati, cambi, voti) lo ricevono come parametro.
import { FLAGS, MATCH, REFEREE } from '../balance.ts';
import { TRAIT_BIT, traitBits } from '../traits.ts';
import { CALM, type WeatherFx } from '../weather.ts';
import type { Attributes, Club, MatchEvent, MatchEventType, MatchResult, Player, PlayerInstr, Position, SideStats, Tactic } from '../model.ts';
import type { Rng } from '../rng.ts';
import type { OnPitch } from './decision.ts';
import type { Beat } from './trace.ts';
import { len } from './pitch.ts';
import { OOP_ROLES, ROLES, type OopRoleId, type RoleId } from './roles.ts';
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
  hx: number; // posizione base nel modulo (con palla)
  hy: number;
  ox: number; // posizione base senza palla (tattica a due fasi; uguale a hx, hy se il modulo è uno solo)
  oy: number;
  oHold: number; // senza palla: quanto resta alto e quanto pressa (ruolo senza palla, o quello con palla)
  oPress: number;
  oDrain: number; // fatica in più (o in meno) del ruolo senza palla
  si: number; // slot nel modulo con palla (per rifare la fase senza palla se cambia il modulo in partita)
  roleId: RoleId;
  marked: number; // contrassegno interno della marcatura
  tx: number; // posizione ideale del momento (verso cui corre)
  ty: number;
  jx: number; // smarcamento casuale dell'azione in corso (estratto una volta per azione)
  jy: number;
  run: boolean; // inserimento in area in questa azione (motore-v2 §11)
  runRoll: number; // estrazione del duello con chi lo segue, una per azione (la partita guardata non ne pesca altre)
  on: boolean;
  st: PStats;
}

export interface TeamSetup {
  club: Club;
  tactic: Tactic;
  mentality: number;
  /** out: posto nel modulo senza palla; oop: ruolo senza palla (FM26). Senza, valgono quelli con palla */
  xi: { player: Player; slot: Slot; role: RoleId; out?: { x: number; y: number }; oop?: OopRoleId | null }[];
  bench: Player[];
  familiarity: number; // 0-100, col modulo in uso
  injuryP: (p: Player) => { muscle: number; relapse: number }; // rischio personale di infortunio in partita
  auto?: boolean; // false: cambi e mentalità li decide l'utente dal vivo (schermata Live)
  ref?: number; // severità dell'arbitro della partita (uguale nei due lati; 1 = media, referees.ts)
  wx?: WeatherFx; // meteo della partita (uguale nei due lati; weather.ts)
}

/** da dove nasce un tiro: serve a contare i gol per origine (piazzati, cross, contropiede) */
export type Origin = 'open' | 'cross' | 'corner' | 'pen' | 'fk';

/**
 * contatori di una squadra in partita (Blocco 2b): non cambiano il gioco e non si salvano. Li leggono
 * `pnpm sim -- --match-stats` e i test di buon senso tattico.
 */
export interface MatchLog {
  crosses: number; crossesOk: number;
  dribbles: number; dribblesOk: number; // tentati (anche quelli fermati con un fallo) e riusciti
  tackles: number; // palla vinta in un duello
  intercepts: number; // passaggio intercettato
  headers: number; // tiri di testa
  longShots: number; // tiri su azione da fuori area
  blocked: number; // tiri murati da un difensore
  deep: number; deepOk: number; // palle in profondità alle spalle della linea
  regainX: number; regains: number; // somma e numero delle x (nel proprio sistema) dei recuperi da contrasto o intercetto
  goals: Record<Origin, number>;
  counterGoals: number; // possesso nato nella propria metà da meno di 15 s e al massimo 4 azioni
  rebounds: number; // tiri su ribattuta dopo una respinta del portiere
  tacticalFouls: number; // falli tattici per fermare una ripartenza
  quickRegains: number; // palloni recuperati nella transizione, cioè subito dopo averli persi
  sweeps: number; // palle in profondità prese in uscita dal portiere
  longKicks: number; // rinvii lunghi del portiere
  late: [number, number]; // passaggi tentati e riusciti dal 70': la stanchezza si vede qui
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
  log: MatchLog;
  q: { on: MP[]; pal: number; att: number } | null; // qualità medie in campo, ricalcolate quando cambia `on`
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
  kind: 'pass' | 'dribble' | 'shot' | 'cross' | 'tackle' | 'foul'; // tackle, foul: la difesa ferma il portatore prima che giochi
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
  high?: boolean; // palla alta (cross, rinvio lungo)
  beats?: Beat[]; // i momenti dell'azione, in ordine (trace.ts)
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
  log: [MatchLog, MatchLog]; // contatori per il bilanciamento: non entrano nel mondo
}

export type Shout = 'encourage' | 'demand' | 'calm';

/** infortunio "senza contatto" programmato prima del fischio d'inizio (o ricaduta di chi è rientrato da poco) */
export interface Scheduled { who: MP; team: Team; at: number; ctx: 'muscle' | 'relapse' }

export interface MatchState {
  rng: Rng;
  ref: number; // severità dell'arbitro: × cartellini, e a metà sui falli fischiati
  wx: WeatherFx; // meteo: passaggi, cross, fatica, velocità
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
  poss: { t: number; half: number; x: number; acts: number }; // come è cominciato il possesso in corso (contropiede)
  counterNow: boolean; // l'azione in corso è una ripartenza contro una difesa scoperta
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
  curFrame: TraceStep | null; // fotogramma dell'azione in corso, a cui si aggiungono i momenti
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
  defMark: number[]; // peso di marcatura di ogni avversario (Marcatura, Posizionamento)
  keepEdge: number; // quanto chi ha palla palleggia meglio dell'avversario (≥ 0)
  dis: number; // disordine della squadra che difende (0-1): lo crea il giro palla, svanisce col tempo (fase di costruzione)
  disAt: number; // secondo dell'ultimo aggiornamento del disordine
  pendingDrain: [number, number];
  subIdx: number;
  shoutAt: [number, number];
  output: SimOutput | null;
  plansFired: [boolean[], boolean[]]; // piani partita già scattati, per squadra
  planUndo: [Pick<Tactic, 'formation' | 'pressing' | 'line' | 'roles'> | null, Pick<Tactic, 'formation' | 'pressing' | 'line' | 'roles'> | null]; // tattica da rimettere a posto a fine partita
}

export const newPStats = (from: number): PStats => ({ passes: 0, passesOk: 0, keyPasses: 0, shots: 0, onTarget: 0, goals: 0, assists: 0, tackles: 0, dribbles: 0, duelsLost: 0, saves: 0, fouls: 0, yellows: 0, red: false, injured: false, conceded: 0, injuryCtx: 'contact', from, to: 90 });
const newLog = (): MatchLog => ({ crosses: 0, crossesOk: 0, dribbles: 0, dribblesOk: 0, tackles: 0, intercepts: 0, headers: 0, longShots: 0, blocked: 0, deep: 0, deepOk: 0,
  regainX: 0, regains: 0, goals: { open: 0, cross: 0, corner: 0, pen: 0, fk: 0 }, counterGoals: 0, late: [0, 0], rebounds: 0, sweeps: 0, longKicks: 0, tacticalFouls: 0, quickRegains: 0 });
const newSide = (): SideStats => ({ possession: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0 });

/** logit personale del giorno, centrato sul giocatore "normale" (morale 65, condizione ≥ 80, modulo conosciuto) */
const dayMod = (p: Player, fam: number) =>
  (FLAGS.psychology ? MATCH.moraleK * (p.psych.morale - 65) : 0) - MATCH.sharpK * Math.max(0, 80 - p.condition.sharpness)
  - MATCH.famK * Math.max(0, 1 - fam / 90);
/**
 * attributi di partita: quelli veri avvicinati alla media (11) di MATCH.attrSpread. In campo il divario fra un 18 e un
 * 6 conta un po' meno che sulla carta: più pareggi e più sorprese (ritaratura 0.14.0). Scelte e valori usano i veri.
 */
export function matchAttrs(p: Player): Attributes {
  const k: number = MATCH.attrSpread, s: number = MATCH.attrSat; // number: in balance.ts sono costanti letterali
  if (k === 1 && s === 0) return p.attrs;
  const out = { ...p.attrs };
  // saturazione: la fascia media resta quasi com'è, gli estremi si avvicinano (un 18 vale meno di 7 punti sopra l'11)
  for (const key of Object.keys(out) as (keyof Attributes)[]) {
    const d = (out[key] - 11) * k;
    out[key] = 11 + (s > 0 ? s * Math.tanh(d / s) : d);
  }
  return out;
}

export const mp = (player: Player, slot: Slot, role: RoleId, fam: number, from = 0, ins: PlayerInstr = {}): MP =>
  ({ p: player, a: matchAttrs(player), pos: slot.pos, hx: slot.x, hy: slot.y, roleId: role, role: ROLES[role], marked: 0, x: slot.x, y: slot.y, tx: slot.x, ty: slot.y,
    jx: 0, jy: 0, run: false, runRoll: 1, energy: player.condition.fitness, mod: dayMod(player, fam), on: true, st: newPStats(from), ins, tr: traitBits(player) | (ins.tackle ? TRAIT_BIT.divesIn : 0),
    ox: slot.x, oy: slot.y, oHold: ROLES[role].hold, oPress: ROLES[role].press, oDrain: 1, si: 0 });

/** la fase senza palla del giocatore: il suo posto nel modulo senza palla e il suo ruolo senza palla */
export function outPhase(m: MP, out?: { x: number; y: number }, oop?: OopRoleId | null) {
  if (out) { m.ox = out.x; m.oy = out.y; }
  if (oop) { m.oHold = m.role.hold * OOP_ROLES[oop].hold; m.oPress = m.role.press * OOP_ROLES[oop].press; m.oDrain = OOP_ROLES[oop].drain; }
  return m;
}

/** falli fischiati: l'arbitro severo ne vede di più (metà dell'effetto sui cartellini) */
export const whistle = (st: MatchState) => 1 + (st.ref - 1) * REFEREE.foulShare;

export function createState(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): MatchState {
  const teams = setups.map((s, i) => {
    const on = s.xi.map((e, i) => { const m = outPhase(mp(e.player, e.slot, e.role, s.familiarity, 0, s.tactic.players?.[e.player.id]), e.out, e.oop); m.si = i; return m; });
    return { side: i as 0 | 1, tactic: s.tactic, baseMentality: s.mentality, mentality: s.mentality, on, bench: [...s.bench], played: [...on], subs: MATCH.maxSubs, stats: newSide(), fam: s.familiarity, auto: s.auto !== false, log: newLog(), q: null };
  }) as [Team, Team];
  return {
    rng, ref: setups[0].ref ?? 1, wx: setups[0].wx ?? CALM, setups, teams, events: [], score: [0, 0], s: 0, bx: 6, by: 4, carrier: teams[0].on[0]!, lastPass: null, chain: 0, poss: { t: 0, half: 1, x: 6, acts: 0 }, counterNow: false, momentum: 0,
    half: 1, t: 0, length: 0, scheduled: [], lastPlace: 0, markStamp: 0, holder: null, meet: null, snap: true,
    trace, curFrame: null, track: [], playAt: 0, lastBall: { x: 6, y: 4 }, lastStep: -1, ids0: [], idsDirty: true,
    defX: [], defY: [], defAnt: [], defMark: [], keepEdge: 0, dis: 0, disAt: 0, pendingDrain: [0, 0], subIdx: 0, shoutAt: [0, 0], output: null, plansFired: [[], []], planUndo: [null, null],
  };
}

export const minute = (st: MatchState) => Math.min(Math.floor(st.t / 60) + 1, 45) + (st.half - 1) * 45;
export const clock = (st: MatchState) => st.half * 10000 + st.t;
export const ev = (st: MatchState, type: MatchEventType, side: 0 | 1, player: MP, extra: Partial<MatchEvent> = {}) =>
  st.events.push({ min: minute(st), side, type, playerId: player.p.id, ...extra });
// dal sistema di chi attacca alle coordinate globali (la squadra 1 gioca a specchio)
export const gx = (st: MatchState, x: number) => (st.s === 0 ? x : 12 - x);
export const gy = (st: MatchState, y: number) => (st.s === 0 ? y : 8 - y);
/** si è nella transizione: il possesso è appena cambiato (pochi secondi e poche azioni fa) */
export const inTransition = (st: MatchState) =>
  st.poss.half === st.half && st.t - st.poss.t <= MATCH.transWindow && st.poss.acts <= MATCH.transActs;

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

/** il migliore secondo `f` fra chi passa il filtro (prima partiva dal primo in campo, il portiere, anche se il filtro
 * lo escludeva: batteva lui le punizioni se aveva Calci piazzati più alti); se nessuno passa il filtro, il primo in campo */
export function best(tm: Team, f: (m: MP) => number, filter: (m: MP) => boolean = () => true): MP {
  const ok = tm.on.filter(filter);
  return ok.length ? ok.reduce((a, b) => (f(b) > f(a) ? b : a)) : tm.on[0]!;
}

/** la squadra `tm` prende palla col giocatore `m`, dove si trova */
export function gain(st: MatchState, tm: Team, m: MP) {
  if (tm.side !== st.s && inTransition(st)) tm.log.quickRegains++; // l'ha ripresa subito dopo averla persa
  st.s = tm.side;
  st.carrier = m;
  st.bx = m.x;
  st.by = m.y;
  st.lastPass = null;
  st.chain = 0;
  st.poss = { t: st.t, half: st.half, x: m.x, acts: 0 };
  st.dis = 0; // palla all'altra squadra: chi difende adesso è in ordine
}
