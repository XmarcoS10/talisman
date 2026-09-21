import { ATTR_GROUPS, type WorldState } from '../../engine/model.ts';
import { age } from '../../engine/players.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { Crest } from '../Crest.tsx';
import { PosBadge, Stars, attrClass, fullName, personalityKey } from '../bits.tsx';
import { useState } from 'react';
import { estimate, personalityKnown } from '../../engine/scouting/fog.ts';
import { ContractPanel } from './ContractPanel.tsx';
import { Deal } from './Deal.tsx';
import { Ability, Est, Known } from '../fog.tsx';
import { fmtMoney, fmtSeason, t } from '../i18n.ts';
import { DevPanel, PeoplePanel } from './PlayerPeople.tsx';
import { Status } from './Squad.tsx';

type Props = { world: WorldState; playerId: number; onBack: () => void; onClub: (id: number) => void; onChange: () => void; onPlayer: (id: number) => void };

export function PlayerView({ world, playerId, onBack, onClub, onChange, onPlayer }: Props) {
  const p = world.players[playerId];
  if (!p) return <button className="btn" onClick={onBack}>{t('player.back')}</button>;
  const club = p.clubId !== null ? world.clubs[p.clubId] : undefined;
  const own = p.clubId === world.manager.clubId;
  const [deal, setDeal] = useState(false);
  const groups = p.position === 'GK' ? (['goalkeeping', 'mental', 'physical'] as const) : (['technical', 'mental', 'physical'] as const);
  const secondary = Object.entries(p.positions).filter(([pos]) => pos !== p.position);

  return (
    <div className="grid">
      <div className="row">
        <button className="btn" onClick={onBack}>← {t('player.back')}</button>
      </div>
      <div className="panel row" style={{ gap: 'var(--s-4)' }}>
        {club && <Crest club={club} size={64} />}
        <div style={{ flex: 1 }}>
          <h1>{fullName(p)}</h1>
          <div className="row muted">
            <PosBadge pos={p.position} />
            {club && <button className="link" onClick={() => onClub(club.id)}>{club.name}</button>}·<span>{t('player.age', { age: age(p, world.season) })}</span>·<span>{t(`nat.${p.nation}`)}</span>·
            <span>{t('player.height', { cm: p.heightCm })}</span>·<span>{t(`player.foot.${p.foot}`)}</span>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'auto auto', gap: 'var(--s-1) var(--s-3)', alignItems: 'center' }}>
          <span className="muted">{t('col.ability')}</span>
          {own ? <Stars ca={p.ca} /> : <Ability world={world} p={p} which="ca" />}
          <span className="muted">{t('col.potential')}</span>
          {own ? <Stars ca={p.pa} /> : <Ability world={world} p={p} which="pa" />}
          {!own && <Known world={world} p={p} />}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 320px', alignItems: 'start' }}>
        {groups.map((g) => (
          <div key={g} className="panel" style={{ gap: 0 }}>
            <h3 style={{ marginBottom: 'var(--s-2)' }}>{t(`group.${g}`)}</h3>
            {ATTR_GROUPS[g].map((k) => (
              <div key={k} className="attr"><span>{t(`attr.${k}`)}</span>
                {own ? <b className={attrClass(p.attrs[k])}>{p.attrs[k]}</b> : <Est b={estimate(world, p, k)} />}
              </div>
            ))}
          </div>
        ))}
        <div className="grid">
          {own && <ContractPanel world={world} p={p} onChange={onChange} />}
          {!own && p.clubId !== null && (deal
            ? <Deal world={world} p={p} onChange={onChange} onClose={() => setDeal(false)} />
            : <button className="btn primary" onClick={() => setDeal(true)}>{t('deal.start')}</button>)}
          {own && <PeoplePanel world={world} p={p} onChange={onChange} onPlayer={onPlayer} />}
          <DevPanel world={world} p={p} />
          <div className="panel">
            <h3>{t('player.value')}</h3>
            <div className="num" style={{ fontSize: 22 }}>{fmtMoney(value(p, world.season, { clubRep: world.clubs[p.clubId ?? 0]?.reputation }))}</div>
            <div className="muted">{t('player.contract', { year: p.contract.until })} · {t('player.wage', { wage: fmtMoney(p.contract.wage) })}</div>
            {p.intl.caps > 0 && <div className="muted">{t('player.intl', { caps: p.intl.caps, goals: p.intl.goals })}</div>}
          </div>
          <div className="panel">
            <h3>{t('player.personality')}</h3>
            <div>{own || personalityKnown(world, p) ? t(personalityKey(p)) : t('fog.personality')}</div>
            {secondary.length > 0 && (
              <div className="row muted">{t('player.positions')}: {secondary.map(([pos]) => t(`pos.${pos}`)).join(', ')}</div>
            )}
          </div>
          <div className="panel">
            <h3>{t('player.condition')}</h3>
            <div className="row">{t('player.fitness', { v: p.condition.fitness })} <Status p={p} /></div>
            {p.form.length > 0 && (
              <div className="row">
                <span className="muted">{t('player.form')}</span>
                {p.form.map((v, i) => <b key={i} className={`num ${v >= 7.5 ? 'pos-good' : v < 6 ? 'pos-bad' : ''}`}>{v.toFixed(1)}</b>)}
              </div>
            )}
          </div>
          <div className="panel">
            <h3>{t('player.season')} {fmtSeason(world.season)}</h3>
            <div className="row num">
              <span>{t('col.apps')} {p.stats.apps}</span><span>{t('col.goals')} {p.stats.goals}</span><span>{t('col.assists')} {p.stats.assists}</span>
              {p.stats.apps > 0 && <span>{t('col.rating')} {(p.stats.ratingSum / p.stats.apps).toFixed(2)}</span>}
            </div>
            <div className="muted">{t('player.cards', { y: p.stats.yellows, r: p.stats.reds })}</div>
          </div>
          <div className="panel">
            <h3>{t('player.career')}</h3>
            {p.history.length === 0 ? <div className="muted">{t('player.noHistory')}</div> : (
              <table>
                <tbody>
                  {[...p.history].reverse().map((h) => (
                    <tr key={h.season}>
                      <td className="num">{fmtSeason(h.season)}</td>
                      <td>{world.clubs[h.clubId]?.shortName}</td>
                      <td className="r num">{h.apps}</td>
                      <td className="r num">{h.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
