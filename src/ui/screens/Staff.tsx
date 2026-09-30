// Staff (0.8.x): vice allenatore, preparatore atletico e medico del club, ognuno col suo effetto, e i candidati liberi
// da assumere al loro posto. Gli osservatori restano nella loro schermata.
import { HeartPulse, UserCog, Users } from 'lucide-react';
import { STAFF } from '../../engine/balance.ts';
import type { StaffMember, StaffRole, WorldState } from '../../engine/model.ts';
import { hireStaff, STAFF_ROLES, staffOf, staffWages } from '../../engine/staff.ts';
import { fmtMoney, natName, t } from '../i18n.ts';

const ICON = { assistant: Users, fitness: UserCog, physio: HeartPulse } as const;

/** l'effetto di un membro dello staff rispetto a uno medio, in parole */
function effect(m: StaffMember): string {
  const e = (m.skill - 10) / 10;
  const n = Math.round((m.role === 'assistant' ? STAFF.assistantMorale : 100 * (m.role === 'physio' ? STAFF.physioHeal : STAFF.fitnessInjury)) * Math.abs(e));
  if (n === 0) return t('staff.fx.none');
  const better = e > 0;
  return t(`staff.fx.${m.role}.${better ? 'good' : 'bad'}`, { n });
}

function Row({ m, onHire }: { m: StaffMember; onHire?: () => void }) {
  return (
    <div className="staff-row">
      <span><b>{m.name}</b><small className="muted">{natName(m.nation)}</small></span>
      <span className="staff-skill"><div className="meter"><i className={m.skill < 8 ? 'bad' : m.skill < 12 ? 'warn' : ''} style={{ width: `${m.skill * 5}%` }} /></div><b className="num">{m.skill}</b></span>
      <span className="small">{effect(m)}</span>
      <span className="num small muted">{t('staff.wage', { v: fmtMoney(m.wage) })}</span>
      {onHire ? <button className="btn" onClick={onHire}>{t('staff.hire')}</button> : <span className="tag">{t('staff.current')}</span>}
    </div>
  );
}

export function Staff({ world, onChange }: { world: WorldState; onChange: () => void }) {
  const me = world.manager.clubId;
  const free = (role: StaffRole) => Object.values(world.staff).filter((m) => m.clubId === null && m.role === role).sort((a, b) => b.skill - a.skill);
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">{t('staff.intro')}</span>
        <span className="pill num">{t('staff.total', { v: fmtMoney(staffWages(world, me)) })}</span>
      </div>
      {STAFF_ROLES.map((role) => {
        const Icon = ICON[role];
        const cur = staffOf(world, me, role);
        return (
          <div key={role} className="panel">
            <h2><Icon size={18} /> {t(`staff.role.${role}`)}</h2>
            <span className="muted small">{t(`staff.what.${role}`)}</span>
            {cur && <Row m={cur} />}
            <span className="caps">{t('staff.candidates')}</span>
            {free(role).map((m) => <Row key={m.id} m={m} onHire={() => { hireStaff(world, m.id); onChange(); }} />)}
          </div>
        );
      })}
    </div>
  );
}
