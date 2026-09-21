// Osservatori (GUIDA §7.6, P9 punto 7): chi lavora per te, dove lo mandi, cosa ti ha scritto, chi puoi assumere.
import { useMemo, useState } from 'react';
import { Database, Globe, MapPin, Star, UsersRound, Wallet } from 'lucide-react';
import type { ScoutTask, WorldState } from '../../engine/model.ts';
import { knowledge } from '../../engine/scouting/fog.ts';
import { assign, fire, hire, scoutsOf, watched } from '../../engine/scouting/scouts.ts';
import { fullName, team } from '../bits.tsx';
import { fmtMoney, t } from '../i18n.ts';
import { ReportCards, ScoutMarket } from './ScoutsParts.tsx';

const taskKey = (task: ScoutTask | null, world: WorldState) =>
  !task ? t('scout.idle')
    : task.kind === 'nation' ? t('scout.onNation', { nation: t(`nation.${task.nation}`) })
    : task.kind === 'club' ? t('scout.onClub', { club: team(world.clubs[task.clubId], 'su') })
    : t('scout.onPlayer', { name: world.players[task.playerId] ? fullName(world.players[task.playerId]!) : '?' });

export function Scouts({ world, onChange, onPlayer }: { world: WorldState; onChange: () => void; onPlayer: (id: number) => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const mine = scoutsOf(world, club);
  const slots = world.manager.board.scoutSlots;
  const nations = useMemo(() => [...new Set(Object.values(world.players).map((p) => p.nation))].sort(), [world]);
  const [open, setOpen] = useState<number | null>(null);
  const wages = mine.reduce((s, x) => s + x.wage, 0);
  // conoscenza: quota di giocatori del mondo che conosci almeno a metà, e le due nazioni dove ne sai di più
  const know = useMemo(() => {
    const by = new Map<string, [number, number]>();
    let good = 0, tot = 0;
    for (const p of Object.values(world.players)) {
      if (p.clubId === club.id) continue;
      const k = knowledge(world, p);
      tot++; if (k >= 50) good++;
      const e = by.get(p.nation) ?? [0, 0]; e[0] += k; e[1]++; by.set(p.nation, e);
    }
    const top = [...by].map(([n, [s, c]]) => [n, s / c] as const).sort((a, b) => b[1] - a[1]).slice(0, 2);
    return { pct: tot ? Math.round(good / tot * 100) : 0, top };
  }, [world, club.id, world.day]); // il mondo muta sul posto: il giorno fa da versione
  const reported = Object.values(world.known).filter((k) => k.reports.length > 0);
  const topGrade = reported.filter((k) => /top|good/.test(k.reports.at(-1)!.verdict)).length;

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('scout.wageBill')}</span><Wallet size={16} color="var(--accent)" /></span>
          <div className="big num">{fmtMoney(wages)}</div><span className="muted small">{t('scout.perSeason')}</span></div>
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('scout.staff')}</span><UsersRound size={16} color="var(--accent)" /></span>
          <div className="big num">{mine.length} <small>/ {slots} {slots > mine.length ? t('scout.freeSlots', { n: slots - mine.length }) : ''}</small></div>
          <span className="dots">{Array.from({ length: slots }, (_, i) => <i key={i} className={i < mine.length ? 'on' : ''} />)}</span></div>
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('scout.knowledge')}</span><Globe size={16} color="var(--accent)" /></span>
          <div className="big num">{know.pct}% <small>{t('scout.global')}</small></div>
          <div className="row small" style={{ gap: 12 }}>{know.top.map(([n, v]) => <span key={n} className="num"><span className="muted">{n}</span> <b className="pos-good">{Math.round(v)}%</b></span>)}</div></div>
        <div className="kpi"><span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('scout.reported')}</span><Star size={16} color="var(--accent)" /></span>
          <div className="big num" style={{ color: 'var(--accent)' }}>{reported.length} <small>{t('scout.profiles')}</small></div>
          <span className="row small"><span className="tag">{t('scout.topGrade', { n: topGrade })}</span></span></div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="section-h">{t('scout.mine')}</h2>
          <span className="tag dim">{t('scout.activeLine', { n: mine.filter((s) => s.assignment).length, v: fmtMoney(wages) })}</span>
        </div>
        <table>
          <thead><tr><th>{t('scout.member')}</th><th className="c">{t('scout.judgeA')}</th><th className="c">{t('scout.judgeP')}</th><th>{t('scout.kind')}</th><th>{t('scout.task')}</th><th className="r">{t('col.wage')}</th><th /></tr></thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id}>
                <td><span className="row"><span className="initials">{s.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><span><b>{s.name}</b><div className="muted small">{t(`nation.${s.nation}`)}</div></span></span></td>
                <td className="c"><span className={`judge ${s.judgeAbility >= 15 ? 'hi' : ''}`}>{s.judgeAbility}</span></td>
                <td className="c"><span className={`judge ${s.judgePotential >= 15 ? 'hi' : ''}`}>{s.judgePotential}</span></td>
                <td className="muted">{t(s.analyst ? 'scout.analyst' : 'scout.field')}</td>
                <td>
                  <div className="row small"><MapPin size={12} color={s.assignment ? 'var(--accent)' : 'var(--warning)'} /> {taskKey(s.assignment, world)}</div>
                  <select value={s.assignment?.kind === 'nation' ? s.assignment.nation : s.assignment?.kind === 'club' ? `c${s.assignment.clubId}` : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      assign(world, s.id, !v ? null : v.startsWith('c') ? { kind: 'club', clubId: Number(v.slice(1)) } : { kind: 'nation', nation: v });
                      onChange();
                    }}>
                    <option value="">{t('scout.assignMission')}</option>
                    <optgroup label={t('scout.byNation')}>
                      {nations.map((n) => <option key={n} value={n}>{t(`nation.${n}`)}{s.contacts[n]! >= 50 ? ' ★' : ''}</option>)}
                    </optgroup>
                    <optgroup label={t('scout.byClub')}>
                      {Object.values(world.clubs).filter((c) => c.id !== club.id).map((c) => <option key={c.id} value={`c${c.id}`}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </td>
                <td className="r num">{t('scout.perYear', { v: fmtMoney(s.wage) })}</td>
                <td className="r">
                  <button className="btn small" onClick={() => setOpen(open === s.id ? null : s.id)}>{t('scout.watchingN', { n: s.assignment ? watched(world, s).length : 0 })}</button>{' '}
                  <button className="btn small" onClick={() => { fire(world, club, s.id); onChange(); }}>{t('scout.fire')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {open !== null && world.scouts[open] && (
          <div className="chips">
            {watched(world, world.scouts[open]!).map((p) => (
              <button key={p.id} onClick={() => onPlayer(p.id)}>{fullName(p)} · {Math.round(knowledge(world, p))}%</button>
            ))}
          </div>
        )}
        <div className="muted small"><Star size={12} color="var(--warning)" /> {t('scout.contactsHint')}</div>
      </div>

      <ReportCards world={world} onPlayer={onPlayer} />

      <ScoutMarket world={world} full={mine.length >= slots} onHire={(s) => { hire(world, club, s.id); onChange(); }} />
      <div className="muted small"><Database size={12} /> {t('scout.slotsHint')}</div>
    </div>
  );
}
