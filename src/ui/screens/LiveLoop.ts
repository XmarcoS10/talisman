// Il ciclo di disegno della partita dal vivo: la simulazione avanza quanto basta a stare davanti alla riproduzione,
// la velocità dipende dalla modalità (Salienti ed Estesa corrono fra un'azione e l'altra), la telecamera segue.
import { useEffect, useRef, type RefObject } from 'react';
import type { MatchRun } from '../../engine/match/engine.ts';
import { Reel, speedAt, PRE, type ViewMode } from '../match/highlights.ts';
import { sample, SPEEDS, ensure } from '../match/playback.ts';
import { Camera, cameraZoom, draw, resetTrail, type CameraMode, type Look } from '../match/renderer.ts';
import { focusOf } from '../match/fx.ts';
import { beatTime, momentsAt, type Moment } from '../match/moments.ts';
import { Overlays, type OverlayKind } from '../match/overlays.ts';
import { t } from '../i18n.ts';
import { crowdReact, type CrowdReaction } from '../audio.ts';
import { CHANCE_XG } from '../match/highlights.ts';

/** gancio per gli strumenti (tools/clips.cjs registra le clip del sito): la partita, spostarsi, velocità fissa */
declare global { interface Window { talismanLive?: { run: MatchRun; seek(T: number): void; speed: number | null } } }

export interface LoopOpts { playing: boolean; speed: number; view: ViewMode; camera: CameraMode; overlays: OverlayKind[] }

/** quanto la simulazione sta avanti alla riproduzione: nei salienti deve vedere l'azione prima che cominci */
const AHEAD = PRE + 18;
/** replay: secondi di gioco per secondo reale (metà dei salienti: rallentatore) e quanto si torna indietro */
export const REPLAY_SPEED = 1;
const REPLAY_BACK = 12;
const REPLAY_AFTER = 1.5;

/** come reagisce la folla a un momento (il boato del gol lo suona già Live, quando cambia il punteggio) */
function reaction(m: Moment, all: Moment[]): CrowdReaction | null {
  if (m.kind === 'shot' && (m.xg ?? 0) >= CHANCE_XG) return 'ooh';
  if (m.kind === 'penalty') return 'ooh';
  const big = all.some((x) => x.step === m.step && x.kind === 'shot' && (x.xg ?? 0) >= CHANCE_XG);
  if ((m.kind === 'miss' || m.kind === 'save' || m.kind === 'parry') && big) return 'aah';
  if (m.kind === 'save' || m.kind === 'parry' || m.kind === 'beat') return 'applause';
  return null;
}

export function useLiveLoop(run: MatchRun, canvas: RefObject<HTMLCanvasElement | null>, look: Look, mirror: boolean, o: LoopOpts, tick: () => void) {
  const T = useRef(0);
  const cam = useRef(new Camera());
  // in Completa i salienti servono comunque: striscia delle azioni e replay
  const mode = o.view === 'full' ? 'highlights' : o.view;
  const reel = useRef(new Reel(mode));
  const moments = useRef<Moment[]>([]);
  const overlays = useRef(new Overlays(look.mine));
  const replay = useRef<{ to: number; back: number } | null>(null);
  const replayed = useRef(new Set<number>()); // gol già rivisti in automatico
  const heard = useRef(new Set<string>()); // reazioni della folla già suonate
  if (reel.current.mode !== mode) reel.current = new Reel(mode); // si ricalcola da capo sulla traccia già pronta
  /** rivede al rallentatore da `from` a `to`, poi torna dov'era */
  const startReplay = (from: number, to: number) => {
    replay.current = { to, back: replay.current?.back ?? T.current };
    T.current = Math.max(0, from);
    resetTrail();
  };
  const stopReplay = () => { if (replay.current) { T.current = replay.current.back; replay.current = null; resetTrail(); } };

  useEffect(() => {
    window.talismanLive = { run, seek: (x) => { T.current = x; replay.current = null; resetTrail(); }, speed: null };
    return () => { delete window.talismanLive; };
  }, [run]);

  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const style = getComputedStyle(document.documentElement);
    const css = (v: string) => style.getPropertyValue(v) || '#123';
    const on = new Set(o.overlays);
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const r = o.view === 'full' ? null : reel.current;
      const rp = replay.current;
      const speed = rp ? REPLAY_SPEED : window.talismanLive?.speed ?? speedAt(r, T.current, SPEEDS[o.speed]!) * (r ? SPEEDS[o.speed]! / SPEEDS[0] : 1);
      const prevT = T.current;
      if (o.playing) {
        T.current += dt * speed;
        if (rp && T.current >= rp.to) stopReplay();
        ensure(run, T.current + (r ? AHEAD : 0));
        reel.current.update(run);
      }
      overlays.current.update(run, T.current);
      const el = canvas.current;
      if (el) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = el.clientWidth * dpr, h = el.clientHeight * dpr;
        if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
        const ctx = el.getContext('2d');
        const st = sample(run, T.current, mirror);
        moments.current = st ? momentsAt(run, T.current, st.i, speed, mirror) : [];
        // replay automatico di ogni gol, alla fine del suo saliente: solo se ci si passa giocando, non saltando
        const goal = rp ? undefined : reel.current.clips.find((c) => c.kind === 'goal' && prevT < c.to && c.to <= T.current && !replayed.current.has(c.step));
        if (goal) {
          replayed.current.add(goal.step);
          const k = beatTime(run, goal.step, 'goal');
          startReplay(k - REPLAY_BACK, k + REPLAY_AFTER);
        }
        if (o.playing && !rp) for (const m of moments.current) { // la folla reagisce una volta sola a ogni momento
          const react = reaction(m, moments.current);
          const key = `${m.step}${m.kind}`;
          if (react && m.age < 0.3 && !heard.current.has(key)) { heard.current.add(key); crowdReact(react); }
        }
        const focus = focusOf(moments.current); // rigore: inquadratura dedicata
        if (ctx) {
          if (focus) cam.current.step(focus.x, focus.y, dt, focus.zoom, w, h);
          else if (st) cam.current.step(st.bx, st.by, dt, cameraZoom(o.camera, !!r?.at(T.current)), w, h);
          const g = overlays.current.ghost;
          draw(ctx, w, h, st, look, cam.current, css, moments.current,
            { ov: overlays.current, on, mirror, before: g ? t('overlay.before', { n: g.min }) : '' });
        }
      }
      acc += dt;
      if (acc > 0.4) { acc = 0; tick(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [o.playing, o.speed, o.view, o.camera, o.overlays, run, look, mirror, canvas, tick]);

  return { T, reel, moments, replay, startReplay, stopReplay, overlays };
}
