import type { WorldState } from '../../engine/model.ts';
import { nextMatchDay, standings } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { fmtDate, fmtSeason, t } from '../i18n.ts';
import { outcome } from './Fixtures.tsx';
import { boardGoal } from './Start.tsx';
import { LeagueTable } from './Tables.tsx';

export function Desk({ world }: { world: WorldState }) {
  const clubId = world.manager.clubId;
  const club = world.clubs[clubId]!;
  const comp = world.competitions[club.compId]!;
  const mine = comp.fixtures.filter((f) => f.home === clubId || f.away === clubId);
  const day = nextMatchDay(world);
  const next = mine.find((f) => f.day === day);
  const played = mine.filter((f) => f.result);
  const table = standings(world, comp);
  const rankOf = (id: number) => table.findIndex((r) => r.clubId === id) + 1;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
      <div className="grid">
        <div className="panel">
          <h3>{t('desk.nextMatch')}</h3>
          {next ? (
            <div className="score">
              <div className="grid" style={{ justifyItems: 'center' }}><Crest club={world.clubs[next.home]!} size={64} /><b>{world.clubs[next.home]!.name}</b></div>
              <div className="grid" style={{ justifyItems: 'center', gap: 'var(--s-1)' }}>
                <span className="muted">{comp.name}</span>
                <span className="num">{fmtDate(world.season, next.day)}</span>
                <span className="muted">{t(next.home === clubId ? 'desk.home' : 'desk.away')}</span>
              </div>
              <div className="grid" style={{ justifyItems: 'center' }}><Crest club={world.clubs[next.away]!} size={64} /><b>{world.clubs[next.away]!.name}</b></div>
            </div>
          ) : <div className="muted">{t('desk.noMatch')}</div>}
          {next && played.length > 0 && (
            <div className="muted c">{t('desk.opponentPos', { pos: rankOf(next.home === clubId ? next.away : next.home) })}</div>
          )}
        </div>

        <div className="panel">
          <h3>{t('desk.news')}</h3>
          {[...played].reverse().slice(0, 6).map((fx) => (
            <div key={fx.day} className="row">
              <span className={`form ${outcome(fx, clubId)}`}>{t(`col.${{ W: 'w', D: 'd', L: 'l' }[outcome(fx, clubId)!]}`)}</span>
              <span className="num muted">{fmtDate(world.season, fx.day)}</span>
              <span>{t('desk.resultNews', { home: world.clubs[fx.home]!.name, away: world.clubs[fx.away]!.name, hg: fx.result!.hg, ag: fx.result!.ag })}</span>
            </div>
          ))}
          <div className="muted">{t('desk.welcome', { manager: world.manager.name, club: club.name, goal: boardGoal(world, clubId).toLowerCase() })}</div>
        </div>
      </div>

      <div className="grid">
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>{t('desk.table')}</h3>
            <span className="row" style={{ gap: 3 }}>
              {played.slice(-5).map((fx) => <span key={fx.day} className={`form ${outcome(fx, clubId)}`}>{t(`col.${{ W: 'w', D: 'd', L: 'l' }[outcome(fx, clubId)!]}`)}</span>)}
            </span>
          </div>
          <LeagueTable world={world} compId={comp.id} highlight={clubId} compact />
        </div>
        {world.history.length > 0 && (
          <div className="panel">
            <h3>{t('desk.history')}</h3>
            {world.history.filter((h) => h.compId === 'ITA1').slice(-5).reverse().map((h) => (
              <div key={h.season} className="row">
                <span className="num muted">{fmtSeason(h.season)}</span>
                <Crest club={world.clubs[h.championId]!} size={18} />
                <span>{world.clubs[h.championId]!.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
