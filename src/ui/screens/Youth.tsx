// Vivaio e nazionali (GUIDA §7.8): strutture, ultime annate, minutaggio dei giovani, i nostri in nazionale.
import type { WorldState } from '../../engine/model.ts';
import { youngsters } from '../../engine/youth/intake.ts';
import { PosBadge, Stars, fullName } from '../bits.tsx';
import { t } from '../i18n.ts';

export function Youth({ world, onPlayer }: { world: WorldState; onPlayer: (id: number) => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const kids = youngsters(world, club, 21);
  const last = world.intake.filter((i) => i.clubId === club.id).at(-1);
  const called = club.playerIds.map((id) => world.players[id]!).filter((p) => world.nations[p.nation]?.callups.includes(p.id));
  const honours = Object.entries(world.nations).flatMap(([code, n]) => n.honours.filter((h) => h.place === 'winner').map((h) => ({ code, ...h })))
    .sort((a, b) => b.season - a.season);

  return (
    <div className="grid">
      <div className="panel">
        <h3>{t('youth.title')}</h3>
        <div className="row wrap">
          <span className="chip">{t('youth.facilities')}: <b className="num">{club.youth.facilities}</b>/20</span>
          <span className="chip">{t('youth.recruitment')}: <b className="num">{club.youth.recruitment}</b>/20</span>
        </div>
        <div className="muted">{t('youth.hint')}</div>
      </div>

      <div className="panel">
        <h3>{last ? t('youth.lastIntake', { season: last.season }) : t('youth.noIntake')}</h3>
        {last?.playerIds.map((id) => world.players[id]).filter((p) => p).map((p) => (
          <div key={p!.id} className="row">
            <PosBadge pos={p!.position} />
            <button className="link" onClick={() => onPlayer(p!.id)}>{fullName(p!)}</button>
            <span className="muted">{world.season - p!.birthYear} {t('youth.years')} · {t(`nation.${p!.nation}`)}</span>
            <div className="spacer" />
            <Stars ca={p!.ca} /> <Stars ca={p!.pa} />
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>{t('youth.minutes')}</h3>
        <table className="tbl">
          <thead><tr><th /><th>{t('col.name')}</th><th className="num">{t('col.age')}</th><th>{t('col.ability')}</th><th>{t('col.potential')}</th><th className="num">{t('col.apps')}</th><th className="num">{t('youth.minutesShare')}</th></tr></thead>
          <tbody>
            {kids.map((p) => (
              <tr key={p.id} onClick={() => onPlayer(p.id)}>
                <td><PosBadge pos={p.position} /></td>
                <td>{fullName(p)}{p.contract.loan ? <span className="chip">{t('youth.onLoan')}</span> : null}</td>
                <td className="num">{world.season - p.birthYear}</td>
                <td><Stars ca={p.ca} /></td>
                <td><Stars ca={p.pa} /></td>
                <td className="num">{p.stats.apps}</td>
                <td className={`num ${p.psych.minutes < 0.15 ? 'pos-bad' : ''}`}>{Math.round(p.psych.minutes * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>{t('intl.title')}</h3>
        {called.length === 0 && <div className="muted">{t('intl.none')}</div>}
        {called.map((p) => (
          <div key={p.id} className="row">
            <button className="link" onClick={() => onPlayer(p.id)}>{fullName(p)}</button>
            <span className="muted">{t(`nation.${p.nation}`)} · {t('intl.caps', { caps: p.intl.caps, goals: p.intl.goals })}</span>
          </div>
        ))}
        <h3>{t('intl.honours')}</h3>
        {honours.length === 0 && <div className="muted">{t('intl.noHonours')}</div>}
        {honours.map((h) => <div key={`${h.season}${h.tournament}`}>{t(`intl.${h.tournament}`, { season: h.season, nation: t(`nation.${h.code}`) })}</div>)}
      </div>
    </div>
  );
}
