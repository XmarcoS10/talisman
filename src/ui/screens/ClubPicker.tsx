// Scelta del club (P13 punto 3): filtri per campionato, cassa, blasone e obiettivo, e la sfida raccontata a parole.
import { useMemo, useState } from 'react';
import { fairPosition } from '../../engine/board/board.ts';
import { estimate, wageBill } from '../../engine/finance/ledger.ts';
import { pickXI, xiStrength } from '../../engine/match.ts';
import type { Club, WorldState } from '../../engine/model.ts';
import { Crest } from '../Crest.tsx';
import { fmtMoney, t } from '../i18n.ts';
import { boardGoal } from './Start.tsx';

type Goal = 'all' | 'top' | 'middle' | 'survive';

/** la sfida in tre righe: obiettivo, soldi, rosa. Deriva tutto dal mondo, niente di scritto a mano per club */
export function challenge(world: WorldState, c: Club): string[] {
  const comp = world.competitions[c.compId]!;
  const peers = comp.clubIds.map((id) => world.clubs[id]!);
  const cash = peers.filter((p) => p.balance > c.balance).length; // quanti hanno più cassa
  const strength = peers.map((p) => ({ id: p.id, s: xiStrength(pickXI(world, p)) })).sort((a, b) => b.s - a.s).findIndex((x) => x.id === c.id) + 1;
  const fair = fairPosition(world, c);
  const ratio = wageBill(world, c) / Math.max(1, estimate(world, c));
  return [
    t(cash < 4 ? 'challenge.rich' : cash > peers.length - 5 ? 'challenge.poor' : 'challenge.midCash'),
    t(strength + 3 < fair ? 'challenge.underrated' : strength > fair + 3 ? 'challenge.overrated' : 'challenge.honest', { pos: strength }),
    t(ratio > 0.62 ? 'challenge.wages' : c.youth.facilities >= 13 ? 'challenge.youth' : `challenge.style.${c.philosophy}`),
  ];
}

export function ClubPicker({ world, selected, onPick }: { world: WorldState; selected: number | null; onPick: (id: number) => void }) {
  const [comp, setComp] = useState<string>('all');
  const [goal, setGoal] = useState<Goal>('all');
  const [minCash, setMinCash] = useState(0);
  const [sort, setSort] = useState<'rep' | 'cash'>('rep');

  const clubs = useMemo(() => Object.values(world.clubs).filter((c) => {
    if (comp !== 'all' && c.compId !== comp) return false;
    if (c.balance < minCash * 1e6) return false;
    const fair = fairPosition(world, c);
    const top = world.competitions[c.compId]!.level === 1 ? fair <= 4 : fair <= 3;
    const survive = world.competitions[c.compId]!.level === 1 && fair >= 15;
    return goal === 'all' || (goal === 'top' && top) || (goal === 'survive' && survive) || (goal === 'middle' && !top && !survive);
  }).sort((a, b) => (sort === 'rep' ? b.reputation - a.reputation : b.balance - a.balance)), [world, comp, goal, minCash, sort]);

  const pick = selected !== null ? world.clubs[selected] : undefined;

  return (
    <div className="grid">
      <div className="panel">
        <div className="row wrap">
          <label>{t('start.league')}{' '}
            <select value={comp} onChange={(e) => setComp(e.target.value)}>
              <option value="all">{t('start.allLeagues')}</option>
              {Object.values(world.competitions).sort((a, b) => a.level - b.level).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>{t('start.goal')}{' '}
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              {(['all', 'top', 'middle', 'survive'] as const).map((g) => <option key={g} value={g}>{t(`start.goal.${g}`)}</option>)}
            </select>
          </label>
          <label>{t('start.minCash')}{' '}
            <input type="number" min={0} max={200} step={5} value={minCash} onChange={(e) => setMinCash(Number(e.target.value))} style={{ width: 70 }} />
          </label>
          <div className="spacer" />
          {(['rep', 'cash'] as const).map((k) => (
            <button key={k} className={`btn small ${sort === k ? 'primary' : ''}`} onClick={() => setSort(k)}>{t(`start.sort.${k}`)}</button>
          ))}
        </div>
      </div>

      {pick && (
        <div className="panel challenge">
          <div className="row"><Crest club={pick} size={48} /><div><h2>{pick.name}</h2><div className="muted">{boardGoal(world, pick.id)}</div></div></div>
          {challenge(world, pick).map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      <div className="clubs">
        {clubs.map((c) => (
          <button key={c.id} className={`club-card ${selected === c.id ? 'selected' : ''}`} onClick={() => onPick(c.id)}>
            <Crest club={c} size={36} />
            <div>
              <div><b>{c.name}</b> <span className="muted">· {world.competitions[c.compId]!.name}</span></div>
              <div className="muted">{t('start.reputation')} {c.reputation} · {t('start.cash')} {fmtMoney(c.balance)}</div>
              <div className="muted">{boardGoal(world, c.id)}</div>
            </div>
          </button>
        ))}
        {clubs.length === 0 && <div className="muted">{t('start.noClubs')}</div>}
      </div>
    </div>
  );
}
