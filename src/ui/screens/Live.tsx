// Partita in diretta (GUIDA §8.4): campo 2D, panchina, pannello analista, controlli.
import { useEffect, useReducer, useRef, useState } from 'react';
import type { Fixture, Tactic, WorldState } from '../../engine/model.ts';
import { finishMatchDay, type LiveDay } from '../../engine/world.ts';
import { context, pick } from '../match/analyst.ts';
import { atMinute, duration, ensure, matchMinutes, sample, SPEEDS, SPEED_LABELS } from '../match/playback.ts';
import { lines } from '../match/commentary.ts';
import { Camera, draw, resetTrail, type Look } from '../match/renderer.ts';
import { Crest } from '../Crest.tsx';
import { Hint } from '../Hint.tsx';
import { crowdIntensity, crowdStart, crowdStop, playUi } from '../audio.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { LiveAnalyst } from './LiveAnalyst.tsx';
import { LiveBench } from './LiveBench.tsx';
import { Seg } from './Tactics.tsx';

const EV_ICON: Record<string, string> = { goal: '⚽', penGoal: '⚽', penMiss: '✖', chance: '◎', yellow: '🟨', red: '🟥', injury: '✚', sub: '⇄' };
const INSTR = ['pressing', 'tempo', 'width', 'line', 'directness'] as const;

export function Live({ world, live, onFinish }: { world: WorldState; live: LiveDay; onFinish: (played: Fixture[]) => void }) {
  const { run, fx } = live;
  const me: 0 | 1 = fx.home === world.manager.clubId ? 0 : 1;
  const clubs = [world.clubs[fx.home]!, world.clubs[fx.away]!] as const;
  const canvas = useRef<HTMLCanvasElement>(null);
  const T = useRef(0);
  const cam = useRef(new Camera());
  const said = useRef(new Map<string, number>());
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [follow, setFollow] = useState(false); // di default si vede tutto il campo
  const [pause, setPause] = useState(false); // pausa tattica
  const [phrase, setPhrase] = useState<{ id: string; vars: Record<string, string | number> } | null>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const look: Look = useRef<Look>({
    colors: [clubs[0].colors[0]!, clubs[1].colors[0] === clubs[0].colors[0] ? clubs[1].colors[1]! : clubs[1].colors[0]!],
    numbers: new Map(), names: new Map(), mine: me,
  }).current;
  const mirror = me === 1; // la squadra dell'utente attacca sempre verso destra
  run.teams.forEach((tm) => tm.played.forEach((m, i) => {
    if (!look.numbers.has(m.p.id)) look.numbers.set(m.p.id, i + 1);
    look.names.set(m.p.id, shortName(m.p));
  }));

  // ciclo di disegno: la simulazione avanza quanto basta a stare davanti alla riproduzione
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const style = getComputedStyle(document.documentElement);
    const css = (v: string) => style.getPropertyValue(v) || '#123';
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing && !pause) {
        T.current += dt * SPEEDS[speed]!;
        ensure(run, T.current);
      }
      const el = canvas.current;
      if (el) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = el.clientWidth * dpr, h = el.clientHeight * dpr;
        if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
        const ctx = el.getContext('2d');
        const st = sample(run, T.current, mirror);
        if (ctx) {
          if (st) cam.current.step(st.bx, st.by, dt, follow, w, h);
          draw(ctx, w, h, st, look, cam.current, css);
        }
      }
      acc += dt;
      if (acc > 0.4) { acc = 0; rerender(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, pause, speed, follow, run, look, mirror]);

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
      <LiveBench run={run} me={me} onChange={rerender} />

      <div className="grid" style={{ alignContent: 'start' }}>
        <Hint id="live" />
        <div className="panel live-head">
          <span className="row"><Crest club={clubs[0]} size={28} />{clubs[0].shortName}</span>
          <b className="num big">{score[0]} – {score[1]}</b>
          <span className="row">{clubs[1].shortName}<Crest club={clubs[1]} size={28} /></span>
          <span className="num muted">{over ? t('match.fullTime') : `${min}'`}</span>
        </div>
        <div className="pitch-wrap">
          <canvas ref={canvas} className="pitch2d" />
          <span className="attack-dir">{t('live.attackRight', { club: clubs[me].shortName })}</span>
        </div>
        <div className="panel say">
          {lines(run.frames, st?.i ?? 0, look.names).map((l, i, a) => (
            <div key={`${l.key}${i}`} className={`${i === a.length - 1 ? 'now' : 'muted'} ${l.big ? 'big' : ''}`}>{t(l.key, l.vars)}</div>
          ))}
        </div>
        <div className="panel live-controls">
          <button className="btn primary" onClick={() => setPlaying(!playing)} disabled={over}>{playing ? '❚❚' : '▶'}</button>
          <Seg label={t('live.speed')} value={speed} options={[...SPEED_LABELS]} onChange={setSpeed} />
          <span className="muted">{t('live.duration', { n: matchMinutes(speed) })}</span>
          <button className="btn" onClick={nextEvent} disabled={over}>{t('live.nextEvent')}</button>
          <button className="btn" onClick={() => setPause(!pause)}>{t('live.tacticalPause')}</button>
          <button className="btn" onClick={() => setFollow(!follow)}>{t(follow ? 'live.wide' : 'live.follow')}</button>
          <button className="btn" onClick={toEnd} disabled={over}>{t('live.toEnd')}</button>
          {over && <button className="btn primary" onClick={() => onFinish(finishMatchDay(world, live))}>{t('live.report')}</button>}
        </div>
        <div className="panel">
          <div className="timeline">
            <div className="bar" style={{ width: `${Math.min(100, (min / 95) * 100)}%` }} />
            {run.events.map((e, i) => (
              <button key={i} className={`mark ${e.side === me ? 'me' : ''}`} style={{ left: `${Math.min(99, (e.min / 95) * 100)}%` }}
                title={`${e.min}' ${t(`match.ev.${e.type}`)} ${shortName(world.players[e.playerId]!)}`} onClick={() => jumpTo(e.min)}>
                {EV_ICON[e.type]}
              </button>
            ))}
          </div>
        </div>
        {pause && (
          <div className="panel">
            <h3>{t('live.tacticalPause')}</h3>
            <Seg label={t('tactics.mentality')} value={tac.mentality - 1} options={[1, 2, 3, 4, 5].map((m) => t(`mentality.${m}`))} onChange={(v) => setTac('mentality', v + 1)} />
            {INSTR.map((k) => (
              <Seg key={k} label={t(`instr.${k}`)} value={tac[k]} options={[0, 1, 2].map((v) => t(`instr.${k}.${v}`))} onChange={(v) => setTac(k, v)} />
            ))}
            <div className="muted">{t('live.pauseHint')}</div>
          </div>
        )}
      </div>

      <LiveAnalyst run={run} me={me} names={look.names} phrase={phrase} ctx={ctx} />
    </div>
  );
}
