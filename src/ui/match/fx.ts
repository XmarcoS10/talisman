// Disegno dei momenti (Blocco 3, punto 3): contrasto e scivolata, fallo, cartellini, fuorigioco, piazzati con la
// barriera, rigore, dribbling riuscito, colpo di testa, parata e respinta, gol con la rete che si muove, infortunio.
// Quando succede ciascuno lo decide moments.ts; qui c'è solo il disegno, sopra i giocatori.
import { t } from '../i18n.ts';
import type { Moment } from './moments.ts';
import type { Live } from './playback.ts';
import type { Look } from './renderer.ts';

type C2D = CanvasRenderingContext2D;
interface View { X: (x: number) => number; Y: (y: number) => number; r0: number; w: number; css: (v: string) => string }

const GOLD = '#eab308', RED = '#ef4444'; // --gold e --negative di tokens.css

/** dove disegnare un giocatore: la sua posizione adesso, o dove era la palla se non è più in campo */
function at(live: Live, id: number, m: Moment, v: View): [number, number] {
  const i = live.ids.indexOf(id);
  return i >= 0 ? [v.X(live.x[i]!), v.Y(live.y[i]!)] : [v.X(m.x), v.Y(m.y)];
}

const fadeOut = (age: number) => Math.min(1, (1 - age) * 3); // pieno fino a 2/3, poi sparisce

function badge(ctx: C2D, text: string, x: number, y: number, fs: number, fg: string, bg = 'rgba(10,14,24,0.88)') {
  ctx.font = `700 ${fs}px 'Space Grotesk', system-ui, sans-serif`;
  const w = ctx.measureText(text).width + fs;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - fs * 0.8, w, fs * 1.6, fs * 0.4);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, x, y + fs * 0.05);
}

function pulse(ctx: C2D, x: number, y: number, r: number, age: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r * (1.2 + age * 1.6), 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, r * 0.18 * (1 - age));
  ctx.stroke();
}

function card(ctx: C2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.translate(x + r * 0.9, y - r * 1.9);
  ctx.rotate(0.2);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-r * 0.35, -r * 0.5, r * 0.7, r);
  ctx.strokeRect(-r * 0.35, -r * 0.5, r * 0.7, r);
  ctx.restore();
}

/** la rete della porta vicino alla palla che si gonfia */
function net(ctx: C2D, v: View, right: boolean, age: number) {
  const x0 = v.X(right ? 12 : 0), dir = right ? 1 : -1;
  const depth = v.r0 * (1.2 + Math.sin(age * Math.PI * 6) * 0.5 * (1 - age));
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k <= 6; k++) {
    const y = v.Y(3.35 + (1.3 * k) / 6);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + dir * depth * 1.4, y, x0 + dir * depth, y);
    ctx.stroke();
  }
}

/** la barriera: quattro uomini in fila fra la palla e la porta che difendono */
function wall(ctx: C2D, m: Moment, v: View, color: string) {
  const gx = m.x > 6 ? 12 : 0;
  const dx = gx - m.x, dy = 4 - m.y, d = Math.hypot(dx, dy) || 1;
  const cx = m.x + (dx / d) * 0.8, cy = m.y + (dy / d) * 0.8;
  for (let k = -1.5; k <= 1.5; k++) {
    ctx.beginPath();
    ctx.arc(v.X(cx - (dy / d) * k * 0.2), v.Y(cy + (dx / d) * k * 0.2), v.r0 * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** colore della squadra di un giocatore */
const teamColor = (live: Live, look: Look, id: number) => look.colors[live.ids.indexOf(id) < live.n0 ? 0 : 1]!;

export function drawMoments(ctx: C2D, moments: Moment[], live: Live, look: Look, v: View) {
  const fs = Math.max(12, Math.round(v.r0 * 1.05));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of moments) {
    ctx.globalAlpha = fadeOut(m.age);
    const [px, py] = at(live, m.who, m, v);
    switch (m.kind) {
      case 'tackle': { // scivolata: una scia dietro a chi entra, e un lampo sul pallone
        const [qx, qy] = m.vs !== undefined ? at(live, m.vs, m, v) : [px, py];
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = v.r0 * 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px - (qx - px) * 0.8, py - (qy - py) * 0.8);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.lineCap = 'butt';
        pulse(ctx, qx, qy, v.r0, m.age, '#fff');
        break;
      }
      case 'foul': badge(ctx, t('fx.foul'), px, py - v.r0 * 2.2, fs, '#fff'); break;
      case 'yellow': card(ctx, px, py, v.r0 * 1.2, GOLD); break;
      case 'red': card(ctx, px, py, v.r0 * 1.2, RED); break;
      case 'injury': badge(ctx, '+', px, py - v.r0 * 2.2, fs, '#fff', RED); break;
      case 'offside': {
        ctx.save();
        ctx.setLineDash([v.r0 * 0.6, v.r0 * 0.45]);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = Math.max(2, v.r0 * 0.14);
        ctx.beginPath();
        ctx.moveTo(px, v.Y(0));
        ctx.lineTo(px, v.Y(8));
        ctx.stroke();
        ctx.restore();
        badge(ctx, t('fx.offside'), px, v.Y(0.55), fs, GOLD);
        break;
      }
      case 'corner': badge(ctx, t('fx.corner'), v.w / 2, fs * 1.6, fs, '#fff'); break;
      case 'freeKick': badge(ctx, t('fx.freeKick'), v.w / 2, fs * 1.6, fs, '#fff'); break;
      case 'wall': wall(ctx, m, v, teamColor(live, look, m.who)); break;
      case 'penalty': badge(ctx, t('fx.penalty'), v.w / 2, fs * 1.6, fs * 1.3, GOLD); break;
      case 'beat': { // uomo saltato: due frecce davanti a chi dribbla
        ctx.fillStyle = v.css('--accent');
        ctx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
        ctx.fillText('»', px + v.r0 * (1.8 + m.age), py);
        break;
      }
      case 'header': case 'clear': case 'claim': case 'sweep': case 'block': case 'rebound': case 'secondBall':
        pulse(ctx, px, py, v.r0, m.age, m.kind === 'header' ? v.css('--accent') : '#fff');
        break;
      case 'save': case 'parry': { // il portiere si allunga verso il pallone
        ctx.beginPath();
        ctx.ellipse(px, py, v.r0 * (1.1 + 0.9 * (1 - m.age)), v.r0 * 0.75, Math.atan2(v.Y(m.y) - py, v.X(m.x) - px), 0, Math.PI * 2);
        ctx.fillStyle = teamColor(live, look, m.who);
        ctx.fill();
        badge(ctx, t(m.kind === 'save' ? 'fx.save' : 'fx.parry'), px, py - v.r0 * 2.2, fs, '#fff');
        break;
      }
      case 'goal':
        net(ctx, v, m.x > 6, m.age);
        pulse(ctx, px, py, v.r0, (m.age * 3) % 1, v.css('--accent'));
        badge(ctx, t('fx.goal'), v.w / 2, fs * 2.4, fs * 2, v.css('--accent'));
        break;
      default: break;
    }
  }
  ctx.globalAlpha = 1;
}

/** rigore: la telecamera stringe sull'area (inquadratura dedicata) */
export function focusOf(moments: Moment[]): { x: number; y: number; zoom: number } | null {
  const p = moments.find((m) => m.kind === 'penalty');
  return p ? { x: p.x > 6 ? 10.4 : 1.6, y: 4, zoom: 2.3 } : null;
}
