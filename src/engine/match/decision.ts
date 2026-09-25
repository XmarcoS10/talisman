// Decisione del portatore di palla (GUIDA §6.2 punti 2-4).
// Ogni opzione ha: p = probabilità di riuscita, u = utilità attesa in "gol attesi".
// u = p · valore_dopo − (1 − p) · costo_della_perdita · avversione_al_rischio (+ preferenze tattiche).
// La scelta è un softmax con temperatura: Decisioni alte → quasi sempre l'opzione migliore.
import { FLAGS, MATCH } from '../balance.ts';
import type { Player, Tactic } from '../model.ts';
import type { Rng } from '../rng.ts';
import { len, lossCost, segDist, sigmoid, xG, xT } from './pitch.ts';
import type { Role } from './roles.ts';

/** giocatore in campo: posizione nel sistema della propria squadra (x verso la porta avversaria) */
export interface OnPitch {
  p: Player;
  x: number;
  y: number;
  energy: number;
  role: Role; // tendenze del ruolo (roles.ts)
  mod: number; // logit personale del giorno: morale, condizione partita, familiarità col modulo
}

export interface View {
  carrier: OnPitch;
  isGK: boolean;
  bx: number;
  by: number;
  mates: OnPitch[]; // squadra in campo (il portatore viene saltato)
  defs: OnPitch[]; // avversari in campo
  defX: number[]; // avversari nel sistema dell'attaccante
  defY: number[];
  defAnt: number[]; // peso di intercetto di ogni avversario (Anticipazione)
  pressure: number; // 0 … ~2.5
  offsideLine: number; // x oltre cui un compagno è in fuorigioco
  tactic: Tactic;
  mentality: number;
  bonus: number; // logit comune: casa, momentum, stanchezza del portatore
  chain: number; // passaggi consecutivi in questo possesso
}

export type Option =
  | { kind: 'pass'; to: OnPitch; tx: number; ty: number; p: number; off: number; u: number; w: number; deep: boolean; long?: boolean } // w: intesa (chem); deep: in profondità; long: rinvio lungo del portiere
  | { kind: 'dribble'; tx: number; ty: number; p: number; tackler: OnPitch | undefined; u: number }
  | { kind: 'shot'; xg: number; u: number }
  | { kind: 'cross'; p: number; u: number; low: boolean }; // p: che arrivi; low: palla bassa all'indietro dal fondo

const a = (pl: OnPitch, k: keyof Player['attrs']) => pl.p.attrs[k] - 11; // attributo centrato su 11
const NO_REL: Record<number, number> = {};
/** moltiplicatore del peso di scelta di un passaggio dalla relazione tra i due (−100…100): ±8% al massimo */
export const chem = (s: number | undefined) => (s === undefined ? 1 : 1 + (Math.max(-100, Math.min(100, s)) / 100) * MATCH.chemPass);

/** quello che serve a tutte le opzioni: quanto vale tenere palla, quanto costa perderla, la voglia di verticalizzare */
interface Ctx { keep: number; loss: number; direct: number; vision: number; rel: Record<number, number> }

function context(v: View): Ctx {
  const { carrier: c, bx, by, tactic } = v;
  const mm = v.mentality - 3; // −2 … +2
  const riskW = 1 - MATCH.mentalityRisk * mm; // mentalità offensiva = meno paura di perdere palla
  // perdere palla costa il valore regalato all'avversario + il valore del possesso stesso (K)
  const keep = MATCH.possessionValue * riskW;
  const loss = lossCost(bx, by) * riskW + keep;
  // verticalità: istruzione tattica + impazienza dopo una lunga serie di passaggi
  const direct = MATCH.directnessK * tactic.directness + MATCH.patience * Math.max(0, v.chain - 5) + c.role.direct;
  // spogliatoio in campo (§7.3): tra amici ci si cerca un po' di più, tra nemici un po' di meno
  return { keep, loss, direct, vision: MATCH.passVision * a(c, 'vision'), rel: FLAGS.psychology ? c.p.rel : NO_REL };
}

/** 1) PASSAGGI a ogni compagno (è il ciclo più caldo del gioco: niente allocazioni qui dentro) */
function passes(v: View, x: Ctx, out: Option[]) {
  const { carrier: c, bx, by, tactic, pressure } = v;
  const { keep, loss, direct, vision, rel } = x;
  const tempoMod = (1 - tactic.tempo) * 0.15; // ritmo alto = più errori
  const nd = v.defX.length;
  const lr = MATCH.laneRadius, mr = MATCH.markRadius;
  // parte del logit che dipende solo dal portatore
  const passLogit0 = MATCH.passBase - MATCH.passPress * pressure + MATCH.passSkill * a(c, 'passing') + tempoMod + v.bonus;
  for (const m of v.mates) {
    if (m === c) continue;
    const dx = m.x - bx, dy = m.y - by;
    const dist = len(dx, dy);
    if (dist < 0.5 || dist > 7 || dx < -4) continue; // nessuno gioca lanci di 60 m o retropassaggi di 35 m
    const minX = Math.min(bx, m.x) - lr, maxX = Math.max(bx, m.x) + lr;
    const minY = Math.min(by, m.y) - lr, maxY = Math.max(by, m.y) + lr;
    let lane = 0, mark = 0;
    for (let i = 0; i < nd; i++) {
      const X = v.defX[i]!, Y = v.defY[i]!;
      const ex = X - m.x, ey = Y - m.y;
      if (ex > -mr && ex < mr && ey > -mr && ey < mr) {
        const dm = len(ex, ey);
        if (dm < mr) mark += 1 - dm / mr;
      }
      if (X < minX || X > maxX || Y < minY || Y > maxY) continue; // lontano dalla linea di passaggio
      const d = segDist(X, Y, bx, by, m.x, m.y);
      if (d < lr) lane += (1 - d / lr) * v.defAnt[i]!;
    }
    const logit = passLogit0 - MATCH.passDist * dist - MATCH.passLane * lane - MATCH.passMark * mark
      + (dist > 3.5 ? vision : 0) + MATCH.passTouch * (m.p.attrs.firstTouch - 11);
    const p = sigmoid(logit);
    // fuorigioco: passaggi in avanti verso chi attacca la profondità vicino alla linea difensiva
    const edge = v.offsideLine - MATCH.offsideWindow;
    const off = dx > 1 && m.x > edge ? Math.min(0.6, MATCH.offsideBase + MATCH.offsidePerZone * (m.x - edge)) : 0;
    const pe = p * (1 - off);
    out.push({ kind: 'pass', to: m, tx: m.x, ty: m.y, p, off, u: pe * (xT(m.x, m.y) + keep) - (1 - pe) * loss + direct * dx, w: chem(rel[m.p.id]), deep: false });
  }
}

/** 1b) PALLA IN PROFONDITÀ nello spazio tra la linea difensiva e il portiere: punisce le linee alte */
function throughBalls(v: View, x: Ctx, out: Option[]) {
  const { carrier: c, bx, by, pressure } = v;
  const { keep, loss, direct, vision, rel } = x;
  const space = MATCH.gkLineX - v.offsideLine;
  if (!(space > 1 && bx < v.offsideLine - 0.5)) return;
  const tx = v.offsideLine + Math.min(space, MATCH.throughDepth);
  let defPace = 0; // il difensore più veloce vicino alla linea
  for (let i = 0; i < v.defX.length; i++) if (v.defX[i]! > v.offsideLine - 1.5) defPace = Math.max(defPace, v.defs[i]!.p.attrs.pace);
  for (const m of v.mates) {
    if (m === c || m.x < v.offsideLine - 1.5 || m.x <= bx) continue; // solo chi è già vicino alla linea
    const dist = len(tx - bx, m.y - by);
    const race = (m.p.attrs.pace + m.p.attrs.acceleration) / 2 - defPace; // corsa uomo contro uomo
    const p = sigmoid(MATCH.throughBase + MATCH.throughRace * race - MATCH.passDist * 0.6 * dist - MATCH.passPress * pressure
      + MATCH.passSkill * a(c, 'passing') + 2 * vision + v.bonus);
    const off = MATCH.throughOffside * (1 - (m.p.attrs.offTheBall - 11) * 0.04);
    const pe = p * (1 - off);
    out.push({ kind: 'pass', to: m, tx, ty: m.y, p, off, u: pe * (xT(tx, m.y) + keep) - (1 - pe) * loss + direct * (tx - bx), w: chem(rel[m.p.id]), deep: true });
  }
}

/** 1c) RINVIO LUNGO del portiere verso chi sta nella metà campo avversaria: Rinvio suo, Colpo di testa di chi riceve */
function longKicks(v: View, x: Ctx, out: Option[]) {
  const { carrier: c, bx, tactic } = v;
  for (const m of v.mates) {
    if (m === c || m.x < 6.5) continue;
    const p = sigmoid(MATCH.kickBase + MATCH.kickSkill * (a(c, 'kicking') + a(m, 'heading')) + v.bonus);
    out.push({ kind: 'pass', to: m, tx: m.x, ty: m.y, p, off: 0, u: p * (xT(m.x, m.y) + x.keep) - (1 - p) * x.loss + MATCH.kickDirect * tactic.directness * (m.x - bx) / 6,
      w: chem(x.rel[m.p.id]), deep: false, long: true });
  }
}

/** 2) DRIBBLING: puntare l'uomo, portando palla verso il centro negli ultimi metri */
function dribble(v: View, x: Ctx): Option {
  const { carrier: c, bx, by, pressure } = v;
  let tackler: OnPitch | undefined, best = Infinity;
  for (let i = 0; i < v.defX.length; i++) {
    const d = len(v.defX[i]! - bx, v.defY[i]! - by);
    if (d < best) { best = d; tackler = v.defs[i]; }
  }
  const close = best < 2.2 ? 1 - best / 2.2 : 0; // quanto è vicino il difensore
  const dribSkill = 0.4 * a(c, 'dribbling') + 0.2 * (a(c, 'technique') + a(c, 'agility') + a(c, 'acceleration'));
  const tackSkill = tackler ? 0.4 * a(tackler, 'tackling') + 0.3 * (a(tackler, 'positioning') + a(tackler, 'anticipation')) : 0;
  const tx = Math.min(10.8, bx + MATCH.dribGain);
  const ty = by + (bx > 7 ? (4 - by) * 0.25 : 0);
  const pd = sigmoid(MATCH.dribBase + MATCH.dribSkill * dribSkill - close * MATCH.dribDef * tackSkill - MATCH.dribPress * pressure
    + (tackler ? (100 - tackler.energy) * MATCH.energySkill : 0) + v.bonus);
  return { kind: 'dribble', tx, ty, p: pd, tackler: close > 0 ? tackler : undefined, u: pd * (xT(tx, ty) + x.keep + MATCH.dribBeat * close) - (1 - pd) * x.loss + 0.0008 * a(c, 'flair') + c.role.dribble };
}

/** 3) TIRO dalla trequarti in su */
function shot(v: View, x: Ctx, out: Option[]) {
  const { carrier: c, bx, by, pressure } = v;
  if (bx < MATCH.shotMinX) return;
  const xg = xG(bx, by, pressure);
  if (!(xg > 0.015)) return;
  const skill = bx < 10 ? a(c, 'longShots') : a(c, 'finishing');
  const mm = v.mentality - 3;
  // tirare chiude quasi sempre l'azione: si rinuncia a metà del valore del possesso
  out.push({ kind: 'shot', xg, u: xg * (1 + MATCH.shotSkill * skill) * MATCH.shotBias * c.role.shoot * (1 + MATCH.mentalityShot * mm) - (1 - xg) * x.keep * 0.5 });
}

/** xG del tiro dopo la palla bassa all'indietro: sempre dallo stesso punto, si calcola una volta */
const LOW_XG = xG(10.2, 4, MATCH.lowPressure);

/** 4) CROSS dalla fascia (alto) e, dal fondo, palla bassa all'indietro */
function cross(v: View, x: Ctx, out: Option[]) {
  const { carrier: c, bx, by, pressure } = v;
  if (!(bx >= MATCH.crossMinX && (by < MATCH.crossWide || by > 8 - MATCH.crossWide))) return;
  let attBox = 0, defBox = 0;
  for (const m of v.mates) if (m !== c && m.x >= 9.8 && m.y > 2 && m.y < 6) attBox++;
  for (let i = 0; i < v.defX.length; i++) if (v.defX[i]! >= 9.8 && v.defY[i]! > 2 && v.defY[i]! < 6) defBox++;
  const p = sigmoid(MATCH.crossBase + MATCH.crossSkill * a(c, 'crossing') - MATCH.crossPress * pressure + v.bonus);
  // stima del duello: quanti dei miei e dei loro ci sono in area
  const win = sigmoid(MATCH.duelBase + MATCH.crossAtt * attBox - MATCH.crossDef * defBox);
  const value = (w: number, xg: number) => p * (w * xg + (1 - w) * MATCH.secondValue) * c.role.cross - (1 - p) * x.loss * MATCH.crossLoss;
  out.push({ kind: 'cross', p, low: false, u: value(win, MATCH.headerXg) });
  if (bx >= MATCH.lowMinX) out.push({ kind: 'cross', p, low: true, u: value(sigmoid(MATCH.lowBase + MATCH.crossAtt * attBox - MATCH.crossDef * defBox), LOW_XG) });
}

/** le opzioni del portatore, nell'ordine in cui le valuta: passaggi, profondità, dribbling, tiro, cross */
export function options(v: View): Option[] {
  const x = context(v);
  const out: Option[] = [];
  passes(v, x, out);
  throughBalls(v, x, out);
  if (v.isGK) { longKicks(v, x, out); return out; } // il portiere la gioca corta o la rinvia lunga
  out.push(dribble(v, x));
  shot(v, x, out);
  cross(v, x, out);
  return out;
}

/** softmax con temperatura (§6.2 punto 4) */
export function choose(rng: Rng, opts: Option[], c: OnPitch, pressure: number): Option {
  const temp = Math.max(0.003, MATCH.tempBase * (1 + MATCH.tempDecisions * (11 - c.p.attrs.decisions))
    * (1 + MATCH.tempPressure * pressure * (1 - c.p.attrs.composure / 20)));
  let max = -Infinity;
  for (const o of opts) if (o.u > max) max = o.u;
  let tot = 0;
  // u riusato come peso: l'opzione non serve più
  for (const o of opts) tot += (o.u = Math.exp((o.u - max) / temp) * (o.kind === 'pass' ? o.w : 1));
  let x = rng.next() * tot;
  for (const o of opts) if ((x -= o.u) < 0) return o;
  return opts[opts.length - 1]!;
}
