// Campo 2D dall'alto su canvas (GUIDA §8.4). Niente librerie: disegno diretto, coordinate del motore
// (12 × 8 zone ≈ 105 × 68 m) convertite in pixel dalla telecamera. Il campo arriva già specchiato dal playback:
// qui la squadra dell'utente attacca sempre verso destra.
import type { Live } from './playback.ts';
import { art } from '../assets-manifest.ts';

export const PITCH_X = 12, PITCH_Y = 8;
export type CameraMode = 'wide' | 'follow' | 'close';
export const CAMERA_MODES: CameraMode[] = ['wide', 'follow', 'close'];
/** zoom della telecamera: campo intero fermo, segui la palla, ravvicinata (solo dentro un saliente) */
export const cameraZoom = (mode: CameraMode, inClip: boolean) => (mode === 'wide' ? 1 : mode === 'close' && inClip ? 1.8 : 1.3);

export interface Look {
  colors: [string, string]; // maglia squadra 0 e squadra 1 (matchKits: sempre distinguibili)
  ring: [boolean, boolean]; // bordo spesso per chi si confonderebbe con l'altra maglia o col prato
  numbers: Map<number, number>;
  names: Map<number, string>;
  mine: 0 | 1; // quale delle due è la squadra dell'utente
}

export class Camera {
  cx = PITCH_X / 2;
  cy = PITCH_Y / 2;
  zoom = 1;
  /**
   * zoom 1: ferma sul campo intero. Oltre: insegue la palla piano, senza uscire dal campo; finché la palla resta
   * nel riquadro centrale la telecamera non si muove (niente tremolii a ogni passaggio corto)
   */
  step(bx: number, by: number, dt: number, zoom: number, w: number, h: number) {
    const k = Math.min(1, dt * 1.25);
    const follow = zoom > 1;
    this.zoom += (zoom - this.zoom) * k;
    const scale = Math.min(w / PITCH_X, h / PITCH_Y) * this.zoom;
    const halfX = Math.min(PITCH_X, w / scale) / 2;
    const halfY = Math.min(PITCH_Y, h / scale) / 2;
    const hold = (c: number, b: number, half: number) => (Math.abs(b - c) < half * 0.3 ? c : b - Math.sign(b - c) * half * 0.3);
    const tx = follow ? Math.max(halfX, Math.min(PITCH_X - halfX, hold(this.cx, bx, halfX))) : PITCH_X / 2;
    const ty = follow ? Math.max(halfY, Math.min(PITCH_Y - halfY, hold(this.cy, by, halfY))) : PITCH_Y / 2;
    this.cx += (tx - this.cx) * k;
    this.cy += (ty - this.cy) * k;
  }
}

const trail: { x: number; y: number }[] = [];

// erba: la texture generata con la pipeline (tools/assets). Si carica una volta sola; senza, il campo resta a fasce piatte.
let grassImg: HTMLImageElement | null = null;
let grassPat: CanvasPattern | null = null;
function grassPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const a = art('texture/erba');
  if (!a) return null;
  if (!grassImg) { grassImg = new Image(); grassImg.src = a.src; }
  if (!grassImg.complete || !grassImg.naturalWidth) return null;
  if (!grassPat) {
    grassPat = ctx.createPattern(grassImg, 'repeat');
    grassPat?.setTransform(new DOMMatrix().scale(0.35));
  }
  return grassPat;
}

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
  const grass = grassPattern(ctx);
  if (grass) { // la texture della pipeline, se c'è: solo grana, le fasce restano quelle dei colori
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = grass;
    ctx.fillRect(X(0), Y(0), PITCH_X * scale, PITCH_Y * scale);
    ctx.restore();
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

  // giocatori coi colori veri delle maglie (il contrasto lo garantisce matchKits); chi ha la palla è più grande e con l'anello
  const r0 = scale * 0.26;
  const blink = 0.55 + 0.45 * Math.sin(performance.now() / 120);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ci = live.ids.indexOf(live.carrier);
  pressers(ctx, live, ci, X, Y, r0);
  live.ids.forEach((id, i) => {
    const side = i < live.n0 ? 0 : 1;
    const hasBall = i === ci;
    const r = hasBall ? r0 * 1.25 : r0;
    const px = X(live.x[i]!), py = Y(live.y[i]!);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = look.colors[side]!;
    ctx.fill();
    const ring = look.ring[side];
    ctx.lineWidth = Math.max(1, r * (ring ? 0.3 : 0.14));
    ctx.strokeStyle = ring ? contrast(look.colors[side]!) : 'rgba(0,0,0,0.55)';
    ctx.stroke();
    if (hasBall) { // anello luminoso sul portatore
      ctx.beginPath();
      ctx.arc(px, py, r * 1.45, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.strokeStyle = css('--accent'); // non bianco: su una maglia bianca sparirebbe
      ctx.stroke();
    } else if (id === live.passTo) { // chi sta per ricevere lampeggia
      ctx.beginPath();
      ctx.arc(px, py, r * 1.35, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.strokeStyle = `rgba(255,255,255,${blink.toFixed(2)})`;
      ctx.stroke();
    }
    if (r > 9) { // numero solo se c'è spazio per leggerlo
      ctx.font = `700 ${Math.round(r)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = contrast(look.colors[side]!);
      ctx.fillText(String(look.numbers.get(id) ?? ''), px, py + r * 0.05);
    }
  });
  if (ci >= 0) nameTag(ctx, look.names.get(live.carrier) ?? '', X(live.x[ci]!), Y(live.y[ci]!) - r0 * 2.1, r0);
  ball(ctx, X(live.bx), Y(live.by), live.h, scale);
}

/** la palla e la sua ombra: più la palla è alta, più l'ombra si stacca e si allarga, e la palla sembra più grande */
function ball(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, scale: number) {
  const rb = Math.max(2.5, scale * 0.12);
  const lift = h * scale * 0.55;
  ctx.beginPath();
  ctx.ellipse(x + lift * 0.45, y + lift * 0.25, rb * (1 + h * 0.6), rb * (0.6 + h * 0.3), 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${(0.45 - h * 0.2).toFixed(2)})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - lift, rb * (1 + h * 0.35), 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

/** il nome del portatore, su una targhetta sopra di lui */
function nameTag(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, r0: number) {
  if (!name) return;
  const fs = Math.max(11, Math.round(r0 * 0.95));
  ctx.font = `600 ${fs}px 'Hanken Grotesk', system-ui, sans-serif`;
  const w = ctx.measureText(name).width + fs * 0.9;
  ctx.fillStyle = 'rgba(10,14,24,0.82)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - fs * 0.75, w, fs * 1.5, fs * 0.35);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x, y + fs * 0.05);
}

/** chi pressa il portatore (i due avversari più vicini, entro una zona): un arco giallo rivolto verso di lui */
function pressers(ctx: CanvasRenderingContext2D, live: Live, ci: number, X: (x: number) => number, Y: (y: number) => number, r0: number) {
  if (ci < 0) return;
  const cx = live.x[ci]!, cy = live.y[ci]!;
  const mine = ci < live.n0;
  const near: [number, number][] = [];
  for (let i = mine ? live.n0 : 0; i < (mine ? live.ids.length : live.n0); i++) {
    const d = (live.x[i]! - cx) ** 2 + (live.y[i]! - cy) ** 2;
    if (d < 1) near.push([d, i]);
  }
  near.sort((a, b) => a[0] - b[0]);
  ctx.strokeStyle = '#eab308'; // --gold di tokens.css
  ctx.lineWidth = Math.max(2, r0 * 0.22);
  for (const [, i] of near.slice(0, 2)) {
    const a = Math.atan2(cy - live.y[i]!, cx - live.x[i]!);
    ctx.beginPath();
    ctx.arc(X(live.x[i]!), Y(live.y[i]!), r0 * 1.45, a - 0.7, a + 0.7);
    ctx.stroke();
  }
}

export const resetTrail = () => trail.splice(0, trail.length);

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
