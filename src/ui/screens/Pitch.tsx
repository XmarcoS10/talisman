// Campo della schermata Tattica: gli slot del modulo con titolare, ruolo e adattamento al ruolo.
// Si assegna trascinando (dalla lista o da uno slot all'altro) oppure cliccando slot e poi giocatore.
// Con la tattica a due fasi (FM26) mostra le posizioni con palla o senza palla, coi ruoli di quella fase.
import { isAvailable, slotRating } from '../../engine/match.ts';
import { oopRolesFor, rolesFor, validRole } from '../../engine/match/roles.ts';
import { FORMATIONS, phaseMap } from '../../engine/match/tactics.ts';
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
  /** senza palla: posizioni del modulo senza palla e ruoli senza palla ('' = come con palla) */
  phase?: 'in' | 'out';
}

export function Pitch({ world, club, selected, onSelect, onAssign, onRole, phase = 'in' }: Props) {
  const tac = club.tactic;
  const slots = FORMATIONS[tac.formation];
  const outF = tac.formationOut ?? tac.formation;
  const map = phaseMap(tac.formation, outF);
  const at = (i: number) => (phase === 'out' ? FORMATIONS[outF][map[i]!]! : slots[i]!);
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
            style={{ top: `${(1 - at(i).x / 12) * 100}%`, left: `${(1 - at(i).y / 8) * 100}%` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const pid = Number(e.dataTransfer.getData('text/plain')); if (pid) onAssign(pid, i); }}
          >
            <span className="slot-ring" style={{ '--fit': `${p ? p.condition.fitness / 2 : 0}%`, '--fam': `${p ? (p.positions[slot.pos] ?? 0) * 10 : 0}%` } as React.CSSProperties /* variabili CSS: il tipo non le conosce */}>
            <button
              className={`slot-dot ${p ? fitClass(p.positions[slot.pos]) : ''}`}
              draggable={!!p}
              onDragStart={(e) => p && e.dataTransfer.setData('text/plain', String(p.id))}
              onClick={() => onSelect(i)}
              title={p ? t('tactics.slotTitle', { name: shortName(p), pos: t(`pos.${slot.pos}`), r: Math.round(slotRating(p, slot) / 10), fit: p.condition.fitness }) : t(`pos.${slot.pos}`)}
            >
              {i + 1}
            </button>
            </span>
            <div className="slot-name">{p ? shortName(p) : t(`pos.${slot.pos}`)}</div>
            {/* il nome del ruolo va a capo invece di essere tagliato; sopra c'è la tendina vera, trasparente */}
            {phase === 'in' ? (
              <label className="slot-role">
                <span>{t(`role.${role}`)} ▾</span>
                <select value={role} onChange={(e) => onRole(i, e.target.value)} aria-label={t('tactics.role')}>
                  {rolesFor(slot.pos).map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                </select>
              </label>
            ) : oopRolesFor(at(i).pos).length > 0 && (
              <label className="slot-role out">
                <span>{t(`oop.${tac.rolesOut?.[i] ?? 'same'}`)} ▾</span>
                <select value={tac.rolesOut?.[i] ?? ''} onChange={(e) => onRole(i, e.target.value)} aria-label={t('tactics.roleOut')}>
                  <option value="">{t('oop.same')}</option>
                  {oopRolesFor(at(i).pos).map((r) => <option key={r} value={r}>{t(`oop.${r}`)}</option>)}
                </select>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
