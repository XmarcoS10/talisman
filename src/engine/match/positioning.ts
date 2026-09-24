// Posizioni dei 22 (GUIDA §6.2 punto 1). Ognuno ha una posizione "ideale" (modulo + palla + ruolo) e ci corre a
// velocità limitata: dopo una palla persa chi era sbilanciato in avanti deve rientrare, ed è da lì che nascono i
// contropiedi. Col registro acceso (partita guardata) lo stesso intervallo si gioca a passi fissi (F6.2).
import { MATCH } from '../balance.ts';
import { len } from './pitch.ts';
import { clamp } from '../util.ts';
import { clock, cover, gx, gy, minute, type MatchState, type MP, type Team, type TraceStep } from './state.ts';

const WIDTH = [0.8, 1, 1.2];
const LINE = [-0.6, 0, 0.6];
const PRESS_STEP = [0.35, 0.5, 0.7]; // quanto esce il pressatore verso il portatore

/** accelerazione e frenata: la palla non viaggia a velocità costante */
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (1 - u) ** 2 * 2);

function runTo(m: MP, x: number, y: number, dt: number) {
  const dx = x - m.x, dy = y - m.y;
  const d = len(dx, dy);
  const max = dt * MATCH.runSpeed * (0.7 + 0.3 * (m.p.attrs.pace + m.p.attrs.acceleration) / 40) * (0.6 + 0.4 * m.energy / 100);
  if (d <= max) { m.x = x; m.y = y; } else { m.x += (dx * max) / d; m.y += (dy * max) / d; }
}

/** gli smarcamenti si estraggono una volta per azione: dentro l'azione il movimento è continuo, non nervoso */
function jitter(st: MatchState) {
  for (const m of st.teams[st.s].on) {
    if (m === st.carrier || m.pos === 'GK') continue;
    m.jx = (st.rng.next() - 0.5) * MATCH.offBallMove;
    m.jy = (st.rng.next() - 0.5) * MATCH.offBallMove * 1.5;
  }
}

function aimAtt(st: MatchState) {
  const att = st.teams[st.s];
  const { bx, by } = st;
  const mmA = att.mentality - 3, wf = WIDTH[att.tactic.width]!;
  for (const m of att.on) {
    if (m === st.holder) {
      if (st.snap) { m.x = bx; m.y = by; }
      m.tx = bx; m.ty = by;
      continue;
    }
    if (m === st.meet) { m.tx = bx; m.ty = by; continue; } // va incontro alla palla in viaggio
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

/** il blocco senza palla: ognuno al suo posto nel modulo accorciato, e chi è più vicino adesso va in pressione */
function shapeDef(def: Team, dbx: number, dby: number): MP | undefined {
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
  return presser;
}

/**
 * marcatura a uomo nella propria metà campo: ognuno prende l'attaccante libero più vicino (uno a testa),
 * restando tra lui e la porta
 */
function markUp(st: MatchState, att: Team, def: Team, presser: MP | undefined, dby: number) {
  const stamp = ++st.markStamp; // "già marcato" senza allocare un Set a ogni azione
  for (const m of def.on) {
    if (m === presser || m.pos === 'GK' || m.tx > 5) continue;
    let target: MP | undefined, bd = 2;
    for (const a of att.on) {
      if (a === st.carrier || a.pos === 'GK' || a.marked === stamp) continue;
      const qx = 12 - a.x - m.tx, qy = 8 - a.y - m.ty;
      if (qx * qx + qy * qy > 4.004) continue; // oltre 2 zone non lo marca (margine per restare esatti sul bordo)
      const d = len(qx, qy);
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
}

function aimDef(st: MatchState) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const dbx = 12 - st.bx, dby = 8 - st.by; // palla vista dalla difesa
  const presser = shapeDef(def, dbx, dby);
  markUp(st, att, def, presser, dby);
  // il più vicino esce in pressione sul portatore
  if (presser) {
    const f = PRESS_STEP[def.tactic.pressing]!;
    presser.tx += (dbx - presser.tx) * f;
    presser.ty += (dby - presser.ty) * f;
  }
}

const move = (tm: Team, dt: number) => { for (const m of tm.on) runTo(m, m.tx, m.ty, dt); };
/** un passo di movimento: prima si muove chi ha palla, poi la difesa si riposiziona su quello che vede */
function advance(st: MatchState, dt: number) {
  aimAtt(st);
  move(st.teams[st.s], dt);
  aimDef(st);
  move(st.teams[1 - st.s]!, dt);
}

/** senza registro il campo fa un salto solo per azione: è la modalità del sim-cli e del mondo che avanza */
function place(st: MatchState) {
  const dt = Math.min(30, Math.max(0.5, clock(st) - st.lastPlace));
  st.lastPlace = clock(st);
  st.holder = st.carrier;
  st.meet = null;
  jitter(st);
  advance(st, dt);
}

const roster = (st: MatchState) => {
  if (st.idsDirty) {
    st.ids0 = [];
    for (const tm of st.teams) for (const m of tm.on) st.ids0.push(m.p.id);
    st.idsDirty = false;
  }
  return st.ids0;
};

function emit(st: MatchState, dead: boolean) {
  const ids = roster(st);
  const xy = new Float32Array(ids.length * 2);
  let k = 0;
  for (const tm of st.teams)
    for (const m of tm.on) {
      xy[k++] = tm.side === 0 ? m.x : 12 - m.x;
      xy[k++] = tm.side === 0 ? m.y : 8 - m.y;
    }
  st.track.push({
    at: st.playAt, min: minute(st), half: st.half, ids, n0: st.teams[0].on.length, xy, bx: gx(st, st.bx), by: gy(st, st.by),
    carrier: st.holder ? st.holder.p.id : 0, to: st.meet ? st.meet.p.id : 0, sc0: st.score[0], sc1: st.score[1],
    step: Math.max(0, st.trace!.length - 1), dead,
  });
}

/**
 * dove era indirizzata la palla: destinatario, zona di conduzione, porta.
 * Se l'azione è già stata raccontata (intervallo a vuoto, es. dopo il calcio d'inizio) la palla non riparte.
 */
function waypoint(f: TraceStep | null, fresh: boolean, g1: { x: number; y: number }) {
  if (!fresh || !f) return g1;
  if (f.kind === 'shot') return { x: f.side === 0 ? 12 : 0, y: 4 };
  return f.tx !== undefined ? { x: f.tx, y: f.ty! } : g1;
}

/** un passo fisso dell'intervallo: la palla sulla sua traiettoria, i 22 che si muovono e si ricongiungono */
function replayStep(st: MatchState, k: number, n: number, dt: number, path: ReplayPath) {
  const { g0, g1, wp, flight, fresh, f, next, all, sx, sy, ex, ey, dead } = path;
  const u = k / n;
  const v = ease(Math.min(1, u / flight));
  let px = g0.x + (wp.x - g0.x) * v, py = g0.y + (wp.y - g0.y) * v;
  if (u > flight) { // raccordo verso dove riparte davvero l'azione (rimessa, rinvio, recupero)
    const w = (u - flight) / (1 - flight);
    px += (g1.x - px) * w;
    py += (g1.y - py) * w;
  }
  st.bx = st.s === 0 ? px : 12 - px;
  st.by = st.s === 0 ? py : 8 - py;
  const flying = u < flight && fresh && f!.kind !== 'dribble';
  st.holder = flying ? null : next;
  st.meet = flying ? next : null;
  st.snap = false;
  advance(st, dt / n);
  st.snap = true;
  const w = u * u; // ricongiungimento alle posizioni autorevoli
  all.forEach((m, i) => {
    m.x += (sx[i]! + (ex[i]! - sx[i]!) * u - m.x) * w;
    m.y += (sy[i]! + (ey[i]! - sy[i]!) * u - m.y) * w;
  });
  emit(st, dead);
  st.playAt += dt / n / (dead ? MATCH.deadSpeed : 1);
}

interface ReplayPath {
  g0: { x: number; y: number }; g1: { x: number; y: number }; wp: { x: number; y: number };
  flight: number; fresh: boolean; f: TraceStep | null; next: MP; dead: boolean;
  all: MP[]; sx: number[]; sy: number[]; ex: number[]; ey: number[];
}

/**
 * col registro acceso lo stesso intervallo si gioca a passi fissi: la palla viaggia e decelera, i 22
 * ricalcolano la posizione ideale a ogni passo. È da qui che nascono coperture e inserimenti visibili.
 *
 * Vincolo: il bilanciamento non deve cambiare. Le posizioni di fine intervallo sono quelle del motore
 * (calcolate prima, con lo stesso consumo di casualità), i passi intermedi sono il racconto di come ci
 * si è arrivati e vi si ricongiungono (peso `w`, che vale 1 all'ultimo passo).
 */
function replay(st: MatchState) {
  const trace = st.trace!;
  const dt = Math.min(30, Math.max(0.5, clock(st) - st.lastPlace));
  st.lastPlace = clock(st);
  const f = trace.length ? trace[trace.length - 1]! : null; // l'azione appena eseguita
  const dead = dt >= MATCH.deadFrom;
  const g0 = st.lastBall;
  const g1 = { x: gx(st, st.bx), y: gy(st, st.by) };
  const next = st.carrier; // chi avrà la palla a fine intervallo

  const all = [...st.teams[0].on, ...st.teams[1].on];
  const sx = all.map((m) => m.x), sy = all.map((m) => m.y);
  st.holder = st.carrier;
  st.meet = null;
  jitter(st);
  advance(st, dt); // posizioni autorevoli
  const ex = all.map((m) => m.x), ey = all.map((m) => m.y);
  all.forEach((m, i) => { m.x = sx[i]!; m.y = sy[i]!; });

  const fresh = f !== null && trace.length - 1 !== st.lastStep;
  st.lastStep = trace.length - 1;
  const wp = waypoint(f, fresh, g1);
  const flight = dead ? 0.2 : f && f.kind === 'dribble' ? 1 : MATCH.ballFlight;
  const n = Math.max(1, Math.ceil(dt / MATCH.frameTick));
  const path: ReplayPath = { g0, g1, wp, flight, fresh, f, next, dead, all, sx, sy, ex, ey };
  for (let k = 1; k <= n; k++) replayStep(st, k, n, dt, path);
  all.forEach((m, i) => { m.x = ex[i]!; m.y = ey[i]!; });
  st.holder = next;
  st.meet = null;
  st.bx = st.s === 0 ? g1.x : 12 - g1.x;
  st.by = st.s === 0 ? g1.y : 8 - g1.y;
  st.lastBall = g1;
}

/** i 22 si spostano fino a questo momento: a salti nel sim-cli, a passi fissi nella partita guardata */
export const settle = (st: MatchState) => (st.trace ? replay(st) : place(st));

export function kickoff(st: MatchState, side: 0 | 1) {
  st.s = side; st.bx = 6; st.by = 4; st.lastPass = null; st.chain = 0; st.poss = { t: st.t, half: st.half, x: 6, acts: 0 };
  const tm = st.teams[side];
  st.carrier = tm.on.find((m) => m.pos === 'ST' || m.pos === 'AMC') ?? tm.on[tm.on.length - 1]!;
  settle(st);
}
