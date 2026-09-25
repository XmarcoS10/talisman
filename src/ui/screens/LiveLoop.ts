// Il ciclo di disegno della partita dal vivo: la simulazione avanza quanto basta a stare davanti alla riproduzione,
// la velocità dipende dalla modalità (Salienti ed Estesa corrono fra un'azione e l'altra), la telecamera segue.
import { useEffect, useRef, type RefObject } from 'react';
import type { MatchRun } from '../../engine/match/engine.ts';
import { Reel, speedAt, PRE, type ViewMode } from '../match/highlights.ts';
import { sample, SPEEDS, ensure } from '../match/playback.ts';
import { Camera, cameraZoom, draw, type CameraMode, type Look } from '../match/renderer.ts';
import { focusOf } from '../match/fx.ts';
import { momentsAt, type Moment } from '../match/moments.ts';

export interface LoopOpts { playing: boolean; speed: number; view: ViewMode; camera: CameraMode }

/** quanto la simulazione sta avanti alla riproduzione: nei salienti deve vedere l'azione prima che cominci */
const AHEAD = PRE + 18;

export function useLiveLoop(run: MatchRun, canvas: RefObject<HTMLCanvasElement | null>, look: Look, mirror: boolean, o: LoopOpts, tick: () => void) {
  const T = useRef(0);
  const cam = useRef(new Camera());
  const reel = useRef(new Reel(o.view));
  const moments = useRef<Moment[]>([]);
  if (reel.current.mode !== o.view) reel.current = new Reel(o.view); // si ricalcola da capo sulla traccia già pronta

  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const style = getComputedStyle(document.documentElement);
    const css = (v: string) => style.getPropertyValue(v) || '#123';
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const r = o.view === 'full' ? null : reel.current;
      const speed = speedAt(r, T.current, SPEEDS[o.speed]!) * (r ? SPEEDS[o.speed]! / SPEEDS[0] : 1);
      if (o.playing) {
        T.current += dt * speed;
        ensure(run, T.current + (r ? AHEAD : 0));
        r?.update(run);
      }
      const el = canvas.current;
      if (el) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = el.clientWidth * dpr, h = el.clientHeight * dpr;
        if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
        const ctx = el.getContext('2d');
        const st = sample(run, T.current, mirror);
        moments.current = st ? momentsAt(run, T.current, st.i, speed, mirror) : [];
        const focus = focusOf(moments.current); // rigore: inquadratura dedicata
        if (ctx) {
          if (focus) cam.current.step(focus.x, focus.y, dt, focus.zoom, w, h);
          else if (st) cam.current.step(st.bx, st.by, dt, cameraZoom(o.camera, !!r?.at(T.current)), w, h);
          draw(ctx, w, h, st, look, cam.current, css, moments.current);
        }
      }
      acc += dt;
      if (acc > 0.4) { acc = 0; tick(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [o.playing, o.speed, o.view, o.camera, run, look, mirror, canvas, tick]);

  return { T, reel, moments };
}
