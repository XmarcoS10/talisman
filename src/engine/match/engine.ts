// Motore partita L2 a zone (GUIDA §6.2): una sequenza di decisioni del portatore di palla,
// con posizioni dei 22 ricalcolate a ogni azione dal modulo e dalla posizione della palla.
import { FLAGS, MATCH } from '../balance.ts';
import type { Club, MatchEvent, MatchEventType, MatchResult, Player, Position, SideStats, Tactic } from '../model.ts';
import { ratingAt } from '../players.ts';
import type { Rng } from '../rng.ts';
import { choose, options, type OnPitch, type Option, type View } from './decision.ts';
import { inBox, len, segDist, shotGeometry } from './pitch.ts';
import { ROLES, type RoleId } from './roles.ts';
import type { Slot } from './tactics.ts';
import { clamp } from '../util.ts';

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

export type Shout = 'encourage' | 'demand' | 'calm';

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

export interface SimOutput {
  result: MatchResult;
  played: [MP[], MP[]]; // tutti quelli scesi in campo, con statistiche
}

const PRESS = [0.8, 1, 1.25];
const WIDTH = [0.8, 1, 1.2];
const LINE = [-0.6, 0, 0.6];
const TEMPO = [1.2, 1, 0.85];
const PRESS_STEP = [0.35, 0.5, 0.7]; // quanto esce il pressatore verso il portatore

const newPStats = (from: number): PStats => ({ passes: 0, passesOk: 0, keyPasses: 0, shots: 0, onTarget: 0, goals: 0, assists: 0, tackles: 0, dribbles: 0, duelsLost: 0, saves: 0, fouls: 0, yellows: 0, red: false, injured: false, conceded: 0, injuryCtx: 'contact', from, to: 90 });
const newSide = (): SideStats => ({ possession: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0 });
/** accelerazione e frenata: la palla non viaggia a velocità costante */
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (1 - u) ** 2 * 2);
/** chi va a prendere un cross: testa, coraggio, e la punta di peso ha la precedenza */
const aerialScore = (m: MP) => m.p.attrs.heading + m.p.attrs.bravery / 2 + m.role.aerial;
/** logit personale del giorno, centrato sul giocatore "normale" (morale 65, condizione ≥ 80, modulo conosciuto) */
const dayMod = (p: Player, fam: number) =>
  (FLAGS.psychology ? MATCH.moraleK * (p.psych.morale - 65) : 0) - MATCH.sharpK * Math.max(0, 80 - p.condition.sharpness)
  - MATCH.famK * Math.max(0, 1 - fam / 90);
const mp = (player: Player, slot: Slot, role: RoleId, fam: number, from = 0): MP =>
  ({ p: player, pos: slot.pos, hx: slot.x, hy: slot.y, roleId: role, role: ROLES[role], marked: 0, x: slot.x, y: slot.y, tx: slot.x, ty: slot.y,
    jx: 0, jy: 0, energy: player.condition.fitness, mod: dayMod(player, fam), on: true, st: newPStats(from) });

/** partita simulata tutta d'un fiato (mondo che avanza, sim-cli, test) */
export function simulate(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): SimOutput {
  return runMatch(rng, setups, trace).result();
}

export function runMatch(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): MatchRun {
  const teams = setups.map((s, i) => {
    const on = s.xi.map((e) => mp(e.player, e.slot, e.role, s.familiarity));
    return { side: i as 0 | 1, tactic: s.tactic, baseMentality: s.mentality, mentality: s.mentality, on, bench: [...s.bench], played: [...on], subs: MATCH.maxSubs, stats: newSide(), fam: s.familiarity, auto: s.auto !== false };
  }) as [Team, Team];

  const events: MatchEvent[] = [];
  const score: [number, number] = [0, 0];
  let s: 0 | 1 = 0; // squadra in possesso
  let bx = 6, by = 4; // palla, nel sistema di chi attacca
  let carrier: MP = teams[0].on[0]!;
  let lastPass: MP | null = null;
  let chain = 0; // passaggi consecutivi nel possesso attuale
  let momentum = 0; // + casa, − ospiti
  let half = 1, t = 0;
  const minute = () => Math.min(Math.floor(t / 60) + 1, 45) + (half - 1) * 45;
  const ev = (type: MatchEventType, side: 0 | 1, player: MP, extra: Partial<MatchEvent> = {}) =>
    events.push({ min: minute(), side, type, playerId: player.p.id, ...extra });

  // infortuni "senza contatto" programmati prima del fischio d'inizio
  // (e le ricadute di chi è rientrato da poco)
  const scheduled: { who: MP; team: Team; at: number; ctx: 'muscle' | 'relapse' }[] = [];
  teams.forEach((tm, i) => {
    for (const m of tm.on) {
      const risk = setups[i]!.injuryP(m.p);
      if (rng.next() < risk.relapse) scheduled.push({ who: m, team: tm, at: rng.int(1, 89), ctx: 'relapse' });
      else if (rng.next() < risk.muscle) scheduled.push({ who: m, team: tm, at: rng.int(1, 89), ctx: 'muscle' });
    }
  });

  /**
   * posizioni dei 22. Ognuno ha una posizione "ideale" (modulo + palla + ruolo) e ci corre a velocità limitata:
   * dopo una palla persa chi era sbilanciato in avanti deve rientrare, ed è da lì che nascono i contropiedi.
   */
  let lastPlace = 0;
  let markStamp = 0;
  const clock = () => half * 10000 + t;
  // dal sistema di chi attacca alle coordinate globali (la squadra 1 gioca a specchio)
  const gx = (x: number) => (s === 0 ? x : 12 - x);
  const gy = (y: number) => (s === 0 ? y : 8 - y);
  function runTo(m: MP, x: number, y: number, dt: number) {
    const dx = x - m.x, dy = y - m.y;
    const d = len(dx, dy);
    const max = dt * MATCH.runSpeed * (0.7 + 0.3 * (m.p.attrs.pace + m.p.attrs.acceleration) / 40) * (0.6 + 0.4 * m.energy / 100);
    if (d <= max) { m.x = x; m.y = y; } else { m.x += (dx * max) / d; m.y += (dy * max) / d; }
  }

  /** impegno difensivo: con mentalità offensiva si rientra meno e si pressa peggio */
  const cover = (tm: Team) => 1 - MATCH.mentalityCover * (tm.mentality - 3);

  /** chi tiene la palla adesso (nessuno mentre è in viaggio) e chi la sta aspettando */
  let holder: MP | null = null;
  let meet: MP | null = null;
  let snap = true; // il portatore sta sulla palla; nei passi intermedi ci corre invece di comparirci

  /** gli smarcamenti si estraggono una volta per azione: dentro l'azione il movimento è continuo, non nervoso */
  function jitter() {
    for (const m of teams[s].on) {
      if (m === carrier || m.pos === 'GK') continue;
      m.jx = (rng.next() - 0.5) * MATCH.offBallMove;
      m.jy = (rng.next() - 0.5) * MATCH.offBallMove * 1.5;
    }
  }

  function aimAtt() {
    const att = teams[s];
    const mmA = att.mentality - 3, wf = WIDTH[att.tactic.width]!;
    for (const m of att.on) {
      if (m === holder) {
        if (snap) { m.x = bx; m.y = by; }
        m.tx = bx; m.ty = by;
        continue;
      }
      if (m === meet) { m.tx = bx; m.ty = by; continue; } // va incontro alla palla in viaggio
      if (m.pos === 'GK') {
        const gkMax = m.roleId === 'sweeperKeeper' ? 2.4 : 1.6; // il portiere libero accompagna la linea
        m.tx = Math.min(gkMax, 0.6 + Math.max(0, bx - 6) * 0.1); m.ty = 4;
        continue;
      }
      // la squadra sale a blocco secondo il ruolo di ognuno (roles.ts)
      const rl = m.role;
      let x = Math.max(m.hx, rl.baseX) + rl.push + (bx - 6) * rl.follow + MATCH.mentalityPush * mmA;
      // negli ultimi 30 metri chi sa inserirsi attacca l'area
      if (bx >= 8 && rl.runs) x += (m.p.attrs.offTheBall / 20) * MATCH.boxRun;
      // movimento senza palla: smarcamenti che aprono (o chiudono) le linee di passaggio
      const mv = 0.5 + m.p.attrs.offTheBall / 20;
      const side = m.hy > 4.3 ? 1 : m.hy < 3.7 ? -1 : 0; // da che lato gioca, per allargarsi o stringere
      m.tx = clamp(x + m.jx * mv, 0.3, rl.maxX);
      m.ty = clamp(4 + (m.hy - 4) * wf + rl.dy * side + (by - 4) * 0.25 + m.jy * mv, 0.2, 7.8);
    }
  }

  function aimDef() {
    const att = teams[s], def = teams[1 - s]!;
    const dbx = 12 - bx, dby = 8 - by; // palla vista dalla difesa
    const shift = LINE[def.tactic.line]! + 0.25 * (def.mentality - 3);
    // senza palla il blocco si accorcia: anche punte e trequartisti rientrano, di più se la mentalità è prudente
    const compact = MATCH.defCompact + MATCH.mentalityCompact * (def.mentality - 3);
    let presser: MP | undefined, best = Infinity;
    for (const m of def.on) {
      if (m.pos === 'GK') { m.tx = 0.6; m.ty = 4; continue; }
      m.tx = clamp(1 + (m.hx - 1) * compact * m.role.hold + (dbx - 6) * 0.45 + shift, 0.9, 11.5);
      m.ty = clamp(4 + (m.hy - 4) * 0.7 + (dby - 4) * 0.35, 0.2, 7.8);
      const d = len(m.x - dbx, m.y - dby); // in pressione va chi è davvero più vicino adesso
      if (d < best) { best = d; presser = m; }
    }
    // marcatura a uomo nella propria metà campo: ognuno prende l'attaccante libero più vicino (uno a testa),
    // restando tra lui e la porta
    const stamp = ++markStamp; // "già marcato" senza allocare un Set a ogni azione
    for (const m of def.on) {
      if (m === presser || m.pos === 'GK' || m.tx > 5) continue;
      let target: MP | undefined, bd = 2;
      for (const a of att.on) {
        if (a === carrier || a.pos === 'GK' || a.marked === stamp) continue;
        const d = len(12 - a.x - m.tx, 8 - a.y - m.ty);
        if (d < bd) { bd = d; target = a; }
      }
      if (target) {
        target.marked = stamp;
        const tight = MATCH.markTightness * cover(def);
        m.tx += (12 - target.x - MATCH.markGoalSide - m.tx) * tight;
        m.ty += (8 - target.y - m.ty) * tight;
      } else {
        // difensore in più, senza uomo: esce a schermare lo spazio davanti all'area, verso la palla
        m.tx += MATCH.spareStepUp;
        m.ty += (dby - m.ty) * 0.3;
      }
    }
    // il più vicino esce in pressione sul portatore
    if (presser) {
      const f = PRESS_STEP[def.tactic.pressing]!;
      presser.tx += (dbx - presser.tx) * f;
      presser.ty += (dby - presser.ty) * f;
    }
  }

  const move = (tm: Team, dt: number) => { for (const m of tm.on) runTo(m, m.tx, m.ty, dt); };
  /** un passo di movimento: prima si muove chi ha palla, poi la difesa si riposiziona su quello che vede */
  function advance(dt: number) {
    aimAtt();
    move(teams[s], dt);
    aimDef();
    move(teams[1 - s]!, dt);
  }

  /** senza registro il campo fa un salto solo per azione: è la modalità del sim-cli e del mondo che avanza */
  function place() {
    const dt = Math.min(30, Math.max(0.5, clock() - lastPlace));
    lastPlace = clock();
    holder = carrier;
    meet = null;
    jitter();
    advance(dt);
  }

  // --- traccia densa di posizioni (F6.2) ---
  const track: PosFrame[] = [];
  let playAt = 0; // secondi di riproduzione già emessi
  let lastBall = { x: 6, y: 4 }; // palla globale a inizio intervallo
  let lastStep = -1; // ultima azione già raccontata: un intervallo a vuoto non la ripercorre
  let ids0: number[] = [];
  let idsDirty = true;
  const roster = () => {
    if (idsDirty) {
      ids0 = [];
      for (const tm of teams) for (const m of tm.on) ids0.push(m.p.id);
      idsDirty = false;
    }
    return ids0;
  };

  function emit(dead: boolean) {
    const ids = roster();
    const xy = new Float32Array(ids.length * 2);
    let k = 0;
    for (const tm of teams)
      for (const m of tm.on) {
        xy[k++] = tm.side === 0 ? m.x : 12 - m.x;
        xy[k++] = tm.side === 0 ? m.y : 8 - m.y;
      }
    track.push({
      at: playAt, min: minute(), half, ids, n0: teams[0].on.length, xy, bx: gx(bx), by: gy(by),
      carrier: holder ? holder.p.id : 0, to: meet ? meet.p.id : 0, sc0: score[0], sc1: score[1],
      step: Math.max(0, trace!.length - 1), dead,
    });
  }

  /**
   * col registro acceso lo stesso intervallo si gioca a passi fissi: la palla viaggia e decelera, i 22
   * ricalcolano la posizione ideale a ogni passo. È da qui che nascono coperture e inserimenti visibili.
   *
   * Vincolo: il bilanciamento non deve cambiare. Le posizioni di fine intervallo sono quelle del motore
   * (calcolate prima, con lo stesso consumo di casualità), i passi intermedi sono il racconto di come ci
   * si è arrivati e vi si ricongiungono (peso `w`, che vale 1 all'ultimo passo).
   */
  function replay() {
    const dt = Math.min(30, Math.max(0.5, clock() - lastPlace));
    lastPlace = clock();
    const f = trace!.length ? trace![trace!.length - 1]! : null; // l'azione appena eseguita
    const dead = dt >= MATCH.deadFrom;
    const g0 = lastBall;
    const g1 = { x: gx(bx), y: gy(by) };
    const next = carrier; // chi avrà la palla a fine intervallo

    const all = [...teams[0].on, ...teams[1].on];
    const sx = all.map((m) => m.x), sy = all.map((m) => m.y);
    holder = carrier;
    meet = null;
    jitter();
    advance(dt); // posizioni autorevoli
    const ex = all.map((m) => m.x), ey = all.map((m) => m.y);
    all.forEach((m, i) => { m.x = sx[i]!; m.y = sy[i]!; });

    // dove era indirizzata la palla: destinatario, zona di conduzione, porta.
    // Se l'azione è già stata raccontata (intervallo a vuoto, es. dopo il calcio d'inizio) la palla non riparte.
    const fresh = f !== null && trace!.length - 1 !== lastStep;
    lastStep = trace!.length - 1;
    const wp = !fresh || !f ? g1 : f.kind === 'shot' ? { x: f.side === 0 ? 12 : 0, y: 4 } : f.tx !== undefined ? { x: f.tx, y: f.ty! } : g1;
    const flight = dead ? 0.2 : f && f.kind === 'dribble' ? 1 : MATCH.ballFlight;
    const n = Math.max(1, Math.ceil(dt / MATCH.frameTick));
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      const v = ease(Math.min(1, u / flight));
      let px = g0.x + (wp.x - g0.x) * v, py = g0.y + (wp.y - g0.y) * v;
      if (u > flight) { // raccordo verso dove riparte davvero l'azione (rimessa, rinvio, recupero)
        const w = (u - flight) / (1 - flight);
        px += (g1.x - px) * w;
        py += (g1.y - py) * w;
      }
      bx = s === 0 ? px : 12 - px;
      by = s === 0 ? py : 8 - py;
      const flying = u < flight && fresh && f!.kind !== 'dribble';
      holder = flying ? null : next;
      meet = flying ? next : null;
      snap = false;
      advance(dt / n);
      snap = true;
      const w = u * u; // ricongiungimento alle posizioni autorevoli
      all.forEach((m, i) => {
        m.x += (sx[i]! + (ex[i]! - sx[i]!) * u - m.x) * w;
        m.y += (sy[i]! + (ey[i]! - sy[i]!) * u - m.y) * w;
      });
      emit(dead);
      playAt += dt / n / (dead ? MATCH.deadSpeed : 1);
    }
    all.forEach((m, i) => { m.x = ex[i]!; m.y = ey[i]!; });
    holder = next;
    meet = null;
    bx = s === 0 ? g1.x : 12 - g1.x;
    by = s === 0 ? g1.y : 8 - g1.y;
    lastBall = g1;
  }

  const settle = () => (trace ? replay() : place());

  function nearest(tm: Team, x: number, y: number, skipGK = false): MP {
    let best: MP = tm.on[0]!, bd = Infinity;
    for (const m of tm.on) {
      if (skipGK && m.pos === 'GK') continue;
      const d = len(m.x - x, m.y - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  /** la squadra `tm` prende palla col giocatore `m`, dove si trova */
  function gain(tm: Team, m: MP) {
    s = tm.side;
    carrier = m;
    bx = m.x;
    by = m.y;
    lastPass = null;
    chain = 0;
  }

  function kickoff(side: 0 | 1) {
    s = side; bx = 6; by = 4; lastPass = null; chain = 0;
    carrier = teams[side].on.find((m) => m.pos === 'ST' || m.pos === 'AMC') ?? teams[side].on[teams[side].on.length - 1]!;
    settle();
  }

  const best = (tm: Team, f: (m: MP) => number, filter: (m: MP) => boolean = () => true) =>
    tm.on.filter(filter).reduce((a, b) => (f(b) > f(a) ? b : a), tm.on[0]!);

  function removeFromPitch(tm: Team, m: MP) {
    m.on = false;
    m.st.to = minute();
    tm.on = tm.on.filter((x) => x !== m);
    idsDirty = true;
    if (carrier === m) carrier = nearest(tm, m.x, m.y);
  }

  function substitute(tm: Team, out: MP, chosen?: Player): boolean {
    if (tm.subs <= 0 || tm.bench.length === 0 || !out.on) return false;
    const inP = chosen ?? tm.bench.reduce((a, b) => (ratingAt(b, out.pos) > ratingAt(a, out.pos) ? b : a));
    tm.bench = tm.bench.filter((b) => b !== inP);
    const m = mp(inP, { pos: out.pos, x: out.hx, y: out.hy }, out.roleId, tm.fam, minute()); // entra nello stesso ruolo
    m.x = out.x; m.y = out.y;
    tm.on = tm.on.map((x) => (x === out ? m : x));
    idsDirty = true;
    tm.played.push(m);
    out.on = false;
    out.st.to = minute();
    tm.subs--;
    if (carrier === out) carrier = m;
    ev('sub', tm.side, out, { assistId: inP.id });
    return true;
  }

  function injure(tm: Team, m: MP, ctx: PStats['injuryCtx']) {
    if (!m.on || m.st.injured) return;
    m.st.injured = true;
    m.st.injuryCtx = ctx;
    ev('injury', tm.side, m);
    if (!substitute(tm, m)) removeFromPitch(tm, m);
  }

  function sendOff(tm: Team, m: MP) {
    m.st.red = true;
    tm.stats.reds++;
    ev('red', tm.side, m);
    removeFromPitch(tm, m);
  }

  function corner() {
    const att = teams[s], def = teams[1 - s]!;
    att.stats.corners++;
    const taker = best(att, (m) => m.p.attrs.corners, (m) => m.pos !== 'GK');
    const r = rng.next();
    if (r < MATCH.cornerHeader) {
      const header = best(att, (m) => m.p.attrs.heading + m.p.attrs.strength / 2, (m) => m !== taker && m.pos !== 'GK');
      lastPass = taker;
      bx = 10.9; by = 4;
      shoot(header, MATCH.cornerHeaderXg * (1 + 0.06 * (header.p.attrs.heading - 11)), 'header');
    } else if (r < MATCH.cornerHeader + 0.2) {
      carrier = nearest(att, 10.5, 1); bx = 10.5; by = 1; lastPass = null; // battuto corto
    } else gain(def, nearest(def, 1.5, 4, true));
    t += MATCH.restartTime;
  }

  function shoot(sh: MP, xg: number, kind: 'open' | 'header' | 'pen' | 'fk') {
    const att = teams[s], def = teams[1 - s]!;
    const gk = def.on.find((m) => m.pos === 'GK');
    att.stats.shots++; sh.st.shots++; att.stats.xg += xg;
    const skill = kind === 'pen' ? sh.p.attrs.penalties : kind === 'fk' ? sh.p.attrs.freeKicks : kind === 'header' ? sh.p.attrs.heading
      : shotGeometry(bx, by).dist > 18 ? sh.p.attrs.longShots : sh.p.attrs.finishing;
    const gkSkill = gk ? (gk.p.attrs.reflexes + gk.p.attrs.oneOnOnes + gk.p.attrs.handling) / 3 : 3;
    const pGoal = clamp(xg * (1 + MATCH.shotSkill * (skill - 11)) * (1 - MATCH.gkSkill * (gkSkill - 11)), 0.005, 0.97);
    const assist = lastPass && lastPass !== sh && kind !== 'pen' ? lastPass : null;
    if (assist) assist.st.keyPasses++;
    const sign = s === 0 ? 1 : -1;
    momentum = clamp(momentum + sign * MATCH.momentumShot, -100, 100);

    if (rng.next() < pGoal) {
      att.stats.onTarget++; sh.st.onTarget++; sh.st.goals++;
      score[s]++;
      if (assist) assist.st.assists++;
      for (const m of def.on) m.st.conceded++;
      ev(kind === 'pen' ? 'penGoal' : 'goal', s, sh, { xg, ...(assist ? { assistId: assist.p.id } : {}) });
      momentum = clamp(momentum + sign * MATCH.momentumGoal, -100, 100);
      t += MATCH.goalTime;
      kickoff((1 - s) as 0 | 1);
      return;
    }
    if (kind === 'pen') ev('penMiss', s, sh, { xg });
    else if (xg >= 0.3) ev('chance', s, sh, { xg });
    t += MATCH.restartTime;
    if (rng.next() < MATCH.onTargetBase + MATCH.onTargetXg * xg) {
      att.stats.onTarget++; sh.st.onTarget++;
      if (gk) gk.st.saves++;
      if (rng.next() < MATCH.cornerAfterSave) corner();
      else gain(def, gk ?? nearest(def, 0.6, 4));
    } else if (kind !== 'pen' && rng.next() < MATCH.blockedShare) {
      if (rng.next() < MATCH.cornerAfterBlock) corner();
      else gain(def, nearest(def, 12 - bx, 8 - by, true));
    } else gain(def, gk ?? nearest(def, 0.6, 4));
  }

  function foul(fouler: MP, victim: MP) {
    const att = teams[s], def = teams[1 - s]!;
    def.stats.fouls++; fouler.st.fouls++;
    t += MATCH.restartTime;
    if (rng.next() < MATCH.redP) sendOff(def, fouler);
    // chi è già ammonito entra con più prudenza: il secondo giallo è più raro
    else if (rng.next() < MATCH.yellowP * (1 + 0.08 * (fouler.p.attrs.aggression - 11)) * (fouler.st.yellows ? MATCH.bookedCaution : 1)) {
      fouler.st.yellows++; def.stats.yellows++;
      ev('yellow', def.side, fouler);
      if (fouler.st.yellows === 2) sendOff(def, fouler);
    }
    if (rng.next() < MATCH.injuryOnFoul) injure(att, victim, 'contact');
    if (!victim.on) return; // il fallo ha tolto di mezzo il portatore: batte il più vicino
    if (inBox(bx, by)) {
      const taker = best(att, (m) => m.p.attrs.penalties);
      shoot(taker, MATCH.penaltyXg, 'pen');
    } else if (bx >= 8 && Math.abs(by - 4) < 2.5 && rng.next() < MATCH.fkShot) {
      lastPass = null;
      const taker = best(att, (m) => m.p.attrs.freeKicks);
      shoot(taker, MATCH.fkXg * (1 + 0.08 * (taker.p.attrs.freeKicks - 11)), 'fk');
    }
  }

  // la difesa vista da chi attacca: tre liste riusate a ogni azione invece di crearne tre nuove (≈320.000 a stagione)
  const defX: number[] = [], defY: number[] = [], defAnt: number[] = [];
  function step() {
    const att = teams[s], def = teams[1 - s]!;
    settle();
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
      const d = len(defX[i]! - bx, defY[i]! - by);
      if (d < cd && m.pos !== 'GK') { cd = d; closest = m; }
      if (d < MATCH.pressRadius) pressure += (1 - d / MATCH.pressRadius) * (0.7 + 0.03 * m.p.attrs.workRate) * (m.energy / 100) * PRESS[def.tactic.pressing]! * cv * m.role.press;
      if (m.pos !== 'GK') line = Math.max(line, defX[i]!);
    }
    const sign = s === 0 ? 1 : -1;
    const view: View = {
      carrier, isGK: carrier.pos === 'GK', bx, by, mates: att.on, defs: def.on, defX, defY, defAnt, pressure,
      offsideLine: Math.max(line, bx), tactic: att.tactic, mentality: att.mentality,
      bonus: (s === 0 ? MATCH.homeBoost : 0) + (sign * momentum / 100) * MATCH.momentumK * (1 - carrier.p.attrs.composure / 25)
        - (100 - carrier.energy) * MATCH.energySkill + carrier.mod,
      chain,
    };
    const t0 = t;
    const c = carrier;
    // fallo "di pressione": il difensore più vicino ferma l'azione (in area si sta più attenti)
    const pressFoul = MATCH.pressFoul * pressure * PRESS[def.tactic.pressing]! * (inBox(bx, by) ? MATCH.foulInBox : 1)
      * (closest?.st.yellows ? MATCH.bookedCaution : 1);
    if (closest && rng.next() < pressFoul) foul(closest, c);
    else act(att, def, c, defX, defY, choose(rng, options(view), carrier, pressure));

    // tempo che passa: possesso, stanchezza (applicata a blocchi di un minuto), momentum
    const dt = t - t0;
    att.stats.possession += dt;
    pendingDrain[s] += dt;
    pendingDrain[s === 0 ? 1 : 0] += dt * PRESS[def.tactic.pressing]!; // chi pressa si stanca di più
    if (pendingDrain[0] + pendingDrain[1] >= 120) drain();
    momentum *= MATCH.momentumDecay;
  }

  /** fotogramma per il replay 2D: tutti in campo in coordinate globali (la squadra 1 gioca a specchio) */
  function frame(o: Option): TraceStep {
    const ids: number[] = [], px: number[] = [], py: number[] = [];
    for (const tm of teams)
      for (const m of tm.on) {
        ids.push(m.p.id);
        px.push(tm.side === 0 ? m.x : 12 - m.x);
        py.push(tm.side === 0 ? m.y : 8 - m.y);
      }
    const f: TraceStep = {
      half, t, min: minute(), side: s, kind: o.kind, bx: gx(bx), by: gy(by), pressure: 0, mom: Math.round(momentum), from: carrier.p.id,
      ids, px, py, n0: teams[0].on.length, score: [score[0], score[1]],
      ...(o.kind === 'pass' ? { tx: gx(o.tx), ty: gy(o.ty), p: o.p, to: (o.to as MP).p.id }
        : o.kind === 'dribble' ? { tx: gx(o.tx), ty: gy(o.ty), p: o.p }
        : o.kind === 'shot' ? { xg: o.xg } : { p: o.p }),
    };
    trace!.push(f);
    return f;
  }

  /** esegue l'opzione scelta dal portatore */
  function act(att: Team, def: Team, c: MP, defX: number[], defY: number[], o: Option) {
    const f = trace ? frame(o) : null;
    switch (o.kind) {
      case 'pass': {
        att.stats.passes++; c.st.passes++;
        if (o.off > 0 && rng.next() < o.off) {
          att.stats.offsides++;
          t += MATCH.restartTime;
          gain(def, nearest(def, 12 - o.tx, 8 - o.ty));
        } else if (rng.next() < o.p) {
          att.stats.passesOk++; c.st.passesOk++;
          if (f) f.ok = true;
          lastPass = c;
          chain++;
          carrier = o.to as MP;
          bx = o.tx; by = o.ty;
          t += MATCH.passTime * TEMPO[att.tactic.tempo]! + MATCH.passTimePerZone * len(o.tx - c.x, o.ty - c.y);
        } else {
          // intercetto: il difensore più vicino alla linea di passaggio
          let w = def.on[0]!, bd = Infinity;
          for (let i = 0; i < def.on.length; i++) {
            const d = segDist(defX[i]!, defY[i]!, bx, by, o.tx, o.ty);
            if (d < bd) { bd = d; w = def.on[i]!; }
          }
          w.st.tackles++; def.stats.tackles++;
          t += MATCH.passTime + MATCH.turnoverTime;
          gain(def, w);
        }
        break;
      }
      case 'dribble': {
        const tk = o.tackler as MP | undefined;
        const foulP = MATCH.foulBase * (1 + MATCH.foulAggression * (tk ? tk.p.attrs.aggression - 11 : 0)) * PRESS[def.tactic.pressing]!
          * (inBox(bx, by) ? MATCH.foulInBox : 1) * (tk?.st.yellows ? MATCH.bookedCaution : 1);
        if (tk && rng.next() < foulP) foul(tk, c);
        else if (rng.next() < o.p) {
          c.st.dribbles++;
          if (f) f.ok = true;
          bx = o.tx; by = o.ty;
          lastPass = null;
          t += MATCH.dribbleTime;
        } else {
          const w = tk ?? nearest(def, 12 - bx, 8 - by);
          w.st.tackles++; def.stats.tackles++; c.st.duelsLost++;
          t += MATCH.turnoverTime + 1;
          gain(def, w);
        }
        break;
      }
      case 'shot': {
        const side = s; // dopo un gol kickoff() passa la palla all'altra squadra: l'esito va letto su chi ha tirato
        const before = score[side];
        shoot(c, o.xg, 'open');
        if (f) f.ok = score[side] > before;
        break;
      }
      case 'cross': {
        att.stats.passes++; c.st.passes++;
        t += MATCH.passTime;
        if (rng.next() < o.p) {
          att.stats.passesOk++; c.st.passesOk++;
          if (f) f.ok = true;
          const inBoxMates = att.on.filter((m) => m !== c && m.pos !== 'GK' && m.x >= 9.5);
          const header = inBoxMates.length
            ? inBoxMates.reduce((a, b) => (aerialScore(b) > aerialScore(a) ? b : a))
            : best(att, (m) => m.p.attrs.heading, (m) => m !== c && m.pos !== 'GK');
          const dh = best(def, (m) => m.p.attrs.heading, (m) => m.pos !== 'GK');
          lastPass = c;
          bx = 10.8; by = 4;
          shoot(header, MATCH.headerXg * (1 + 0.06 * (header.p.attrs.heading - 11)) * (1 - 0.04 * (dh.p.attrs.heading - 11)), 'header');
        } else if (rng.next() < MATCH.cornerAfterClear) corner();
        else gain(def, nearest(def, 1.5, 4, true));
        break;
      }
    }
  }

  const pendingDrain: [number, number] = [0, 0];
  function drain() {
    for (const tm of teams) {
      const mins = pendingDrain[tm.side] / 60;
      for (const m of tm.on) m.energy = Math.max(30, m.energy - mins * m.role.drain * (MATCH.drainBase + MATCH.drainStamina * (1 - m.p.attrs.stamina / 20)));
      pendingDrain[tm.side] = 0;
    }
  }

  let subIdx = 0;
  let length = 0;
  let output: SimOutput | null = null;

  function startHalf(h: number) {
    half = h;
    t = 0;
    length = 45 * 60 + (h === 1 ? rng.int(0, 3) : rng.int(2, 6)) * 60;
    kickoff(h === 1 ? 0 : 1);
  }

  function finish() {
    const total = teams[0].stats.possession + teams[1].stats.possession || 1;
    const poss0 = Math.round((teams[0].stats.possession / total) * 100);
    teams[0].stats.possession = poss0;
    teams[1].stats.possession = 100 - poss0;
    for (const tm of teams) tm.stats.xg = Math.round(tm.stats.xg * 100) / 100;
    const ratings: Record<number, number> = {};
    teams.forEach((tm, i) => {
      const diff = score[i]! - score[1 - i]!;
      for (const m of tm.played) ratings[m.p.id] = rate(m, diff, score[1 - i]!);
    });
    output = { result: { hg: score[0], ag: score[1], events, stats: [teams[0].stats, teams[1].stats], ratings }, played: [teams[0].played, teams[1].played] };
  }

  /** una azione del portatore, più quello che succede intorno (stato della partita, cambi, infortuni) */
  function tick() {
    if (output) return;
    step();
    const min = minute();
    // stato della partita: nel finale chi è avanti si copre, chi è sotto si sbilancia
    for (const tm of teams) {
      const diff = score[tm.side] - score[tm.side === 0 ? 1 : 0];
      let m = tm.baseMentality;
      if (min >= MATCH.protectLeadFrom && diff > 0) m--;
      if (min >= MATCH.chaseFrom && diff < 0) m++;
      if (min >= MATCH.chaseFrom + 15 && diff < 0) m++;
      tm.mentality = clamp(m, 1, 5);
    }
    // cambi: ai minuti previsti esce il più stanco, se è sotto soglia
    if (subIdx < MATCH.subMinutes.length && min >= MATCH.subMinutes[subIdx]!) {
      subIdx++;
      for (const tm of teams) {
        if (tm.auto === false) continue; // la panchina la gestisce l'utente
        const tired = tm.on.filter((m) => m.pos !== 'GK').sort((a, b) => a.energy - b.energy)[0];
        if (tired && tired.energy < MATCH.subEnergy) substitute(tm, tired);
      }
    }
    for (const sc of scheduled) if (sc.at <= min && sc.who.on && !sc.who.st.injured) injure(sc.team, sc.who, sc.ctx);
    if (t >= length) { if (half === 1) startHalf(2); else finish(); }
  }

  const shoutAt = [0, 0];
  startHalf(1);
  return {
    tick,
    get done() { return output !== null; },
    minute,
    score,
    events,
    teams,
    frames: trace ?? [],
    track,
    shout(side, kind) {
      if (minute() < shoutAt[side]!) return false;
      shoutAt[side] = minute() + MATCH.shoutEvery;
      for (const m of teams[side].on) m.mod += MATCH.shoutBoost * shoutResponse(m.p, kind);
      return true;
    },
    nextShout: (side) => shoutAt[side]!,
    sub(side, outId, inId) {
      const tm = teams[side];
      const out = tm.on.find((m) => m.p.id === outId);
      const inP = tm.bench.find((b) => b.id === inId);
      return out && inP ? substitute(tm, out, inP) : false;
    },
    rating(m) {
      const i = teams[0].played.includes(m) ? 0 : 1;
      return rate(m, score[i]! - score[1 - i]!, score[1 - i]!);
    },
    result() {
      while (!output) tick();
      return output;
    },
  };
}

/** voto in pagella 3-10 (algoritmo documentato: base 6 + contributi) */
function rate(m: MP, goalDiff: number, conceded: number): number {
  const s = m.st;
  let r = 6.2 + 0.85 * s.goals + 0.5 * s.assists + 0.08 * s.keyPasses + 0.08 * s.onTarget + 0.035 * s.tackles + 0.04 * s.dribbles
    - 0.2 * s.yellows - (s.red ? 1.2 : 0);
  if (s.passes >= 5) r += (s.passesOk / s.passes - 0.8) * 1.5;
  const defensive = m.pos === 'GK' || m.pos === 'DC' || m.pos === 'DL' || m.pos === 'DR';
  if (m.pos === 'GK') r += 0.2 * s.saves;
  if (defensive) r += conceded === 0 ? 0.4 : -0.2 * s.conceded;
  r += goalDiff > 0 ? 0.25 : goalDiff < 0 ? -0.25 : 0;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}
