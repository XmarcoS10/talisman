// Report sull'avversario: modulo probabile, uomo pericoloso, ultimi precedenti, consiglio dell'analista.
// Tutto ciò che si mostra è pubblico (tattica vista in campo, gol segnati, risultati): niente valori nascosti.
import { coachOf } from '../../engine/coaches.ts';
import type { Club, Fixture, WorldState } from '../../engine/model.ts';
import { refereeFor, type Referee } from '../../engine/referees.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

/** il consiglio nasce dal modo di giocare dell'avversario: la sua istruzione più marcata */
function advice(c: Club): string {
  const tc = c.tactic;
  if (tc.pressing === 2) return 'pressHigh';
  if (tc.line === 2) return 'lineHigh';
  if (tc.mentality <= 2) return 'lowBlock';
  if (tc.width === 2) return 'wide';
  if (tc.directness === 2) return 'direct';
  if (tc.tempo === 0) return 'slow';
  return 'balanced';
}

/** severità dell'arbitro in parole: tollerante, nella media, severo */
export const strictLabel = (r: Referee) => t(r.strict <= 7 ? 'ref.lenient' : r.strict <= 13 ? 'ref.average' : 'ref.strict');

export function OpponentReport({ world, oppId, fx, onPlayer }: { world: WorldState; oppId: number; fx?: Fixture; onPlayer: (id: number) => void }) {
  const opp = world.clubs[oppId]!;
  const squad = opp.playerIds.map((id) => world.players[id]!);
  const danger = [...squad].sort((a, b) => b.stats.goals * 2 + b.stats.assists - (a.stats.goals * 2 + a.stats.assists) || (b.history.at(-1)?.goals ?? 0) - (a.history.at(-1)?.goals ?? 0))[0];
  const last = [...(world.manager.h2h[oppId] ?? '')].slice(-3);
  const a = advice(opp);
  const coach = coachOf(world, oppId);
  const ref = fx ? refereeFor(world, fx) : null;
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{t('opp.title')}</h2><span className="tag dim">{opp.shortName}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="mini-card">
          <span className="caps">{t('opp.formation')}</span>
          <b className="big-num">{opp.tactic.formation}</b>
          <small>{t(`mentality.${opp.tactic.mentality}`)}</small>
          {coach && <small className="muted">{t('coach.line', { name: `${coach.firstName} ${coach.lastName}`, style: t(`coach.style.${coach.style}`) })}</small>}
        </div>
        {danger && (
          <button className="mini-card" style={{ textAlign: 'left' }} onClick={() => onPlayer(danger.id)}>
            <span className="caps">{t('opp.danger')}</span>
            <b>★ {shortName(danger)}</b>
            <small>{danger.stats.apps ? t('opp.dangerStats', { g: danger.stats.goals, a: danger.stats.assists }) : t('opp.dangerLast', { g: danger.history.at(-1)?.goals ?? 0 })}</small>
          </button>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="caps">{t('opp.h2h')}</span>
        <span className="form-row">
          {last.length === 0 && <span className="muted small">{t('opp.noH2h')}</span>}
          {last.map((r, i) => <span key={i} className={`form ${r}`}>{t(`col.${r === 'W' ? 'w' : r === 'D' ? 'd' : 'l'}`)}</span>)}
        </span>
      </div>
      {ref && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="caps">{t('ref.title')}</span>
          <span>{ref.firstName} {ref.lastName} · <b className={ref.strict >= 14 ? 'pos-bad' : ref.strict <= 7 ? 'pos-good' : ''}>{strictLabel(ref)}</b> <span className="muted small">({ref.strict}/20)</span></span>
        </div>
      )}
      {ref && ref.strict >= 14 && <div className="muted small">{t('ref.adviceStrict')}</div>}
      <div className="analyst"><b>{t('opp.analyst')}</b> {t(`opp.advice.${a}`, { club: opp.shortName })}</div>
    </div>
  );
}
