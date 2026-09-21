import { useState } from 'react';
import type { CompId, WorldState } from '../../engine/model.ts';
import { expected } from '../../engine/board/board.ts';
import { standings } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { formOf, nextFixture, tableFor, type TableView } from '../league.ts';
import { LeagueSide } from './TablesSide.tsx';

/** classifica compatta per la scrivania */
export function LeagueTable({ world, compId, highlight, compact, onClub }: { world: WorldState; compId: CompId; highlight: number; compact?: boolean; onClub?: (id: number) => void }) {
  const comp = world.competitions[compId]!;
  let rows = standings(world, comp).map((r, i) => ({ ...r, rank: i + 1 }));
  const n = rows.length;
  if (compact) {
    const me = rows.findIndex((r) => r.clubId === highlight);
    const from = Math.max(0, Math.min(me - 3, n - 7));
    rows = rows.slice(from, from + 7);
  }
  return (
    <table>
      <thead>
        <tr><th className="r">#</th><th>{t('col.club')}</th><th className="r">{t('col.p')}</th><th className="r">{t('col.gd')}</th><th className="r">{t('col.pts')}</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const c = world.clubs[r.clubId]!;
          const zone = r.rank <= comp.promote ? 'zone-up' : r.rank > n - comp.relegate ? 'zone-down' : '';
          return (
            <tr key={r.clubId} className={`${r.clubId === highlight ? 'me' : ''} ${onClub ? 'clickable' : ''}`} onClick={() => onClub?.(r.clubId)}>
              <td className={`r num ${zone}`}>{r.rank}</td>
              <td><span className="row" style={{ gap: 'var(--s-2)' }}><Crest club={c} size={18} />{c.name}</span></td>
              <td className="r num">{r.p}</td>
              <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
              <td className="r num"><b>{r.pts}</b></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const VIEWS: TableView[] = ['all', 'home', 'away', 'form', 'xg'];

export function Tables({ world, clubId, onPlayer, onClub }: { world: WorldState; clubId: number; onPlayer: (id: number) => void; onClub: (id: number) => void }) {
  const comps = Object.values(world.competitions).sort((a, b) => a.level - b.level);
  const [compId, setCompId] = useState(world.clubs[clubId]!.compId);
  const [view, setView] = useState<TableView>('all');
  const comp = world.competitions[compId]!;
  const rows = tableFor(world, comp, view);
  const n = rows.length;
  const full = standings(world, comp);
  const myRank = full.findIndex((r) => r.clubId === clubId) + 1;
  const mine = comp.clubIds.includes(clubId);
  const zone = (rank: number) => (rank <= comp.promote ? 'up' : rank > n - comp.relegate ? 'down' : '');
  const name = (rank: number) => world.clubs[full[rank - 1]?.clubId ?? -1]?.name ?? '';
  const safePts = comp.relegate > 0 ? full[n - comp.relegate - 1]?.pts ?? 0 : 0;

  return (
    <div className="stack">
      <div className="panel">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div className="seg-tabs">
            {comps.map((c) => <button key={c.id} className={c.id === compId ? 'active hot' : ''} onClick={() => setCompId(c.id)}>{c.name}</button>)}
          </div>
          <div className="seg-tabs">
            {VIEWS.map((v) => <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>{t(`tables.view.${v}`)}</button>)}
          </div>
        </div>
        <div className="caps">{t('tables.round', { n: Math.max(0, ...full.map((r) => r.p)), tot: (n - 1) * 2 })}</div>
      </div>

      <div className="kpis">
        {mine && (
          <div className="kpi">
            <span className="caps">{t('tables.myState')}</span>
            <div className="big">{myRank}°<small>{world.clubs[clubId]!.name}</small></div>
            <span className="muted">{t('tables.target', { pos: expected(world, world.clubs[clubId]!), pts: full[myRank - 1]!.pts })}</span>
          </div>
        )}
        {comp.promote > 0 && (
          <div className="kpi"><span className="caps">{t(comp.level === 1 ? 'tables.title' : 'tables.promotion')}</span>
            <div className="big">1°{comp.promote > 1 ? ` – ${comp.promote}°` : ''}</div>
            <span className="muted">{Array.from({ length: comp.promote }, (_, i) => name(i + 1)).join(', ')}</span>
            <div className="meter"><i style={{ width: `${(full[0]?.p ?? 0) / Math.max(1, (n - 1) * 2) * 100}%` }} /></div></div>
        )}
        {comp.promote === 0 && (
          <div className="kpi"><span className="caps">{t('tables.title')}</span><div className="big">1°</div><span className="muted">{name(1)}</span></div>
        )}
        {comp.relegate > 0 && (
          <div className="kpi"><span className="caps">{t('tables.safety')}</span>
            <div className="big">{n - comp.relegate}°<small>{t('tables.safePts', { pts: safePts })}</small></div>
            <span className="muted">{name(n - comp.relegate)}</span></div>
        )}
        {comp.relegate > 0 && (
          <div className="kpi"><span className="caps">{t('tables.relegation')}</span>
            <div className="big">{n - comp.relegate + 1}° – {n}°</div>
            <span className="muted">{Array.from({ length: comp.relegate }, (_, i) => name(n - comp.relegate + 1 + i)).join(', ')}</span>
            <div className="meter"><i className="bad" style={{ width: `${(full[0]?.p ?? 0) / Math.max(1, (n - 1) * 2) * 100}%` }} /></div></div>
        )}
      </div>

      <div className="cols2">
        <div className="panel">
          <h2>{t('tables.official', { name: comp.name })}</h2>
          <table className="league">
            <thead>
              <tr>
                <th className="r">#</th><th>{t('col.club')}</th>
                {view === 'xg'
                  ? <><th className="r">{t('col.p')}</th><th className="r">{t('col.xgf')}</th><th className="r">{t('col.xga')}</th><th className="r">{t('col.xgd')}</th><th className="r">{t('col.gf')}</th><th className="r">{t('col.ga')}</th></>
                  : <>{(['p', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts'] as const).map((k) => <th key={k} className="r">{t(`col.${k}`)}</th>)}</>}
                <th>{t('tables.last5')}</th><th>{t('tables.next')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const c = world.clubs[r.clubId]!;
                const nx = nextFixture(comp, r.clubId);
                const opp = nx ? world.clubs[nx.home === r.clubId ? nx.away : nx.home] : undefined;
                return (
                  <tr key={r.clubId} className={`clickable ${r.clubId === clubId ? 'me' : ''}`} onClick={() => onClub(r.clubId)}>
                    <td className={`r num ${view === 'all' ? `zone-${zone(i + 1)}` : ''}`}>{i + 1}</td>
                    <td><span className="row" style={{ gap: 'var(--s-2)' }}><span className="code">{c.shortName.slice(0, 3).toUpperCase()}</span><Crest club={c} size={18} />{c.name}</span></td>
                    {view === 'xg'
                      ? <><td className="r num">{r.p}</td><td className="r num">{r.xgf.toFixed(1)}</td><td className="r num">{r.xga.toFixed(1)}</td>
                        <td className="r num"><b>{(r.xgf - r.xga > 0 ? '+' : '') + (r.xgf - r.xga).toFixed(1)}</b></td><td className="r num">{r.gf}</td><td className="r num">{r.ga}</td></>
                      : <><td className="r num">{r.p}</td><td className="r num">{r.w}</td><td className="r num">{r.d}</td><td className="r num">{r.l}</td>
                        <td className="r num">{r.gf}</td><td className="r num">{r.ga}</td><td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td><td className="r num"><b>{r.pts}</b></td></>}
                    <td><span className="form-row">{formOf(comp, r.clubId).map((f, j) => <span key={j} className={`form ${f}`}>{t(`col.${f === 'W' ? 'w' : f === 'D' ? 'd' : 'l'}`)}</span>)}</span></td>
                    <td className="muted small">{opp ? `${opp.shortName} (${nx!.home === r.clubId ? t('fixtures.homeShort') : t('fixtures.awayShort')})` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="row wrap muted small">
            {comp.promote > 0 && <span className="pos-good">▌ {t(comp.level === 1 ? 'tables.title' : 'tables.promotion')}</span>}
            {comp.relegate > 0 && <span className="pos-bad">▌ {t('tables.relegation')}</span>}
            <span>{t('tables.tiebreak')}</span>
          </div>
        </div>
        <LeagueSide world={world} comp={comp} onPlayer={onPlayer} name={shortName} />
      </div>
    </div>
  );
}
