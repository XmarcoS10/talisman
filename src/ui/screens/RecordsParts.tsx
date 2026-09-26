// Pezzi della schermata Record: il pannello di un club (usato anche nella scheda degli altri club) e la riga di coppa.
import { Medal, Trophy } from 'lucide-react';
import type { ClubId, Legend, ManagerSeason, MatchRecord, WorldState } from '../../engine/model.ts';
import { emptyRecords } from '../../engine/records.ts';
import { fmtSeason, t } from '../i18n.ts';

export const cupLabel = (c: ManagerSeason['cup']) => {
  if (!c) return '—';
  if (c.won) return t('rec.cupWon');
  const left = c.of - c.round;
  return t(left === 1 ? 'cup.final' : left === 2 ? 'cup.semi' : left === 3 ? 'cup.quarter' : 'cup.round', { n: c.round + 1 });
};

function Match({ world, label, m }: { world: WorldState; label: string; m: MatchRecord | null }) {
  return (
    <div className="mini-card">
      <span className="caps">{label}</span>
      {m ? <><b className="num">{m.gf}-{m.ga}</b>
        <span className="small">{t(m.home ? 'rec.vsHome' : 'rec.vsAway', { club: world.clubs[m.opp]?.name ?? '—' })} · {fmtSeason(m.season)}</span></>
        : <span className="muted small">{t('rec.none')}</span>}
    </div>
  );
}

function Legends({ title, list, key_, onPlayer, world }: { title: string; list: Legend[]; key_: 'goals' | 'apps'; onPlayer: (id: number) => void; world: WorldState }) {
  return (
    <div>
      <h3>{title}</h3>
      {list.length === 0 && <span className="muted small">{t('rec.afterSeason')}</span>}
      <table>
        <tbody>
          {list.map((l, i) => (
            <tr key={l.playerId}>
              <td className="num muted">{i + 1}</td>
              <td>{world.players[l.playerId] ? <a onClick={() => onPlayer(l.playerId)}>{l.name}</a> : <span className="muted">{l.name}</span>}</td>
              <td className="num r"><b>{l[key_]}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** i record di un club: sono risultati, non valori dei giocatori, quindi si mostrano anche per i club altrui (§7.6) */
export function ClubRecordsPanel({ world, clubId, onPlayer }: { world: WorldState; clubId: ClubId; onPlayer: (id: number) => void }) {
  const r = world.records[clubId] ?? emptyRecords();
  const titles = world.history.filter((h) => h.championId === clubId);
  const cups = world.cupWinners.filter((c) => c.clubId === clubId);
  return (
    <div className="panel">
      <h2><Medal size={18} /> {t('rec.clubTitle')}</h2>
      <div className="kpis">
        <div className="kpi"><span className="caps">{t('rec.titles')}</span><b className="num"><Trophy size={14} /> {titles.length}</b>
          <span className="small muted">{titles.map((h) => `${world.competitions[h.compId]?.name ?? h.compId} ${fmtSeason(h.season)}`).join(' · ')}</span></div>
        <div className="kpi"><span className="caps">{t('rec.cups')}</span><b className="num">{cups.length}</b>
          <span className="small muted">{cups.map((c) => fmtSeason(c.season)).join(' · ')}</span></div>
        <div className="kpi"><span className="caps">{t('rec.best')}</span>
          {r.best ? <><b className="num">{t('rec.pos', { n: r.best.pos })}</b>
            <span className="small muted">{world.competitions[r.best.compId]?.name ?? r.best.compId} {fmtSeason(r.best.season)} · {t('rec.pts', { n: r.best.pts })}</span></>
            : <span className="muted small">{t('rec.none')}</span>}</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Match world={world} label={t('rec.bigWin')} m={r.bigWin} />
        <Match world={world} label={t('rec.bigLoss')} m={r.bigLoss} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Legends world={world} title={t('rec.scorers')} list={r.scorers} key_="goals" onPlayer={onPlayer} />
        <Legends world={world} title={t('rec.apps')} list={r.apps} key_="apps" onPlayer={onPlayer} />
      </div>
      <span className="muted small">{t('rec.leagueOnly')}</span>
    </div>
  );
}
