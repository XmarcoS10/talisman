import type { WorldState } from '../../engine/model.ts';
import type { SeasonSummary } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { fmtSeason, t } from '../i18n.ts';

export function SeasonModal({ world, summary, myPos, onClose, onQuit }: { world: WorldState; summary: SeasonSummary; myPos: number; onClose: () => void; onQuit: () => void }) {
  const name = (id: number) => world.clubs[id]!.name;
  const board = world.manager.board;
  return (
    <div className="overlay">
      <div className="modal">
        <h1>{t('season.title', { season: fmtSeason(summary.season) })}</h1>
        {Object.entries(summary.champions).map(([compId, clubId]) => (
          <div key={compId} className="row">
            <Crest club={world.clubs[clubId]!} size={40} />
            <div><div className="muted">{world.competitions[compId]!.name}</div><b>{t('season.champion', { club: name(clubId) })}</b></div>
          </div>
        ))}
        <div className="panel">
          <div><span className="pos-good">▲ {t('season.promoted')}:</span> {summary.promoted.map(name).join(', ')}</div>
          <div><span className="pos-bad">▼ {t('season.relegated')}:</span> {summary.relegated.map(name).join(', ')}</div>
        </div>
        <div>{t('season.yourPos', { club: name(world.manager.clubId), pos: myPos })}</div>
        <div className="muted">{t('season.retired', { n: summary.retired })}</div>
        <div className={`banner ${board.sacked ? 'warn' : ''}`}>
          {t(board.sacked ? 'season.sacked' : 'season.boardTrust', { trust: Math.round(board.trust.board) })}
        </div>
        {board.sacked
          ? <button className="btn primary" autoFocus onClick={onQuit}>{t('season.toMenu')}</button>
          : <button className="btn primary" autoFocus onClick={onClose}>{t('season.next', { season: fmtSeason(world.season) })}</button>}
      </div>
    </div>
  );
}
