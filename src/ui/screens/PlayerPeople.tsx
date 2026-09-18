// Pannelli del profilo giocatore della fase F5: umore e spogliatoio, sviluppo col "perché" (Causal Log).
import { exclude, makePromise, moraleParts, moraleTarget, reinstate, squadStatus } from '../../engine/morale.ts';
import type { Player, WorldState } from '../../engine/model.ts';
import { validMentor } from '../../engine/training.ts';
import { shortName } from '../bits.tsx';
import { fmtDate, fmtSeason, t, tEvent } from '../i18n.ts';
import { moraleClass } from './Graph.tsx';

export function PeoplePanel({ world, p, onChange, onPlayer }: { world: WorldState; p: Player; onChange: () => void; onPlayer: (id: number) => void }) {
  const club = p.clubId !== null ? world.clubs[p.clubId] : undefined;
  if (!club) return null;
  const mine = club.id === world.manager.clubId;
  const st = squadStatus(world, club).get(p.id)!;
  const parts = moraleParts(world, club, p, st);
  const promise = world.promises.find((x) => x.playerId === p.id);
  const excluded = club.excluded.includes(p.id);
  const mentor = validMentor(world, p);
  const rels = Object.entries(p.rel).map(([id, s]) => ({ q: world.players[Number(id)], s })).filter((r) => r.q && r.q.clubId === club.id);
  const list = (xs: typeof rels) => xs.length === 0 ? <span className="muted">{t('people.none')}</span>
    : xs.slice(0, 5).map(({ q, s }, i) => <span key={q!.id}>{i > 0 && ', '}<button className="link" onClick={() => onPlayer(q!.id)}>{shortName(q!)}</button> <span className="muted num">{Math.round(s)}</span></span>);
  const act = (f: () => void) => { f(); onChange(); };

  return (
    <div className="panel">
      <h3>{t('people.title')}</h3>
      <div className="attr"><span>{t('people.morale')}</span><b className={`num m-text-${moraleClass(p.psych.morale)}`}>{Math.round(p.psych.morale)} → {Math.round(moraleTarget(parts))}</b></div>
      <div className="attr"><span>{t('people.trust')}</span><b className="num">{Math.round(p.psych.trust)}</b></div>
      <div className="attr"><span>{t('people.status')}</span><span>{t(`sstatus.${st}`)}</span></div>
      <div className="muted" style={{ fontSize: 11 }}>{t('people.why')}</div>
      {(Object.keys(parts) as (keyof typeof parts)[]).filter((k) => Math.round(parts[k]) !== 0).map((k) => (
        <div key={k} className="attr"><span className="muted">{t(`part.${k}`)}</span><b className={`num ${parts[k] > 0 ? 'pos-good' : 'pos-bad'}`}>{parts[k] > 0 ? '+' : ''}{Math.round(parts[k])}</b></div>
      ))}
      <div><span className="muted">{t('people.friends')}: </span>{list(rels.filter((r) => r.s >= 30).sort((a, b) => b.s - a.s))}</div>
      <div><span className="muted">{t('people.rivals')}: </span>{list(rels.filter((r) => r.s <= -30).sort((a, b) => a.s - b.s))}</div>
      {mentor && <div className="muted">{t('people.mentor', { name: shortName(mentor) })}</div>}
      {p.psych.wantsOut && <div className="pos-bad">{t('people.wantsOut')}</div>}
      {mine && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {promise
            ? <span className="pos-mid">{t('people.promiseActive', { apps: promise.apps, need: promise.need, left: promise.left })}</span>
            : !excluded && <>
              <button className="btn" onClick={() => act(() => makePromise(world, p, 'starter'))}>{t('people.promiseStarter')}</button>
              <button className="btn" onClick={() => act(() => makePromise(world, p, 'minutes'))}>{t('people.promiseMinutes')}</button>
            </>}
          <button className="btn" onClick={() => act(() => (excluded ? reinstate : exclude)(world, club, p))}>{t(excluded ? 'people.reinstate' : 'people.exclude')}</button>
        </div>
      )}
    </div>
  );
}

/** grafico di crescita: CA a fine di ogni stagione passata + punti mensili della stagione in corso */
function Chart({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 280, H = 90;
  const lo = Math.min(...points) - 5, hi = Math.max(...points) + 5;
  const xy = points.map((v, i) => [(i / (points.length - 1)) * (W - 30) + 25, H - 10 - ((v - lo) / (hi - lo)) * (H - 20)] as const);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={t('dev.chart')}>
      <text x="0" y="12">{Math.round(hi - 5)}</text><text x="0" y={H - 6}>{Math.round(lo + 5)}</text>
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.5} />)}
    </svg>
  );
}

export function DevPanel({ world, p }: { world: WorldState; p: Player }) {
  const points = [...p.history.map((h) => h.ca), ...p.caLog.slice(p.history.length ? 1 : 0), p.ca];
  const events = world.causal.filter((e) => e.playerId === p.id).slice(-12).reverse();
  return (
    <div className="panel">
      <h3>{t('dev.title')}</h3>
      <div className="muted" style={{ fontSize: 11 }}>{t('dev.chart')} · {p.history.length ? fmtSeason(p.history[0]!.season) : fmtSeason(world.season)} →</div>
      <Chart points={points} />
      <div className="muted" style={{ fontSize: 11 }}>{t('dev.why')}</div>
      {events.length === 0 && <div className="muted">{t('dev.noEvents')}</div>}
      {events.map((e, i) => (
        <div key={i} className="row" style={{ fontSize: 12 }}>
          <span className="num muted">{fmtDate(e.season, e.day).split(' ').slice(1, 3).join(' ')}</span>
          <span className={e.key === 'cause.down' || e.key === 'cause.injury' ? 'pos-bad' : e.key === 'cause.up' ? 'pos-good' : ''}>{tEvent(e.key, e.vars)}</span>
        </div>
      ))}
    </div>
  );
}
