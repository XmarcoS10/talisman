// Campo della schermata Tattica: gli slot del modulo con titolare, ruolo e adattamento al ruolo.
// Si assegna trascinando (dalla lista o da uno slot all'altro) oppure cliccando slot e poi giocatore.
import { isAvailable, slotRating } from '../../engine/match.ts';
import { rolesFor, validRole } from '../../engine/match/roles.ts';
import { FORMATIONS } from '../../engine/match/tactics.ts';
import type { Club, WorldState } from '../../engine/model.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

/** colore di adattamento: ruolo naturale, adattabile, fuori ruolo */
export function fitClass(fam: number | undefined) {
  return (fam ?? 0) >= 5 ? 'fit-good' : (fam ?? 0) >= 3 ? 'fit-mid' : 'fit-bad';
}

interface Props {
  world: WorldState;
  club: Club;
  selected: number | null;
  onSelect: (i: number) => void;
  onAssign: (playerId: number, slot: number) => void;
  onRole: (slot: number, role: string) => void;
}

export function Pitch({ world, club, selected, onSelect, onAssign, onRole }: Props) {
  const slots = FORMATIONS[club.tactic.formation];
  return (
    <div className="pitch" aria-label={t('tactics.pitch')}>
      <div className="pitch-lines" aria-hidden />
      {slots.map((slot, i) => {
        const id = club.lineup?.[i];
        const p = id != null ? world.players[id] : undefined;
        const role = validRole(club.tactic.roles[i], slot.pos);
        const bad = p && !isAvailable(p);
        return (
          <div
            key={i}
            className={`slot ${selected === i ? 'selected' : ''} ${bad ? 'unavailable' : ''}`}
            style={{ top: `${(1 - slot.x / 12) * 100}%`, left: `${(1 - slot.y / 8) * 100}%` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const pid = Number(e.dataTransfer.getData('text/plain')); if (pid) onAssign(pid, i); }}
          >
            <button
              className={`slot-dot ${p ? fitClass(p.positions[slot.pos]) : ''}`}
              draggable={!!p}
              onDragStart={(e) => p && e.dataTransfer.setData('text/plain', String(p.id))}
              onClick={() => onSelect(i)}
              title={p ? `${shortName(p)} · ${t(`pos.${slot.pos}`)}` : t(`pos.${slot.pos}`)}
            >
              {p ? Math.round(slotRating(p, slot) / 10) : '?'}
            </button>
            <div className="slot-name">{p ? shortName(p) : t(`pos.${slot.pos}`)}</div>
            <select className="slot-role" value={role} onChange={(e) => onRole(i, e.target.value)} aria-label={t('tactics.role')}>
              {rolesFor(slot.pos).map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}
