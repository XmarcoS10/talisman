// Istruzioni individuali (Blocco 2b, intervento 10) del giocatore selezionato in Tattica: tiro, ampiezza, inserimenti,
// resta dietro, marcatura stretta su un ruolo avversario. Valgono per tutte le partite finché non si cambiano.
import { POSITIONS, type PlayerInstr, type Tactic, type WorldState } from '../../engine/model.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { Seg } from './Tactics.tsx';

const SCALES = ['shoot', 'width', 'runs'] as const;

export function PlayerInstructions({ world, tactic, playerId, onChange }: { world: WorldState; tactic: Tactic; playerId: number; onChange: () => void }) {
  const p = world.players[playerId];
  if (!p) return null;
  const ins: PlayerInstr = tactic.players?.[playerId] ?? {};
  const set = (patch: Partial<PlayerInstr>) => {
    tactic.players = { ...tactic.players, [playerId]: { ...ins, ...patch } };
    onChange();
  };
  return (
    <div className="panel">
      <h2>{t('ins.title', { name: shortName(p) })}</h2>
      {SCALES.map((k) => (
        <Seg key={k} label={t(`ins.${k}`)} value={ins[k] ?? 1} options={[0, 1, 2].map((v) => t(`ins.${k}.${v}`))} onChange={(v) => set({ [k]: v })} />
      ))}
      <Seg label={t('ins.stayBack')} value={ins.stayBack ? 1 : 0} options={[t('ins.no'), t('ins.yes')]} onChange={(v) => set({ stayBack: v === 1 })} />
      <label className="seg-row">
        <span className="muted">{t('ins.mark')}</span>
        {/* as: il valore viene dalle opzioni qui sotto, che sono tutte posizioni */}
        <select value={ins.mark ?? ''} onChange={(e) => set({ mark: (e.target.value || undefined) as PlayerInstr['mark'] })}>
          <option value="">{t('ins.mark.none')}</option>
          {POSITIONS.filter((pos) => pos !== 'GK').map((pos) => <option key={pos} value={pos}>{t(`pos.${pos}`)}</option>)}
        </select>
      </label>
    </div>
  );
}
