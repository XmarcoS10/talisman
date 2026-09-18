import type { WorldState } from '../../engine/model.ts';
import { standings } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { fmtMoney, t } from '../i18n.ts';
import { Squad } from './Squad.tsx';

export function ClubView({ world, clubId, onPlayer, onBack }: { world: WorldState; clubId: number; onPlayer: (id: number) => void; onBack: () => void }) {
  const club = world.clubs[clubId]!;
  const comp = world.competitions[club.compId]!;
  const pos = standings(world, comp).findIndex((r) => r.clubId === clubId) + 1;
  const titles = world.history.filter((h) => h.championId === clubId);
  return (
    <div className="grid">
      <div className="row"><button className="btn" onClick={onBack}>← {t('player.back')}</button></div>
      <div className="panel row" style={{ gap: 'var(--s-4)' }}>
        <Crest club={club} size={72} />
        <div style={{ flex: 1 }}>
          <h1>{club.name}</h1>
          <div className="muted">{t('club.info', { city: club.city, founded: club.founded, stadium: club.stadium.name, cap: club.stadium.capacity.toLocaleString('it-IT') })}</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'auto auto', gap: 'var(--s-1) var(--s-3)' }}>
          <span className="muted">{comp.name}</span><b className="num">{pos}°</b>
          <span className="muted">{t('start.reputation')}</span><b className="num">{club.reputation}</b>
          <span className="muted">{t('tactics.formation')}</span><b className="num">{club.tactic.formation}</b>
          <span className="muted">{t('top.balance')}</span><b className="num">{fmtMoney(club.balance)}</b>
          {titles.length > 0 && <><span className="muted">{t('club.titles')}</span><b className="num">{titles.length}</b></>}
        </div>
      </div>
      <Squad world={world} clubId={clubId} onPlayer={onPlayer} title={t('club.squad')} />
    </div>
  );
}
