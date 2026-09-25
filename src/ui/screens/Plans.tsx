// Piani partita (GUIDA §6.4, Blocco 2b, intervento 10): fino a 3, ognuno con una condizione (punteggio e minuto) e
// quello che cambia. Scattano da soli, una volta per partita; il vice lo annuncia. Valgono solo per quella partita.
import { FORMATION_IDS, type FormationId, type MatchPlan, type Tactic } from '../../engine/model.ts';
import { t } from '../i18n.ts';

const MINUTES = [30, 45, 55, 60, 65, 70, 75, 80, 85];
const newPlan = (n: number): MatchPlan => ({ name: t('plans.defaultName', { n }), when: { score: 'behind', by: 1, from: 70 }, set: { mentality: 4 } });

/** un menu che può anche lasciare il valore "invariato" */
function Pick({ label, value, options, onChange }: { label: string; value: string | number | undefined; options: [string, string][]; onChange: (v: string | undefined) => void }) {
  return (
    <label className="field"><span className="caps">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{t('plans.keep')}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select></label>
  );
}

function PlanRow({ plan, onChange, onRemove }: { plan: MatchPlan; onChange: () => void; onRemove: () => void }) {
  const w = plan.when, s = plan.set;
  const num = (v: string | undefined) => (v === undefined ? undefined : Number(v));
  const edit = (f: () => void) => { f(); onChange(); };
  return (
    <div className="mini-card stack" style={{ gap: 8 }}>
      <div className="row wrap" style={{ gap: 8 }}>
        <input className="plan-name" value={plan.name} maxLength={24} onChange={(e) => edit(() => { plan.name = e.target.value; })} aria-label={t('plans.name')} />
        <span className="muted">{t('plans.when')}</span>
        <select value={w.score} onChange={(e) => edit(() => { w.score = e.target.value as MatchPlan['when']['score']; /* as: opzioni qui sotto */ })}>
          {(['behind', 'level', 'ahead'] as const).map((k) => <option key={k} value={k}>{t(`plans.score.${k}`)}</option>)}
        </select>
        {w.score !== 'level' && <select value={w.by} onChange={(e) => edit(() => { w.by = Number(e.target.value); })}>
          {[1, 2].map((n) => <option key={n} value={n}>{t('plans.by', { n })}</option>)}
        </select>}
        <span className="muted">{t('plans.from')}</span>
        <select value={w.from} onChange={(e) => edit(() => { w.from = Number(e.target.value); })}>
          {MINUTES.map((m) => <option key={m} value={m}>{m}'</option>)}
        </select>
        <button className="btn" onClick={onRemove}>{t('plans.remove')}</button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <Pick label={t('plans.mentality')} value={s.mentality} options={[1, 2, 3, 4, 5].map((m) => [String(m), t(`mentality.${m}`)])} onChange={(v) => edit(() => { s.mentality = num(v); })} />
        <Pick label={t('plans.formation')} value={s.formation} options={FORMATION_IDS.map((f) => [f, f])} onChange={(v) => edit(() => { s.formation = v as FormationId | undefined; /* as: opzioni qui sotto */ })} />
        <Pick label={t('plans.pressing')} value={s.pressing} options={[0, 1, 2].map((v) => [String(v), t(`instr.pressing.${v}`)])} onChange={(v) => edit(() => { s.pressing = num(v); })} />
        <Pick label={t('plans.line')} value={s.line} options={[0, 1, 2].map((v) => [String(v), t(`instr.line.${v}`)])} onChange={(v) => edit(() => { s.line = num(v); })} />
      </div>
    </div>
  );
}

export function Plans({ tactic, onChange }: { tactic: Tactic; onChange: () => void }) {
  const plans = tactic.plans ?? [];
  const set = (next: MatchPlan[]) => { tactic.plans = next; onChange(); };
  return (
    <div className="panel">
      <h2>{t('tactics.plans')}</h2>
      <div className="muted small">{t('tactics.plansHint')}</div>
      {plans.map((pl, i) => <PlanRow key={i} plan={pl} onChange={() => set([...plans])} onRemove={() => set(plans.filter((_, k) => k !== i))} />)}
      {plans.length < 3 && <button className="btn" onClick={() => set([...plans, newPlan(plans.length + 1)])}>{t('plans.add')}</button>}
    </div>
  );
}
