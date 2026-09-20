// Ricerca giocatori (GUIDA §7.5, P9 punto 7): filtri, e mai un numero preciso su chi non è tuo.
import { useMemo, useState } from 'react';
import { POSITIONS, type Player, type Position, type WorldState } from '../../engine/model.ts';
import { knowledge, metrics } from '../../engine/scouting/fog.ts';
import { sellWillingness } from '../../engine/transfers/club-ai.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { PosBadge, fullName } from '../bits.tsx';
import { Ability } from '../fog.tsx';
import { fmtMoney, t } from '../i18n.ts';

interface F {
  pos: Position | '';
  maxAge: number;
  maxValue: number; // milioni
  maxWage: number; // migliaia
  nation: string;
  expiring: boolean;
  available: boolean; // solo chi il suo club lascerebbe andare
  known: boolean; // solo quelli che conosciamo davvero
}
const EMPTY: F = { pos: '', maxAge: 40, maxValue: 200, maxWage: 20000, nation: '', expiring: false, available: false, known: false };

export function Market({ world, onPlayer }: { world: WorldState; onPlayer: (id: number) => void }) {
  const [f, setF] = useState<F>(EMPTY);
  const [sort, setSort] = useState<'ca' | 'value' | 'age'>('ca');
  const me = world.clubs[world.manager.clubId]!;
  const set = <K extends keyof F>(k: K, v: F[K]) => setF({ ...f, [k]: v });

  const nations = useMemo(() => [...new Set(Object.values(world.players).map((p) => p.nation))].sort(), [world]);
  const rows = useMemo(() => {
    const out: Player[] = [];
    for (const p of Object.values(world.players)) {
      if (p.clubId === me.id) continue;
      const club = p.clubId !== null ? world.clubs[p.clubId]! : null;
      const age = world.season - p.birthYear;
      if (f.pos && (p.positions[f.pos] ?? 0) < 4) continue;
      if (age > f.maxAge) continue;
      if (f.nation && p.nation !== f.nation) continue;
      if (f.expiring && p.contract.until > world.season) continue;
      if (f.known && knowledge(world, p) < 80) continue;
      if (club && f.available && sellWillingness(world, club, p) < 0.5) continue;
      if (value(p, world.season, { clubRep: club?.reputation ?? 40 }) > f.maxValue * 1e6) continue;
      if (p.contract.wage > f.maxWage * 1000) continue;
      out.push(p);
    }
    const key = sort === 'age' ? (p: Player) => -(world.season - p.birthYear) : sort === 'value'
      ? (p: Player) => value(p, world.season, { clubRep: p.clubId !== null ? world.clubs[p.clubId]!.reputation : 40 })
      : (p: Player) => p.ca;
    return out.sort((a, b) => key(b) - key(a)).slice(0, 60);
  }, [world, f, sort, me.id]);

  return (
    <div className="grid market">
      <div className="panel filters">
        <h3>{t('market.filters')}</h3>
        <label>{t('col.pos')}
          <select value={f.pos} onChange={(e) => set('pos', e.target.value as Position | '')}>
            <option value="">{t('market.any')}</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>{t('market.maxAge')} <input type="number" min={16} max={40} value={f.maxAge} onChange={(e) => set('maxAge', Number(e.target.value))} /></label>
        <label>{t('market.maxValue')} <input type="number" min={0} max={200} value={f.maxValue} onChange={(e) => set('maxValue', Number(e.target.value))} /></label>
        <label>{t('market.maxWage')} <input type="number" min={0} max={20000} step={100} value={f.maxWage} onChange={(e) => set('maxWage', Number(e.target.value))} /></label>
        <label>{t('market.nation')}
          <select value={f.nation} onChange={(e) => set('nation', e.target.value)}>
            <option value="">{t('market.any')}</option>
            {nations.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={f.expiring} onChange={(e) => set('expiring', e.target.checked)} /> {t('market.expiring')}</label>
        <label className="check"><input type="checkbox" checked={f.available} onChange={(e) => set('available', e.target.checked)} /> {t('market.available')}</label>
        <label className="check"><input type="checkbox" checked={f.known} onChange={(e) => set('known', e.target.checked)} /> {t('market.known')}</label>
        <button className="btn" onClick={() => setF(EMPTY)}>{t('market.reset')}</button>
        <div className="muted">{t('market.count', { n: rows.length })}</div>
      </div>

      <div className="panel">
        <div className="row">
          <h3>{t('nav.market')}</h3>
          <div className="spacer" />
          {(['ca', 'value', 'age'] as const).map((k) => (
            <button key={k} className={`btn small ${sort === k ? 'primary' : ''}`} onClick={() => setSort(k)}>{t(`market.sort.${k}`)}</button>
          ))}
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th /><th>{t('col.name')}</th><th>{t('col.nat')}</th><th className="num">{t('col.age')}</th>
              <th>{t('col.ability')}</th><th>{t('col.potential')}</th><th>{t('market.club')}</th>
              <th className="num">{t('col.value')}</th><th className="num">{t('col.wage')}</th><th className="num">{t('col.contract')}</th><th className="num">{t('market.per90')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const club = p.clubId !== null ? world.clubs[p.clubId]! : null;
              const m = metrics(p);
              return (
                <tr key={p.id} onClick={() => onPlayer(p.id)}>
                  <td><PosBadge pos={p.position} /></td>
                  <td>{fullName(p)}</td>
                  <td className="muted">{p.nation}</td>
                  <td className="num">{world.season - p.birthYear}</td>
                  <td><Ability world={world} p={p} which="ca" /></td>
                  <td><Ability world={world} p={p} which="pa" /></td>
                  <td className="muted">{club ? club.shortName : t('market.free')}</td>
                  <td className="num">{fmtMoney(value(p, world.season, { clubRep: club?.reputation ?? 40 }))}</td>
                  <td className="num">{fmtMoney(p.contract.wage)}</td>
                  <td className="num">{p.contract.until}</td>
                  <td className={`num ${m.small ? 'muted' : ''}`} title={t(m.small ? 'market.smallSample' : 'market.sample', { n: m.apps })}>
                    {m.apps ? `${m.rating.toFixed(2)}${m.small ? ' ⚠' : ''}` : '–'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
