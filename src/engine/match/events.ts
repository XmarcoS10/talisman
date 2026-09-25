// Eventi intorno al gioco: falli, cartellini, infortuni (di contatto e "senza contatto"), stanchezza.
import { MATCH } from '../balance.ts';
import { afterFoul } from './setpieces.ts';
import { ev, gain, minute, nearest, type MatchState, type MP, type PStats, type Team } from './state.ts';
import { substitute } from './subs.ts';
import { beat } from './trace.ts';

export function removeFromPitch(st: MatchState, tm: Team, m: MP) {
  m.on = false;
  m.st.to = minute(st);
  tm.on = tm.on.filter((x) => x !== m);
  st.idsDirty = true;
  if (st.carrier === m) st.carrier = nearest(tm, m.x, m.y);
}

export function injure(st: MatchState, tm: Team, m: MP, ctx: PStats['injuryCtx']) {
  if (!m.on || m.st.injured) return;
  m.st.injured = true;
  m.st.injuryCtx = ctx;
  ev(st, 'injury', tm.side, m);
  if (!substitute(st, tm, m)) removeFromPitch(st, tm, m);
}

function sendOff(st: MatchState, tm: Team, m: MP) {
  beat(st, 'red', m);
  m.st.red = true;
  tm.stats.reds++;
  ev(st, 'red', tm.side, m);
  removeFromPitch(st, tm, m);
}

/** quanto è probabile che il difensore più vicino porti via palla al portatore pressato, prima che giochi */
export function challengeP(tk: MP, c: MP, pressure: number) {
  const a = tk.p.attrs, b = c.p.attrs;
  const diff = 0.4 * a.tackling + 0.3 * (a.positioning + a.anticipation) - 0.5 * b.technique - 0.25 * (b.composure + b.balance);
  return MATCH.pressTackle * pressure * Math.max(0.2, 1 + MATCH.tackleSkill * diff);
}

/** contrasto vinto sul portatore: palla al difensore, dove si trova */
export function challenge(st: MatchState, tk: MP) {
  const def = st.teams[1 - st.s]!;
  tk.st.tackles++; def.stats.tackles++;
  def.log.tackles++; def.log.regains++; def.log.regainX += tk.x;
  beat(st, 'tackle', tk, st.carrier);
  st.t += MATCH.turnoverTime + 1;
  gain(st, def, tk);
}

export function foul(st: MatchState, fouler: MP, victim: MP, tactical = false) {
  const att = st.teams[st.s], def = st.teams[1 - st.s]!;
  const { rng } = st;
  def.stats.fouls++; fouler.st.fouls++;
  beat(st, 'foul', fouler, victim);
  st.t += MATCH.restartTime;
  if (rng.next() < MATCH.redP) sendOff(st, def, fouler);
  // chi è già ammonito entra con più prudenza: il secondo giallo è più raro
  else if (rng.next() < MATCH.yellowP * (tactical ? MATCH.tacticalYellow : 1) * (1 + 0.08 * (fouler.p.attrs.aggression - 11)) * (fouler.st.yellows ? MATCH.bookedCaution : 1)) {
    fouler.st.yellows++; def.stats.yellows++;
    beat(st, 'yellow', fouler);
    ev(st, 'yellow', def.side, fouler);
    if (fouler.st.yellows === 2) sendOff(st, def, fouler);
  }
  if (rng.next() < MATCH.injuryOnFoul) injure(st, att, victim, 'contact');
  if (!victim.on) return; // il fallo ha tolto di mezzo il portatore: batte il più vicino
  afterFoul(st, att);
}

/** infortuni "senza contatto" programmati prima del fischio d'inizio, e le ricadute di chi è rientrato da poco */
export function scheduleInjuries(st: MatchState) {
  st.teams.forEach((tm, i) => {
    for (const m of tm.on) {
      const risk = st.setups[i]!.injuryP(m.p);
      if (st.rng.next() < risk.relapse) st.scheduled.push({ who: m, team: tm, at: st.rng.int(1, 89), ctx: 'relapse' });
      else if (st.rng.next() < risk.muscle) st.scheduled.push({ who: m, team: tm, at: st.rng.int(1, 89), ctx: 'muscle' });
    }
  });
}

export function dueInjuries(st: MatchState, min: number) {
  for (const sc of st.scheduled) if (sc.at <= min && sc.who.on && !sc.who.st.injured) injure(st, sc.team, sc.who, sc.ctx);
}

/** stanchezza, applicata a blocchi di un minuto: chi pressa si stanca di più */
export function drain(st: MatchState) {
  for (const tm of st.teams) {
    const mins = st.pendingDrain[tm.side] / 60;
    for (const m of tm.on) m.energy = Math.max(30, m.energy - mins * m.role.drain * (MATCH.drainBase + MATCH.drainStamina * (1 - m.p.attrs.stamina / 20)));
    st.pendingDrain[tm.side] = 0;
  }
}
