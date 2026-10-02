// Posizioni dei 22 (GUIDA §6.2 punto 1). Ognuno ha una posizione "ideale" (modulo + palla + ruolo) e ci corre a
// velocità limitata: dopo una palla persa chi era sbilanciato in avanti deve rientrare, ed è da lì che nascono i
// contropiedi. Col registro acceso (partita guardata) lo stesso intervallo si gioca a passi fissi (F6.2).
import { MATCH } from '../balance.ts';
import { habit } from '../traits.ts';
import { len, sigmoid } from './pitch.ts';
import { clamp } from '../util.ts';
import { clock, cover, gx, gy, minute, type MatchState, type MP, type Team, type TraceStep } from './state.ts';

const WIDTH = MATCH.widthLevels;
const LINE = MATCH.lineLevels;
const PRESS_STEP = MATCH.pressStep;

/** accelerazione e frenata: la palla non viaggia a velocità costante */
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (1 - u) ** 2 * 2);

function runTo(m: MP, x: number, y: number, dt: number, inertia: boolean) {
  const dx = x - m.x, dy = y - m.y;
  const d = len(dx, dy);
  const vmax = MATCH.runSpeed * (0.7 + 0.3 * (m.a.pace + m.a.acceleration) / 40) * (0.6 + 0.4 * m.energy / 100);
  if (!inertia) { // il motore: a salti, alla velocità massima (decide le posizioni vere)
    const max = dt * vmax;
    if (d <= max) { m.x = x; m.y = y; } else { m.x += (dx * max) / d; m.y += (dy * max) / d; }
    return;
  }
  // racconto (piano 2D, fluidità): verso il bersaglio con accelerazione limitata, frenando per arrivarci (v = √(2·a·d))
  const acc = MATCH.runAccel * (0.8 + 0.2 * m.a.acceleration / 10);
  const want = Math.min(vmax, Math.sqrt(2 * acc * d));
  const wx = d > 1e-6 ? (dx / d) * want : 0, wy = d > 1e-6 ? (dy / d) * want : 0;
  let ax = wx - m.vx, ay = wy - m.vy;
  const al = len(ax, ay), dv = acc * dt;
  if (al > dv) { ax *= dv / al; ay *= dv / al; }
  m.vx += ax; m.vy += ay;
  m.x += m.vx * dt; m.y += m.vy * dt;
}

/** gli smarcamenti si estraggono una volta per azione: dentro l'azione il movimento è continuo, non nervoso */
function jitter(st: MatchState) {
  for (const m of st.teams[st.s].on) {
    m.run = false;
    if (m === st.carrier || m.pos === 'GK') continue;
    m.jx = (st.rng.next() - 0.5) * MATCH.offBallMove;
    m.jy = (st.rng.next() - 0.5) * MATCH.offBallMove * 1.5;
    // inserimento: dalla trequarti chi ha le corse nel ruolo attacca l'area (la punta ci sta già); chi gioca largo
    // solo col pallone sull'altra fascia, a chiudere sul secondo palo (sulla sua resta largo per il cross)
    const wide = m.hy > 4.3 ? 1 : m.hy < 3.7 ? -1 : 0;
    if (st.bx >= MATCH.runFromX && m.pos !== 'ST' && (m.role.runs || m.ins.runs === 2) && !(wide && (st.by - 4) * wide > 0)) {
      m.run = st.rng.next() < MATCH.runInsert * MATCH.insRuns[m.ins.runs ?? 1]! * m.a.offTheBall / 10
        * habit.runs(m.tr); // tratti: si inserisce, resta dietro
      if (m.run) m.runRoll = st.rng.next();
    }
  }
}

/** il reparto più arretrato del modulo (x minima fra i dieci di movimento): da lì si misura la forma del blocco */
function backX(tm: Team, out: boolean) {
  let lo = 12;
  for (const m of tm.on) if (m.pos !== 'GK') lo = Math.min(lo, out ? m.ox : Math.max(m.hx, m.role.baseX));
  return lo;
}

function aimAtt(st: MatchState) {
  const att = st.teams[st.s];
  const { bx, by } = st;
  const mmA = att.mentality - 3, wf = WIDTH[att.tactic.width]! * MATCH.attWidth;
  // la squadra sale a blocco (piano 2D, fase 3): la linea arretrata sta a blockAttGap dietro la palla, gli altri
  // reparti alla loro distanza nel modulo; il ruolo sposta poco (follow) attorno al blocco
  const line = clamp(bx - MATCH.blockAttGap, MATCH.blockAttMin, MATCH.blockAttMax), back = backX(att, false);
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
    let x = line + (Math.max(m.hx, rl.baseX) - back) * MATCH.blockAttDepth + rl.push + (bx - 6) * (rl.follow - 0.5) + MATCH.mentalityPush * mmA;
    // negli ultimi 30 metri chi sa inserirsi attacca l'area
    const runs = MATCH.insRuns[m.ins.runs ?? 1]!; // istruzione individuale: inserimenti di meno o di più
    if (bx >= 8 && (rl.runs || m.ins.runs === 2)) x += (m.a.offTheBall / 20) * MATCH.boxRun * runs;
    if (m.ins.stayBack) x = Math.min(x, MATCH.stayBackX);
    // movimento senza palla: smarcamenti che aprono (o chiudono) le linee di passaggio
    const mv = 0.5 + m.a.offTheBall / 20;
    const side = m.hy > 4.3 ? 1 : m.hy < 3.7 ? -1 : 0; // da che lato gioca, per allargarsi o stringere
    const wide = side * MATCH.insWidth * ((m.ins.width ?? 1) - 1); // "resta largo" / "stringi"
    m.tx = clamp(x + m.jx * mv, 0.3, rl.maxX);
    m.ty = clamp(4 + (m.hy - 4) * wf + rl.dy * side + wide + (by - 4) * 0.25 + m.jy * mv, 0.2, 7.8);
    if (m.run) { m.tx = Math.max(m.tx, MATCH.runBoxX); m.ty = 4 + (m.ty - 4) * MATCH.runNarrow; }
  }
}

/** il blocco senza palla: ognuno al suo posto nel modulo accorciato, e chi è più vicino adesso va in pressione */
function shapeDef(def: Team, dbx: number, dby: number): MP | undefined {
  const shift = LINE[def.tactic.line]! + 0.25 * (def.mentality - 3);
  // blocco senza palla (piano 2D, fase 3): la linea difensiva a blockDefGap dietro la palla, fra un minimo vicino
  // all'area e un massimo verso la metà campo; gli altri reparti alla loro distanza nel modulo, accorciata
  // (di più se la mentalità è prudente); il ruolo senza palla (oHold) allunga o accorcia la sua
  const depth = MATCH.blockDefDepth + MATCH.mentalityCompact * (def.mentality - 3);
  const line = clamp(dbx - MATCH.blockDefGap, MATCH.blockDefMin, MATCH.blockDefMax) + shift, back = backX(def, true);
  let presser: MP | undefined, best = Infinity;
  for (const m of def.on) {
    if (m.pos === 'GK') { m.tx = 0.6; m.ty = 4; continue; }
    m.tx = clamp(line + (m.ox - back) * depth * m.oHold, 0.9, 11.5); // modulo e ruolo senza palla
    m.ty = clamp(4 + (m.oy - 4) * MATCH.blockDefWidth + (dby - 4) * 0.35, 0.2, 7.8);
    const d = len(m.x - dbx, m.y - dby); // in pressione va chi è davvero più vicino adesso
    if (d < best) { best = d; presser = m; }
  }
  return presser;
}

/** a zona: si tiene il posto nella linea, e si prende l'uomo solo vicino alla palla o in area */
const inMarkZone = (st: MatchState, m: MP, dby: number) => m.tx <= MATCH.markBoxX || len(m.tx - (12 - st.bx), m.ty - dby) <= MATCH.markNearBall;

/**
 * marcatura a uomo nella propria metà campo: ognuno prende l'attaccante libero più vicino (uno a testa),
 * restando tra lui e la porta
 */
function markUp(st: MatchState, att: Team, def: Team, presser: MP | undefined, dby: number) {
  const stamp = ++st.markStamp; // "già marcato" senza allocare un Set a ogni azione
  // prima chi ha la marcatura stretta su un ruolo avversario: prende quell'uomo, più vicino
  for (const m of def.on) {
    if (!m.ins.mark || m === presser || m.pos === 'GK' || m.tx > 5) continue;
    const target = att.on.find((a) => a.pos === m.ins.mark && a !== st.carrier && a.marked !== stamp);
    if (!target) continue;
    target.marked = stamp;
    m.marked = -stamp; // già sistemato: il giro normale lo salta
    const tight = Math.min(1, MATCH.markTightness * MATCH.markStrict * cover(def));
    m.tx += (12 - target.x - MATCH.markGoalSide - m.tx) * tight;
    m.ty += (8 - target.y - m.ty) * tight;
  }
  const r = MATCH.markRange, r2 = r * r + 0.004;
  for (const m of def.on) {
    if (m === presser || m.pos === 'GK' || m.tx > 5 || m.marked === -stamp) continue;
    if (!inMarkZone(st, m, dby)) continue;
    let target: MP | undefined, bd: number = r;
    for (const a of att.on) {
      if (a === st.carrier || a.pos === 'GK' || a.marked === stamp) continue;
      const qx = 12 - a.x - m.tx, qy = 8 - a.y - m.ty;
      if (qx * qx + qy * qy > r2) continue; // oltre markRange zone non lo marca (margine per restare esatti sul bordo)
      const d = len(qx, qy);
      if (d < bd) { bd = d; target = a; }
    }
    if (target) {
      target.marked = stamp;
      const tight = MATCH.markTightness * cover(def) * runLag(target, m);
      m.tx += (12 - target.x - MATCH.markGoalSide - m.tx) * tight;
      m.ty += (8 - target.y - m.ty) * tight;
    } else {
      // difensore in più, senza uomo: esce a schermare lo spazio davanti all'area, verso la palla
      m.tx += MATCH.spareStepUp;
      m.ty += (dby - m.ty) * 0.3;
    }
  }
}

/**
 * chi si inserisce contro chi lo segue (Movimento senza palla, Accelerazione, Velocità contro Posizionamento, Anticipo,
 * Velocità): chi perde il duello resta indietro, a `runLag` della marcatura. 1 se non c'è inserimento
 */
function runLag(runner: MP, m: MP) {
  if (!runner.run) return 1;
  const a = runner.a, d = m.a;
  const edge = (a.offTheBall + a.acceleration + a.pace - d.positioning - d.anticipation - d.pace) / 3;
  return runner.runRoll < sigmoid(MATCH.runDuelBase + MATCH.runDuelK * edge) ? MATCH.runLag : 1;
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

const move = (st: MatchState, tm: Team, dt: number) => {
  for (const m of tm.on) {
    // chi ha o insegue la palla non ha inerzia nel racconto: deve arrivarci in tempo (la velocità resta coerente)
    const chase = m === st.holder || m === st.meet, x0 = m.x, y0 = m.y;
    runTo(m, m.tx, m.ty, dt, st.narr && !chase);
    if (st.narr && chase && dt > 0) { m.vx = (m.x - x0) / dt; m.vy = (m.y - y0) / dt; }
  }
};
/** un passo di movimento: prima si muove chi ha palla, poi la difesa si riposiziona su quello che vede */
function advance(st: MatchState, dt: number) {
  aimAtt(st);
  move(st, st.teams[st.s], dt * st.wx.speed); // campo pesante: si corre più piano
  aimDef(st);
  move(st, st.teams[1 - st.s]!, dt * st.wx.speed);
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

type P = { x: number; y: number };
const meters = (a: P, b: P) => len((b.x - a.x) * 8.75, (b.y - a.y) * 8.5);
const has = (f: TraceStep, k: string) => !!f.beats?.some((b) => b.kind === k);

/** dove finisce il tiro: in rete se è gol, contro chi lo mura, altrimenti davanti alla linea (parata o fuori) */
function shotTarget(f: TraceStep, goal: boolean, g0: P, wp: P): P {
  const gx = f.side === 0 ? 1 : -1, y = clamp(4 + (f.by - 4) * 0.15, 3.65, 4.35);
  if (goal) return { x: 6 + gx * 6.2, y };
  if (has(f, 'block')) return { x: g0.x + (wp.x - g0.x) * 0.25, y: g0.y + (y - g0.y) * 0.25 }; // contro chi lo mura
  if (has(f, 'save') || has(f, 'parry') || has(f, 'claim')) return { x: 6 + gx * 5.4, y: 4 + (y - 4) * 0.5 }; // sulle mani del portiere
  return { x: 6 + gx * 6.05, y: f.by < 4 ? 3.35 : 4.65 }; // fuori, accanto al palo
}

/**
 * il racconto della palla nell'intervallo (piano 2D, fase 2): dove va, quanto dura il volo (distanza / velocità, non
 * una quota fissa), quanto resta a velocità vera nel gioco fermo (il gol). Intercetto: la palla si ferma sulla
 * traiettoria dove la prende il difensore. Contrasto: resta al portatore finché il difensore non gli è addosso.
 * Tiro: entra in rete se è gol, altrimenti si ferma davanti alla linea (parata, muro, fuori: poi riparte da g1).
 */
function ballPlan(f: TraceStep | null, fresh: boolean, dead: boolean, g0: P, g1: P, next: MP, dt: number): { wp: P; flight: number; live: number } {
  let wp = waypoint(f, fresh, g1);
  if (!f || !fresh) return { wp, flight: dead ? 0.2 : MATCH.ballFlight, live: 0 };
  if (f.kind === 'dribble') return { wp, flight: 0, live: 0 }; // conduzione: la palla è ai piedi di chi corre (glue)
  if (f.kind === 'tackle') return { wp: g0, flight: MATCH.tackleContest, live: 0 };
  const goal = has(f, 'goal'); // anche di testa su cross, da corner o da punizione
  if (f.kind === 'shot' || goal) wp = shotTarget(f, goal, g0, wp);
  else if (f.kind === 'pass' && f.to !== undefined && f.to !== next.p.id) {
    // intercettato: il punto della traiettoria più vicino a dove finisce chi l'ha presa
    const vx = wp.x - g0.x, vy = wp.y - g0.y, l2 = vx * vx + vy * vy || 1;
    const k = clamp(((g1.x - g0.x) * vx + (g1.y - g0.y) * vy) / l2, 0.25, 1);
    wp = { x: g0.x + vx * k, y: g0.y + vy * k };
  }
  const speed = f.kind === 'shot' || goal ? MATCH.ballShot : f.high || f.kind === 'cross' ? MATCH.ballLong : MATCH.ballPass;
  const flight = clamp(meters(g0, wp) / speed / dt, 0.04, 0.9);
  // gol: volo e palla in rete a velocità vera, poi il ritorno a centrocampo scorre veloce
  return { wp, flight, live: goal && dead ? Math.min(0.95, flight + MATCH.goalHold / dt) : 0 };
}

/** un passo fisso dell'intervallo: la palla sulla sua traiettoria, i 22 che si muovono e si ricongiungono */
function replayStep(st: MatchState, k: number, n: number, dt: number, path: ReplayPath) {
  const { g0, g1, wp, flight, live, fresh, f, next, all, sx, sy, ex, ey, dead } = path;
  const glue = !dead && fresh;
  const u = k / n;
  const v = ease(Math.min(1, u / flight));
  let px = g0.x + (wp.x - g0.x) * v, py = g0.y + (wp.y - g0.y) * v;
  if (live > 0) { // gol: la palla resta in rete, e torna al centro solo alla fine
    if (u > 0.92) { px = g1.x; py = g1.y; }
  } else if (glue && u >= flight) { // dopo il volo la palla va ai piedi di chi l'ha presa e lo segue
    const w = flight >= 1 ? 1 : Math.min(1, (u - flight) / MATCH.ballGlue);
    px += (gx(st, next.x) - px) * w;
    py += (gy(st, next.y) - py) * w;
  } else if (u > flight) { // raccordo verso dove riparte davvero l'azione (rimessa, rinvio, recupero)
    const w = (u - flight) / (1 - flight);
    px += (g1.x - px) * w;
    py += (g1.y - py) * w;
  }
  st.bx = st.s === 0 ? px : 12 - px;
  st.by = st.s === 0 ? py : 8 - py;
  const flying = (u < flight && fresh && f!.kind !== 'dribble') || (live > 0 && u <= 0.92); // palla in rete: di nessuno
  st.holder = flying ? null : next;
  st.meet = flying && live === 0 ? next : null;
  st.snap = false;
  st.narr = true;
  advance(st, dt / n);
  st.narr = false;
  st.snap = true;
  const w = u ** MATCH.rejoinPow; // ricongiungimento alle posizioni autorevoli (tardi: prima vale l'inerzia)
  all.forEach((m, i) => {
    m.x += (sx[i]! + (ex[i]! - sx[i]!) * u - m.x) * w;
    m.y += (sy[i]! + (ey[i]! - sy[i]!) * u - m.y) * w;
  });
  emit(st, dead && u > live);
  st.playAt += dt / n / (dead && u > live ? MATCH.deadSpeed : 1);
}

interface ReplayPath {
  g0: { x: number; y: number }; g1: { x: number; y: number }; wp: { x: number; y: number };
  flight: number; live: number; fresh: boolean; f: TraceStep | null; next: MP; dead: boolean;
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
  const { wp, flight, live } = ballPlan(f, fresh, dead, g0, g1, next, dt);
  const n = Math.max(1, Math.ceil(dt / MATCH.frameTick));
  const path: ReplayPath = { g0, g1, wp, flight, live, fresh, f, next, dead, all, sx, sy, ex, ey };
  for (let k = 1; k <= n; k++) replayStep(st, k, n, dt, path);
  all.forEach((m, i) => { m.x = ex[i]!; m.y = ey[i]!; });
  st.holder = next;
  st.meet = null;
  st.bx = st.s === 0 ? g1.x : 12 - g1.x;
  st.by = st.s === 0 ? g1.y : 8 - g1.y;
  // la prossima azione parte dai piedi di chi ha la palla a schermo (solo racconto: st.bx resta quella del motore)
  st.lastBall = !dead && fresh ? { x: gx(st, next.x), y: gy(st, next.y) } : g1;
}

/** i 22 si spostano fino a questo momento: a salti nel sim-cli, a passi fissi nella partita guardata */
export const settle = (st: MatchState) => (st.trace ? replay(st) : place(st));

export function kickoff(st: MatchState, side: 0 | 1) {
  st.s = side; st.bx = 6; st.by = 4; st.lastPass = null; st.chain = 0; st.poss = { t: st.t, half: st.half, x: 6, acts: 0 };
  const tm = st.teams[side];
  st.carrier = tm.on.find((m) => m.pos === 'ST' || m.pos === 'AMC') ?? tm.on[tm.on.length - 1]!;
  settle(st);
}
