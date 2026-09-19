// Campo 2D dall'alto su canvas (GUIDA §8.4). Niente librerie: disegno diretto, coordinate del motore
// (12 × 8 zone ≈ 105 × 68 m) convertite in pixel dalla telecamera. Il campo arriva già specchiato dal playback:
// qui la squadra dell'utente attacca sempre verso destra.
import type { Live } from './playback.ts';

export const PITCH_X = 12, PITCH_Y = 8;
const FOLLOW_ZOOM = 1.2;

export interface Look {
  colors: [string, string]; // maglia squadra 0 e squadra 1
  numbers: Map<number, number>;
  names: Map<number, string>;
  mine: 0 | 1; // quale delle due è la squadra dell'utente
}

export class Camera {
  cx = PITCH_X / 2;
  cy = PITCH_Y / 2;
  zoom = 1;
  /** di norma sta ferma sul campo intero; se insegue, si muove piano e non esce dal campo */
  step(bx: number, by: number, dt: number, follow: boolean, w: number, h: number) {
    const k = Math.min(1, dt * 1.25);
    this.zoom += ((follow ? FOLLOW_ZOOM : 1) - this.zoom) * k;
    const scale = Math.min(w / PITCH_X, h / PITCH_Y) * this.zoom;
    const halfX = Math.min(PITCH_X, w / scale) / 2;
    const halfY = Math.min(PITCH_Y, h / scale) / 2;
    const tx = follow ? Math.max(halfX, Math.min(PITCH_X - halfX, bx)) : PITCH_X / 2;
    const ty = follow ? Math.max(halfY, Math.min(PITCH_Y - halfY, by)) : PITCH_Y / 2;
    this.cx += (tx - this.cx) * k;
    this.cy += (ty - this.cy) * k;
  }
}

const trail: { x: number; y: number }[] = [];

export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, live: Live | null, look: Look, cam: Camera, css: (v: string) => string) {
  const scale = Math.min(w / PITCH_X, h / PITCH_Y) * cam.zoom;
  const ox = w / 2 - cam.cx * scale;
  const oy = h / 2 - cam.cy * scale;
  const X = (x: number) => ox + x * scale;
  const Y = (y: number) => oy + y * scale;

  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = css(i % 2 ? '--pitch-1' : '--pitch-2');
    ctx.fillRect(X(i), Y(0), scale + 1, PITCH_Y * scale);
  }
  ctx.fillStyle = css('--bg-0');
  if (X(0) > 0) ctx.fillRect(0, 0, X(0), h);
  if (X(PITCH_X) < w) ctx.fillRect(X(PITCH_X), 0, w - X(PITCH_X), h);
  if (Y(0) > 0) ctx.fillRect(0, 0, w, Y(0));
  if (Y(PITCH_Y) < h) ctx.fillRect(0, Y(PITCH_Y), w, h - Y(PITCH_Y));

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, scale * 0.02);
  ctx.strokeRect(X(0), Y(0), PITCH_X * scale, PITCH_Y * scale);
  ctx.beginPath();
  ctx.moveTo(X(6), Y(0)); ctx.lineTo(X(6), Y(PITCH_Y));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(6), Y(4), 1.05 * scale, 0, Math.PI * 2);
  ctx.stroke();
  for (const side of [0, 1]) {
    ctx.strokeRect(X(side ? PITCH_X - 1.9 : 0), Y(2.1), 1.9 * scale, 3.8 * scale); // area di rigore
    ctx.strokeRect(X(side ? PITCH_X - 0.65 : 0), Y(3.1), 0.65 * scale, 1.8 * scale); // area piccola
    ctx.beginPath();
    ctx.arc(X(side ? PITCH_X - 1.35 : 1.35), Y(4), scale * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.fillRect(X(side ? PITCH_X : -0.18), Y(3.35), 0.18 * scale, 1.3 * scale); // porta
  }
  if (!live) return;

  // scia della palla
  trail.push({ x: live.bx, y: live.by });
  if (trail.length > 14) trail.shift();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, scale * 0.04);
  ctx.beginPath();
  trail.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
  ctx.stroke();

  // giocatori: i nostri pieni, gli avversari smorzati; chi ha la palla è più grande e con l'anello
  const r0 = scale * 0.26;
  const blink = 0.55 + 0.45 * Math.sin(performance.now() / 120);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  live.ids.forEach((id, i) => {
    const side = i < live.n0 ? 0 : 1;
    const mine = side === look.mine;
    const hasBall = id === live.carrier;
    const r = hasBall ? r0 * 1.25 : r0;
    const px = X(live.x[i]!), py = Y(live.y[i]!);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = mine ? look.colors[side]! : fade(look.colors[side]!, 0.45);
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * (mine ? 0.18 : 0.1));
    ctx.strokeStyle = mine ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
    ctx.stroke();
    if (hasBall) { // anello luminoso sul portatore
      ctx.beginPath();
      ctx.arc(px, py, r * 1.45, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    } else if (id === live.passTo) { // chi sta per ricevere lampeggia
      ctx.beginPath();
      ctx.arc(px, py, r * 1.35, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.strokeStyle = `rgba(255,255,255,${blink.toFixed(2)})`;
      ctx.stroke();
    }
    if (r > 9) { // numero solo se c'è spazio per leggerlo
      ctx.font = `700 ${Math.round(r)}px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = contrast(look.colors[side]!);
      ctx.globalAlpha = mine ? 1 : 0.7;
      ctx.fillText(String(look.numbers.get(id) ?? ''), px, py + r * 0.05);
      ctx.globalAlpha = 1;
    }
  });

  ctx.beginPath();
  ctx.arc(X(live.bx), Y(live.by), Math.max(2.5, scale * 0.12), 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

export const resetTrail = () => trail.splice(0, trail.length);

/** smorza un colore verso il grigio della sua stessa luminosità */
function fade(hex: string, amount: number): string {
  const [r, g, b] = rgb(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const m = (v: number) => Math.round(v + (l - v) * amount);
  return `rgb(${m(r)} ${m(g)} ${m(b)})`;
}

function rgb(hex: string): [number, number, number] {
  const v = hex.trim().replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** testo leggibile sopra la maglia */
function contrast(hex: string): string {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#10181d' : '#f2f6f8';
}
