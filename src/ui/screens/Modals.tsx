import type { Fixture, WorldState } from '../../engine/model.ts';
import type { SeasonSummary } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { shortName } from '../bits.tsx';
import { fmtSeason, t } from '../i18n.ts';
import { ResultsList } from './Fixtures.tsx';

export function MatchModal({ world, fx, others, onClose }: { world: WorldState; fx: Fixture; others: Fixture[]; onClose: () => void }) {
  const h = world.clubs[fx.home]!, a = world.clubs[fx.away]!;
  const r = fx.result!;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="muted c">{t('match.fullTime')}</div>
        <div className="score">
          <div className="grid" style={{ justifyItems: 'center' }}><Crest club={h} size={72} /><b>{h.name}</b></div>
          <div className="big">{r.hg} - {r.ag}</div>
          <div className="grid" style={{ justifyItems: 'center' }}><Crest club={a} size={72} /><b>{a.name}</b></div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {([0, 1] as const).map((side) => (
            <div key={side} style={{ textAlign: side ? 'left' : 'right' }}>
              {r.events.filter((e) => e.side === side).map((e, i) => (
                <div key={i}>
                  ⚽ <b>{shortName(world.players[e.playerId]!)}</b> <span className="num">{e.min}'</span>
                  {e.assistId !== undefined && <div className="muted" style={{ fontSize: 11 }}>{t('match.assist', { name: shortName(world.players[e.assistId]!) })}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <h3>{t('match.otherResults')}</h3>
        <ResultsList world={world} fixtures={others.filter((o) => o !== fx)} />
        <button className="btn primary" autoFocus onClick={onClose}>{t('match.continue')}</button>
      </div>
    </div>
  );
}

export function SeasonModal({ world, summary, myPos, onClose }: { world: WorldState; summary: SeasonSummary; myPos: number; onClose: () => void }) {
  const name = (id: number) => world.clubs[id]!.name;
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
        <button className="btn primary" autoFocus onClick={onClose}>{t('season.next', { season: fmtSeason(world.season) })}</button>
      </div>
    </div>
  );
}
