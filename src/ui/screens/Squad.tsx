import { useState } from 'react';
import { POSITIONS, type Player, type WorldState } from '../../engine/model.ts';
import { age, marketValue } from '../../engine/players.ts';
import { PosBadge, Stars, fullName, nextSort } from '../bits.tsx';
import { fmtMoney, t } from '../i18n.ts';

type Row = { p: Player; pos: number; name: string; nat: string; age: number; ca: number; pa: number; value: number; wage: number; contract: number; apps: number; goals: number; assists: number };
const COLS: { key: keyof Row & string; label: string; num?: boolean }[] = [
  { key: 'pos', label: 'col.pos' }, { key: 'name', label: 'col.name' }, { key: 'nat', label: 'col.nat' },
  { key: 'age', label: 'col.age', num: true }, { key: 'ca', label: 'col.ability' }, { key: 'pa', label: 'col.potential' },
  { key: 'value', label: 'col.value', num: true }, { key: 'wage', label: 'col.wage', num: true }, { key: 'contract', label: 'col.contract', num: true },
  { key: 'apps', label: 'col.apps', num: true }, { key: 'goals', label: 'col.goals', num: true }, { key: 'assists', label: 'col.assists', num: true },
];

export function Squad({ world, clubId, onPlayer }: { world: WorldState; clubId: number; onPlayer: (id: number) => void }) {
  const [sort, setSort] = useState<{ key: keyof Row & string; dir: 1 | -1 }>({ key: 'pos', dir: 1 });
  const rows: Row[] = world.clubs[clubId]!.playerIds.map((id) => {
    const p = world.players[id]!;
    return {
      p, pos: POSITIONS.indexOf(p.position), name: p.lastName, nat: p.nation, age: age(p, world.season), ca: p.ca, pa: p.pa,
      value: marketValue(p, world.season), wage: p.contract.wage, contract: p.contract.until, apps: p.stats.apps, goals: p.stats.goals, assists: p.stats.assists,
    };
  });
  rows.sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
    return (c || b.ca - a.ca) * sort.dir;
  });

  return (
    <div className="panel">
      <h2>{t('squad.title', { n: rows.length })}</h2>
      <table>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} className={`sortable ${c.num ? 'r' : ''} ${sort.key === c.key ? 'sorted' : ''}`}
                onClick={() => setSort(nextSort(sort, c.key, c.key === 'pos' || c.key === 'name' ? 1 : -1))}>
                {t(c.label)} {sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.p.id} className="clickable" onClick={() => onPlayer(r.p.id)}>
              <td><PosBadge pos={r.p.position} /></td>
              <td>{fullName(r.p)}</td>
              <td className="muted" title={t(`nat.${r.nat}`)}>{r.nat}</td>
              <td className="r num">{r.age}</td>
              <td><Stars ca={r.ca} /></td>
              <td><Stars ca={r.pa} /></td>
              <td className="r num">{fmtMoney(r.value)}</td>
              <td className="r num">{fmtMoney(r.wage)}</td>
              <td className={`r num ${r.contract <= world.season ? 'pos-bad' : ''}`}>{r.contract}</td>
              <td className="r num">{r.apps}</td>
              <td className="r num">{r.goals}</td>
              <td className="r num">{r.assists}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
