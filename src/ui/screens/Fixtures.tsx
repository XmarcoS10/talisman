import { useState } from 'react';
import { fxLabel } from '../league.ts';
import { CalendarDays, Clock, Download, Landmark, Trophy } from 'lucide-react';
import type { Fixture, WorldState } from '../../engine/model.ts';
import { DAYS_BETWEEN_ROUNDS } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { download, ical, isRivalry, kickoff } from '../calendar.ts';
import { fmtDate, gameDate, t } from '../i18n.ts';
import { CupView, Preseason } from './CupView.tsx';
import { OpponentReport } from './OpponentReport.tsx';
import { cupFixtures } from '../../engine/cup.ts';

/** esito dal punto di vista di un club: W/D/L */
export function outcome(fx: Fixture, clubId: number): 'W' | 'D' | 'L' | null {
  if (!fx.result) return null;
  const { hg, ag } = fx.result;
  const mine = fx.home === clubId ? hg - ag : ag - hg;
  return mine > 0 ? 'W' : mine < 0 ? 'L' : 'D';
}

export function ResultsList({ world, fixtures, highlight }: { world: WorldState; fixtures: Fixture[]; highlight?: number }) {
  return (
    <div className="results">
      {fixtures.map((fx) => {
        const h = world.clubs[fx.home]!, a = world.clubs[fx.away]!;
        const me = fx.home === highlight || fx.away === highlight;
        return (
          <div key={`${fx.home}-${fx.away}`} className={`result ${me ? 'me' : ''}`}>
            {/* la città basta a riconoscere il club, e nella colonna stretta il nome intero finiva coi puntini */}
            <span className="r" title={h.name}>{h.city} <Crest club={h} size={16} /></span>
            <b className="num c">{fx.result ? `${fx.result.hg} - ${fx.result.ag}` : kickoff(world, fx)}</b>
            <span title={a.name}><Crest club={a} size={16} /> {a.city}</span>
          </div>
        );
      })}
    </div>
  );
}

type Half = 'mine' | 'first' | 'second';
const month = (world: WorldState, day: number) => gameDate(world.season, day).getUTCMonth();

export function Fixtures({ world, clubId, onPlayer }: { world: WorldState; clubId: number; onPlayer: (id: number) => void }) {
  const club = world.clubs[clubId]!;
  const comp = world.competitions[club.compId]!;
  const mine = comp.fixtures.filter((f) => f.home === clubId || f.away === clubId);
  const nextIdx = mine.findIndex((f) => !f.result);
  const [round, setRound] = useState(Math.max(0, nextIdx === -1 ? mine.length - 1 : nextIdx));
  const [half, setHalf] = useState<Half>('mine');
  const [mon, setMon] = useState(-1);
  const [tab, setTab] = useState<'league' | 'cup'>('league');
  const roundDay = round * DAYS_BETWEEN_ROUNDS;
  const cupNext = cupFixtures(world).filter((f) => !f.result && (f.home === clubId || f.away === clubId)).sort((a, b) => a.day - b.day)[0];
  const leagueNext = nextIdx >= 0 ? mine[nextIdx] : undefined;
  const next = cupNext && (!leagueNext || cupNext.day < leagueNext.day) ? cupNext : leagueNext;
  const months = [...new Set(mine.map((f) => month(world, f.day)))];
  const rows = mine.map((fx, i) => ({ fx, i })).filter(({ fx, i }) =>
    (half === 'first' ? i < mine.length / 2 : half === 'second' ? i >= mine.length / 2 : true) && (mon < 0 || month(world, fx.day) === mon));
  const homeN = mine.filter((f) => f.home === clubId).length;

  return (
    <div className="stack">
      <div className="row wrap">
        <div className="seg-tabs">
          <button className={tab === 'league' ? 'active hot' : ''} onClick={() => setTab('league')}><Trophy size={14} /> {comp.name} <span className="tag dim">{t('fixtures.running')}</span></button>
          <button className={tab === 'cup' ? 'active hot' : ''} onClick={() => setTab('cup')}><Trophy size={14} /> {t('cup.name')}</button>
        </div>
        <div className="seg-tabs">
          {(['mine', 'first', 'second'] as Half[]).map((h) => <button key={h} className={h === half ? 'active' : ''} onClick={() => setHalf(h)}>{t(`fixtures.half.${h}`, { n: mine.length })}</button>)}
        </div>
        <select value={mon} onChange={(e) => setMon(Number(e.target.value))} aria-label={t('fixtures.month')}>
          <option value={-1}>{t('fixtures.allMonths')}</option>
          {months.map((m) => <option key={m} value={m}>{new Date(Date.UTC(2000, m, 1)).toLocaleDateString('it-IT', { month: 'long', timeZone: 'UTC' })}</option>)}
        </select>
      </div>

      {next && <Featured world={world} fx={next} clubId={clubId} round={nextIdx + 1} />}
      <Preseason world={world} />
      {tab === 'cup' ? <CupView world={world} clubId={clubId} /> : (

      <div className="cols2">
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2><CalendarDays size={18} /> {t('fixtures.calendar', { name: comp.name })}</h2>
            <span className="tag dim">{t('fixtures.rounds', { n: mine.length })}</span>
          </div>
          <table>
            <thead><tr><th>{t('fixtures.roundShort')}</th><th>{t('col.date')}</th><th>{t('col.opponent')}</th><th className="c">{t('fixtures.venue')}</th><th className="r">{t('fixtures.timeResult')}</th></tr></thead>
            <tbody>
              {rows.map(({ fx, i }) => {
                const home = fx.home === clubId;
                const opp = world.clubs[home ? fx.away : fx.home]!;
                const o = outcome(fx, clubId);
                const riv = isRivalry(world, fx.home, fx.away);
                return (
                  <tr key={i} className={`clickable ${i === round ? 'me' : ''} ${riv ? 'rivalry' : ''}`} onClick={() => setRound(i)}>
                    <td className="num muted">{String(i + 1).padStart(2, '0')}</td>
                    <td className="num">{fmtDate(world.season, fx.day)}{i === nextIdx && <div className="small pos-good">{t('fixtures.next')}</div>}{riv && <div className="small pos-mid">{t('fixtures.rivalry')}</div>}</td>
                    <td><span className="row" style={{ gap: 'var(--s-2)' }}><Crest club={opp} size={18} />{opp.name}</span></td>
                    <td className="c"><span className="tag dim">{home ? t('fixtures.homeShort') : t('fixtures.awayShort')}</span></td>
                    <td className="r">
                      {o ? <span className="row" style={{ justifyContent: 'flex-end', gap: 'var(--s-2)' }}><span className={`form ${o}`}>{t(`col.${o === 'W' ? 'w' : o === 'D' ? 'd' : 'l'}`)}</span><span className="num">{fx.result!.hg}-{fx.result!.ag}</span></span>
                        : <span className={`num ${i === nextIdx ? 'tag' : ''}`}>{kickoff(world, fx)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="row muted small" style={{ justifyContent: 'space-between' }}>
            <span>{t('fixtures.homeAway', { h: homeN, a: mine.length - homeN })}</span>
            <button className="link" onClick={() => download(`calendario-${club.shortName}-${world.season}.ics`, ical(world, mine), 'text/calendar')}>
              <Download size={13} /> {t('fixtures.ical')}
            </button>
          </div>
        </div>
        <div className="stack" style={{ position: 'sticky', top: 0 }}>
          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>{t('fixtures.round', { n: round + 1 })} · {t('fixtures.allResults')}</h2>
              <span className="row">
                <button className="btn small" disabled={round === 0} onClick={() => setRound(round - 1)}>‹</button>
                <button className="btn small" disabled={round >= mine.length - 1} onClick={() => setRound(round + 1)}>›</button>
              </span>
            </div>
            <ResultsList world={world} fixtures={comp.fixtures.filter((f) => f.day === roundDay)} highlight={clubId} />
          </div>
          {next && <OpponentReport world={world} oppId={next.home === clubId ? next.away : next.home} onPlayer={onPlayer} />}
        </div>
      </div>)}
    </div>
  );
}

function Featured({ world, fx, clubId, round }: { world: WorldState; fx: Fixture; clubId: number; round: number }) {
  const h = world.clubs[fx.home]!, a = world.clubs[fx.away]!;
  const days = fx.day - world.day;
  return (
    <div className="panel featured">
      <span className="featured-icon"><Crest club={world.clubs[fx.home === clubId ? fx.away : fx.home]!} size={40} /></span>
      <div className="stack" style={{ gap: 4 }}>
        <span className="row"><span className="tag">{t('fixtures.featured')}</span><span className="caps" style={{ color: 'var(--data-1)' }}>{fx.cup || fx.stage ? fxLabel(fx, '') : `${t('fixtures.round', { n: round })} · ${world.competitions[h.compId]!.name}`}</span>
          {isRivalry(world, h.id, a.id) && <span className="tag warn">{t('fixtures.rivalry')}</span>}</span>
        <h1>{h.name} <span className="muted">vs</span> {a.name}</h1>
        <span className="row muted wrap">
          <span><CalendarDays size={13} /> {fmtDate(world.season, fx.day)}</span>
          <span><Clock size={13} /> {t('fixtures.at', { time: kickoff(world, fx) })}</span>
          <span><Landmark size={13} /> {t('fixtures.stadium', { name: h.stadium.name, cap: h.stadium.capacity.toLocaleString('it-IT') })}</span>
        </span>
      </div>
      <div className="countdown">
        <span className="caps">{t('fixtures.kickoffIn')}</span>
        <b className="num">{days <= 0 ? t('fixtures.today') : t('fixtures.inDays', { n: days })}</b>
      </div>
    </div>
  );
}
