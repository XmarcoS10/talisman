// Ricerca giocatori (GUIDA §7.5, P9 punto 7): filtri, ordinamenti, pagine — e mai un numero preciso su chi non è tuo.
import { useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Download, Euro, Flag, Hourglass, LayoutGrid, RotateCcw, Search, SlidersHorizontal, UserCheck, UserRound, Wallet } from 'lucide-react';
import { POSITIONS, type Player, type Position, type WorldState } from '../../engine/model.ts';
import { knowledge, metrics } from '../../engine/scouting/fog.ts';
import { sellWillingness } from '../../engine/transfers/club-ai.ts';
import { value } from '../../engine/transfers/valuation.ts';
import { PosBadge, fullName } from '../bits.tsx';
import { download } from '../calendar.ts';
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
type Sort = 'ca' | 'value' | 'age' | 'contract';
const PAGE = 14;
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function Toggle({ on, set, icon, title, sub }: { on: boolean; set: (v: boolean) => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button className="toggle-card" onClick={() => set(!on)} aria-pressed={on}>
      {icon}<span><b>{title}</b><small>{sub}</small></span><span className={`switch ${on ? 'on' : ''}`} />
    </button>
  );
}

export function Market({ world, onPlayer, onOffer }: { world: WorldState; onPlayer: (id: number) => void; onOffer: (id: number) => void }) {
  const [f, setF] = useState<F>(EMPTY);
  const [sort, setSort] = useState<Sort>('ca');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const me = world.clubs[world.manager.clubId]!;
  const set = <K extends keyof F>(k: K, v: F[K]) => { setF({ ...f, [k]: v }); setPage(0); };
  const val = (p: Player) => value(p, world.season, { clubRep: p.clubId !== null ? world.clubs[p.clubId]!.reputation : 40 });

  const nations = useMemo(() => [...new Set(Object.values(world.players).map((p) => p.nation))].sort(), [world]);
  const rows = useMemo(() => {
    const out: Player[] = [];
    const query = norm(q.trim());
    for (const p of Object.values(world.players)) {
      if (p.clubId === me.id) continue;
      const club = p.clubId !== null ? world.clubs[p.clubId]! : null;
      const age = world.season - p.birthYear;
      if (f.pos && (p.positions[f.pos] ?? 0) < 4) continue;
      if (age > f.maxAge) continue;
      if (f.nation && p.nation !== f.nation) continue;
      if (f.expiring && p.contract.until > world.season) continue;
      if (query && !norm(`${p.firstName} ${p.lastName} ${club?.name ?? ''}`).includes(query)) continue;
      if (f.known && knowledge(world, p) < 80) continue;
      if (club && f.available && sellWillingness(world, club, p) < 0.5) continue;
      if (val(p) > f.maxValue * 1e6) continue;
      if (p.contract.wage > f.maxWage * 1000) continue;
      out.push(p);
    }
    const key = sort === 'age' ? (p: Player) => -(world.season - p.birthYear) : sort === 'value' ? val
      : sort === 'contract' ? (p: Player) => -p.contract.until : (p: Player) => p.ca;
    return out.sort((a, b) => key(b) - key(a)).slice(0, 200);
  }, [world, f, sort, me.id, q]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const csv = () => download(`mercato-${world.season}.csv`, [
    [t('col.pos'), t('col.name'), t('col.nat'), t('col.age'), t('market.club'), t('col.value'), t('col.wage'), t('col.contract')].join(';'),
    ...rows.map((p) => [p.position, fullName(p), p.nation, world.season - p.birthYear, p.clubId !== null ? world.clubs[p.clubId]!.name : '', val(p), p.contract.wage, p.contract.until].join(';')),
  ].join('\n'), 'text/csv');

  return (
    <div className="market-grid">
      <div className="panel filters">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="row"><span className="hint-icon" style={{ width: 38, height: 38 }}><SlidersHorizontal size={18} /></span><span><b className="deal-h">{t('market.filters')}</b><div className="caps">{t('market.params')}</div></span></span>
          <button className="link pos-good" onClick={() => { setF(EMPTY); setPage(0); }}><RotateCcw size={13} /> {t('market.resetShort')}</button>
        </div>
        <label className="field"><span className="caps"><LayoutGrid size={12} /> {t('market.role')}</span>
          <select value={f.pos} onChange={(e) => set('pos', e.target.value as Position | '')}>
            <option value="">{t('market.allRoles')}</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{t(`pos.${p}`)}</option>)}
          </select>
        </label>
        <label className="field"><span className="caps"><Flag size={12} /> {t('market.nation')}</span>
          <select value={f.nation} onChange={(e) => set('nation', e.target.value)}>
            <option value="">{t('market.allNations')}</option>
            {nations.map((n) => <option key={n} value={n}>{t(`nation.${n}`)}</option>)}
          </select>
        </label>
        <label className="field"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps"><CalendarClock size={12} /> {t('market.maxAge')}</span><span className="tag num">≤ {f.maxAge} {t('youth.years')}</span></span>
          <input type="range" min={16} max={42} value={f.maxAge} onChange={(e) => set('maxAge', Number(e.target.value))} />
          <span className="row muted small" style={{ justifyContent: 'space-between' }}><span>16</span><span>29</span><span>42</span></span></label>
        <label className="field"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps"><Euro size={12} /> {t('market.maxValue')}</span><span className="tag num">≤ {f.maxValue}M €</span></span>
          <input type="range" min={1} max={250} value={f.maxValue} onChange={(e) => set('maxValue', Number(e.target.value))} />
          <span className="row muted small" style={{ justifyContent: 'space-between' }}><span>1M</span><span>125M</span><span>250M</span></span></label>
        <label className="field"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps"><Wallet size={12} /> {t('market.maxWage')}</span><span className="tag num">≤ {fmtMoney(f.maxWage * 1000)}</span></span>
          <input type="range" min={100} max={20000} step={100} value={f.maxWage} onChange={(e) => set('maxWage', Number(e.target.value))} /></label>
        <span className="caps" style={{ marginTop: 8 }}>{t('market.quick')}</span>
        <Toggle on={f.expiring} set={(v) => set('expiring', v)} icon={<Hourglass size={16} color="var(--warning)" />} title={t('market.expiring')} sub={t('market.expiringSub')} />
        <Toggle on={f.available} set={(v) => set('available', v)} icon={<UserRound size={16} color="var(--accent)" />} title={t('market.available')} sub={t('market.availableSub')} />
        <Toggle on={f.known} set={(v) => set('known', v)} icon={<UserCheck size={16} color="var(--accent)" />} title={t('market.known')} sub={t('market.knownSub')} />
        <div className="mini-card row"><span className="live-dot" /> <span className="caps">{t('market.db')}</span><b className="num pos-good">{rows.length}</b><span className="small">{t('market.filtered')}</span></div>
        <button className="btn" onClick={() => { setF(EMPTY); setPage(0); }}><RotateCcw size={14} /> {t('market.reset')}</button>
      </div>

      <div className="panel">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <span className="row wrap"><h1>{t('market.title')}</h1><span className="caps pos-good">{t('market.scope')}</span>
            <span className="seg-tabs">{(['ca', 'value', 'age', 'contract'] as Sort[]).map((k) => <button key={k} className={sort === k ? 'active hot' : ''} onClick={() => { setSort(k); setPage(0); }}>{t(`market.sort.${k}`)}</button>)}</span></span>
          <span className="row"><label className="search-box"><Search size={14} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t('market.search')} /></label>
            <button className="btn" onClick={csv} title={t('market.csv')}><Download size={15} /></button></span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('col.pos')}</th><th>{t('col.name')}</th><th>{t('col.nat')}</th><th className="r">{t('col.age')}</th>
              <th>{t('col.ability')}</th><th>{t('col.potential')}</th><th>{t('market.club')}</th>
              <th className="r">{t('col.value')}</th><th className="r">{t('col.wage')}</th><th className="r">{t('col.contract')}</th><th className="r">{t('market.per90')}</th><th />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const club = p.clubId !== null ? world.clubs[p.clubId]! : null;
              const m = metrics(p);
              return (
                <tr key={p.id} className="clickable" onClick={() => onPlayer(p.id)}>
                  <td><PosBadge pos={p.position} /></td>
                  <td><b>{fullName(p)}</b></td>
                  <td className="muted num">{p.nation}</td>
                  <td className={`r num ${world.season - p.birthYear <= 21 ? 'pos-good' : ''}`}>{world.season - p.birthYear}</td>
                  <td><Ability world={world} p={p} which="ca" /></td>
                  <td><Ability world={world} p={p} which="pa" /></td>
                  <td>{club ? <span className="code">{club.shortName.slice(0, 3).toUpperCase()}</span> : <span className="tag">{t('market.free')}</span>}</td>
                  <td className="r num pos-good"><b>{fmtMoney(val(p))}</b></td>
                  <td className="r num">{fmtMoney(p.contract.wage)}</td>
                  <td className={`r num ${p.contract.until <= world.season ? 'pos-bad' : ''}`}>{p.contract.until}</td>
                  <td className={`r num ${m.small ? 'muted' : ''}`} title={t(m.small ? 'market.smallSample' : 'market.sample', { n: m.apps })}>
                    {m.apps ? `${m.rating.toFixed(2)}${m.small ? ' ⚠' : ''}` : '–'}
                  </td>
                  <td className="r">{club && <button className="btn small primary" onClick={(e) => { e.stopPropagation(); onOffer(p.id); }}>{t('market.offer')}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="caps">{t('market.showing', { a: rows.length ? page * PAGE + 1 : 0, b: Math.min(rows.length, page * PAGE + PAGE), n: rows.length })}</span>
          <span className="pager">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => Math.min(Math.max(0, page - 2), Math.max(0, pages - 5)) + i).map((i) => (
              <button key={i} className={i === page ? 'active' : ''} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
          </span>
        </div>
        <span className="muted small">{t('market.fogHint')}</span>
      </div>
    </div>
  );
}
