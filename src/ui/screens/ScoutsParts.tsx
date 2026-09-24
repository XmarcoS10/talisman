// Osservatori, seconda metà: i rapporti a schede e il mercato di osservatori e analisti.
import { useState } from 'react';
import { BarChart3, User } from 'lucide-react';
import type { Scout, ScoutReport, WorldState } from '../../engine/model.ts';
import { age } from '../../engine/players.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { PosBadge, Stars, fullName } from '../bits.tsx';
import { fmtMoney, t } from '../i18n.ts';

const GRADE: Record<string, [string, string]> = { top: ['A+', ''], good: ['A', ''], useful: ['B', 'cyan'], no: ['C', 'dim'] };
const gradeOf = (verdict: string) => GRADE[verdict.replace('scout.verdict.', '').slice(0, -1)] ?? ['?', 'dim'];

export function ReportCards({ world, onPlayer }: { world: WorldState; onPlayer: (id: number) => void }) {
  const [all, setAll] = useState(false);
  const latest = new Map<number, ScoutReport>();
  for (const [id, k] of Object.entries(world.known)) {
    const r = k.reports.at(-1);
    if (r && world.players[Number(id)]) latest.set(Number(id), r);
  }
  const list = [...latest].sort(([, a], [, b]) => b.season * 400 + b.day - (a.season * 400 + a.day));
  const shown = all ? list : list.slice(0, 6);
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="section-h">{t('scout.recent')}</h2>
        {list.length > 6 && <button className="link" onClick={() => setAll(!all)}>{all ? t('scout.fewer') : t('scout.allProfiles', { n: list.length })} ›</button>}
      </div>
      {list.length === 0 && <div className="panel muted">{t('scout.noReports')}</div>}
      <div className="report-grid">
        {shown.map(([id, r]) => {
          const p = world.players[id]!;
          const [grade, tone] = gradeOf(r.verdict);
          const club = p.clubId !== null ? world.clubs[p.clubId] : undefined;
          return (
            <div key={id} className="panel report-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <button className="link deal-h" onClick={() => onPlayer(id)}>{fullName(p)}</button>
                  <div className="row small"><PosBadge pos={p.position} /><span className="muted">{t('scout.ageClub', { age: age(p, world.season), club: club?.shortName ?? t('scout.freeAgent') })}</span></div>
                </div>
                <span className={`tag ${tone}`}>{t('scout.grade', { g: grade })}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', background: 'var(--bg-1)', borderRadius: 'var(--r-2)', padding: 10 }}>
                <div><span className="caps">{t('col.potential')}</span><div><Stars world={world} ca={r.pa[0]} /> <span className="muted small">→ {r.pa[1]}</span></div></div>
                <div className="r"><span className="caps">{t('scout.marketValue')}</span><div className="num"><b>{fmtMoney(value(p, world.season, { clubRep: club?.reputation ?? 40 }))}</b></div></div>
              </div>
              <span className="caps">{t('scout.advice')}</span>
              <div className={`analyst ${tone === '' ? 'good' : ''}`}>«{t(r.verdict)}»</div>
              <div className="row muted small" style={{ justifyContent: 'space-between' }}>
                <span><User size={12} /> {t('scout.by', { name: world.scouts[r.scoutId]?.name ?? '—' })}</span>
                <button className="btn small" onClick={() => onPlayer(id)}>{t('scout.card')}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Kind = 'all' | 'field' | 'analyst';

export function ScoutMarket({ world, full, onHire }: { world: WorldState; full: boolean; onHire: (s: Scout) => void }) {
  const [kind, setKind] = useState<Kind>('all');
  const free = Object.values(world.scouts).filter((s) => s.clubId === null);
  const count = (k: Kind) => free.filter((s) => k === 'all' || (k === 'analyst') === s.analyst).length;
  const list = free.filter((s) => kind === 'all' || (kind === 'analyst') === s.analyst)
    .sort((a, b) => b.judgeAbility + b.judgePotential - (a.judgeAbility + a.judgePotential));
  const best = (s: Scout) => Object.entries(s.contacts).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="panel">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div><h2 className="section-h">{t('scout.market')}</h2><span className="muted small">{t(full ? 'scout.marketFull' : 'scout.marketHint')}</span></div>
        <div className="seg-tabs">
          {(['all', 'field', 'analyst'] as Kind[]).map((k) => <button key={k} className={k === kind ? 'active hot' : ''} onClick={() => setKind(k)}>{t(`scout.kinds.${k}`, { n: count(k) })}</button>)}
        </div>
      </div>
      <table>
        <thead><tr><th>{t('scout.candidate')}</th><th>{t('scout.role')}</th><th className="c">{t('scout.judgeA')}</th><th className="c">{t('scout.judgeP')}</th><th className="r">{t('scout.wageAsk')}</th><th className="r">{t('scout.deal')}</th></tr></thead>
        <tbody>
          {list.map((s) => {
            const net = best(s);
            return (
              <tr key={s.id}>
                <td><span className="row"><span className="initials">{s.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <span><b>{s.name}</b>{net && net[1] >= 50 && <span className="tag warn" style={{ marginLeft: 6 }}>{t('scout.network', { nation: t(`nation.${net[0]}`) })}</span>}
                    <div className="muted small">{t(`nation.${s.nation}`)}</div></span></span></td>
                <td className={s.analyst ? '' : ''} style={{ color: s.analyst ? 'var(--data-1)' : undefined }}>{s.analyst ? <><BarChart3 size={13} /> {t('scout.analyst')}</> : t('scout.field')}</td>
                <td className="c"><span className={`judge ${s.judgeAbility >= 15 ? 'hi' : ''}`}>{s.judgeAbility}</span></td>
                <td className="c"><span className={`judge ${s.judgePotential >= 15 ? 'hi' : ''}`}>{s.judgePotential}</span></td>
                <td className="r num">{t('scout.perYear', { v: fmtMoney(s.wage) })}</td>
                <td className="r"><button className="btn primary" disabled={full} onClick={() => onHire(s)}>{t('scout.hire')}</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
