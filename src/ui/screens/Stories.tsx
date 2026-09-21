// Storie e sala stampa (GUIDA §13 P8 punto 6): conferenza, giornale, clima mediatico, cronaca di lega, le trame in corso.
import { useState } from 'react';
import { Layers, Newspaper, Rss, Search, ShieldCheck, TrendingUp } from 'lucide-react';
import type { Arc, WorldState } from '../../engine/model.ts';
import { age } from '../../engine/players.ts';
import { Crest } from '../Crest.tsx';
import { PosBadge, fullName } from '../bits.tsx';
import { fmtDate, t } from '../i18n.ts';
import { PressRoom } from './PressRoom.tsx';

const involves = (world: WorldState, a: Arc) => a.subject.club === world.manager.clubId || a.subject.rival === world.manager.clubId
  || (a.subject.player !== undefined && world.players[a.subject.player]?.clubId === world.manager.clubId);

// tipi di storia per i filtri rapidi
const KINDS = {
  market: ['newSigning', 'flop', 'preSigned', 'formerClub', 'wantsOut'],
  polemics: ['hothead', 'feud', 'boardUnrest', 'fans', 'ffp', 'crisis', 'thrashing', 'giant'],
  dressing: ['mentor', 'veteran', 'debut', 'predestined', 'talisman', 'redemption', 'comebackKid', 'slump'],
} as const;
type Kind = 'all' | keyof typeof KINDS;

/** un arco: il protagonista, le tappe raccontate dalla più recente */
export function ArcCard({ world, a, full = true }: { world: WorldState; a: Arc; full?: boolean }) {
  const lines = [...a.lines].reverse();
  const shown = full ? lines : lines.slice(0, 1);
  const p = a.subject.player !== undefined ? world.players[a.subject.player] : undefined;
  const c = a.subject.club !== undefined ? world.clubs[a.subject.club] : undefined;
  return (
    <div className={`arc ${a.state}`}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="row">
          {p ? <span className="initials">{p.firstName[0]}{p.lastName[0]}</span> : c ? <Crest club={c} size={30} /> : null}
          <span><b className="deal-h">{p ? fullName(p) : c?.name ?? t(`arc.${a.rule}`)}</b>
            {p && <div className="muted small row">{t('stories.ageRole', { age: age(p, world.season) })} <PosBadge pos={p.position} /></div>}</span>
        </span>
        <span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
          <span className="tag">{t(`arc.${a.rule}`)}</span>
          <span className={`tag ${a.state === 'won' ? '' : a.state === 'lost' ? 'bad' : 'dim'}`}>{t(`arc.state.${a.state}`)}</span>
        </span>
      </div>
      {shown.map((l, i) => (
        <div key={i} className={i === 0 ? '' : 'muted'}><span className="num muted small">{fmtDate(l.season, l.day)}</span> {l.text}</div>
      ))}
    </div>
  );
}

export function Stories({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const [scope, setScope] = useState<'mine' | 'all' | 'papers'>('mine');
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');
  const club = world.clubs[world.manager.clubId]!;
  const told = world.arcs.filter((a) => a.lines.length > 0);
  const mine = told.filter((a) => involves(world, a));
  const match = (a: Arc) => (kind === 'all' || (KINDS[kind] as readonly string[]).includes(a.rule))
    && (!q || `${t(`arc.${a.rule}`)} ${a.lines.map((l) => l.text).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const pool = (scope === 'mine' ? mine : told).filter(match);
  const open = pool.filter((a) => a.state === 'open').reverse();
  const closed = pool.filter((a) => a.state !== 'open').reverse().slice(0, 30);
  // il giornale: l'ultima riga di una storia del tuo club fa da titolo
  const lead = mine.flatMap((a) => a.lines.map((l) => ({ a, l }))).sort((x, y) => y.l.season * 400 + y.l.day - (x.l.season * 400 + x.l.day));
  const league = told.filter((a) => !involves(world, a)).flatMap((a) => a.lines.map((l) => ({ a, l })))
    .sort((x, y) => y.l.season * 400 + y.l.day - (x.l.season * 400 + x.l.day)).slice(0, 5);
  const press = world.manager.board.trust.press;
  const pressing = world.press ? world.press.questions.filter((x) => x.answered === null).length : 0;

  return (
    <div className="stack">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="seg-tabs">
          <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}><ShieldCheck size={14} /> {t('stories.tabMine', { club: club.shortName })} <span className="tag">{mine.filter((a) => a.state === 'open').length}</span></button>
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>{t('stories.tabAll')}</button>
          <button className={scope === 'papers' ? 'active' : ''} onClick={() => setScope('papers')}><Newspaper size={14} /> {t('stories.tabPapers')}</button>
        </div>
        <label className="search-box"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('stories.search')} /></label>
      </div>
      <div className="row wrap"><span className="caps">{t('stories.quick')}</span>
        <div className="chips">
          {(['all', 'market', 'polemics', 'dressing'] as Kind[]).map((k) => <button key={k} className={k === kind ? 'active' : ''} onClick={() => setKind(k)}>{t(`stories.kind.${k}`)}</button>)}
          <button className={pressing ? 'active' : ''} onClick={() => setScope('mine')}>● {t('stories.pressOpen', { n: pressing })}</button>
        </div>
      </div>

      <div className="cols2" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)' }}>
        <div className="stack">
          {scope !== 'papers' && <PressRoom world={world} onChange={onChange} />}
          <div className="row" style={{ justifyContent: 'space-between' }}><h2><Layers size={18} /> {t('stories.open')}</h2><span className="caps">{t('stories.count', { n: open.length })}</span></div>
          {open.length === 0 && <div className="panel muted">{t('stories.none')}</div>}
          <div className="report-grid">{open.map((a) => <ArcCard key={a.id} world={world} a={a} />)}</div>
          <h2>{t('stories.closed')}</h2>
          {closed.length === 0 && <div className="panel muted">{t('stories.none')}</div>}
          <div className="report-grid">{closed.map((a) => <ArcCard key={a.id} world={world} a={a} full={false} />)}</div>
        </div>

        <div className="stack">
          <div className="panel paper">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span><span className="caps">{t('stories.paperKicker')}</span><div className="deal-h">{t('stories.paper', { city: club.city })}</div></span>
              <span className="stack" style={{ alignItems: 'flex-end', gap: 2 }}><span className="tag cyan">{t('stories.edition')}</span><span className="caps">{fmtDate(world.season, world.day)}</span></span>
            </div>
            {lead[0] ? <>
              <span className="caps pos-good">{t(`arc.${lead[0].a.rule}`)}</span>
              <h1 className="headline">{lead[0].l.text}</h1>
              {lead.slice(1, 3).map((x, i) => <p key={i} className="muted serif">«{x.l.text}»</p>)}
            </> : <span className="muted">{t('stories.noPaper')}</span>}
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}><h2><TrendingUp size={18} /> {t('stories.climate')}</h2><span className="tag cyan">{t(`board.band.${press >= 70 ? 'high' : press >= 50 ? 'ok' : press >= 32 ? 'low' : 'crisis'}`)}</span></div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="mini-card"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('stories.pressure')}</span><b className="num pos-mid">{Math.round(100 - press)}%</b></span>
                <div className="meter"><i className="warn" style={{ width: `${100 - press}%` }} /></div></div>
              <div className="mini-card"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('stories.judgement')}</span><b className="num pos-good">{Math.round(press)}%</b></span>
                <div className="meter"><i style={{ width: `${press}%` }} /></div></div>
            </div>
            <span className="muted small">{t('stories.climateHint', { n: mine.filter((a) => a.state === 'open').length })}</span>
          </div>

          <div className="panel">
            <h2><Rss size={18} /> {t('stories.league')}</h2>
            {league.length === 0 && <span className="muted">{t('stories.none')}</span>}
            {league.map(({ a, l }, i) => {
              const c = a.subject.club !== undefined ? world.clubs[a.subject.club] : a.subject.player !== undefined ? world.clubs[world.players[a.subject.player]?.clubId ?? -1] : undefined;
              return (
                <div key={i} className="feed-row">
                  <span className="num muted small">{fmtDate(l.season, l.day).split(' ').slice(1, 3).join(' ')}</span>
                  <div><b className="pos-good small">{c?.name ?? t(`arc.${a.rule}`)}</b><div>{l.text}</div></div>
                </div>
              );
            })}
          </div>
        </div>
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
