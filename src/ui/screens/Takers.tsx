// Battitori dei piazzati (Blocco 2b, intervento 8): corner, punizioni e rigori. "Automatico" = batte il migliore in
// campo per quel fondamentale; un battitore scelto che non è in campo viene sostituito allo stesso modo.
import type { Player, Tactic, WorldState } from '../../engine/model.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

type Kind = keyof NonNullable<Tactic['takers']>;
const KINDS: { kind: Kind; skill: (p: Player) => number }[] = [
  { kind: 'corners', skill: (p) => p.attrs.corners },
  { kind: 'freeKicks', skill: (p) => p.attrs.freeKicks },
  { kind: 'penalties', skill: (p) => p.attrs.penalties },
];

export function Takers({ world, tactic, playerIds, onChange }: { world: WorldState; tactic: Tactic; playerIds: number[]; onChange: () => void }) {
  const players = playerIds.map((id) => world.players[id]!).filter((p) => p.position !== 'GK');
  const set = (kind: Kind, id: number | undefined) => {
    const next = { ...tactic.takers };
    if (id === undefined) delete next[kind]; else next[kind] = id;
    tactic.takers = next;
    onChange();
  };
  return (
    <div className="panel">
      <h2>{t('tactics.takers')}</h2>
      {KINDS.map(({ kind, skill }) => (
        <label key={kind} className="seg-row">
          <span className="muted">{t(`tactics.takers.${kind}`)}</span>
          <select value={tactic.takers?.[kind] ?? ''} onChange={(e) => set(kind, e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">{t('tactics.takers.auto')}</option>
            {[...players].sort((a, b) => skill(b) - skill(a)).map((p) => <option key={p.id} value={p.id}>{shortName(p)} · {skill(p)}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
