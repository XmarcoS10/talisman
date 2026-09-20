// Osservatori (GUIDA §7.6, P9 punto 7): chi lavora per te, dove lo mandi, cosa ti ha scritto.
import { useState } from 'react';
import type { ScoutTask, WorldState } from '../../engine/model.ts';
import { knowledge } from '../../engine/scouting/fog.ts';
import { assign, fire, hire, scoutsOf, watched } from '../../engine/scouting/scouts.ts';
import { fullName } from '../bits.tsx';
import { fmtMoney, t } from '../i18n.ts';

const taskKey = (task: ScoutTask | null, world: WorldState) =>
  !task ? t('scout.idle')
    : task.kind === 'nation' ? t('scout.onNation', { nation: task.nation })
    : task.kind === 'club' ? t('scout.onClub', { club: world.clubs[task.clubId]?.shortName ?? '?' })
    : t('scout.onPlayer', { name: world.players[task.playerId] ? fullName(world.players[task.playerId]!) : '?' });

export function Scouts({ world, onChange, onPlayer }: { world: WorldState; onChange: () => void; onPlayer: (id: number) => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const mine = scoutsOf(world, club);
  const free = Object.values(world.scouts).filter((s) => s.clubId === null);
  const nations = [...new Set(Object.values(world.players).map((p) => p.nation))].sort();
  const [open, setOpen] = useState<number | null>(null);
  const reports = Object.entries(world.known).flatMap(([id, k]) => k.reports.map((r) => ({ ...r, playerId: Number(id) })))
    .sort((a, b) => b.season * 400 + b.day - (a.season * 400 + a.day)).slice(0, 12);

  return (
    <div className="grid">
      <div className="panel">
        <h3>{t('scout.mine')}</h3>
        <table className="tbl">
          <thead>
            <tr><th>{t('col.name')}</th><th>{t('col.nat')}</th><th className="num">{t('scout.judgeA')}</th><th className="num">{t('scout.judgeP')}</th>
              <th>{t('scout.kind')}</th><th>{t('scout.task')}</th><th className="num">{t('col.wage')}</th><th /></tr>
          </thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="muted">{s.nation}</td>
                <td className="num">{s.judgeAbility}</td>
                <td className="num">{s.judgePotential}</td>
                <td className="muted">{t(s.analyst ? 'scout.analyst' : 'scout.field')}</td>
                <td>
                  <select value={s.assignment?.kind === 'nation' ? s.assignment.nation : s.assignment?.kind === 'club' ? `c${s.assignment.clubId}` : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      assign(world, s.id, !v ? null : v.startsWith('c') ? { kind: 'club', clubId: Number(v.slice(1)) } : { kind: 'nation', nation: v });
                      onChange();
                    }}>
                    <option value="">{t('scout.idle')}</option>
                    <optgroup label={t('scout.byNation')}>
                      {nations.map((n) => <option key={n} value={n}>{n}{s.contacts[n]! >= 50 ? ' ★' : ''}</option>)}
                    </optgroup>
                    <optgroup label={t('scout.byClub')}>
                      {Object.values(world.clubs).filter((c) => c.id !== club.id).map((c) => <option key={c.id} value={`c${c.id}`}>{c.shortName}</option>)}
                    </optgroup>
                  </select>
                </td>
                <td className="num">{fmtMoney(s.wage)}</td>
                <td>
                  <button className="btn small" onClick={() => setOpen(open === s.id ? null : s.id)}>{t('scout.watching')}</button>
                  <button className="btn small" onClick={() => { fire(world, club, s.id); onChange(); }}>{t('scout.fire')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {open !== null && (
          <div className="row wrap">
            {watched(world, world.scouts[open]!).map((p) => (
              <button key={p.id} className="chip" onClick={() => onPlayer(p.id)}>{fullName(p)} · {Math.round(knowledge(world, p))}%</button>
            ))}
          </div>
        )}
        <div className="muted">{t('scout.contactsHint')}</div>
      </div>

      <div className="panel">
        <h3>{t('scout.reports')}</h3>
        {reports.length === 0 && <div className="muted">{t('scout.noReports')}</div>}
        {reports.map((r, i) => {
          const p = world.players[r.playerId];
          if (!p) return null;
          return (
            <div key={i} className="report">
              <button className="link" onClick={() => onPlayer(p.id)}>{fullName(p)}</button>
              <span className="muted">{world.scouts[r.scoutId]?.name}</span>
              <span>{t(r.verdict)}</span>
              <span className="num muted">{t('scout.bands', { ca: `${r.ca[0]}–${r.ca[1]}`, pa: `${r.pa[0]}–${r.pa[1]}` })}</span>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h3>{t('scout.free')}</h3>
        <table className="tbl">
          <thead><tr><th>{t('col.name')}</th><th>{t('col.nat')}</th><th className="num">{t('scout.judgeA')}</th><th className="num">{t('scout.judgeP')}</th><th>{t('scout.kind')}</th><th className="num">{t('col.wage')}</th><th /></tr></thead>
          <tbody>
            {free.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="muted">{s.nation}</td>
                <td className="num">{s.judgeAbility}</td>
                <td className="num">{s.judgePotential}</td>
                <td className="muted">{t(s.analyst ? 'scout.analyst' : 'scout.field')}</td>
                <td className="num">{fmtMoney(s.wage)}</td>
                <td><button className="btn small primary" onClick={() => { hire(world, club, s.id); onChange(); }}>{t('scout.hire')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
