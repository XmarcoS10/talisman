// Il portiere (Blocco 2b, intervento 5): parata secondo il tipo di tiro, presa o respinta (la respinta crea la
// ribattuta), uscita sulle palle in profondità. Il rinvio lungo è un'opzione in decision.ts. Costanti in MATCH (gk*).
import { MATCH } from '../balance.ts';
import { sigmoid } from './pitch.ts';
import { corner } from './setpieces.ts';
import { shoot } from './execute.ts';
import { gain, nearest, type MatchState, type MP, type Team } from './state.ts';
import { beat } from './trace.ts';

/**
 * bravura del portiere sul tiro: ravvicinato (xG alto) = Uno contro uno, Riflessi, Uscite basse; rigore = Riflessi e
 * Concentrazione; il resto = Riflessi, Posizionamento, Concentrazione
 */
export function keeperSkill(gk: MP | undefined, pen: boolean, xg: number): number {
  if (!gk) return 3;
  const a = gk.p.attrs;
  if (pen) return 0.7 * a.reflexes + 0.3 * a.concentration;
  if (xg >= MATCH.gkCloseXg) return 0.5 * a.oneOnOnes + 0.3 * a.reflexes + 0.2 * a.rushingOut;
  return 0.6 * a.reflexes + 0.25 * a.positioning + 0.15 * a.concentration;
}

/**
 * dopo la parata: la trattiene (Presa, più difficile sui tiri forti da vicino) o la respinge. Respinta: in corner, sui
 * piedi di un attaccante (ribattuta) o a un difensore
 */
export function afterSave(st: MatchState, att: Team, def: Team, gk: MP | undefined, xg: number) {
  if (!gk) { gain(st, def, nearest(def, 0.6, 4)); return; }
  const { rng } = st;
  if (rng.next() < sigmoid(MATCH.gkHoldBase + MATCH.gkHoldSkill * (gk.p.attrs.handling - 11) - MATCH.gkHoldXg * xg)) { beat(st, 'save', gk); gain(st, def, gk); return; }
  beat(st, 'parry', gk);
  const r = rng.next();
  if (r < MATCH.gkParryCorner) { corner(st); return; }
  if (r < MATCH.gkParryCorner + MATCH.gkRebound) {
    const rb = nearest(att, 10.7, 4, true); // chi arriva sulla ribattuta
    st.bx = 10.7; st.by = 4 + (rng.next() - 0.5) * 2;
    st.lastPass = null;
    att.log.rebounds++;
    beat(st, 'rebound', rb);
    shoot(st, rb, MATCH.gkReboundXg, 'open', 'open');
    return;
  }
  gain(st, def, nearest(def, 1.2, 4, true));
}

/** il portiere esce sulla palla in profondità: Uscite basse, e di più il portiere libero (che sta già più alto) */
export function sweeps(st: MatchState, def: Team): MP | null {
  const gk = def.on.find((m) => m.pos === 'GK');
  if (!gk) return null;
  const p = MATCH.gkSweepBase + MATCH.gkSweepSkill * (gk.p.attrs.rushingOut - 11) + (gk.roleId === 'sweeperKeeper' ? MATCH.gkSweepRole : 0);
  return st.rng.next() < p ? gk : null;
}
