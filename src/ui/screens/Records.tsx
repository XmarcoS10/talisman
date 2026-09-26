// Record e storia (0.3.0): il club, la carriera dell'allenatore, i giocatori della rosa e l'albo d'oro.
import { useState } from 'react';
import { BookOpen, Trophy } from 'lucide-react';
import type { Player, WorldState } from '../../engine/model.ts';
import { fmtSeason, t } from '../i18n.ts';
import { ClubRecordsPanel, cupLabel } from './RecordsParts.tsx';

type Tab = 'club' | 'manager' | 'players' | 'roll';

/** totali di carriera di un giocatore: storia più stagione in corso (derivati, non salvati) */
export function careerOf(p: Player) {
  const seasons = [...p.history.map((h) => ({ season: h.season, goals: h.goals, apps: h.apps })), { season: -1, goals: p.stats.goals, apps: p.stats.apps }];
  const best = seasons.reduce((b, s) => (s.goals > b.goals ? s : b), { season: -1, goals: 0, apps: 0 });
  return { apps: seasons.reduce((s, x) => s + x.apps, 0), goals: seasons.reduce((s, x) => s + x.goals, 0), best };
}

function Manager({ world }: { world: WorldState }) {
  const rows = [...world.manager.seasons].reverse();
  return (
    <div className="panel">
      <h2><BookOpen size={18} /> {t('rec.managerTitle', { name: world.manager.name })}</h2>
      {rows.length === 0 && <span className="muted">{t('rec.afterSeason')}</span>}
      <table>
        <thead><tr><th>{t('rec.season')}</th><th>{t('col.club')}</th><th>{t('rec.league')}</th><th className="r">{t('rec.finish')}</th><th className="r">{t('col.pts')}</th><th className="r">{t('rec.cup')}</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.season}>
              <td className="num">{fmtSeason(s.season)}</td>
              <td>{world.clubs[s.clubId]?.name ?? '—'}{s.sacked && <span className="tag dim"> {t('rec.sacked')}</span>}</td>
              <td>{s.compId ? world.competitions[s.compId]?.name ?? s.compId : '—'}</td>
              <td className="num r"><b>{t('rec.pos', { n: s.pos })}</b></td>
              <td className="num r">{s.pts ?? '—'}</td>
              <td className="r">{cupLabel(s.cup)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Players({ world, onPlayer }: { world: WorldState; onPlayer: (id: number) => void }) {
  const rows = world.clubs[world.manager.clubId]!.playerIds.map((id) => world.players[id]!).map((p) => ({ p, c: careerOf(p) }))
    .sort((a, b) => b.c.goals - a.c.goals || b.c.apps - a.c.apps);
  return (
    <div className="panel">
      <h2>{t('rec.playersTitle')}</h2>
      <table>
        <thead><tr><th>{t('rec.player')}</th><th className="r">{t('col.apps')}</th><th className="r">{t('col.goals')}</th><th className="r">{t('rec.bestSeason')}</th><th className="r">{t('rec.caps')}</th></tr></thead>
        <tbody>
          {rows.map(({ p, c }) => (
            <tr key={p.id} className="clickable" onClick={() => onPlayer(p.id)}>
              <td>{p.firstName} {p.lastName}</td>
              <td className="num r">{c.apps}</td>
              <td className="num r"><b>{c.goals}</b></td>
              <td className="num r">{c.best.goals > 0 ? t('rec.bestGoals', { n: c.best.goals, s: c.best.season < 0 ? fmtSeason(world.season) : fmtSeason(c.best.season) }) : '—'}</td>
              <td className="num r">{p.intl.caps}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="muted small">{t('rec.playersHint')}</span>
    </div>
  );
}

function Roll({ world }: { world: WorldState }) {
  const comps = Object.values(world.competitions).sort((a, b) => a.level - b.level);
  return (
    <div className="cols2">
      {comps.map((c) => {
        const rows = world.history.filter((h) => h.compId === c.id).reverse();
        return (
          <div key={c.id} className="panel">
            <h2><Trophy size={16} /> {c.name}</h2>
            {rows.length === 0 && <span className="muted">{t('rec.afterSeason')}</span>}
            <table>
              <tbody>
                {rows.map((h) => {
                  const top = h.topScorer && world.players[h.topScorer.playerId];
                  return (
                    <tr key={h.season}>
                      <td className="num muted">{fmtSeason(h.season)}</td>
                      <td><b>{world.clubs[h.championId]?.name ?? '—'}</b></td>
                      <td className="small muted">{h.topScorer ? t('rec.topScorer', { name: top ? `${top.firstName} ${top.lastName}` : '—', n: h.topScorer.goals }) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="panel">
        <h2><Trophy size={16} /> {t('rec.cupRoll')}</h2>
        {world.cupWinners.length === 0 && <span className="muted">{t('rec.afterSeason')}</span>}
        {[...world.cupWinners].reverse().map((c) => <div key={c.season} className="row"><span className="num muted">{fmtSeason(c.season)}</span> <b>{world.clubs[c.clubId]?.name ?? '—'}</b></div>)}
      </div>
    </div>
  );
}

export function Records({ world, onPlayer }: { world: WorldState; onPlayer: (id: number) => void }) {
  const [tab, setTab] = useState<Tab>('club');
  const tabs: [Tab, string][] = [['club', t('rec.tabClub')], ['manager', t('rec.tabManager')], ['players', t('rec.tabPlayers')], ['roll', t('rec.tabRoll')]];
  return (
    <div className="grid">
      <div className="seg-tabs">
        {tabs.map(([k, label]) => <button key={k} className={tab === k ? 'active hot' : ''} onClick={() => setTab(k)}>{label}</button>)}
      </div>
      {tab === 'club' && <ClubRecordsPanel world={world} clubId={world.manager.clubId} onPlayer={onPlayer} />}
      {tab === 'manager' && <Manager world={world} />}
      {tab === 'players' && <Players world={world} onPlayer={onPlayer} />}
      {tab === 'roll' && <Roll world={world} />}
    </div>
  );
}
