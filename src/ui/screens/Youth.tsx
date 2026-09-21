// Vivaio e nazionali (GUIDA §7.8): strutture, prossima annata, minutaggio dei giovani, Primavera, i nostri in nazionale,
// investimenti da chiedere alla dirigenza.
import { useState } from 'react';
import { Building2, Flag, GraduationCap, Info, Sparkles, Trophy, Users } from 'lucide-react';
import { BOARD, YOUTH } from '../../engine/balance.ts';
import { request, requestCost } from '../../engine/board/board.ts';
import type { WorldState } from '../../engine/model.ts';
import { NATIONS } from '../../engine/names.ts';
import { intakePreview, youthTable } from '../../engine/youth/primavera.ts';
import { youngsters } from '../../engine/youth/intake.ts';
import { PosBadge, Stars, fullName } from '../bits.tsx';
import { t } from '../i18n.ts';

const level = (v: number) => (v >= 16 ? 'top' : v >= 11 ? 'good' : v >= 6 ? 'ok' : 'low');
/** il responsabile del vivaio: un nome stabile per club, la sua bravura è il reclutamento del club */
const headOf = (id: number) => {
  const it = NATIONS.ITA!;
  return `${it.first[(id * 7 + 3) % it.first.length]} ${it.last[(id * 13 + 5) % it.last.length]}`;
};

export function Youth({ world, onPlayer, onChange }: { world: WorldState; onPlayer: (id: number) => void; onChange: () => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const kids = youngsters(world, club, 21);
  const [msg, setMsg] = useState<string | null>(null);
  const comp = world.competitions[club.compId]!;
  const table = youthTable(world, comp);
  const myRow = table.findIndex((r) => r.clubId === club.id);
  const prev = intakePreview(club);
  const inFirst = kids.filter((p) => p.psych.minutes >= 0.25).length;
  const called = club.playerIds.map((id) => world.players[id]!).filter((p) => world.nations[p.nation]?.callups.includes(p.id));
  const honours = Object.entries(world.nations).flatMap(([code, n]) => n.honours.filter((h) => h.place === 'winner').map((h) => ({ code, ...h })))
    .sort((a, b) => b.season - a.season).slice(0, 4);
  const cost = requestCost('facility');
  const b = world.manager.board;

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('youth.facilities')}</span><span className="tag cyan">{t(`youth.level.${level(club.youth.facilities)}`)}</span></span>
          <div className="big num">{club.youth.facilities} <small>/ 20</small></div><div className="meter"><i className="cyan" style={{ width: `${club.youth.facilities * 5}%` }} /></div>
          <span className="muted small"><Building2 size={12} /> {t('youth.facilitiesHint')}</span></div>
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('youth.recruitment')}</span><span className="tag warn">{t(`youth.reach.${level(club.youth.recruitment)}`)}</span></span>
          <div className="big num">{club.youth.recruitment} <small>/ 20</small></div><div className="meter"><i className="warn" style={{ width: `${club.youth.recruitment * 5}%` }} /></div>
          <span className="muted small">{t('youth.recruitHint', { n: Math.round(club.youth.recruitment * YOUTH.foreignPerRecruitment * 100) })}</span></div>
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('youth.next')}</span><Sparkles size={16} color="var(--accent)" /></span>
          <div className="big" style={{ color: 'var(--accent)' }}>{t('youth.summer', { y: world.season + 1 })}</div>
          <span className="muted small">{t('youth.preview', { a: prev.size[0], b: prev.size[1] })} <Stars ca={prev.pa} /></span></div>
        <div className="kpi"><span className="caps">{t('youth.inFirst')}</span>
          <div className="big num">{inFirst} <small>{t('youth.ofKids', { n: kids.length })}</small></div>
          <span className="muted small">{t('youth.inFirstHint')}</span></div>
      </div>

      <div className="cols2">
        <div className="stack">
          <div className="panel">
            <h2><Users size={18} /> {t('youth.minutes')}</h2>
            <span className="muted">{t('youth.minutesSub')}</span>
            <table>
              <thead><tr><th>{t('col.pos')}</th><th>{t('col.name')}</th><th className="r">{t('col.age')}</th><th>{t('col.ability')}</th><th>{t('col.potential')}</th><th className="r">{t('col.apps')}</th><th>{t('youth.minutesShare')}</th></tr></thead>
              <tbody>
                {kids.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => onPlayer(p.id)}>
                    <td><PosBadge pos={p.position} /></td>
                    <td><b>{fullName(p)}</b> {p.contract.loan ? <span className="tag dim">{t('youth.onLoan')}</span> : world.season - p.birthYear <= 19 ? <span className="tag">U19</span> : null}</td>
                    <td className="r num">{world.season - p.birthYear}</td>
                    <td><Stars ca={p.ca} /></td>
                    <td><Stars ca={p.pa} /></td>
                    <td className="r num">{p.stats.apps}</td>
                    <td><span className="mini-bar"><span className="meter"><i className={p.psych.minutes < 0.25 ? 'bad' : ''} style={{ width: `${Math.round(p.psych.minutes * 100)}%` }} /></span>{Math.round(p.psych.minutes * 100)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="analyst"><Info size={14} /> {t('youth.minutesInfo')}</div>
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}><h2><Trophy size={18} /> {t('youth.primavera')}</h2>
              {myRow >= 0 && <span className="tag">{t('youth.myPlace', { n: myRow + 1 })}</span>}</div>
            <table>
              <thead><tr><th className="r">#</th><th>{t('col.club')}</th>{(['p', 'w', 'd', 'l', 'gd', 'pts'] as const).map((k) => <th key={k} className="r">{t(`col.${k}`)}</th>)}</tr></thead>
              <tbody>
                {table.slice(0, 10).map((r, i) => (
                  <tr key={r.clubId} className={r.clubId === club.id ? 'me' : ''}>
                    <td className="r num">{i + 1}</td><td>{world.clubs[r.clubId]!.name}</td>
                    <td className="r num">{r.p}</td><td className="r num">{r.w}</td><td className="r num">{r.d}</td><td className="r num">{r.l}</td>
                    <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td><td className="r num"><b>{r.pts}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myRow >= 10 && <span className="muted small">{t('youth.myPlace', { n: myRow + 1 })} · {table[myRow]!.pts} pt</span>}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <h2><Flag size={18} /> {t('intl.title')}</h2>
            {called.length === 0 && <div className="mini-card muted">{t('intl.none')}</div>}
            {called.map((p) => (
              <button key={p.id} className="leader" onClick={() => onPlayer(p.id)}>
                <span className="initials">{p.firstName[0]}{p.lastName[0]}</span>
                <span><b>{fullName(p)}</b><small>{t(`nation.${p.nation}`)} · {t('intl.caps', { caps: p.intl.caps, goals: p.intl.goals })}</small></span>
              </button>
            ))}
            <span className="caps">{t('intl.honours')}</span>
            {honours.length === 0 && <span className="muted small">{t('intl.noHonours')}</span>}
            {honours.map((h) => <span key={`${h.season}${h.tournament}`} className="small">{t(`intl.${h.tournament}`, { season: h.season, nation: t(`nation.${h.code}`) })}</span>)}
          </div>

          <div className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}><h2><Building2 size={18} /> {t('youth.invest')}</h2><span className="tag num">{t('youth.capital', { n: Math.round(b.capital) })}</span></div>
            <span className="muted">{t('youth.investHint')}</span>
            <div className="mini-card">
              <b>{t('youth.upgrade', { n: club.youth.facilities + YOUTH.facilityRequest > 20 ? 20 : club.youth.facilities + YOUTH.facilityRequest })}</b>
              <span className="small pos-good">✓ {t('youth.upgradeA')}</span>
              <span className="small pos-good">✓ {t('youth.upgradeB')}</span>
              <span className="small muted">{t('youth.upgradeCost', { n: cost })}</span>
            </div>
            {msg && <div className={`banner ${msg === 'board.granted' ? 'ok' : 'warn'}`}>{t(msg)}</div>}
            <button className="btn primary big" disabled={b.capital < cost || club.youth.facilities >= 20 || b.trust.board < BOARD.warnAt}
              onClick={() => { setMsg(request(world, 'facility').ok ? 'board.granted' : 'board.refused'); onChange(); }}>
              <GraduationCap size={16} /> {t('youth.askPresident')}
            </button>
          </div>

          <div className="panel row">
            <span className="initials">{headOf(club.id).split(' ').map((w) => w[0]).join('')}</span>
            <div><b>{headOf(club.id)}</b><div className="muted small">{t('youth.head', { n: club.youth.recruitment })}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
