import { ATTR_GROUPS, type WorldState } from '../../engine/model.ts';
import { age, marketValue } from '../../engine/players.ts';
import { Crest } from '../Crest.tsx';
import { PosBadge, Stars, attrClass, fullName, personalityKey } from '../bits.tsx';
import { fmtMoney, fmtSeason, t } from '../i18n.ts';
import { Status } from './Squad.tsx';

export function PlayerView({ world, playerId, onBack }: { world: WorldState; playerId: number; onBack: () => void }) {
  const p = world.players[playerId];
  if (!p) return <button className="btn" onClick={onBack}>{t('player.back')}</button>;
  const club = p.clubId !== null ? world.clubs[p.clubId] : undefined;
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
            <span>{club?.name}</span>·<span>{t('player.age', { age: age(p, world.season) })}</span>·<span>{t(`nat.${p.nation}`)}</span>·
            <span>{t('player.height', { cm: p.heightCm })}</span>·<span>{t(`player.foot.${p.foot}`)}</span>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'auto auto', gap: 'var(--s-1) var(--s-3)', alignItems: 'center' }}>
          <span className="muted">{t('col.ability')}</span><Stars ca={p.ca} />
          <span className="muted">{t('col.potential')}</span><Stars ca={p.pa} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 300px', alignItems: 'start' }}>
        {groups.map((g) => (
          <div key={g} className="panel" style={{ gap: 0 }}>
            <h3 style={{ marginBottom: 'var(--s-2)' }}>{t(`group.${g}`)}</h3>
            {ATTR_GROUPS[g].map((k) => (
              <div key={k} className="attr"><span>{t(`attr.${k}`)}</span><b className={attrClass(p.attrs[k])}>{p.attrs[k]}</b></div>
            ))}
          </div>
        ))}
        <div className="grid">
          <div className="panel">
            <h3>{t('player.value')}</h3>
            <div className="num" style={{ fontSize: 22 }}>{fmtMoney(marketValue(p, world.season))}</div>
            <div className="muted">{t('player.contract', { year: p.contract.until })} · {t('player.wage', { wage: fmtMoney(p.contract.wage) })}</div>
          </div>
          <div className="panel">
            <h3>{t('player.personality')}</h3>
            <div>{t(personalityKey(p))}</div>
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
