// Le partite delle nazionali col motore vero (§7.8). Prima erano gol di Poisson: adesso si giocano come quelle dei
// club, con formazione, ruoli, cambi, cartellini e infortuni. Una nazionale non è un club del mondo: la sua squadra si
// costruisce al momento e non si salva (regola 4), e le statistiche di campionato non si toccano.
import { NATIONAL, TRAIN } from '../balance.ts';
import { injure } from '../injuries.ts';
import { simulate } from '../match/engine.ts';
import { defaultRoles } from '../match/tactics.ts';
import { aiMentality, bestFormation, pickXI, teamSetup, xiStrength } from '../match.ts';
import type { MP } from '../match/state.ts';
import type { Club, IntlMatch, WorldState } from '../model.ts';
import { addNews, pName } from '../news.ts';
import type { Rng } from '../rng.ts';
import { NATIONS } from '../names.ts';
import { clamp } from '../util.ts';
import { callUp, strength } from './squad.ts';

const CODES = Object.keys(NATIONS);
const KEEP = 60; // quante partite si conservano per la schermata

/**
 * la nazionale come squadra da mandare in campo: id negativo (non è un club del mondo, e non collide con nessuno),
 * modulo scelto dal ct sui convocati, colori dal codice. Tutto il resto sono valori di comodo che il motore non legge.
 */
export function nationalTeam(world: WorldState, code: string): Club {
  const squad = callUp(world, code);
  const club: Club = {
    id: -(CODES.indexOf(code) + 1), name: code, shortName: code, city: code,
    colors: ['#1f7a4d', '#f2f2f2', '#0f131d'], crest: null, founded: 1900, reputation: Math.round(strength(world, code)),
    philosophy: 'balanced', stadium: { name: code, capacity: 60_000 }, balance: 0, books: [], debts: [], credits: [],
    sanction: { kind: 'none', seasons: 0, points: 0 }, crisis: { below: 0, warned: 0, since: null, penalty: 0 },
    compId: 'ITA1', playerIds: squad.map((p) => p.id),
    tactic: { formation: '4-3-3', mentality: 3, pressing: 1, tempo: 1, width: 1, line: 1, directness: 1, counterPress: 1, roles: [] },
    training: [], familiarity: {}, excluded: [], scoutIds: [], youth: { facilities: 10, recruitment: 10 }, feuds: [],
  };
  club.tactic.formation = bestFormation(world, club);
  club.tactic.roles = defaultRoles(club.tactic.formation);
  // una nazionale si allena poco ma gioca uno schema semplice e conosciuto: senza questo il campo si rompeva
  // in continuazione e le partite finivano 4-3
  club.familiarity = { [club.tactic.formation]: NATIONAL.familiarity };
  return club;
}

/** una nazionale è pronta a giocare se ha almeno undici convocati */
export const canPlayIntl = (world: WorldState, code: string) => callUp(world, code).length >= 11;

interface IntlOpts { kind: IntlMatch['kind']; stage?: IntlMatch['stage']; knockout?: boolean }

/**
 * una partita di nazionale: la gioca il motore, poi si scrivono presenze, gol, fatica, morale e infortuni.
 * Restituisce la partita registrata (con i rigori, se era da dentro o fuori ed è finita pari).
 */
export function playNational(world: WorldState, rng: Rng, a: string, b: string, opts: IntlOpts): IntlMatch {
  const teams = [nationalTeam(world, a), nationalTeam(world, b)] as const;
  const xis = teams.map((c) => pickXI(world, c));
  const str = xis.map(xiStrength);
  // come i club: chi è più debole si chiude, chi è più forte spinge. Senza, fra nazionali di forza diversa
  // finiva 5-1 una volta su quattro
  const out = simulate(rng, teams.map((c, i) => ({
    ...teamSetup(world, c, xis[i]!, aiMentality(str[i]!, str[1 - i]!, i === 0)), auto: true,
  })) as [ReturnType<typeof teamSetup>, ReturnType<typeof teamSetup>]);
  const { result } = out;
  const match: IntlMatch = {
    season: world.season, day: opts.kind === 'break' ? world.day : -1, kind: opts.kind, a, b, ga: result.hg, gb: result.ag,
    scorers: result.events.filter((e) => e.type === 'goal' || e.type === 'penGoal').map((e) => ({ playerId: e.playerId, min: e.min, side: e.side })),
    ...(opts.stage ? { stage: opts.stage } : {}),
  };
  if (opts.knockout && result.hg === result.ag) {
    // ai rigori la forza conta poco (NATIONAL.penaltyScale): chi vince segna un rigore in più
    const home = rng.next() < 0.5 + (strength(world, a) - strength(world, b)) / NATIONAL.penaltyScale;
    match.pens = home ? [5, 4] : [4, 5];
  }
  applyIntl(world, rng, out.played);
  world.intl.push(match);
  if (world.intl.length > KEEP) world.intl.splice(0, world.intl.length - KEEP);
  return match;
}

/** chi ha vinto: gol, e ai rigori il tabellino dei rigori */
export const intlWinner = (m: IntlMatch) => (m.ga !== m.gb ? (m.ga > m.gb ? m.a : m.b) : m.pens && m.pens[0] > m.pens[1] ? m.a : m.b);

/** quello che la partita lascia sui giocatori: presenze, gol, minuti nelle gambe, morale, infortuni */
function applyIntl(world: WorldState, rng: Rng, played: [MP[], MP[]]) {
  const me = world.manager.clubId;
  for (const list of played) for (const m of list) {
    const p = m.p, c = p.condition;
    const share = Math.max(1, m.st.to - m.st.from) / 90;
    p.intl.caps++;
    p.intl.goals += m.st.goals;
    // niente p.stats: le partite delle nazionali non entrano nelle statistiche di campionato
    c.fitness = Math.round(m.energy);
    c.sharpness = Math.min(100, c.sharpness + TRAIN.sharpMatch * share);
    c.fatigue = Math.min(100, Math.round((c.fatigue + TRAIN.fatigueMatch * share) * 10) / 10);
    p.psych.morale = clamp(p.psych.morale + NATIONAL.morale * share, 0, 100);
    if (m.st.injured) {
      const type = injure(rng, p, m.st.injuryCtx);
      if (p.clubId === me) addNews(world, 'news.intl.injury', { name: pName(p), injury: type.id, days: c.injuryDays });
    }
  }
}
