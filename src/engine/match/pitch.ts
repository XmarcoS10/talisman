// Geometria del campo, valore del possesso (xT) e modello xG (GUIDA §6.3).
import { MATCH } from '../balance.ts';

export const ZONE_LEN_M = 105 / 12;
export const ZONE_WID_M = 68 / 8;
const GOAL_HALF_M = 7.32 / 2;

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
/** lunghezza del vettore (dx, dy): Math.hypot è molto più lento e qui gira ~100k volte a partita */
export const len = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

/** valore del possesso in (x, y): probabilità indicativa di segnare nelle azioni successive */
export function xTExact(x: number, y: number): number {
  return MATCH.xtA * Math.exp(MATCH.xtB * x) * Math.max(0.3, 1 - MATCH.xtWing * Math.abs(y - 4) ** 1.3);
}
// tabella a passo 0,1 zone: xT viene chiamato decine di migliaia di volte a partita
const XT_TABLE = new Float64Array(121 * 81);
for (let i = 0; i <= 120; i++) for (let j = 0; j <= 80; j++) XT_TABLE[i * 81 + j] = xTExact(i / 10, j / 10);
export const xT = (x: number, y: number) =>
  XT_TABLE[Math.round(Math.max(0, Math.min(12, x)) * 10) * 81 + Math.round(Math.max(0, Math.min(8, y)) * 10)]!;

/** quanto costa perdere palla in x: il valore che si regala all'avversario (vede il campo specchiato) */
export const lossCost = (x: number, y: number) => xT(12 - x, 8 - y) * MATCH.lossWeight;

export function shotGeometry(x: number, y: number) {
  const dx = Math.max(0.3, (12 - x) * ZONE_LEN_M);
  const dy = (y - 4) * ZONE_WID_M;
  const dist = len(dx, dy);
  // angolo sotto cui si vede la porta
  const angle = Math.atan2(2 * GOAL_HALF_M * dx, dx * dx + dy * dy - GOAL_HALF_M * GOAL_HALF_M);
  return { dist, angle: angle < 0 ? angle + Math.PI : angle };
}

export function xG(x: number, y: number, pressure: number, header = false): number {
  const { dist, angle } = shotGeometry(x, y);
  return sigmoid(MATCH.xgBase + MATCH.xgAngle * angle - MATCH.xgDist * dist - MATCH.xgPress * pressure + (header ? MATCH.xgHeader : 0));
}

/** distanza del punto (px,py) dal segmento (ax,ay)-(bx,by) */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
  return len(px - ax - t * vx, py - ay - t * vy);
}

export const inBox = (x: number, y: number) => x >= 10.1 && y > 1.7 && y < 6.3;
