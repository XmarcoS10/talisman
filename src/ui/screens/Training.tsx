import { Activity, CalendarRange, GraduationCap, HeartPulse, Layers } from 'lucide-react';
import { DEV, TRAIN } from '../../engine/balance.ts';
import { familiarityOf } from '../../engine/match.ts';
import { FORMATION_IDS, TRAINING_CATS, type TrainingCat, type WorldState } from '../../engine/model.ts';
import { age } from '../../engine/players.ts';
import { PRESETS, planFocus, planLoad, trainingInjuryP } from '../../engine/training.ts';
import { PosBadge, shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

const Bar = ({ v, max, cls = '' }: { v: number; max: number; cls?: string }) => (
  <span className={`bar ${cls}`}><span style={{ width: `${Math.max(0, Math.min(100, (v / max) * 100))}%` }} /></span>
);

export function Training({ world, onChange, onPlayer }: { world: WorldState; onChange: () => void; onPlayer: (id: number) => void }) {
  const club = world.clubs[world.manager.clubId]!;
  const plan = club.training;
  const update = (f: () => void) => { f(); onChange(); };
  const load = planLoad(plan);
  const focus = planFocus(plan);
  const players = club.playerIds.map((id) => world.players[id]!);
  const risky = players
    .filter((p) => p.condition.injuryDays === 0)
    .map((p) => ({ p, r: trainingInjuryP(p, plan, world.season) }))
    .sort((a, b) => b.r - a.r)
    .filter((x) => x.r > TRAIN.injuryBase * 2 || x.p.condition.relapse > 0)
    .slice(0, 8);
  const mentees = players.filter((p) => age(p, world.season) <= DEV.menteeMaxAge);
  const veterans = players.filter((p) => age(p, world.season) >= DEV.mentorMinAge).sort((a, b) => b.attrs.socialInfluence - a.attrs.socialInfluence);

  const avgRisk = players.reduce((s, p) => s + trainingInjuryP(p, plan, world.season), 0) / Math.max(1, players.length);
  const preset = Object.keys(PRESETS).find((k) => PRESETS[k]!.every((c, i) => plan[i] === c));
  const tutored = mentees.filter((p) => p.mentorId !== null).length;
  return (
    <div className="stack">
    <div className="kpis">
      <div className="kpi"><span className="caps">{t('training.load')}</span><div className={`big num ${load > TRAIN.loadRef * 1.3 ? 'pos-bad' : load > TRAIN.loadRef ? 'pos-mid' : 'pos-good'}`}>{load.toFixed(1)} <small>/ {TRAIN.loadRef}</small></div>
        <div className="meter"><i className={load > TRAIN.loadRef * 1.3 ? 'bad' : load > TRAIN.loadRef ? 'warn' : ''} style={{ width: `${Math.min(100, load / (TRAIN.loadRef * 1.5) * 100)}%` }} /></div></div>
      <div className="kpi"><span className="caps">{t('training.riskAvg')}</span><div className="big num">{(avgRisk * 100).toFixed(2)}%</div><span className="muted small">{t('training.riskAvgHint')}</span></div>
      <div className="kpi"><span className="caps">{t('training.famNow', { f: club.tactic.formation })}</span><div className="big num">{Math.round(familiarityOf(club))}%</div>
        <div className="meter"><i className="cyan" style={{ width: `${familiarityOf(club)}%` }} /></div></div>
      <div className="kpi"><span className="caps">{t('training.mentors')}</span><div className="big num">{tutored} <small>/ {mentees.length}</small></div><span className="muted small">{t('training.tutored')}</span></div>
    </div>
        <div className="panel">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h2><CalendarRange size={18} /> {t('training.week')}</h2>
        <div className="seg-tabs">
          {Object.keys(PRESETS).map((k) => (
            <button key={k} className={preset === k ? 'active hot' : ''} onClick={() => update(() => { club.training = [...PRESETS[k]!]; })}>{t(`preset.${k}`)}</button>
          ))}
        </div>
      </div>
      <div className="muted">{t('training.hint')}</div>
      <div className="week">
        <span />
        {[1, 2, 3, 4, 5, 6].map((d) => <b key={d} className="muted c">{t('training.day', { n: d })}</b>)}
        {(['am', 'pm'] as const).map((half, h) => (
          <div key={half} style={{ display: 'contents' }}>
            <span className="muted">{t(`training.${half}`)}</span>
            {[0, 1, 2, 3, 4, 5].map((d) => {
              const i = d * 2 + h;
              return (
                <select key={i} className={`cat-${plan[i]}`} value={plan[i]} aria-label={`${t('training.day', { n: d + 1 })} ${t(`training.${half}`)}`}
                  onChange={(e) => update(() => { plan[i] = e.target.value as TrainingCat; })}>
                  {TRAINING_CATS.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
                </select>
              );
            })}
          </div>
        ))}
      </div>
    </div>

    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
      <div className="grid">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="panel">
            <h2><Activity size={18} /> {t('training.load')}</h2>
            <div className="row"><Bar v={load} max={10} cls={load > TRAIN.loadRef * 1.3 ? 'bad' : load > TRAIN.loadRef ? 'mid' : ''} /><b className="num">{load.toFixed(1)}</b></div>
            <div className="muted" style={{ fontSize: 11 }}>{t('training.loadHint', { ref: TRAIN.loadRef })}</div>
            <h2 style={{ marginTop: 8 }}>{t('training.focus')}</h2>
            {(['technical', 'physical', 'mental', 'setPieces'] as const).map((a) => (
              <div key={a} className="attr"><span>{t(`area.${a}`)}</span><Bar v={focus[a]} max={2} /></div>
            ))}
          </div>
          <div className="panel">
            <h2><Layers size={18} /> {t('training.familiarity')}</h2>
            {FORMATION_IDS.map((f) => (
              <div key={f} className="attr">
                <span className={f === club.tactic.formation ? '' : 'muted'}>{f}</span>
                <span className="row"><Bar v={familiarityOf(club, f)} max={100} /><b className="num">{Math.round(familiarityOf(club, f))}</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="panel">
          <h2><HeartPulse size={18} /> {t('training.risk')}</h2>
          <div className="muted" style={{ fontSize: 11 }}>{t('training.riskHint')}</div>
          {risky.length === 0 && <div className="muted">{t('training.noRisk')}</div>}
          {risky.map(({ p, r }) => (
            <div key={p.id} className="attr clickable" onClick={() => onPlayer(p.id)}>
              <span><PosBadge pos={p.position} /> {shortName(p)} {p.condition.relapse > 0 && <span className="pos-mid">· {t('training.relapse')}</span>}</span>
              <b className={`num ${r > TRAIN.injuryBase * 4 ? 'pos-bad' : 'pos-mid'}`}>{(r * 100).toFixed(1)}%</b>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2><GraduationCap size={18} /> {t('training.mentors')}</h2>
          <div className="muted" style={{ fontSize: 11 }}>{t('training.mentorsHint')}</div>
          {mentees.map((p) => (
            <div key={p.id} className="attr">
              <span><PosBadge pos={p.position} /> {shortName(p)} <span className="muted">({age(p, world.season)})</span></span>
              <select value={p.mentorId ?? ''} onChange={(e) => update(() => { p.mentorId = e.target.value ? Number(e.target.value) : null; })}>
                <option value="">{t('training.noMentor')}</option>
                {veterans.map((v) => <option key={v.id} value={v.id}>{shortName(v)} · {t('attr.socialInfluence')} {v.attrs.socialInfluence}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
