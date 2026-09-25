// Partita in diretta (GUIDA §8.4): campo 2D, panchina, pannello analista, controlli.
import { useEffect, useReducer, useRef, useState } from 'react';
import { matchKits } from '../procgen/kit.ts';
import type { Tactic, WorldState } from '../../engine/model.ts';
import type { LiveDay } from '../../engine/world.ts';
import { context, pick } from '../match/analyst.ts';
import { atMinute, duration, ensure, matchMinutes, sample, SPEED_LABELS } from '../match/playback.ts';
import { lines } from '../match/commentary.ts';
import { resetTrail, type CameraMode, type Look } from '../match/renderer.ts';
import type { ViewMode } from '../match/highlights.ts';
import { settings, updateSettings } from '../settings.ts';
import { useLiveLoop } from './LiveLoop.ts';
import { Pause, Play, SkipForward, SlidersHorizontal } from 'lucide-react';
import { Hint } from '../Hint.tsx';
import { crowdIntensity, crowdStart, crowdStop, playUi } from '../audio.ts';
import { shortName } from '../bits.tsx';
import { Inertia, Scoreboard, Shouts, SkipCard, Ticker, ViewBar } from './LiveParts.tsx';
import { t } from '../i18n.ts';
import { LiveAnalyst } from './LiveAnalyst.tsx';
import { LiveBench } from './LiveBench.tsx';
import { Seg } from './Tactics.tsx';

const INSTR = ['pressing', 'tempo', 'width', 'line', 'directness', 'counterPress'] as const;

export function Live({ world, live, onFinish }: { world: WorldState; live: LiveDay; onFinish: () => void }) {
  const { run, fx } = live;
  const me: 0 | 1 = fx.home === world.manager.clubId ? 0 : 1;
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!] as const;
  const canvas = useRef<HTMLCanvasElement>(null);
  const said = useRef(new Map<string, number>());
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [view, setView] = useState<ViewMode>(settings().view);
  const [camera, setCamera] = useState<CameraMode>(settings().camera);
  const [pause, setPause] = useState(false); // pausa tattica
  const [phrase, setPhrase] = useState<{ id: string; vars: Record<string, string | number> } | null>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const look: Look = useRef<Look>({
    ...matchKits(clubs[0], clubs[1]), // gli stessi colori delle maglie, con il bordo se si confondono
    numbers: new Map(), names: new Map(), mine: me,
  }).current;
  const mirror = me === 1; // la squadra dell'utente attacca sempre verso destra
  run.teams.forEach((tm) => tm.played.forEach((m, i) => {
    if (!look.numbers.has(m.p.id)) look.numbers.set(m.p.id, i + 1);
    look.names.set(m.p.id, shortName(m.p));
  }));

  const { T, reel } = useLiveLoop(run, canvas, look, mirror, { playing: playing && !pause, speed, view, camera }, rerender);
  const clip = view === 'full' ? null : reel.current.at(T.current);

  const st = sample(run, T.current, mirror);
  const min = st?.min ?? 0;
  const score = st?.score ?? [0, 0];

  // suoni: fischio d'inizio, boato ai gol (quando la riproduzione ci arriva, non quando il motore li calcola)
  const goals = useRef(0);
  useEffect(() => { crowdStart(); playUi('whistle'); return () => crowdStop(); }, []);
  const total = score[0] + score[1];
  if (total > goals.current) { goals.current = total; playUi('goal'); }
  crowdIntensity((st?.frame?.mom ?? 0) * (me === 0 ? 1 : -1) / 100 + 0.4);
  const ctx = context(run, me, run.frames, world.clubs[world.manager.clubId]!.playerIds
    .reduce((s, id) => s + world.players[id]!.psych.morale, 0) / world.clubs[world.manager.clubId]!.playerIds.length);

  // la frase dell'analista cambia ogni 5 minuti di gioco
  const lastPhrase = useRef(-10);
  if (min - lastPhrase.current >= 5) {
    lastPhrase.current = min;
    const p = pick({ ...ctx, min }, said.current);
    if (p) setTimeout(() => setPhrase(p), 0);
  }

  const over = run.done && T.current >= duration(run);
  const whistled = useRef(false);
  if (over && !whistled.current) { whistled.current = true; playUi('whistle'); }
  const jumpTo = (minute: number) => {
    const a = atMinute(run.track, minute);
    if (a !== null) { T.current = a; resetTrail(); }
  };
  const nextEvent = () => {
    const c = reel.current.clips.find((x) => x.from > T.current + 0.5);
    if (view !== 'full' && c) { T.current = c.from; resetTrail(); return; }
    const n = run.events.length;
    let guard = 0;
    while (!run.done && run.events.length === n && guard++ < 4000) ensure(run, duration(run) + 30);
    const ev = run.events[n];
    if (ev) jumpTo(ev.min); else toEnd();
  };
  // la partita finisce di giocarsi subito
  const toEnd = () => {
    run.result();
    T.current = duration(run);
    resetTrail();
    setPlaying(false);
  };
  const tac = world.clubs[world.manager.clubId]!.tactic;
  const setTac = <K extends keyof Tactic>(k: K, v: Tactic[K]) => { tac[k] = v; run.teams[me].baseMentality = tac.mentality; rerender(); };

  return (
    <div className="live">
      <div className="panel live-top">
        <Scoreboard clubs={clubs} score={score} min={min} over={over} me={me}
          tactics={[{ ...run.teams[0].tactic, mentality: run.teams[0].mentality }, { ...run.teams[1].tactic, mentality: run.teams[1].mentality }]} />
        <div className="live-ctl">
          <button className="btn primary sq" onClick={() => setPlaying(!playing)} disabled={over} aria-label={t('live.play')}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <div className="seg-tabs">{SPEED_LABELS.map((l, i) => <button key={l} className={i === speed ? 'active hot' : ''} onClick={() => setSpeed(i)}>{l}</button>)}</div>
          <button className="btn" onClick={nextEvent} disabled={over}><SkipForward size={14} /> {t('live.nextEvent')}</button>
          <button className={`btn ${pause ? 'primary' : ''}`} onClick={() => setPause(!pause)}><SlidersHorizontal size={14} /> {t('live.tacticalPause')}</button>
          <button className="btn" onClick={toEnd} disabled={over}>{t('live.toEnd')}</button>
          {over && <button className="btn primary big" onClick={onFinish}>{t('live.report')}</button>}
          {view === 'full' && <span className="muted small">{t('live.duration', { n: matchMinutes(speed) })}</span>}
        </div>
        <ViewBar view={view} camera={camera}
          onView={(v) => { setView(v); updateSettings({ view: v }); }} onCamera={(c) => { setCamera(c); updateSettings({ camera: c }); }} />
        <Inertia run={run} me={me} min={min} onJump={jumpTo} />
      </div>

      <div className="live-cols">
        <div className="stack">
          <Shouts run={run} me={me} min={min} onDone={() => { playUi('click'); rerender(); }} />
          <LiveBench run={run} me={me} onChange={rerender} />
        </div>

        <div className="stack">
          <Hint id="live" />
          <div className="pitch-wrap">
            <canvas ref={canvas} className="pitch2d" />
            <span className="attack-dir">{t('live.attackRight', { club: clubs[me].shortName })}</span>
            {view !== 'full' && !clip && !over && <SkipCard min={min} />}
          </div>
          <div className="panel say">
            {lines(run.frames, st?.i ?? 0, look.names).map((l, i, a) => (
              <div key={`${l.key}${i}`} className={`${i === a.length - 1 ? 'now' : 'muted'} ${l.big ? 'big' : ''}`}>{t(l.key, l.vars)}</div>
            ))}
          </div>
        </div>

        <div className="stack">
          <LiveAnalyst run={run} me={me} names={look.names} phrase={phrase} ctx={ctx} />
          <div className="panel quick">
            <h3>{t('live.quick')}</h3>
            <Seg label={t('tactics.mentality')} value={tac.mentality - 1} options={[1, 2, 3, 4, 5].map((m) => t(`mentality.${m}`))} onChange={(v) => setTac('mentality', v + 1)} />
            {INSTR.map((k) => (
              <Seg key={k} label={t(`instr.${k}`)} value={tac[k]} options={[0, 1, 2].map((v) => t(`instr.${k}.${v}`))} onChange={(v) => setTac(k, v)} />
            ))}
            <div className="muted small">{t(pause ? 'live.pauseHint' : 'live.quickHint')}</div>
          </div>
        </div>
      </div>

      <Ticker frames={run.frames} i={st?.i ?? 0} names={look.names} world={world} run={run} />
    </div>
  );
}
