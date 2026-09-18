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

export interface PStats {
  passes: number; passesOk: number; keyPasses: number; shots: number; onTarget: number; goals: number; assists: number;
  tackles: number; dribbles: number; saves: number; fouls: number; yellows: number; red: boolean; injured: boolean; conceded: number;
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
}

interface Team {
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
}

/** registro delle azioni: diagnostica del bilanciamento e, in F6, sorgente del replay 2D */
export interface TraceStep {
  half: number;
  t: number;
  side: 0 | 1;
  kind: 'pass' | 'dribble' | 'shot' | 'cross';
  bx: number;
  by: number;
  tx?: number;
  ty?: number;
  p?: number;
  xg?: number;
  pressure: number;
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

const newPStats = (from: number): PStats => ({ passes: 0, passesOk: 0, keyPasses: 0, shots: 0, onTarget: 0, goals: 0, assists: 0, tackles: 0, dribbles: 0, saves: 0, fouls: 0, yellows: 0, red: false, injured: false, conceded: 0, injuryCtx: 'contact', from, to: 90 });
const newSide = (): SideStats => ({ possession: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** chi va a prendere un cross: testa, coraggio, e la punta di peso ha la precedenza */
const aerialScore = (m: MP) => m.p.attrs.heading + m.p.attrs.bravery / 2 + m.role.aerial;
/** logit personale del giorno, centrato sul giocatore "normale" (morale 65, condizione ≥ 80, modulo conosciuto) */
const dayMod = (p: Player, fam: number) =>
  (FLAGS.psychology ? MATCH.moraleK * (p.psych.morale - 65) : 0) - MATCH.sharpK * Math.max(0, 80 - p.condition.sharpness)
  - MATCH.famK * Math.max(0, 1 - fam / 90);
const mp = (player: Player, slot: Slot, role: RoleId, fam: number, from = 0): MP =>
  ({ p: player, pos: slot.pos, hx: slot.x, hy: slot.y, roleId: role, role: ROLES[role], marked: 0, x: slot.x, y: slot.y, tx: slot.x, ty: slot.y,
    energy: player.condition.fitness, mod: dayMod(player, fam), on: true, st: newPStats(from) });

export function simulate(rng: Rng, setups: [TeamSetup, TeamSetup], trace?: TraceStep[]): SimOutput {
  const teams = setups.map((s, i) => {
    const on = s.xi.map((e) => mp(e.player, e.slot, e.role, s.familiarity));
    return { side: i as 0 | 1, tactic: s.tactic, baseMentality: s.mentality, mentality: s.mentality, on, bench: [...s.bench], played: [...on], subs: MATCH.maxSubs, stats: newSide(), fam: s.familiarity };
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
  function runTo(m: MP, x: number, y: number, dt: number) {
    const dx = x - m.x, dy = y - m.y;
    const d = len(dx, dy);
    const max = dt * MATCH.runSpeed * (0.7 + 0.3 * (m.p.attrs.pace + m.p.attrs.acceleration) / 40) * (0.6 + 0.4 * m.energy / 100);
    if (d <= max) { m.x = x; m.y = y; } else { m.x += (dx * max) / d; m.y += (dy * max) / d; }
  }

  /** impegno difensivo: con mentalità offensiva si rientra meno e si pressa peggio */
  const cover = (tm: Team) => 1 - MATCH.mentalityCover * (tm.mentality - 3);

  function place() {
    const dt = Math.min(30, Math.max(0.5, clock() - lastPlace));
    lastPlace = clock();
    const att = teams[s], def = teams[1 - s]!;
    const mmA = att.mentality - 3, wf = WIDTH[att.tactic.width]!;
    for (const m of att.on) {
      if (m === carrier) { m.x = bx; m.y = by; continue; }
      if (m.pos === 'GK') {
        const gkMax = m.roleId === 'sweeperKeeper' ? 2.4 : 1.6; // il portiere libero accompagna la linea
        runTo(m, Math.min(gkMax, 0.6 + Math.max(0, bx - 6) * 0.1), 4, dt);
        continue;
      }
      // la squadra sale a blocco secondo il ruolo di ognuno (roles.ts)
      const rl = m.role;
      let x = Math.max(m.hx, rl.baseX) + rl.push + (bx - 6) * rl.follow + MATCH.mentalityPush * mmA;
      // negli ultimi 30 metri chi sa inserirsi attacca l'area
      if (bx >= 8 && rl.runs) x += (m.p.attrs.offTheBall / 20) * MATCH.boxRun;
      // movimento senza palla: smarcamenti che aprono (o chiudono) le linee di passaggio
      const mv = MATCH.offBallMove * (0.5 + m.p.attrs.offTheBall / 20);
      const side = m.hy > 4.3 ? 1 : m.hy < 3.7 ? -1 : 0; // da che lato gioca, per allargarsi o stringere
      runTo(m, clamp(x + (rng.next() - 0.5) * mv, 0.3, rl.maxX),
        clamp(4 + (m.hy - 4) * wf + rl.dy * side + (by - 4) * 0.25 + (rng.next() - 0.5) * mv * 1.5, 0.2, 7.8), dt);
    }
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
    for (const m of def.on) runTo(m, m.tx, m.ty, dt);
  }

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
    place();
  }

  const best = (tm: Team, f: (m: MP) => number, filter: (m: MP) => boolean = () => true) =>
    tm.on.filter(filter).reduce((a, b) => (f(b) > f(a) ? b : a), tm.on[0]!);

  function removeFromPitch(tm: Team, m: MP) {
    m.on = false;
    m.st.to = minute();
    tm.on = tm.on.filter((x) => x !== m);
    if (carrier === m) carrier = nearest(tm, m.x, m.y);
  }

  function substitute(tm: Team, out: MP): boolean {
    if (tm.subs <= 0 || tm.bench.length === 0) return false;
    const inP = tm.bench.reduce((a, b) => (ratingAt(b, out.pos) > ratingAt(a, out.pos) ? b : a));
    tm.bench = tm.bench.filter((b) => b !== inP);
    const m = mp(inP, { pos: out.pos, x: out.hx, y: out.hy }, out.roleId, tm.fam, minute()); // entra nello stesso ruolo
    m.x = out.x; m.y = out.y;
    tm.on = tm.on.map((x) => (x === out ? m : x));
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

  function step() {
    const att = teams[s], def = teams[1 - s]!;
    place();
    const defX = def.on.map((m) => 12 - m.x), defY = def.on.map((m) => 8 - m.y);
    const cv = cover(def);
    const defAnt = def.on.map((m) => (0.6 + 0.03 * m.p.attrs.anticipation) * cv);
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

  /** esegue l'opzione scelta dal portatore */
  function act(att: Team, def: Team, c: MP, defX: number[], defY: number[], o: Option) {
    if (trace) {
      trace.push({ half, t, side: s, kind: o.kind, bx, by, pressure: 0,
        ...(o.kind === 'pass' || o.kind === 'dribble' ? { tx: o.tx, ty: o.ty, p: o.p } : o.kind === 'shot' ? { xg: o.xg } : { p: o.p }) });
    }
    switch (o.kind) {
      case 'pass': {
        att.stats.passes++; c.st.passes++;
        if (o.off > 0 && rng.next() < o.off) {
          att.stats.offsides++;
          t += MATCH.restartTime;
          gain(def, nearest(def, 12 - o.tx, 8 - o.ty));
        } else if (rng.next() < o.p) {
          att.stats.passesOk++; c.st.passesOk++;
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
          bx = o.tx; by = o.ty;
          lastPass = null;
          t += MATCH.dribbleTime;
        } else {
          const w = tk ?? nearest(def, 12 - bx, 8 - by);
          w.st.tackles++; def.stats.tackles++;
          t += MATCH.turnoverTime + 1;
          gain(def, w);
        }
        break;
      }
      case 'shot':
        shoot(c, o.xg, 'open');
        break;
      case 'cross': {
        att.stats.passes++; c.st.passes++;
        t += MATCH.passTime;
        if (rng.next() < o.p) {
          att.stats.passesOk++; c.st.passesOk++;
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
  for (half = 1; half <= 2; half++) {
    t = 0;
    const length = 45 * 60 + (half === 1 ? rng.int(0, 3) : rng.int(2, 6)) * 60;
    kickoff(half === 1 ? 0 : 1);
    while (t < length) {
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
          const tired = tm.on.filter((m) => m.pos !== 'GK').sort((a, b) => a.energy - b.energy)[0];
          if (tired && tired.energy < MATCH.subEnergy) substitute(tm, tired);
        }
      }
      for (const sc of scheduled) if (sc.at <= min && sc.who.on && !sc.who.st.injured) injure(sc.team, sc.who, sc.ctx);
    }
  }

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
  return { result: { hg: score[0], ag: score[1], events, stats: [teams[0].stats, teams[1].stats], ratings }, played: [teams[0].played, teams[1].played] };
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
