// Colonna destra delle classifiche: marcatori, assist, media voto, disciplina.
import type { Competition, Player, WorldState } from '../../engine/model.ts';
import { t } from '../i18n.ts';
import { avgRating, cards, goalsPerGame, leaders } from '../league.ts';

interface Props { world: WorldState; comp: Competition; onPlayer: (id: number) => void; name: (p: Player) => string }

export function LeagueSide({ world, comp, onPlayer, name }: Props) {
  const club = (p: Player) => world.clubs[p.clubId!]!.name;
  const scorers = leaders(world, comp, (p) => p.stats.goals, 5);
  const assists = leaders(world, comp, (p) => p.stats.assists, 3);
  const played = Math.max(0, ...comp.clubIds.map((id) => world.clubs[id]!.playerIds.reduce((m, pid) => Math.max(m, world.players[pid]!.stats.apps), 0)));
  const rated = leaders(world, comp, avgRating, 3, (p) => p.stats.apps >= Math.max(1, Math.ceil(played / 2)));
  const cc = [...cards(world, comp)].map(([id, [y, r]]) => ({ id, y, r, score: y + 3 * r }));
  cc.sort((a, b) => a.score - b.score);
  const clean = cc[0], dirty = cc.at(-1);
  const pens = comp.fixtures.reduce((s, f) => s + (f.result?.events.filter((e) => e.type === 'penGoal' || e.type === 'penMiss').length ?? 0), 0);

  return (
    <div className="stack">
      <div className="panel">
        <h2>{t('tables.scorers')}</h2>
        {scorers.length === 0 && <span className="muted">{t('tables.none')}</span>}
        {scorers.map((p, i) => (
          <button key={p.id} className="leader" onClick={() => onPlayer(p.id)}>
            <span className="num muted">{i + 1}</span>
            <span><b>{name(p)}</b><small>{club(p)}</small></span>
            <span className="num big-num">{p.stats.goals}</span>
          </button>
        ))}
      </div>
      <div className="panel">
        <h2>{t('tables.assists')}</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {assists.map((p) => (
            <button key={p.id} className="leader-card" onClick={() => onPlayer(p.id)}>
              <b>{name(p)}</b><small>{club(p)}</small><span className="big-num num">{p.stats.assists}</span><small>{t('tables.assistTot')}</small>
            </button>
          ))}
        </div>
        {assists.length === 0 && <span className="muted">{t('tables.none')}</span>}
      </div>
      <div className="panel">
        <h2>{t('tables.ratings')}</h2>
        {rated.map((p, i) => (
          <button key={p.id} className="leader" onClick={() => onPlayer(p.id)}>
            <span className="num muted">{i + 1}</span>
            <span><b>{name(p)}</b><small>{club(p)}</small></span>
            <span className="meter" style={{ width: 70 }}><i style={{ width: `${(avgRating(p) - 5) / 4 * 100}%` }} /></span>
            <span className="tag num">{avgRating(p).toFixed(2)}</span>
          </button>
        ))}
        {rated.length === 0 && <span className="muted">{t('tables.none')}</span>}
      </div>
      <div className="panel">
        <h2>{t('tables.discipline')}</h2>
        {clean && dirty && (
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="mini-card"><span className="caps">{t('tables.fairest')}</span><b>{world.clubs[clean.id]!.name}</b>
              <small className="num">{t('tables.cards', { y: clean.y, r: clean.r })}</small></div>
            <div className="mini-card"><span className="caps">{t('tables.dirtiest')}</span><b>{world.clubs[dirty.id]!.name}</b>
              <small className="num pos-bad">{t('tables.cards', { y: dirty.y, r: dirty.r })}</small></div>
          </div>
        )}
        <div className="row muted small" style={{ justifyContent: 'space-between' }}>
          <span>{t('tables.gpg')} <b className="num">{goalsPerGame(comp).toFixed(2)}</b></span>
          <span>{t('tables.pens')} <b className="num">{pens}</b></span>
        </div>
      </div>
    </div>
  );
}
