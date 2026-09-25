// Sovrapposizioni tattiche sul campo 2D (Blocco 3, punto 5): linea difensiva e baricentro delle due squadre, rete dei
// passaggi, heatmap e zone di pressing della squadra dell'utente. Si aggiornano dal vivo e pesano di più gli ultimi
// minuti (media che dimentica in ~3 minuti di gioco, liste degli ultimi 10), così un cambio d'istruzione si vede.
// Quando l'utente cambia un'istruzione resta per 10 minuti di gioco il «prima», tratteggiato (scelta di Marco).
import type { MatchRun } from '../../engine/match/engine.ts';

export type OverlayKind = 'shape' | 'passes' | 'heat' | 'press';
export const OVERLAYS: OverlayKind[] = ['shape', 'passes', 'heat', 'press'];

const TAU = 180; // secondi di gioco: dopo tre minuti una posizione pesa un terzo
const WINDOW = 600; // passaggi e recuperi degli ultimi 10 minuti
const GHOST_MIN = 10; // per quanti minuti resta il «prima»

interface Shape { line: [number, number]; cx: [number, number]; cy: [number, number] }
interface Ghost extends Shape { min: number }

/** tutto in coordinate globali del motore (la squadra 0 attacca verso x = 12): lo specchio si fa al disegno */
export class Overlays {
  shape: Shape | null = null;
  heat = new Float32Array(12 * 8); // presenza dei nostri per zona
  pos = new Map<number, [number, number]>(); // posizione media recente di ogni nostro giocatore
  passes: { a: number; b: number; t: number }[] = [];
  regains: { x: number; y: number; t: number }[] = [];
  ghost: Ghost | null = null;
  now = 0; // secondi di gioco dell'ultimo fotogramma letto
  private ti = 0;
  private fi = 0;
  readonly me: 0 | 1;
  constructor(me: 0 | 1) { this.me = me; }

  /** legge i fotogrammi nuovi fino all'istante di riproduzione T (in replay, tornando indietro, non cambia niente) */
  update(run: MatchRun, T: number) {
    const { track, frames } = run;
    const a = 1 - Math.exp(-0.25 / TAU);
    for (; this.ti < track.length && track[this.ti]!.at <= T; this.ti++) {
      const p = track[this.ti]!;
      for (; this.fi <= p.step && this.fi < frames.length; this.fi++) this.read(frames[this.fi]!);
      if (p.dead) continue;
      this.now = p.min * 60;
      const sh = shapeOf(p.xy, p.n0, p.ids.length);
      if (!this.shape) this.shape = sh;
      else {
        const att = frames[p.step]?.side; // la linea difensiva si misura solo quando quella squadra difende
        for (const s of [0, 1] as const) {
          if (att !== s) this.shape.line[s] += (sh.line[s] - this.shape.line[s]) * a;
          this.shape.cx[s] += (sh.cx[s] - this.shape.cx[s]) * a;
          this.shape.cy[s] += (sh.cy[s] - this.shape.cy[s]) * a;
        }
      }
      for (let z = 0; z < this.heat.length; z++) this.heat[z]! *= 1 - a;
      const [from, to] = this.me === 0 ? [0, p.n0] : [p.n0, p.ids.length];
      for (let k = from; k < to; k++) {
        const x = p.xy[2 * k]!, y = p.xy[2 * k + 1]!;
        const z = Math.min(7, Math.max(0, Math.floor(y))) * 12 + Math.min(11, Math.max(0, Math.floor(x)));
        this.heat[z]! += a;
        const m = this.pos.get(p.ids[k]!);
        if (!m) this.pos.set(p.ids[k]!, [x, y]);
        else { m[0] += (x - m[0]) * a * 4; m[1] += (y - m[1]) * a * 4; }
      }
    }
    const old = this.now - WINDOW;
    while (this.passes.length && this.passes[0]!.t < old) this.passes.shift();
    while (this.regains.length && this.regains[0]!.t < old) this.regains.shift();
    if (this.ghost && this.now / 60 - this.ghost.min > GHOST_MIN) this.ghost = null;
  }

  private read(f: MatchRun['frames'][number]) {
    const t = f.min * 60;
    if (f.side === this.me && f.kind === 'pass' && f.ok && f.to !== undefined) this.passes.push({ a: f.from, b: f.to, t });
    if (f.side !== this.me) { // chi difendeva eravamo noi: dove abbiamo ripreso palla
      const b = f.beats?.find((x) => x.kind === 'tackle' || x.kind === 'intercept');
      if (b) this.regains.push({ x: b.x, y: b.y, t });
    }
  }

  /** l'utente ha cambiato un'istruzione: il disegno di adesso diventa il «prima» */
  snapshot(min: number) {
    if (this.shape) this.ghost = { line: [...this.shape.line], cx: [...this.shape.cx], cy: [...this.shape.cy], min };
  }
}

/** linea difensiva (media dei 4 più arretrati di movimento) e baricentro (media dei 10 di movimento) per squadra */
function shapeOf(xy: Float32Array, n0: number, n: number): Shape {
  const out: Shape = { line: [0, 0], cx: [0, 0], cy: [0, 0] };
  for (const s of [0, 1] as const) {
    const xs: number[] = [];
    let sy = 0;
    for (let k = s === 0 ? 1 : n0 + 1; k < (s === 0 ? n0 : n); k++) { // il primo di ogni squadra è il portiere: non conta
      const x = xy[2 * k]!;
      xs.push(s === 0 ? x : 12 - x);
      sy += xy[2 * k + 1]!;
    }
    xs.sort((a, b) => a - b);
    const back = xs.slice(0, 4);
    const line = back.reduce((q, v) => q + v, 0) / (back.length || 1);
    const cx = xs.reduce((q, v) => q + v, 0) / (xs.length || 1);
    out.line[s] = s === 0 ? line : 12 - line;
    out.cx[s] = s === 0 ? cx : 12 - cx;
    out.cy[s] = sy / (xs.length || 1);
  }
  return out;
}

type C2D = CanvasRenderingContext2D;
interface View { X: (x: number) => number; Y: (y: number) => number; scale: number; mirror: boolean; before: string }

/** disegno sotto i giocatori: prima le macchie (heatmap, pressing), poi linee e rete */
export function drawOverlays(ctx: C2D, ov: Overlays, on: ReadonlySet<OverlayKind>, v: View) {
  const mx = (x: number) => v.X(v.mirror ? 12 - x : x);
  const my = (y: number) => v.Y(v.mirror ? 8 - y : y);
  const me = ov.me;
  if (on.has('heat')) {
    let max = 0;
    for (const h of ov.heat) max = Math.max(max, h);
    for (let z = 0; z < ov.heat.length && max > 0; z++) {
      const w = ov.heat[z]! / max;
      if (w < 0.08) continue;
      const x = z % 12, y = Math.floor(z / 12);
      ctx.fillStyle = `rgba(0,245,155,${(w * 0.42).toFixed(3)})`;
      const [a, b] = [mx(v.mirror ? x + 1 : x), my(v.mirror ? y + 1 : y)];
      ctx.fillRect(a, b, v.scale, v.scale);
    }
  }
  if (on.has('press')) { // dove riprendiamo palla: 4 fasce × 3 corsie
    const zone = new Float32Array(12);
    for (const r of ov.regains) {
      const ax = me === 0 ? r.x : 12 - r.x; // nella nostra direzione d'attacco
      zone[Math.min(2, Math.floor(r.y / (8 / 3))) * 4 + Math.min(3, Math.floor(ax / 3))]! += 1;
    }
    const max = Math.max(4, ...zone); // con pochi recuperi (inizio partita) le zone restano tenui
    for (let z = 0; z < 12; z++) {
      const col = z % 4, row = Math.floor(z / 4);
      const x0 = me === 0 ? col * 3 : 12 - (col + 1) * 3, y0 = row * (8 / 3);
      ctx.fillStyle = `rgba(234,179,8,${((zone[z]! / max) * 0.35).toFixed(3)})`;
      const a = mx(v.mirror ? x0 + 3 : x0), b = my(v.mirror ? y0 + 8 / 3 : y0);
      ctx.fillRect(a + 1, b + 1, 3 * v.scale - 2, (8 / 3) * v.scale - 2);
      if (zone[z]) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText(String(zone[z]), a + 1.5 * v.scale, b + (4 / 3) * v.scale); }
    }
  }
  if (on.has('passes')) {
    const count = new Map<string, number>();
    for (const p of ov.passes) { const k = p.a < p.b ? `${p.a}-${p.b}` : `${p.b}-${p.a}`; count.set(k, (count.get(k) ?? 0) + 1); }
    ctx.strokeStyle = 'rgba(6,182,212,0.75)'; // --data-1
    for (const [k, n] of count) {
      if (n < 2) continue;
      const [a, b] = k.split('-').map(Number) as [number, number];
      const pa = ov.pos.get(a), pb = ov.pos.get(b);
      if (!pa || !pb) continue;
      ctx.lineWidth = Math.min(v.scale * 0.22, 1 + n * v.scale * 0.018);
      ctx.beginPath(); ctx.moveTo(mx(pa[0]), my(pa[1])); ctx.lineTo(mx(pb[0]), my(pb[1])); ctx.stroke();
    }
  }
  if (on.has('shape') && ov.shape) {
    const sh = ov.shape, g = ov.ghost;
    for (const s of [0, 1] as const) {
      const color = s === me ? '#38bdf8' : '#ef4444'; // noi azzurro, loro rosso (--cyan-soft, --negative)
      if (g) line(ctx, mx(g.line[s]), v, color, true);
      line(ctx, mx(sh.line[s]), v, color, false);
      if (g) dot(ctx, mx(g.cx[s]), my(g.cy[s]), v.scale, color, true);
      dot(ctx, mx(sh.cx[s]), my(sh.cy[s]), v.scale, color, false);
    }
    if (g) { // di quando è il «prima»
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `600 ${Math.max(10, Math.round(v.scale * 0.2))}px 'Hanken Grotesk', system-ui, sans-serif`;
      ctx.fillText(v.before, mx(g.line[me]), v.Y(0.3));
    }
  }
}

function line(ctx: C2D, x: number, v: View, color: string, ghost: boolean) {
  ctx.save();
  ctx.setLineDash(ghost ? [v.scale * 0.1, v.scale * 0.14] : [v.scale * 0.3, v.scale * 0.18]);
  ctx.globalAlpha = ghost ? 0.45 : 0.85;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, v.scale * 0.035);
  ctx.beginPath(); ctx.moveTo(x, v.Y(0)); ctx.lineTo(x, v.Y(8)); ctx.stroke();
  ctx.restore();
}

function dot(ctx: C2D, x: number, y: number, scale: number, color: string, ghost: boolean) {
  ctx.beginPath();
  ctx.arc(x, y, scale * 0.16, 0, Math.PI * 2);
  if (ghost) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; }
  else { ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
}
