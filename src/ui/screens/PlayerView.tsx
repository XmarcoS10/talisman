// Scheda giocatore (specifiche §3.6): intestazione, e sei schede — profilo con radar, attributi, statistiche,
// prestazioni, contratto, dinamiche. Dei giocatori non tuoi solo stime (§7.6).
import { useState } from 'react';
import { ArrowLeft, Footprints, Handshake, Ruler } from 'lucide-react';
import { ATTR_GROUPS, type WorldState } from '../../engine/model.ts';
import { age } from '../../engine/players.ts';
import { estimate, personalityKnown } from '../../engine/scouting/fog.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { Crest } from '../Crest.tsx';
import { Face } from '../Face.tsx';
import { Radar } from '../Radar.tsx';
import { PosBadge, Rating, Stars, attrClass, fullName, personalityKey, standoutTraits } from '../bits.tsx';
import { Ability, Est, Known } from '../fog.tsx';
import { fmtMoney, fmtSeason, t } from '../i18n.ts';
import { ContractPanel } from './ContractPanel.tsx';
import { Deal } from './Deal.tsx';
import { DevPanel, PeoplePanel } from './PlayerPeople.tsx';
import { Status } from './Squad.tsx';

type Props = { startDeal?: boolean; world: WorldState; playerId: number; onBack: () => void; onClub: (id: number) => void; onChange: () => void; onPlayer: (id: number) => void };
type Tab = 'profile' | 'attrs' | 'stats' | 'form' | 'contract' | 'people';

export function PlayerView({ startDeal = false, world, playerId, onBack, onClub, onChange, onPlayer }: Props) {
  const p = world.players[playerId];
  const [tab, setTab] = useState<Tab>(startDeal ? 'contract' : 'profile');
  const [deal, setDeal] = useState(startDeal);
  if (!p) return <button className="btn" onClick={onBack}>{t('player.back')}</button>;
  const club = p.clubId !== null ? world.clubs[p.clubId] : undefined;
  const own = p.clubId === world.manager.clubId;
  const known = own || personalityKnown(world, p);
  const traits = standoutTraits(p);
  const groups = p.position === 'GK' ? (['goalkeeping', 'mental', 'physical'] as const) : (['technical', 'mental', 'physical'] as const);
  const secondary = Object.entries(p.positions).filter(([pos]) => pos !== p.position);
  const tabs: Tab[] = own ? ['profile', 'attrs', 'stats', 'form', 'contract', 'people'] : ['profile', 'attrs', 'stats', 'form', 'contract'];
  const worth = value(p, world.season, { clubRep: club?.reputation });
  const growth = p.caLog.length > 1 ? p.caLog : [];

  const valueBox = (
    <div className="panel">
      <h2>{t('player.money')}</h2>
      <div className="tile-facts">
        <span>{t('player.value')}</span><b className="num pos-good">{fmtMoney(worth)}</b>
        <span>{t('col.wage')}</span><span className="num">{t('player.wage', { wage: fmtMoney(p.contract.wage) })}</span>
        <span>{t('col.contract')}</span><span className={`num ${p.contract.until <= world.season ? 'pos-bad' : ''}`}>{p.contract.until}</span>
        <span>{t('col.release')}</span><span className="num">{p.contract.release ? fmtMoney(p.contract.release) : '—'}</span>
      </div>
    </div>
  );

  return (
    <div className="stack">
      <button className="link" style={{ alignSelf: 'flex-start' }} onClick={onBack}><ArrowLeft size={14} /> {t('player.back')}</button>

      <div className="panel player-head">
        <span className="avatar-big" style={{ borderColor: club?.colors[0] ?? 'var(--border)' }}><Face world={world} p={p} width={84} /></span>
        <div className="stack" style={{ gap: 6, flex: 1 }}>
          <span className="row wrap"><PosBadge pos={p.position} />{club && <><Crest club={club} size={20} /><button className="link" onClick={() => onClub(club.id)}>{club.name}</button></>}<Status p={p} /></span>
          <h1 className="dossier-name" style={{ fontSize: 40 }}>{fullName(p)}</h1>
          <span className="row wrap muted">
            <span>{t('player.age', { age: age(p, world.season) })}</span><span>{t(`nat.${p.nation}`)}</span>
            <span><Ruler size={13} /> {t('player.height', { cm: p.heightCm })}</span><span><Footprints size={13} /> {t(`player.foot.${p.foot}`)}</span>
            {secondary.length > 0 && <span>{t('player.positions')}: {secondary.map(([pos]) => t(`pos.${pos}`)).join(', ')}</span>}
          </span>
        </div>
        <div className="dossier-side">
          <span className="caps">{t('col.ability')}</span>{own ? <Stars world={world} ca={p.ca} /> : <Ability world={world} p={p} which="ca" />}
          <span className="caps">{t('col.potential')}</span>{own ? <Stars world={world} ca={p.pa} /> : <Ability world={world} p={p} which="pa" />}
          {!own && <Known world={world} p={p} />}
        </div>
        {!own && p.clubId !== null && !deal && <button className="btn primary big" onClick={() => { setDeal(true); setTab('contract'); }}><Handshake size={16} /> {t('deal.start')}</button>}
      </div>

      <div className="seg-tabs">
        {tabs.map((x) => <button key={x} className={tab === x ? 'active hot' : ''} onClick={() => setTab(x)}>{t(`player.tab.${x}`)}</button>)}
      </div>

      {tab === 'profile' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start' }}>
          <div className="panel" style={{ alignItems: 'center' }}><h2 style={{ alignSelf: 'flex-start' }}>{t('player.radar')}</h2><Radar world={world} p={p} own={own} /></div>
          <div className="stack">
            <div className="panel">
              <h2>{t('player.condition')}</h2>
              <span className="row" style={{ justifyContent: 'space-between' }}><span>{t('col.fitness')}</span><b className="num">{p.condition.fitness}%</b></span>
              <div className="meter"><i className={p.condition.fitness < 60 ? 'bad' : p.condition.fitness < 75 ? 'warn' : ''} style={{ width: `${p.condition.fitness}%` }} /></div>
              <span className="row" style={{ justifyContent: 'space-between' }}><span>{t('col.sharpness')}</span><b className="num">{Math.round(p.condition.sharpness)}%</b></span>
              <div className="meter"><i className="cyan" style={{ width: `${p.condition.sharpness}%` }} /></div>
              {p.form.length > 0 && <span className="row wrap"><span className="muted">{t('player.form')}</span>{p.form.map((v, i) => <Rating key={i} v={v} />)}</span>}
            </div>
            <div className="panel">
              <h2>{t('player.personality')}</h2>
              {/* «Equilibrato» sopra tratti che spiccano si contraddirebbe: in quel caso parlano i tratti */}
              {!known ? <b className="deal-h">{t('fog.personality')}</b> : (personalityKey(p) !== 'pers.balanced' || !traits.length) && <b className="deal-h">{t(personalityKey(p))}</b>}
              {known && traits.map((k) => (
                <span key={k} className="stack" style={{ gap: 2 }}><b className="small">{t(`${k}.name`)}</b><span className="muted small">{t(`${k}.what`)}</span></span>
              ))}
              {p.intl.caps > 0 && <span className="muted">{t('player.intl', { caps: p.intl.caps, goals: p.intl.goals })}</span>}
            </div>
          </div>
          {valueBox}
        </div>
      )}

      {tab === 'attrs' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'start' }}>
          {groups.map((g) => (
            <div key={g} className="panel" style={{ gap: 0 }}>
              <h2 style={{ marginBottom: 'var(--s-2)' }}>{t(`group.${g}`)}</h2>
              {ATTR_GROUPS[g].map((k) => (
                <div key={k} className="attr"><span>{t(`attr.${k}`)}</span>
                  {own ? <b className={attrClass(p.attrs[k])}>{p.attrs[k]}</b> : <Est b={estimate(world, p, k)} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'stats' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <div className="panel">
            <h2>{t('player.season')} {fmtSeason(world.season)}</h2>
            <div className="tile-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <span><span className="caps">{t('col.apps')}</span><b className="big-num">{p.stats.apps}</b></span>
              <span><span className="caps">{t('col.goals')}</span><b className="big-num">{p.stats.goals}</b></span>
              <span><span className="caps">{t('col.assists')}</span><b className="big-num">{p.stats.assists}</b></span>
              <span><span className="caps">{t('col.rating')}</span>{p.stats.apps > 0 ? <Rating v={p.stats.ratingSum / p.stats.apps} /> : <b className="big-num">–</b>}</span>
            </div>
            <span className="muted">{t('player.cards', { y: p.stats.yellows, r: p.stats.reds })}</span>
          </div>
          <div className="panel">
            <h2>{t('player.career')}</h2>
            {p.history.length === 0 ? <div className="muted">{t('player.noHistory')}</div> : (
              <table>
                <thead><tr><th>{t('fin.season')}</th><th>{t('col.club')}</th><th className="r">{t('col.apps')}</th><th className="r">{t('col.goals')}</th></tr></thead>
                <tbody>
                  {[...p.history].reverse().map((h) => (
                    <tr key={h.season}><td className="num">{fmtSeason(h.season)}</td><td>{world.clubs[h.clubId]?.name}</td><td className="r num">{h.apps}</td><td className="r num">{h.goals}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'form' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
          <div className="panel">
            <h2>{t('player.lastRatings')}</h2>
            <span className="row wrap">{p.form.length ? p.form.map((v, i) => <Rating key={i} v={v} />) : <span className="muted">{t('player.noRatings')}</span>}</span>
            {own && growth.length > 1 && <>
              <span className="caps">{t('player.growth')}</span>
              <svg viewBox="0 0 300 80" className="spark"><polyline points={growth.map((v, i) => `${(i / (growth.length - 1)) * 300},${75 - ((v - Math.min(...growth)) / Math.max(1, Math.max(...growth) - Math.min(...growth))) * 70}`).join(' ')} /></svg>
            </>}
          </div>
          <DevPanel world={world} p={p} />
        </div>
      )}

      {tab === 'contract' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', alignItems: 'start' }}>
          {own ? <ContractPanel world={world} p={p} onChange={onChange} />
            : p.clubId !== null ? (deal ? <Deal world={world} p={p} onChange={onChange} onClose={() => setDeal(false)} />
              : <div className="panel"><button className="btn primary big" onClick={() => setDeal(true)}><Handshake size={16} /> {t('deal.start')}</button></div>)
              : <div className="panel muted">{t('player.freeAgent')}</div>}
          {valueBox}
        </div>
      )}

      {tab === 'people' && own && <PeoplePanel world={world} p={p} onChange={onChange} onPlayer={onPlayer} />}
    </div>
  );
}
