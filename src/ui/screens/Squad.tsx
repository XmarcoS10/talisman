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
type View = 'general' | 'contracts' | 'stats' | 'medical' | keyof typeof ATTR_GROUPS;
const VIEWS: View[] = ['general', 'contracts', 'stats', 'medical', 'technical', 'mental', 'physical', 'goalkeeping'];
// filtri rapidi per reparto (come nei disegni: portieri, difesa, centrocampo, attacco) e contratti in scadenza
const GROUPS = { all: [], gk: ['GK'], def: ['DL', 'DC', 'DR'], mid: ['DM', 'ML', 'MC', 'MR', 'AMC'], att: ['AML', 'AMR', 'ST'], expiring: [] } as const;
type Group = keyof typeof GROUPS;
const inGroup = (p: Player, g: Group, season: number) =>
  g === 'all' ? true : g === 'expiring' ? p.contract.until <= season : (GROUPS[g] as readonly string[]).includes(p.position);

function columns(view: View, season: number, rep: number, world: WorldState, own: boolean): Col[] {
  const avg = (p: Player) => (p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0);
  if (view === 'general') return [
    { key: 'age', label: t('col.age'), num: true, value: (p) => age(p, season) },
    { key: 'ca', label: t('col.ability'), value: (p) => p.ca, cell: (p) => (own ? <Stars ca={p.ca} /> : <Ability world={world} p={p} which="ca" />) },
    { key: 'pa', label: t('col.potential'), value: (p) => p.pa, cell: (p) => (own ? <Stars ca={p.pa} /> : <Ability world={world} p={p} which="pa" />) },
    { key: 'fit', label: t('col.fitness'), num: true, value: (p) => p.condition.fitness, cell: (p) => `${p.condition.fitness}%` },
    // il morale di uno spogliatoio che non è il tuo non lo puoi sapere
    { key: 'morale', label: t('col.morale'), num: true, value: (p) => (own ? p.psych.morale : 0),
      cell: (p) => (own ? <b className={`m-text-${moraleClass(p.psych.morale)}`}>{Math.round(p.psych.morale)}</b> : <span className="muted">?</span>) },
    { key: 'value', label: t('col.value'), num: true, value: (p) => value(p, season, { clubRep: rep }), cell: (p) => fmtMoney(value(p, season, { clubRep: rep })) },
    { key: 'wage', label: t('col.wage'), num: true, value: (p) => p.contract.wage, cell: (p) => fmtMoney(p.contract.wage) },
    { key: 'contract', label: t('col.contract'), num: true, value: (p) => p.contract.until, cell: (p) => <span className={p.contract.until <= season ? 'pos-bad' : ''}>{p.contract.until}</span> },
  ];
  if (view === 'contracts') return [
    { key: 'wage', label: t('col.wage'), num: true, value: (p) => p.contract.wage, cell: (p) => fmtMoney(p.contract.wage) },
    { key: 'contract', label: t('col.contract'), num: true, value: (p) => p.contract.until, cell: (p) => <span className={p.contract.until <= season ? 'pos-bad' : ''}>{p.contract.until}</span> },
    { key: 'release', label: t('col.release'), num: true, value: (p) => p.contract.release ?? 0, cell: (p) => (p.contract.release ? fmtMoney(p.contract.release) : '—') },
    { key: 'sellOn', label: t('col.sellOn'), num: true, value: (p) => p.contract.sellOn, cell: (p) => (p.contract.sellOn ? `${Math.round(p.contract.sellOn * 100)}%` : '—') },
    { key: 'loan', label: t('col.loan'), value: (p) => (p.contract.loan ? world.clubs[p.contract.loan.from]?.shortName ?? '' : ''),
      cell: (p) => (p.contract.loan ? t('squad.loanFrom', { club: world.clubs[p.contract.loan.from]?.shortName ?? '', until: p.contract.loan.until }) : '—') },
    { key: 'agent', label: t('col.agent'), value: (p) => (p.agentId !== null ? world.agents[p.agentId]?.name ?? '' : ''),
      cell: (p) => (p.agentId !== null ? world.agents[p.agentId]?.name ?? '—' : '—') },
  ];
  if (view === 'medical') return [
    { key: 'fit', label: t('col.fitness'), num: true, value: (p) => p.condition.fitness, cell: (p) => <Bar v={p.condition.fitness} /> },
    { key: 'sharp', label: t('col.sharpness'), num: true, value: (p) => p.condition.sharpness, cell: (p) => <Bar v={p.condition.sharpness} /> },
    { key: 'state', label: t('col.medState'), value: (p) => p.condition.injuryDays * 1000 + p.condition.relapse, cell: (p) => (
      p.condition.injuryDays > 0 ? <span className="pos-bad">{t('squad.injured', { days: p.condition.injuryDays })}</span>
        : p.condition.relapse > 0 ? <span className="pos-mid">{t('squad.relapse', { days: p.condition.relapse })}</span>
          : <span className="pos-good">{t('squad.fit')}</span>) },
    { key: 'injury', label: t('col.injury'), value: (p) => p.condition.injury?.id ?? '', cell: (p) => (p.condition.injury ? t(`injury.${p.condition.injury.id}`) : '—') },
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

const Bar = ({ v }: { v: number }) => (
  <span className="mini-bar"><span className="meter"><i style={{ width: `${v}%` }} className={v < 60 ? 'bad' : v < 85 ? 'warn' : ''} /></span>{Math.round(v)}%</span>
);

export function Squad({ world, clubId, onPlayer, title }: { world: WorldState; clubId: number; onPlayer: (id: number) => void; title?: string }) {
  const [view, setView] = useState<View>('general');
  const [group, setGroup] = useState<Group>('all');
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
  const squad = world.clubs[clubId]!.playerIds.map((id) => world.players[id]!);
  const players = squad.filter((p) => inGroup(p, group, world.season));
  const avgAge = squad.reduce((s, p) => s + age(p, world.season), 0) / Math.max(1, squad.length);
  const wages = squad.reduce((s, p) => s + p.contract.wage, 0);
  const u21 = squad.filter((p) => age(p, world.season) <= 21).length;
  players.sort((a, b) => {
    const x = byKey.value(a), y = byKey.value(b);
    const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
    return (c || b.ca - a.ca) * sort.dir;
  });
  const clickSort = (k: string) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: k === 'pos' || k === 'name' ? 1 : -1 }));

  return (
    <div className="panel">
      <div className="row wrap">
        <h2>{title ?? t('squad.title', { n: squad.length })}</h2>
        <span className="pill num">{t('squad.avgAge', { n: avgAge.toFixed(1) })}</span>
        <span className="pill num">{t('squad.wages', { v: fmtMoney(wages) })}</span>
        <span className="pill num">{t('squad.u21', { n: u21, tot: squad.length })}</span>
      </div>
      <div className="seg-tabs">
        {VIEWS.map((v) => <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>{t(`squad.view.${v}`)}</button>)}
      </div>
      <div className="chips">
        {(Object.keys(GROUPS) as Group[]).map((g) => (
          <button key={g} className={g === group ? 'active' : ''} onClick={() => setGroup(g)}>
            {t(`squad.group.${g}`)} ({squad.filter((p) => inGroup(p, g, world.season)).length})
          </button>
        ))}
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
