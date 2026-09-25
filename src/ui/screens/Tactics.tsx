import { useState } from 'react';
import { canPlay, familiarityOf, pickXI, slotRating, xiStrength } from '../../engine/match.ts';
import { validRole } from '../../engine/match/roles.ts';
import { FORMATIONS, defaultRoles } from '../../engine/match/tactics.ts';
import { FORMATION_IDS, POSITIONS, type FormationId, type Tactic, type WorldState } from '../../engine/model.ts';
import { PosBadge, Stars, shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { Pitch, fitClass } from './Pitch.tsx';
import { Status } from './Squad.tsx';
import { Takers } from './Takers.tsx';

type Instr = 'pressing' | 'tempo' | 'width' | 'line' | 'directness';
const INSTRUCTIONS: Instr[] = ['pressing', 'tempo', 'width', 'line', 'directness'];

export function Seg({ label, value, options, onChange }: { label: string; value: number; options: string[]; onChange: (v: number) => void }) {
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

  const fam = Math.round(familiarityOf(club));
  const row = (p: (typeof players)[number], slotIdx: number) => (
    <tr key={p.id} className={`clickable ${slotIdx >= 0 ? 'me' : ''}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(p.id))}
      onClick={() => (selected !== null ? assign(p.id, selected) : onPlayer(p.id))}>
      <td className="num muted">{slotIdx >= 0 ? slotIdx + 1 : ''}</td>
      <td>{slotIdx >= 0 ? <PosBadge pos={slots[slotIdx]!.pos} /> : <span className="muted small">{t('tactics.bench')}</span>}</td>
      <td><b>{shortName(p)}</b> <Status p={p} out={club.excluded.includes(p.id)} /></td>
      <td><PosBadge pos={p.position} /></td>
      <td><span className="mini-bar"><span className="meter"><i className={p.condition.fitness < 60 ? 'bad' : p.condition.fitness < 75 ? 'warn' : ''} style={{ width: `${p.condition.fitness}%` }} /></span>{p.condition.fitness}%</span></td>
      <td>{sel ? <span className={fitClass(p.positions[sel.pos])}><Stars world={world} ca={slotRating(p, sel)} /></span> : <Stars world={world} ca={p.ca} />}</td>
    </tr>
  );
  const bench = sorted.filter((p) => !lineup.includes(p.id));

  return (
    <div className="stack">
      <div className="panel tactic-head">
        <label className="field"><span className="caps">{t('tactics.formation')}</span>
          <select value={tac.formation} onChange={(e) => changeFormation(e.target.value as FormationId)}>
            {FORMATION_IDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select></label>
        <div className="field" style={{ flex: 1, minWidth: 200 }} title={t('tactics.familiarityHint')}>
          <span className="row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('tactics.famLabel')}</span><b className="num pos-good">{fam}%</b></span>
          <div className="meter"><i className={fam < 50 ? 'bad' : fam < 75 ? 'warn' : ''} style={{ width: `${fam}%` }} /></div>
        </div>
        <div className="field"><span className="caps">{t('tactics.strength')}</span><Stars world={world} ca={xiStrength(current)} /></div>
        <button className="btn" onClick={() => update(autoPick)}>{t('tactics.auto')}</button>
      </div>

      <div className="grid tactics">
        <div className="stack">
          <Pitch world={world} club={club} selected={selected} onSelect={setSelected} onAssign={assign}
            onRole={(i, r) => update(() => { tac.roles = slots.map((s, k) => (k === i ? validRole(r, s.pos) : validRole(tac.roles[k], s.pos))); })} />
          <div className="row muted small"><span className="ring-key fit" /> {t('tactics.ringFit')} <span className="ring-key fam" /> {t('tactics.ringFam')}</div>
          {selRole && <div className="panel"><b className="deal-h">{t(`role.${selRole}`)}</b><span className="muted">{t(`role.${selRole}.desc`)}</span></div>}
          {warnings.length > 0 && <div className="panel warn">{t('tactics.unavailable', { names: warnings.map((p) => shortName(p!)).join(', ') })}</div>}
        </div>

        <div className="stack">
          <div className="panel">
            <h2>{t('tactics.instructions')}</h2>
            <Seg label={t('tactics.mentality')} value={tac.mentality - 1} options={[1, 2, 3, 4, 5].map((m) => t(`mentality.${m}`))} onChange={(v) => setTactic('mentality', v + 1)} />
            {INSTRUCTIONS.map((k) => (
              <Seg key={k} label={t(`instr.${k}`)} value={tac[k]} options={[0, 1, 2].map((v) => t(`instr.${k}.${v}`))} onChange={(v) => setTactic(k, v)} />
            ))}
          </div>
          <Takers world={world} tactic={tac} playerIds={club.playerIds} onChange={onChange} />
          <div className="panel">
            <h2>{sel ? t('tactics.candidates', { pos: t(`pos.${sel.pos}`) }) : t('tactics.squadTitle')}</h2>
            <div className="muted small">{t('tactics.hint')}</div>
            <table>
              <thead><tr><th>#</th><th>{t('tactics.slot')}</th><th>{t('col.name')}</th><th>{t('tactics.natural')}</th><th>{t('col.fitness')}</th><th>{sel ? t('tactics.inRole') : t('col.ability')}</th></tr></thead>
              <tbody>
                {!sel && lineup.map((id, i) => (id != null && world.players[id] ? row(world.players[id]!, i) : null))}
                {!sel && <tr className="sep"><td colSpan={6}>{t('tactics.reserves', { n: bench.length })}</td></tr>}
                {(sel ? sorted : bench).map((p) => row(p, lineup.indexOf(p.id)))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}