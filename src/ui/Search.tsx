// Ricerca globale di giocatori e club (tasto "/").
import { forwardRef, useState } from 'react';
import type { WorldState } from '../engine/model.ts';
import { Crest } from './Crest.tsx';
import { PosBadge, fullName } from './bits.tsx';
import { t } from './i18n.ts';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface Props { world: WorldState; onPlayer: (id: number) => void; onClub: (id: number) => void }

export const Search = forwardRef<HTMLInputElement, Props>(function Search({ world, onPlayer, onClub }, ref) {
  const [q, setQ] = useState('');
  const query = norm(q.trim());
  const clubs = query.length < 2 ? [] : Object.values(world.clubs).filter((c) => norm(c.name).includes(query)).slice(0, 4);
  const players = query.length < 2 ? [] : Object.values(world.players).filter((p) => norm(fullName(p)).includes(query)).slice(0, 8);
  const pick = (f: () => void) => { f(); setQ(''); };

  return (
    <div className="search">
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} aria-label={t('search.placeholder')}
        onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur(); } }} />
      {(clubs.length > 0 || players.length > 0) && (
        <div className="search-results">
          {clubs.map((c) => (
            <button key={`c${c.id}`} onClick={() => pick(() => onClub(c.id))}><Crest club={c} size={18} /> {c.name}</button>
          ))}
          {players.map((p) => (
            <button key={p.id} onClick={() => pick(() => onPlayer(p.id))}>
              <PosBadge pos={p.position} /> {fullName(p)} <span className="muted">{p.clubId !== null ? world.clubs[p.clubId]?.shortName : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
