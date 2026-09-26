// Nuova carriera, passo 1 (P13 punto 3): club a schede con filtri per campionato, obiettivo, ricerca e ordinamento.
import { useMemo, useState } from 'react';
import { Flag, Search, Trophy } from 'lucide-react';
import { fairPosition } from '../../engine/board/board.ts';
import { estimate, wageBill } from '../../engine/finance/ledger.ts';
import { pickXI, xiStrength } from '../../engine/match.ts';
import type { Club, WorldState } from '../../engine/model.ts';
import { Stars } from '../bits.tsx';
import { fmtMoney, t } from '../i18n.ts';
import { boardGoal } from './Start.tsx';

type Goal = 'all' | 'top' | 'middle' | 'survive';
type Sort = 'rep' | 'cash' | 'wages';

/** la sfida in tre righe: obiettivo, soldi, rosa. Deriva tutto dal mondo, niente di scritto a mano per club */
export function challenge(world: WorldState, c: Club): string[] {
  const comp = world.competitions[c.compId]!;
  const peers = comp.clubIds.map((id) => world.clubs[id]!);
  const cash = peers.filter((p) => p.balance > c.balance).length; // quanti hanno più cassa
  const strength = strengthRank(world, c);
  const fair = fairPosition(world, c);
  const ratio = wageBill(world, c) / Math.max(1, estimate(world, c));
  return [
    t(cash < 4 ? 'challenge.rich' : cash > peers.length - 5 ? 'challenge.poor' : 'challenge.midCash'),
    t(strength + 3 < fair ? 'challenge.underrated' : strength > fair + 3 ? 'challenge.overrated' : 'challenge.honest', { pos: strength }),
    t(ratio > 0.62 ? 'challenge.wages' : c.youth.facilities >= 13 ? 'challenge.youth' : `challenge.style.${c.philosophy}`),
  ];
}

/** posto in classifica "sulla carta": forza dell'undici titolare tra i club della stessa lega */
export function strengthRank(world: WorldState, c: Club): number {
  const peers = world.competitions[c.compId]!.clubIds.map((id) => world.clubs[id]!);
  return peers.map((p) => ({ id: p.id, s: xiStrength(pickXI(world, p)) })).sort((a, b) => b.s - a.s).findIndex((x) => x.id === c.id) + 1;
}

export const avgXI = (world: WorldState, c: Club) => {
  const xi = pickXI(world, c);
  return xi.reduce((s, x) => s + x.player.ca, 0) / Math.max(1, xi.length);
};
const goalKind = (world: WorldState, c: Club): Goal => {
  const fair = fairPosition(world, c);
  const lvl = world.competitions[c.compId]!.level;
  return (lvl === 1 ? fair <= 4 : fair <= 3) ? 'top' : lvl === 1 && fair >= 15 ? 'survive' : 'middle';
};
export const code = (c: Club) => c.shortName.replace(/\s/g, '').slice(0, 3).toUpperCase();

export function ClubPicker({ world, selected, onPick }: { world: WorldState; selected: number | null; onPick: (id: number) => void }) {
  const [comp, setComp] = useState<string>('all');
  const [goal, setGoal] = useState<Goal>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('rep');
  // la Serie C non si sceglie: non si gioca partita per partita (Blocco 4)
  const comps = Object.values(world.competitions).filter((c) => c.level <= 2).sort((a, b) => a.level - b.level);
  const xi = useMemo(() => new Map(Object.values(world.clubs).map((c) => [c.id, avgXI(world, c)])), [world]);

  const clubs = useMemo(() => Object.values(world.clubs).filter((c) =>
    (comp === 'all' || c.compId === comp) && (goal === 'all' || goalKind(world, c) === goal)
    && (!q || `${c.name} ${c.city}`.toLowerCase().includes(q.toLowerCase())),
  ).sort((a, b) => (sort === 'rep' ? b.reputation - a.reputation : sort === 'cash' ? b.balance - a.balance : wageBill(world, b) - wageBill(world, a))),
  [world, comp, goal, q, sort]);

  return (
    <div className="stack">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="seg-tabs">
          <button className={comp === 'all' ? 'active hot' : ''} onClick={() => setComp('all')}>{t('start.allN', { n: Object.keys(world.clubs).length })}</button>
          {comps.map((c) => <button key={c.id} className={comp === c.id ? 'active hot' : ''} onClick={() => setComp(c.id)}>{c.name} ({c.clubIds.length})</button>)}
        </div>
        <div className="row wrap">
          <label className="search-box"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('start.searchClub')} /></label>
          <label className="search-box"><Flag size={14} /><select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {(['all', 'top', 'middle', 'survive'] as const).map((g) => <option key={g} value={g}>{t('start.goalIs', { g: t(`start.goal.${g}`) })}</option>)}
          </select></label>
          <label className="search-box"><Trophy size={14} /><select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {(['rep', 'cash', 'wages'] as const).map((s) => <option key={s} value={s}>{t(`start.sort.${s}`)}</option>)}
          </select></label>
        </div>
      </div>
      <div className="caps"><span className="live-dot" /> {t('start.available', { n: clubs.length })}</div>

      <div className="club-grid">
        {clubs.map((c) => {
          const g = goalKind(world, c);
          const on = selected === c.id;
          return (
            <button key={c.id} className={`club-tile ${on ? 'selected' : ''}`} onClick={() => onPick(c.id)}>
              <span className="row" style={{ justifyContent: 'space-between' }}>
                <span className={`tag ${on ? '' : 'dim'}`}>{t(on ? 'start.current' : 'start.free')}</span>
                <span className="tag dim">{world.competitions[c.compId]!.name}</span>
              </span>
              <span className="row">
                <span className="club-code" style={{ color: c.colors[0] === '#FFFFFF' || c.colors[0] === '#111111' ? 'var(--accent)' : c.colors[0] }}>{code(c)}<small>{c.founded}</small></span>
                <span><b className="club-name">{c.name}</b><div className="muted small">{t('start.stadium', { name: c.stadium.name, cap: c.stadium.capacity.toLocaleString('it-IT') })}</div></span>
              </span>
              <span className="goal-row"><span className="caps">{t('start.boardGoal')}</span><span className={`tag ${g === 'top' ? '' : g === 'survive' ? 'bad' : 'cyan'}`}>{boardGoal(world, c.id)}</span></span>
              <span className="tile-stats">
                <span><span className="caps">{t('start.budget')}</span><b className="num pos-good">{fmtMoney(c.balance)}</b></span>
                <span><span className="caps">{t('start.wages')}</span><b className="num">{fmtMoney(wageBill(world, c))}</b></span>
                <span><span className="caps">{t('start.squadAvg')}</span><Stars world={world} ca={xi.get(c.id) ?? 0} /></span>
              </span>
              <span className="tile-facts">
                <span>{t('start.reputation')}</span><span className="stars-txt">{'★'.repeat(Math.round(c.reputation / 20))}{'☆'.repeat(5 - Math.round(c.reputation / 20))}</span>
                <span>{t('start.youthLevel')}</span><span>{t(`youth.level.${c.youth.facilities >= 16 ? 'top' : c.youth.facilities >= 11 ? 'good' : c.youth.facilities >= 6 ? 'ok' : 'low'}`)} ({c.youth.facilities}/20)</span>
                <span>{t('start.styleReq')}</span><span className="pos-good">{t(`start.style.${c.philosophy}`)}</span>
              </span>
              <span className="row small" style={{ justifyContent: 'space-between' }}><span className={on ? 'pos-good' : 'muted'}>{t(on ? 'start.ready' : 'start.clickToPick')}</span><span className={`radio ${on ? 'on' : ''}`} /></span>
            </button>
          );
        })}
        {clubs.length === 0 && <div className="muted">{t('start.noClubs')}</div>}
      </div>
    </div>
  );
}
