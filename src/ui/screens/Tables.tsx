import { useState } from 'react';
import type { CompId, WorldState } from '../../engine/model.ts';
import { standings, topScorers } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

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
        <tr>
          <th className="r">#</th><th>{t('col.club')}</th><th className="r">{t('col.p')}</th>
          {!compact && <><th className="r">{t('col.w')}</th><th className="r">{t('col.d')}</th><th className="r">{t('col.l')}</th><th className="r">{t('col.gf')}</th><th className="r">{t('col.ga')}</th></>}
          <th className="r">{t('col.gd')}</th><th className="r">{t('col.pts')}</th>
        </tr>
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
              {!compact && <><td className="r num">{r.w}</td><td className="r num">{r.d}</td><td className="r num">{r.l}</td><td className="r num">{r.gf}</td><td className="r num">{r.ga}</td></>}
              <td className="r num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
              <td className="r num"><b>{r.pts}</b></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Tables({ world, clubId, onPlayer, onClub }: { world: WorldState; clubId: number; onPlayer: (id: number) => void; onClub: (id: number) => void }) {
  const comps = Object.values(world.competitions).sort((a, b) => a.level - b.level);
  const [compId, setCompId] = useState(world.clubs[clubId]!.compId);
  const comp = world.competitions[compId]!;
  return (
    <div className="grid">
      <div className="tabs">
        {comps.map((c) => <button key={c.id} className={c.id === compId ? 'active' : ''} onClick={() => setCompId(c.id)}>{c.name}</button>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
        <div className="panel">
          <LeagueTable world={world} compId={compId} highlight={clubId} onClub={onClub} />
          <div className="row muted" style={{ fontSize: 11 }}>
            {comp.promote > 0 && <span className="pos-good">▌ {t('tables.promotion')}</span>}
            {comp.relegate > 0 && <span className="pos-bad">▌ {t('tables.relegation')}</span>}
          </div>
        </div>
        <div className="panel">
          <h3>{t('tables.scorers')}</h3>
          <table>
            <tbody>
              {topScorers(world, comp).map((p, i) => (
                <tr key={p.id} className="clickable" onClick={() => onPlayer(p.id)}>
                  <td className="r num muted">{i + 1}</td>
                  <td>{shortName(p)}</td>
                  <td className="muted">{world.clubs[p.clubId!]!.shortName}</td>
                  <td className="r num"><b>{p.stats.goals}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
