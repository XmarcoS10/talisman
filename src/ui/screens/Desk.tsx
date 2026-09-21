// Scrivania (specifiche §3.3): riquadri del momento, la prossima gara con i due pulsanti che servono,
// la guida della prima stagione, le notizie e la mini classifica con le zone.
import { CalendarDays, Clock, Landmark, ListChecks, Newspaper, Play, Route, Trophy } from 'lucide-react';
import { expected } from '../../engine/board/board.ts';
import type { WorldState } from '../../engine/model.ts';
import { fixturesOn, nextMatchDay, standings } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { team } from '../bits.tsx';
import { kickoff } from '../calendar.ts';
import { fmtDate, fmtMoney, fmtSeason, t, tEvent } from '../i18n.ts';
import { outcome } from './Fixtures.tsx';
import { boardGoal } from './Start.tsx';
import { Guide } from '../Guide.tsx';
import type { NavName } from '../Sidebar.tsx';
import { DeskStories } from './Stories.tsx';
import { LeagueTable } from './Tables.tsx';
import { Offers } from './Offers.tsx';

const FL = { W: 'w', D: 'd', L: 'l' } as const;

type Props = { world: WorldState; onNav: (n: NavName) => void; onWatch?: () => void; onChange: () => void; onPlayer: (id: number) => void };

export function Desk({ world, onNav, onWatch, onChange, onPlayer }: Props) {
  const clubId = world.manager.clubId;
  const club = world.clubs[clubId]!;
  const comp = world.competitions[club.compId]!;
  const mine = comp.fixtures.filter((f) => f.home === clubId || f.away === clubId);
  const day = nextMatchDay(world);
  const next = day === null ? undefined : fixturesOn(world, day).find((f) => f.home === clubId || f.away === clubId);
  const played = mine.filter((f) => f.result);
  const table = standings(world, comp);
  const rankOf = (id: number) => table.findIndex((r) => r.clubId === id) + 1;
  const squad = club.playerIds.map((id) => world.players[id]!);
  const morale = Math.round(squad.reduce((s, p) => s + p.psych.morale, 0) / Math.max(1, squad.length));
  const last5 = played.slice(-5);
  const news = world.news.filter((n) => n.season === world.season).slice(-7).reverse();

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi"><span className="caps">{t('desk.kpi.pos')}</span><div className="big">{rankOf(clubId)}° <small>/ {table.length}</small></div>
          <span className="muted small">{t('desk.kpi.target', { n: expected(world, club) })}</span></div>
        <div className="kpi"><span className="caps">{t('desk.form')}</span>
          <span className="form-row" style={{ minHeight: 30, alignItems: 'center' }}>{last5.length ? last5.map((fx) => <span key={fx.day} className={`form ${outcome(fx, clubId)}`}>{t(`col.${FL[outcome(fx, clubId)!]}`)}</span>) : <span className="muted">—</span>}</span>
          <span className="muted small">{t('desk.kpi.pts', { n: table[rankOf(clubId) - 1]?.pts ?? 0 })}</span></div>
        <div className="kpi"><span className="caps">{t('fin.balance')}</span><div className="big num">{fmtMoney(club.balance)}</div>
          <span className="muted small">{t('desk.kpi.board', { n: Math.round(world.manager.board.trust.board) })}</span></div>
        <div className="kpi"><span className="caps">{t('desk.kpi.morale')}</span><div className="big num">{morale}<small>/100</small></div>
          <div className="meter"><i className={morale < 45 ? 'bad' : morale < 60 ? 'warn' : ''} style={{ width: `${morale}%` }} /></div></div>
      </div>

      <div className="cols2">
        <div className="stack">
          <div className="panel match-hero">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2><CalendarDays size={18} /> {t('desk.nextMatch')}</h2>
              {next && <span className="tag">{next.cup ? t('cup.name') : comp.name}</span>}
            </div>
            {next ? <>
              <div className="score">
                <div className="grid" style={{ justifyItems: 'center', gap: 6 }}><Crest club={world.clubs[next.home]!} size={72} /><b className="deal-h">{world.clubs[next.home]!.name}</b></div>
                <div className="grid" style={{ justifyItems: 'center', gap: 6 }}>
                  <span className="vs">VS</span>
                  <span className="num small"><CalendarDays size={12} /> {fmtDate(world.season, next.day)}</span>
                  <span className="num small"><Clock size={12} /> {kickoff(world, next)}</span>
                  <span className="tag dim">{t(next.home === clubId ? 'desk.home' : 'desk.away')}</span>
                </div>
                <div className="grid" style={{ justifyItems: 'center', gap: 6 }}><Crest club={world.clubs[next.away]!} size={72} /><b className="deal-h">{world.clubs[next.away]!.name}</b></div>
              </div>
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                <span className="muted small"><Landmark size={12} /> {world.clubs[next.home]!.stadium.name}{played.length > 0 && ` · ${t('desk.opponentPos', { pos: rankOf(next.home === clubId ? next.away : next.home) })}`}</span>
                <span className="row">
                  <button className="btn" onClick={() => onNav('tactics')}><Route size={14} /> {t('desk.setLineup')}</button>
                  {onWatch && <button className="btn primary" onClick={onWatch}><Play size={14} /> {t('desk.goMatch')}</button>}
                </span>
              </div>
            </> : <div className="muted">{t('desk.noMatch')}</div>}
          </div>

          <Offers world={world} onChange={onChange} onPlayer={onPlayer} />
          <Guide onNav={onNav} />
          <DeskStories world={world} />

          <div className="panel">
            <h2><Newspaper size={18} /> {t('desk.news')}</h2>
            {news.map((n, i) => (
              <div key={`n${i}`} className="feed-row" style={{ gridTemplateColumns: '92px 1fr' }}>
                <span className="num muted small">{fmtDate(n.season, n.day)}</span><span>{tEvent(n.key, n.vars)}</span>
              </div>
            ))}
            {[...played].reverse().slice(0, 4).map((fx) => (
              <div key={fx.day} className="feed-row" style={{ gridTemplateColumns: '92px 1fr' }}>
                <span className="num muted small">{fmtDate(world.season, fx.day)}</span>
                <span className="row"><span className={`form ${outcome(fx, clubId)}`}>{t(`col.${FL[outcome(fx, clubId)!]}`)}</span>
                  {t('desk.resultNews', { home: world.clubs[fx.home]!.name, away: world.clubs[fx.away]!.name, hg: fx.result!.hg, ag: fx.result!.ag })}</span>
              </div>
            ))}
            <div className="muted small">{t('desk.welcome', { manager: world.manager.name, club: team(club, 'di'), goal: boardGoal(world, clubId).toLowerCase() })}</div>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2><ListChecks size={18} /> {t('desk.table')}</h2>
              <button className="link small" onClick={() => onNav('tables')}>{t('desk.fullTable')} ›</button>
            </div>
            <LeagueTable world={world} compId={comp.id} highlight={clubId} compact />
            <div className="row muted small">
              {comp.promote > 0 && <span className="pos-good">▌ {t(comp.level === 1 ? 'tables.title' : 'tables.promotion')}</span>}
              {comp.relegate > 0 && <span className="pos-bad">▌ {t('tables.relegation')}</span>}
            </div>
          </div>
          {world.history.length > 0 && (
            <div className="panel">
              <h2><Trophy size={18} /> {t('desk.history')}</h2>
              {world.history.filter((h) => h.compId === comp.id).slice(-5).reverse().map((h) => (
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
    </div>
  );
}
