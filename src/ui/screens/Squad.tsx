import { useState, type ReactNode } from 'react';
import { ATTR_GROUPS, POSITIONS, type AttrKey, type Player, type WorldState } from '../../engine/model.ts';
import { age } from '../../engine/players.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { PosBadge, Stars, attrClass, fullName } from '../bits.tsx';
import { estimate } from '../../engine/scouting/fog.ts';
import { Ability, Est } from '../fog.tsx';
import { fmtMoney, t } from '../i18n.ts';
import { moraleClass } from './Graph.tsx';

/** segnali di indisponibilità accanto al nome */
export function Status({ p, out = false }: { p: Player; out?: boolean }) {
  return (
    <>
      {p.condition.injuryDays > 0 && <span className="status inj" title={t('status.injured', { days: p.condition.injuryDays })}>✚ {p.condition.injuryDays}g</span>}{' '}
      {p.discipline.ban > 0 && <span className="status ban" title={t('status.banned', { n: p.discipline.ban })}>SQ {p.discipline.ban}</span>}{' '}
      {p.condition.injuryDays === 0 && p.condition.relapse > 0 && <span className="status ban" title={t('status.relapse')}>⚠</span>}{' '}
      {out && <span className="status inj" title={t('status.excluded')}>FR</span>}
    </>
  );
}

type Col = { key: string; label: string; title?: string; num?: boolean; value: (p: Player) => number | string; cell?: (p: Player) => ReactNode };
type View = 'general' | 'stats' | keyof typeof ATTR_GROUPS;
const VIEWS: View[] = ['general', 'stats', 'technical', 'mental', 'physical', 'goalkeeping'];

function columns(view: View, season: number, rep: number, world: WorldState, own: boolean): Col[] {
  const avg = (p: Player) => (p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0);
  if (view === 'general') return [
    { key: 'age', label: t('col.age'), num: true, value: (p) => age(p, season) },
    { key: 'ca', label: t('col.ability'), value: (p) => p.ca, cell: (p) => (own ? <Stars ca={p.ca} /> : <Ability world={world} p={p} which="ca" />) },
    { key: 'pa', label: t('col.potential'), value: (p) => p.pa, cell: (p) => (own ? <Stars ca={p.pa} /> : <Ability world={world} p={p} which="pa" />) },
    { key: 'fit', label: t('col.fitness'), num: true, value: (p) => p.condition.fitness, cell: (p) => `${p.condition.fitness}%` },
    { key: 'morale', label: t('col.morale'), num: true, value: (p) => p.psych.morale, cell: (p) => <b className={`m-text-${moraleClass(p.psych.morale)}`}>{Math.round(p.psych.morale)}</b> },
    { key: 'value', label: t('col.value'), num: true, value: (p) => value(p, season, { clubRep: rep }), cell: (p) => fmtMoney(value(p, season, { clubRep: rep })) },
    { key: 'wage', label: t('col.wage'), num: true, value: (p) => p.contract.wage, cell: (p) => fmtMoney(p.contract.wage) },
    { key: 'contract', label: t('col.contract'), num: true, value: (p) => p.contract.until, cell: (p) => <span className={p.contract.until <= season ? 'pos-bad' : ''}>{p.contract.until}</span> },
  ];
  if (view === 'stats') return [
    { key: 'apps', label: t('col.apps'), num: true, value: (p) => p.stats.apps },
    { key: 'goals', label: t('col.goals'), num: true, value: (p) => p.stats.goals },
    { key: 'assists', label: t('col.assists'), num: true, value: (p) => p.stats.assists },
    { key: 'rating', label: t('col.rating'), num: true, value: avg, cell: (p) => (avg(p) ? avg(p).toFixed(2) : '-') },
    { key: 'form', label: t('player.form'), value: (p) => p.form.at(-1) ?? 0, cell: (p) => p.form.map((v) => v.toFixed(1)).join(' ') },
    { key: 'yel', label: '🟨', num: true, value: (p) => p.stats.yellows },
    { key: 'red', label: '🟥', num: true, value: (p) => p.stats.reds },
  ];
  return (ATTR_GROUPS[view] as readonly AttrKey[]).map((k) => ({
    key: k, label: t(`attr.${k}`).slice(0, 4), title: t(`attr.${k}`), num: true,
    value: (p: Player) => p.attrs[k],
    cell: (p: Player) => (own ? <b className={attrClass(p.attrs[k])}>{p.attrs[k]}</b> : <Est b={estimate(world, p, k)} />),
  }));
}

export function Squad({ world, clubId, onPlayer, title }: { world: WorldState; clubId: number; onPlayer: (id: number) => void; title?: string }) {
  const [view, setView] = useState<View>('general');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'pos', dir: 1 });
  const own = clubId === world.manager.clubId;
  const cols = columns(view, world.season, world.clubs[clubId]!.reputation, world, own);
  const fixed: Col[] = [
    { key: 'pos', label: t('col.pos'), value: (p) => POSITIONS.indexOf(p.position), cell: (p) => <PosBadge pos={p.position} /> },
    { key: 'name', label: t('col.name'), value: (p) => p.lastName, cell: (p) => <>{fullName(p)} <Status p={p} out={world.clubs[clubId]!.excluded.includes(p.id)} /></> },
    { key: 'nat', label: t('col.nat'), value: (p) => p.nation, cell: (p) => <span className="muted" title={t(`nat.${p.nation}`)}>{p.nation}</span> },
  ];
  const all = [...fixed, ...cols];
  const byKey = all.find((c) => c.key === sort.key) ?? fixed[0]!;
  const players = world.clubs[clubId]!.playerIds.map((id) => world.players[id]!);
  players.sort((a, b) => {
    const x = byKey.value(a), y = byKey.value(b);
    const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
    return (c || b.ca - a.ca) * sort.dir;
  });
  const clickSort = (k: string) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: k === 'pos' || k === 'name' ? 1 : -1 }));

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{title ?? t('squad.title', { n: players.length })}</h2>
        <div className="tabs">
          {VIEWS.map((v) => <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>{t(`squad.view.${v}`)}</button>)}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            {all.map((c) => (
              <th key={c.key} title={c.title} className={`sortable ${c.num ? 'r' : ''} ${sort.key === c.key ? 'sorted' : ''}`} onClick={() => clickSort(c.key)}>
                {c.label} {sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="clickable" onClick={() => onPlayer(p.id)}>
              {all.map((c) => <td key={c.key} className={c.num ? 'r num' : ''}>{c.cell ? c.cell(p) : c.value(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
