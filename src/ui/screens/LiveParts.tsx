// Pezzi della partita dal vivo: tabellone, barra dell'inerzia con gli eventi, indicazioni dalla panchina,
// regolazioni rapide, cronaca scorrevole.
import { Megaphone, Flame, Wind } from 'lucide-react';
import type { MatchRun, Shout, TraceStep } from '../../engine/match/engine.ts';
import type { Club, Tactic, WorldState } from '../../engine/model.ts';
import { Crest } from '../Crest.tsx';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { lines } from '../match/commentary.ts';
import { VIEW_MODES, type Clip, type ViewMode } from '../match/highlights.ts';
import { CAMERA_MODES, type CameraMode } from '../match/renderer.ts';
import { FastForward, Rewind } from 'lucide-react';

const EV_ICON: Record<string, string> = { goal: '⚽', penGoal: '⚽', penMiss: '✖', chance: '◎', yellow: '🟨', red: '🟥', injury: '✚', sub: '⇄', plan: '📋' };

export function Scoreboard({ clubs, score, min, over, me, tactics, flash = false }: {
  clubs: readonly [Club, Club]; score: [number, number]; min: number; over: boolean; me: 0 | 1; tactics: [Tactic, Tactic]; flash?: boolean;
}) {
  const side = (i: 0 | 1) => (
    <div className={`sb-team ${i === 1 ? 'away' : ''}`}>
      <Crest club={clubs[i]} size={40} />
      <div><b>{clubs[i].name} <span className="code">{clubs[i].shortName.slice(0, 3).toUpperCase()}</span></b>
        <div className="muted small">{tactics[i].formation} · {t(`mentality.${tactics[i].mentality}`)} · {t(i === 0 ? 'live.home' : 'live.away')}{i === me ? ` · ${t('live.you')}` : ''}</div></div>
    </div>
  );
  return (
    <div className="scoreboard">
      {side(0)}
      <div className={`sb-score ${flash ? 'flash' : ''}`}>
        <b className="num">{score[0]}</b><span className="muted">:</span><b className="num">{score[1]}</b>
        <span className="sb-time"><span className="live-dot" />{over ? t('match.fullTime') : `${min}'`}<small>{t(min <= 45 ? 'live.firstHalf' : 'live.secondHalf')}</small></span>
      </div>
      {side(1)}
    </div>
  );
}

export function Inertia({ run, me, min, onJump }: { run: MatchRun; me: 0 | 1; min: number; onJump: (m: number) => void }) {
  const last = run.frames.at(-1);
  const mom = last ? (last.mom * (me === 0 ? 1 : -1)) : 0;
  const mine = Math.round(50 + mom / 2);
  return (
    <div className="inertia">
      <span className="caps">{t('live.inertia')} <b className="pos-good">{mine}%</b> / <b className="pos-bad">{100 - mine}%</b></span>
      <div className="inertia-bar">
        <div className="fill" style={{ width: `${Math.min(100, (min / 95) * 100)}%` }} />
        {run.events.map((e, i) => (
          <button key={i} className={`mark ${e.side === me ? 'me' : ''}`} style={{ left: `${Math.min(99, (e.min / 95) * 100)}%` }}
            title={`${e.min}' ${t(`match.ev.${e.type}`)}`} onClick={() => onJump(e.min)}>{EV_ICON[e.type]}</button>
        ))}
      </div>
      <span className="ticks num">{[0, 15, 30, 45, 60, 75, 90].map((m) => <span key={m} className={Math.abs(min - m) < 8 ? 'pos-good' : ''}>{m}'</span>)}</span>
    </div>
  );
}

const SHOUTS: [Shout, typeof Megaphone][] = [['encourage', Megaphone], ['demand', Flame], ['calm', Wind]];

export function Shouts({ run, me, min, onDone }: { run: MatchRun; me: 0 | 1; min: number; onDone: (k: Shout) => void }) {
  const wait = run.nextShout(me) - min;
  return (
    <div className="shouts">
      {SHOUTS.map(([k, Icon]) => (
        <button key={k} className="btn" disabled={wait > 0 || run.done} title={t(`live.shoutHint.${k}`)} onClick={() => { if (run.shout(me, k)) onDone(k); }}>
          <Icon size={14} /> {t(`live.shout.${k}`)}
        </button>
      ))}
      {wait > 0 && <span className="muted small">{t('live.shoutWait', { n: wait })}</span>}
    </div>
  );
}

export function Ticker({ frames, i, names, world, run }: { frames: TraceStep[]; i: number; names: Map<number, string>; world: WorldState; run: MatchRun }) {
  const now = lines(frames, i, names, 1)[0];
  const evs = run.events.filter((e) => e.type !== 'chance').slice(-4).reverse();
  return (
    <div className="ticker">
      <span className="caps pos-good"><span className="live-dot" />{t('live.ticker')}</span>
      {now && <span className={`tick-now ${now.big ? 'big' : ''}`}>{t(now.key, now.vars)}</span>}
      {evs.map((e, k) => (
        <span key={k} className="muted small">→ {e.min}' {EV_ICON[e.type]} {e.type === 'plan' ? t('live.planFired', { name: e.plan ?? '' }) : world.players[e.playerId] ? shortName(world.players[e.playerId]!) : ''}</span>
      ))}
    </div>
  );
}

/** visione (Salienti, Estesa, Completa) e telecamera: si scelgono anche in Impostazioni */
export function ViewBar({ view, camera, onView, onCamera }: { view: ViewMode; camera: CameraMode; onView: (v: ViewMode) => void; onCamera: (c: CameraMode) => void }) {
  return (
    <div className="view-bar">
      <span className="caps">{t('live.view')}</span>
      <div className="seg-tabs">{VIEW_MODES.map((v) => <button key={v} className={v === view ? 'active hot' : ''} title={t(`view.${v}.hint`)} onClick={() => onView(v)}>{t(`view.${v}`)}</button>)}</div>
      <span className="caps">{t('live.camera')}</span>
      <div className="seg-tabs">{CAMERA_MODES.map((c) => <button key={c} className={c === camera ? 'active hot' : ''} onClick={() => onCamera(c)}>{t(`camera.${c}`)}</button>)}</div>
    </div>
  );
}

/** fra un saliente e l'altro: il campo si scurisce e il cronometro corre */
export function SkipCard({ min }: { min: number }) {
  return (
    <div className="skip-card">
      <FastForward size={18} />
      <b className="num">{min}'</b>
      <span className="muted small">{t('live.skip')}</span>
    </div>
  );
}

const CLIP_ICON: Record<Clip['kind'], string> = { goal: '⚽', penalty: '◉', red: '🟥', injury: '✚', save: '🧤', chance: '◎', press: '⇡', break: '⇢' };

/** striscia dei salienti già visti: un clic li rivede al rallentatore */
export function ClipStrip({ clips, now, me, onReplay }: { clips: Clip[]; now: number; me: 0 | 1; onReplay: (c: Clip) => void }) {
  const seen = clips.filter((c) => c.to <= now);
  if (!seen.length) return null;
  return (
    <div className="clip-strip">
      <span className="caps">{t('live.clips')}</span>
      {seen.map((c) => (
        <button key={c.step} className={`clip ${c.kind} ${c.side === me ? 'me' : ''}`} title={t('live.replayThis', { what: t(`clip.${c.kind}`), n: c.min })} onClick={() => onReplay(c)}>
          {c.min}' {CLIP_ICON[c.kind]}
        </button>
      ))}
    </div>
  );
}

/** in replay: la scritta sul campo e il tasto per tornare subito alla partita */
export function ReplayTag({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="replay-tag">
      <Rewind size={14} /> <b>{t('live.replay')}</b>
      <button className="btn small" onClick={onSkip}>{t('live.replaySkip')}</button>
    </div>
  );
}
