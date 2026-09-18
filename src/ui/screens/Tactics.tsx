import { useState } from 'react';
import { canPlay, familiarityOf, pickXI, slotRating, xiStrength } from '../../engine/match.ts';
import { validRole } from '../../engine/match/roles.ts';
import { FORMATIONS, defaultRoles } from '../../engine/match/tactics.ts';
import { FORMATION_IDS, POSITIONS, type FormationId, type Tactic, type WorldState } from '../../engine/model.ts';
import { PosBadge, Stars, shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { Pitch, fitClass } from './Pitch.tsx';
import { Status } from './Squad.tsx';

type Instr = 'pressing' | 'tempo' | 'width' | 'line' | 'directness';
const INSTRUCTIONS: Instr[] = ['pressing', 'tempo', 'width', 'line', 'directness'];

function Seg({ label, value, options, onChange }: { label: string; value: number; options: string[]; onChange: (v: number) => void }) {
  return (
    <div className="seg-row">
      <span className="muted">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o, i) => (
          <button key={i} role="radio" aria-checked={value === i} className={value === i ? 'active' : ''} onClick={() => onChange(i)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export function Tactics({ world, onChange, onPlayer }: { world: WorldState; onChange: () => void; onPlayer: (id: number) => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const tac = club.tactic;
  const slots = FORMATIONS[tac.formation];
  const autoPick = () => { club.lineup = pickXI(world, club).map((e) => e.player.id); };
  if (club.lineup?.length !== slots.length) autoPick(); // prima apertura o modulo cambiato altrove
  const lineup = club.lineup!;
  const [selected, setSelected] = useState<number | null>(null);

  const update = (f: () => void) => { f(); onChange(); };
  const setTactic = <K extends keyof Tactic>(k: K, v: Tactic[K]) => update(() => { tac[k] = v; });
  const assign = (pid: number, i: number) => update(() => {
    const j = lineup.indexOf(pid);
    if (j >= 0) lineup[j] = lineup[i] ?? null; // era già titolare: scambio
    lineup[i] = pid;
  });
  const changeFormation = (f: FormationId) => update(() => { tac.formation = f; tac.roles = defaultRoles(f); autoPick(); });

  const sel = selected !== null ? slots[selected] : undefined;
  const players = club.playerIds.map((id) => world.players[id]!);
  const sorted = sel
    ? [...players].sort((a, b) => slotRating(b, sel) - slotRating(a, sel))
    : [...players].sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.ca - a.ca);
  const current = pickXI(world, club, tac.formation, lineup);
  const warnings = lineup.map((id) => (id != null ? world.players[id] : undefined)).filter((p) => p && !canPlay(club, p));
  const selRole = selected !== null && sel ? validRole(tac.roles[selected], sel.pos) : null;

  return (
    <div className="grid tactics">
      <div className="grid" style={{ alignContent: 'start' }}>
        <div className="panel row" style={{ justifyContent: 'space-between' }}>
          <label className="row">
            <span className="muted">{t('tactics.formation')}</span>
            <select value={tac.formation} onChange={(e) => changeFormation(e.target.value as FormationId)}>
              {FORMATION_IDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <span className="muted">{t('tactics.strength')} <b className="num">{Math.round(xiStrength(current))}</b></span>
          <span className="muted" title={t('tactics.familiarityHint')}>{t('tactics.familiarity', { v: Math.round(familiarityOf(club)) })}</span>
          <button className="btn" onClick={() => update(autoPick)}>{t('tactics.auto')}</button>
        </div>
        <Pitch world={world} club={club} selected={selected} onSelect={setSelected} onAssign={assign}
          onRole={(i, r) => update(() => { tac.roles = slots.map((s, k) => (k === i ? validRole(r, s.pos) : validRole(tac.roles[k], s.pos))); })} />
        {selRole && <div className="panel"><b>{t(`role.${selRole}`)}</b><span className="muted">{t(`role.${selRole}.desc`)}</span></div>}
        {warnings.length > 0 && <div className="panel warn">{t('tactics.unavailable', { names: warnings.map((p) => shortName(p!)).join(', ') })}</div>}
      </div>

      <div className="grid" style={{ alignContent: 'start' }}>
        <div className="panel">
          <h3>{t('tactics.instructions')}</h3>
          <Seg label={t('tactics.mentality')} value={tac.mentality - 1} options={[1, 2, 3, 4, 5].map((m) => t(`mentality.${m}`))} onChange={(v) => setTactic('mentality', v + 1)} />
          {INSTRUCTIONS.map((k) => (
            <Seg key={k} label={t(`instr.${k}`)} value={tac[k]} options={[0, 1, 2].map((v) => t(`instr.${k}.${v}`))} onChange={(v) => setTactic(k, v)} />
          ))}
        </div>
        <div className="panel">
          <h3>{sel ? t('tactics.candidates', { pos: t(`pos.${sel.pos}`) }) : t('tactics.squad')}</h3>
          <div className="muted" style={{ fontSize: 11 }}>{t('tactics.hint')}</div>
          <table>
            <tbody>
              {sorted.map((p) => {
                const slotIdx = lineup.indexOf(p.id);
                return (
                  <tr key={p.id} className={`clickable ${slotIdx >= 0 ? 'me' : ''}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(p.id))}
                    onClick={() => (selected !== null ? assign(p.id, selected) : onPlayer(p.id))}>
                    <td><PosBadge pos={p.position} /></td>
                    <td>{shortName(p)} <Status p={p} out={club.excluded.includes(p.id)} /></td>
                    <td className="num muted">{p.condition.fitness}%</td>
                    <td>{sel ? <span className={fitClass(p.positions[sel.pos])}><Stars ca={slotRating(p, sel)} /></span> : <Stars ca={p.ca} />}</td>
                    <td className="muted">{slotIdx >= 0 ? t(`pos.${slots[slotIdx]!.pos}`) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}