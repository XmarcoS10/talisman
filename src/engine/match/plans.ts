// Piani partita (GUIDA §6.4, Blocco 2b, intervento 10): fino a 3 piani condizionali dell'allenatore. Ognuno scatta una
// volta per partita, al primo minuto in cui il punteggio è quello previsto, e il vice lo annuncia (evento 'plan').
// Mentalità, pressing, linea e modulo cambiano solo per questa partita: a fine partita la tattica torna com'era.
import type { MatchPlan, Tactic } from '../model.ts';
import { ratingAt } from '../players.ts';
import { DEFAULT_ROLE, ROLES } from './roles.ts';
import { FORMATIONS } from './tactics.ts';
import { minute, type MatchState, type MP, type Team } from './state.ts';

type Undo = Pick<Tactic, 'formation' | 'pressing' | 'line' | 'roles'>;

/** il punteggio è quello del piano? */
function holds(st: MatchState, tm: Team, pl: MatchPlan): boolean {
  const diff = st.score[tm.side] - st.score[tm.side === 0 ? 1 : 0];
  if (pl.when.score === 'behind') return diff <= -pl.when.by;
  if (pl.when.score === 'ahead') return diff >= pl.when.by;
  return diff === 0;
}

/** cambio di modulo a partita in corso: ogni posizione nuova va al più adatto fra quelli in campo */
function reshape(tm: Team, formation: Tactic['formation']) {
  const free = new Set<MP>(tm.on.filter((m) => m.pos !== 'GK'));
  for (const slot of FORMATIONS[formation]) {
    if (slot.pos === 'GK' || free.size === 0) continue;
    const m = [...free].reduce((a, b) => (ratingAt(b.p, slot.pos) > ratingAt(a.p, slot.pos) ? b : a));
    free.delete(m);
    m.pos = slot.pos; m.hx = slot.x; m.hy = slot.y;
    m.roleId = slot.role ?? DEFAULT_ROLE[slot.pos];
    m.role = ROLES[m.roleId];
  }
}

function fire(st: MatchState, tm: Team, pl: MatchPlan) {
  const t = tm.tactic;
  st.planUndo[tm.side] ??= { formation: t.formation, pressing: t.pressing, line: t.line, roles: [...t.roles] };
  if (pl.set.mentality) tm.baseMentality = pl.set.mentality;
  if (pl.set.pressing !== undefined) t.pressing = pl.set.pressing;
  if (pl.set.line !== undefined) t.line = pl.set.line;
  if (pl.set.formation && pl.set.formation !== t.formation) { t.formation = pl.set.formation; reshape(tm, pl.set.formation); }
  st.events.push({ min: minute(st), side: tm.side, type: 'plan', playerId: 0, plan: pl.name });
}

/** a ogni azione: scatta il primo piano non ancora usato la cui condizione vale */
export function checkPlans(st: MatchState, min: number) {
  for (const tm of st.teams) {
    tm.tactic.plans?.forEach((pl, i) => {
      if (st.plansFired[tm.side]![i] || min < pl.when.from || !holds(st, tm, pl)) return;
      st.plansFired[tm.side]![i] = true;
      fire(st, tm, pl);
    });
  }
}

/** a fine partita la tattica del club torna com'era: i piani valgono per una partita */
export function undoPlans(st: MatchState) {
  st.teams.forEach((tm, i) => {
    const u: Undo | null = st.planUndo[i]!;
    if (u) Object.assign(tm.tactic, u);
  });
}
