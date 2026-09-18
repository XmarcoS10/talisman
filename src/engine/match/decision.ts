// Decisione del portatore di palla (GUIDA §6.2 punti 2-4).
// Ogni opzione ha: p = probabilità di riuscita, u = utilità attesa in "gol attesi".
// u = p · valore_dopo − (1 − p) · costo_della_perdita · avversione_al_rischio (+ preferenze tattiche).
// La scelta è un softmax con temperatura: Decisioni alte → quasi sempre l'opzione migliore.
import { MATCH } from '../balance.ts';
import type { Player, Tactic } from '../model.ts';
import type { Rng } from '../rng.ts';
import { len, lossCost, segDist, sigmoid, xG, xT } from './pitch.ts';

/** giocatore in campo: posizione nel sistema della propria squadra (x verso la porta avversaria) */
export interface OnPitch {
  p: Player;
  x: number;
  y: number;
  energy: number;
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
  | { kind: 'pass'; to: OnPitch; tx: number; ty: number; p: number; off: number; u: number }
  | { kind: 'dribble'; tx: number; ty: number; p: number; tackler: OnPitch | undefined; u: number }
  | { kind: 'shot'; xg: number; u: number }
  | { kind: 'cross'; p: number; u: number };

const a = (pl: OnPitch, k: keyof Player['attrs']) => pl.p.attrs[k] - 11; // attributo centrato su 11

export function options(v: View): Option[] {
  const { carrier: c, bx, by, tactic, pressure } = v;
  const mm = v.mentality - 3; // −2 … +2
  const riskW = 1 - MATCH.mentalityRisk * mm; // mentalità offensiva = meno paura di perdere palla
  // perdere palla costa il valore regalato all'avversario + il valore del possesso stesso (K)
  const keep = MATCH.possessionValue * riskW;
  const loss = lossCost(bx, by) * riskW + keep;
  // verticalità: istruzione tattica + impazienza dopo una lunga serie di passaggi
  const direct = MATCH.directnessK * tactic.directness + MATCH.patience * Math.max(0, v.chain - 5);
  const tempoMod = (1 - tactic.tempo) * 0.15; // ritmo alto = più errori
  const out: Option[] = [];

  // 1) PASSAGGI a ogni compagno (è il ciclo più caldo del gioco: niente allocazioni qui dentro)
  const nd = v.defX.length;
  const lr = MATCH.laneRadius, mr = MATCH.markRadius;
  // parte del logit che dipende solo dal portatore
  const passLogit0 = MATCH.passBase - MATCH.passPress * pressure + MATCH.passSkill * a(c, 'passing') + tempoMod + v.bonus;
  const vision = MATCH.passVision * a(c, 'vision');
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
    out.push({ kind: 'pass', to: m, tx: m.x, ty: m.y, p, off, u: pe * (xT(m.x, m.y) + keep) - (1 - pe) * loss + direct * dx });
  }
  // 1b) PALLA IN PROFONDITÀ nello spazio tra la linea difensiva e il portiere: punisce le linee alte
  const space = MATCH.gkLineX - v.offsideLine;
  if (space > 1 && bx < v.offsideLine - 0.5) {
    const tx = v.offsideLine + Math.min(space, MATCH.throughDepth);
    let defPace = 0; // il difensore più veloce vicino alla linea
    for (let i = 0; i < nd; i++) if (v.defX[i]! > v.offsideLine - 1.5) defPace = Math.max(defPace, v.defs[i]!.p.attrs.pace);
    for (const m of v.mates) {
      if (m === c || m.x < v.offsideLine - 1.5 || m.x <= bx) continue; // solo chi è già vicino alla linea
      const dist = len(tx - bx, m.y - by);
      const race = (m.p.attrs.pace + m.p.attrs.acceleration) / 2 - defPace; // corsa uomo contro uomo
      const p = sigmoid(MATCH.throughBase + MATCH.throughRace * race - MATCH.passDist * 0.6 * dist - MATCH.passPress * pressure
        + MATCH.passSkill * a(c, 'passing') + 2 * vision + v.bonus);
      const off = MATCH.throughOffside * (1 - (m.p.attrs.offTheBall - 11) * 0.04);
      const pe = p * (1 - off);
      out.push({ kind: 'pass', to: m, tx, ty: m.y, p, off, u: pe * (xT(tx, m.y) + keep) - (1 - pe) * loss + direct * (tx - bx) });
    }
  }
  if (v.isGK) return out; // il portiere si limita a giocarla

  // 2) DRIBBLING: puntare l'uomo, portando palla verso il centro negli ultimi metri
  let tackler: OnPitch | undefined, best = Infinity;
  for (let i = 0; i < v.defX.length; i++) {
    const d = len(v.defX[i]! - bx, v.defY[i]! - by);
    if (d < best) { best = d; tackler = v.defs[i]; }
  }
  const close = best < 2.2 ? 1 - best / 2.2 : 0; // quanto è vicino il difensore
  const dribSkill = (a(c, 'dribbling') + a(c, 'agility') + a(c, 'acceleration')) / 3;
  const tackSkill = tackler ? (a(tackler, 'tackling') + a(tackler, 'positioning') + a(tackler, 'anticipation')) / 3 : 0;
  const tx = Math.min(10.8, bx + MATCH.dribGain);
  const ty = by + (bx > 7 ? (4 - by) * 0.25 : 0);
  const pd = sigmoid(MATCH.dribBase + MATCH.dribSkill * dribSkill - close * MATCH.dribDef * tackSkill - MATCH.dribPress * pressure
    + (tackler ? (100 - tackler.energy) * MATCH.energySkill : 0) + v.bonus);
  out.push({ kind: 'dribble', tx, ty, p: pd, tackler: close > 0 ? tackler : undefined, u: pd * (xT(tx, ty) + keep) - (1 - pd) * loss + 0.0008 * a(c, 'flair') });

  // 3) TIRO dalla trequarti in su
  if (bx >= MATCH.shotMinX) {
    const xg = xG(bx, by, pressure);
    if (xg > 0.015) {
      const skill = bx < 10 ? a(c, 'longShots') : a(c, 'finishing');
      // tirare chiude quasi sempre l'azione: si rinuncia a metà del valore del possesso
      out.push({ kind: 'shot', xg, u: xg * (1 + MATCH.shotSkill * skill) * MATCH.shotBias * (1 + MATCH.mentalityShot * mm) - (1 - xg) * keep * 0.5 });
    }
  }

  // 4) CROSS dal fondo
  if (bx >= MATCH.crossMinX && (by < 2 || by > 6)) {
    let attBox = 0, defBox = 0;
    for (const m of v.mates) if (m !== c && m.x >= 9.8 && m.y > 2 && m.y < 6) attBox++;
    for (let i = 0; i < v.defX.length; i++) if (v.defX[i]! >= 9.8 && v.defY[i]! > 2 && v.defY[i]! < 6) defBox++;
    const p = sigmoid(MATCH.crossBase + MATCH.crossSkill * a(c, 'crossing') + MATCH.crossAtt * attBox - MATCH.crossDef * defBox - MATCH.crossPress * pressure + v.bonus);
    out.push({ kind: 'cross', p, u: p * MATCH.headerXg * 1.1 - (1 - p) * loss });
  }
  return out;
}

/** softmax con temperatura (§6.2 punto 4) */
export function choose(rng: Rng, opts: Option[], c: OnPitch, pressure: number): Option {
  const temp = Math.max(0.003, MATCH.tempBase * (1 + MATCH.tempDecisions * (11 - c.p.attrs.decisions))
    * (1 + MATCH.tempPressure * pressure * (1 - c.p.attrs.composure / 20)));
  let max = -Infinity;
  for (const o of opts) if (o.u > max) max = o.u;
  let tot = 0;
  for (const o of opts) tot += (o.u = Math.exp((o.u - max) / temp)); // u riusato come peso: l'opzione non serve più
  let x = rng.next() * tot;
  for (const o of opts) if ((x -= o.u) < 0) return o;
  return opts[opts.length - 1]!;
}
