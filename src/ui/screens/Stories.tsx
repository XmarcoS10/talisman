// Storie (GUIDA §13 P8 punto 6): gli archi aperti e quelli conclusi, prima i tuoi.
import { useState } from 'react';
import type { Arc, WorldState } from '../../engine/model.ts';
import { fmtDate, t } from '../i18n.ts';
import { PressRoom } from './PressRoom.tsx';

const involves = (world: WorldState, a: Arc) => a.subject.club === world.manager.clubId || a.subject.rival === world.manager.clubId;

/** un arco: le tappe raccontate, dalla più recente */
export function ArcCard({ world, a, full = true }: { world: WorldState; a: Arc; full?: boolean }) {
  const lines = [...a.lines].reverse();
  const shown = full ? lines : lines.slice(0, 1);
  return (
    <div className={`arc ${a.state}`}>
      <div className="row">
        <b>{t(`arc.${a.rule}`)}</b>
        <div className="spacer" />
        <span className={`chip ${a.state === 'won' ? 'ok' : a.state === 'lost' ? 'warn' : ''}`}>{t(`arc.state.${a.state}`)}</span>
      </div>
      {shown.map((l, i) => (
        <div key={i} className={i === 0 ? '' : 'muted'}>
          <span className="num muted">{fmtDate(l.season, l.day)}</span> {l.text}
        </div>
      ))}
    </div>
  );
}

export function Stories({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const arcs = world.arcs.filter((a) => a.lines.length > 0 && (scope === 'all' || involves(world, a)));
  const open = arcs.filter((a) => a.state === 'open').reverse();
  const closed = arcs.filter((a) => a.state !== 'open').reverse().slice(0, 30);

  return (
    <div className="grid">
      <PressRoom world={world} onChange={onChange} />
      <div className="row">
        {(['mine', 'all'] as const).map((k) => (
          <button key={k} className={`btn small ${scope === k ? 'primary' : ''}`} onClick={() => setScope(k)}>{t(`stories.${k}`)}</button>
        ))}
      </div>
      <div className="panel">
        <h3>{t('stories.open')}</h3>
        {open.length === 0 && <div className="muted">{t('stories.none')}</div>}
        {open.map((a) => <ArcCard key={a.id} world={world} a={a} />)}
      </div>
      <div className="panel">
        <h3>{t('stories.closed')}</h3>
        {closed.length === 0 && <div className="muted">{t('stories.none')}</div>}
        {closed.map((a) => <ArcCard key={a.id} world={world} a={a} full={false} />)}
      </div>
    </div>
  );
}

/** in Scrivania: le storie aperte che ti riguardano, le più recenti */
export function DeskStories({ world }: { world: WorldState }) {
  const open = world.arcs.filter((a) => a.state === 'open' && a.lines.length > 0 && involves(world, a)).slice(-3).reverse();
  if (!open.length) return null;
  return (
    <div className="panel">
      <h3>{t('stories.desk')}</h3>
      {open.map((a) => <ArcCard key={a.id} world={world} a={a} full={false} />)}
    </div>
  );
}
