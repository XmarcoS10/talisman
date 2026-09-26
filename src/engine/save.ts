// Salvataggi versionati (GUIDA §2.5): ogni save ha schemaVersion e passa dalla catena di migrazioni.
import { SCOUT, TRAIN, YOUTH } from './balance.ts';
import { defaultRoles } from './match/tactics.ts';
import { ALL_ATTRS, PHILOSOPHIES, type Club, type WorldState } from './model.ts';
import { Rng } from './rng.ts';
import { seedMinutes } from './morale.ts';
import { initRelations } from './social.ts';
import { defaultTraining } from './training.ts';
import { assignAgents } from './transfers/agents.ts';
import { makeScouts } from './scouting/scouts.ts';
import { newBoard } from './board/board.ts';

export const SCHEMA_VERSION = 28;

// MIGRATIONS[n] porta un save dalla versione n+1 alla n+2. Mai modificarne una già pubblicata.
// I save vecchi non hanno tipi: si lavora su oggetti generici.
type Obj = Record<string, any>; // any giustificato: forma dei dati di versioni precedenti, non tipizzabile
export type Raw = Obj & { schemaVersion: number };
const emptySide = () => ({ possession: 50, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0 });
const MIGRATIONS: ((w: Raw) => void)[] = [
  // 1 → 2 (F3, motore L2): condizione, disciplina, forma, statistiche estese, tattica di club
  (w) => {
    for (const p of Object.values(w.players as Obj)) {
      p.condition = { fitness: 100, injuryDays: 0 };
      p.discipline = { yellows: 0, ban: 0 };
      p.form = [];
      Object.assign(p.stats, { yellows: 0, reds: 0, ratingSum: 0 });
    }
    for (const c of Object.values(w.clubs as Obj))
      c.tactic = { formation: '4-3-3', mentality: 3, pressing: 1, tempo: 1, width: 1, line: 1, directness: 1 };
    for (const comp of Object.values(w.competitions as Obj))
      for (const fx of comp.fixtures) if (fx.result) Object.assign(fx.result, { stats: [emptySide(), emptySide()], ratings: {} });
  },
  // 2 → 3 (F4, tattica): ruoli per slot, notizie
  (w) => {
    for (const c of Object.values(w.clubs as Obj)) c.tactic.roles = defaultRoles(c.tactic.formation);
    w.news = [];
  },
  // 3 → 4 (F5, persone): allenamento, condizione estesa, psicologia, grafo sociale, promesse, registro delle cause
  (w) => {
    const rng = new Rng(w.seed + w.season);
    for (const p of Object.values(w.players as Obj)) {
      p.hidden = { injuryProneness: Math.round(Math.max(1, Math.min(20, rng.gauss(10, 4)))) };
      p.psych = { morale: p.psych?.morale ?? 68, trust: 50, minutes: 0.5, wantsOut: false };
      p.rel = {};
      p.mentorId = null;
      Object.assign(p.condition, { sharpness: 70, fatigue: 0, injury: null, relapse: 0 });
      for (const h of p.history) h.ca = p.ca;
      p.caLog = [p.ca];
    }
    for (const c of Object.values(w.clubs as Obj)) {
      Object.assign(c, { training: defaultTraining(), familiarity: { [c.tactic.formation]: TRAIN.famStart }, excluded: [], feuds: [] });
      initRelations(w as unknown as WorldState, c as Club, rng); // forma garantita dalle righe sopra
      seedMinutes(w as unknown as WorldState, c as Club);
    }
    Object.assign(w.manager, { kept: 0, broken: 0 });
    w.causal = [];
    w.promises = [];
  },
  // 4 → 5 (F7, mercato): ogni giocatore ha un agente
  (w) => {
    for (const p of Object.values(w.players as Obj)) p.agentId = null;
    w.agents = {};
    w.nextAgentId = 1;
    assignAgents(w as unknown as WorldState, new Rng(w.seed + 77)); // forma garantita dalle righe sopra
  },
  // 5 → 6 (F7, IA di mercato): ogni club ha una filosofia
  (w) => {
    const rng = new Rng(w.seed + 91);
    for (const c of Object.values(w.clubs as Obj)) c.philosophy = rng.pick([...PHILOSOPHIES]);
  },
  // 6 → 7 (F7, contratti): clausole, percentuale di rivendita, prestiti, parametro zero
  (w) => {
    for (const p of Object.values(w.players as Obj))
      Object.assign(p.contract, { release: null, sellOn: 0, sellOnTo: null, loan: null, preSigned: null });
  },
  // 7 → 8 (F7, scouting): osservatori e nebbia dell'informazione
  (w) => {
    for (const c of Object.values(w.clubs as Obj)) c.scoutIds = [];
    w.scouts = {};
    w.known = {};
    w.nextScoutId = 1;
    makeScouts(w as unknown as WorldState, new Rng(w.seed + 113)); // forma garantita dalle righe sopra
  },
  // 8 → 9 (F7, schermate): le trattative aperte dall'utente si salvano
  (w) => { w.talks = []; },
  // 9 → 10 (F8, finanze): conto economico, rate, fair play finanziario
  (w) => {
    for (const c of Object.values(w.clubs as Obj))
      Object.assign(c, { books: [], debts: [], credits: [], sanction: { kind: 'none', seasons: 0, points: 0 } });
  },
  // 10 → 11 (F8, dirigenza): le quattro barre della fiducia e il contratto con la società
  (w) => { w.manager.board = newBoard(); },
  // 11 → 12 (F8, narrativa): archi narrativi
  (w) => { w.arcs = []; w.nextArcId = 1; w.manager.h2h = {}; },
  // 12 → 13 (F8, stampa): la conferenza della settimana
  (w) => { w.press = null; },
  // 13 → 14 (F8, giovanili e nazionali): strutture del vivaio, carriera in nazionale
  (w) => {
    for (const c of Object.values(w.clubs as Obj))
      c.youth = { facilities: Math.round(YOUTH.facilitiesFromRep[0] + c.reputation / YOUTH.facilitiesFromRep[1]), recruitment: Math.round(YOUTH.recruitmentFromRep[0] + c.reputation / YOUTH.recruitmentFromRep[1]) };
    for (const p of Object.values(w.players as Obj)) p.intl = { caps: 0, goals: 0, titles: 0 };
    w.nations = {};
    w.intake = [];
  },
  // 14 → 15 (F10, finanze): la cassa mese per mese, per il grafico
  (w) => {
    for (const c of Object.values(w.clubs as Obj)) for (const b of c.books as Obj[]) b.monthly = [];
  },
  // 15 → 16 (F10, dirigenza): i posti nello staff osservatori
  (w) => { w.manager.board.scoutSlots = Math.max(SCOUT.slots, (w.clubs[w.manager.clubId]?.scoutIds ?? []).length); },
  // 16 → 17 (F10, nuova carriera): la filosofia dell'allenatore
  (w) => { w.manager.style = 'none'; },
  // 17 → 18 (F10, coppa): la Coppa nazionale; a stagione iniziata si parte da quella dopo
  (w) => { w.cup = null; w.cupWinners = []; },
  // 18 → 19 (F10, amichevoli): i risultati delle amichevoli estive
  (w) => { w.friendlies = null; },
  // 19 → 20 (dopo F10): le offerte dell'IA per i giocatori dell'utente
  (w) => { w.offers = []; },
  // 20 → 21 (0.2.0): ogni risposta in conferenza sa che tipo è; una conferenza lasciata a metà si riapre la settimana dopo
  (w) => { w.press = null; },
  // 21 → 22 (0.2.0, piazzati): i battitori scelti in Tattica; nelle carriere di prima nessuno, batte il migliore in campo
  (w) => { for (const c of Object.values(w.clubs as Obj)) c.tactic.takers ??= {}; },
  // 22 → 23 (0.2.0, transizioni): l'istruzione "dopo la palla persa"; per tutti "normale", cioè come prima
  (w) => { for (const c of Object.values(w.clubs as Obj)) c.tactic.counterPress ??= 1; },
  // 23 → 24 (0.2.0, istruzioni individuali e piani partita): nessuna istruzione e nessun piano nelle carriere di prima
  (w) => { for (const c of Object.values(w.clubs as Obj)) { c.tactic.players ??= {}; c.tactic.plans ??= []; } },
  // 24 → 25 (0.2.0, Serie C, playoff e playout): spareggi accesi, la B retrocede in quattro; la Serie C arriva da
  // sola alla prima fine stagione (endSeason), prima di promozioni e retrocessioni
  (w) => {
    w.rules ??= { playoffs: true };
    w.playoffs ??= null;
    const b = (w.competitions as Obj).ITA2;
    if (b) b.relegate = 4;
  },
  // 25 → 26 (0.2.0, bancarotte): nessun club in crisi, nessun avviso dato
  (w) => { for (const c of Object.values(w.clubs as Obj)) c.crisis ??= { below: 0, warned: 0, since: null, penalty: 0 }; },
  // 26 → 27 (0.2.0, storie nella lingua di chi legge): le frasi nuove si salvano come {key, seed, v}; quelle già
  // scritte restano stringhe e si leggono così come sono. Niente da convertire.
  () => {},
  // 27 → 28 (nazionali col motore vero): l'archivio delle partite delle nazionali parte vuoto
  (w) => { w.intl = []; },
];

export function serialize(world: WorldState): string {
  return JSON.stringify(world);
}

export function deserialize(json: string): WorldState {
  return migrate(JSON.parse(json) as Raw);
}

/** porta un mondo già letto (oggetto, non testo) alla versione corrente: evita di rileggere 100 MB due volte */
export function migrate(raw: Raw): WorldState {
  if (typeof raw.schemaVersion !== 'number') throw new Error('Salvataggio non valido');
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('Salvataggio creato da una versione più recente del gioco');
  while (raw.schemaVersion < SCHEMA_VERSION) {
    MIGRATIONS[raw.schemaVersion - 1]!(raw);
    raw.schemaVersion++;
  }
  return raw as unknown as WorldState; // struttura garantita dalla catena di migrazioni
}

/**
 * controllo di integrità del mondo (Impostazioni → diagnostica): ogni riferimento deve puntare a qualcosa che esiste
 * ed essere reciproco (il club elenca il giocatore e il giocatore dice di essere di quel club). Restituisce quanti
 * controlli ha fatto e i problemi trovati, in chiaro.
 */
export function integrity(world: WorldState): { checks: number; problems: string[] } {
  const problems: string[] = [];
  let checks = 0;
  const check = (ok: boolean, what: string) => { checks++; if (!ok) problems.push(what); };
  for (const c of Object.values(world.clubs)) {
    check(!!world.competitions[c.compId], `club ${c.id}: campionato ${c.compId} inesistente`);
    for (const id of c.playerIds) check(world.players[id]?.clubId === c.id, `club ${c.id}: giocatore ${id} non suo`);
    for (const id of c.scoutIds) check(world.scouts[id]?.clubId === c.id, `club ${c.id}: osservatore ${id} non suo`);
  }
  for (const p of Object.values(world.players)) {
    if (p.clubId !== null) check(world.clubs[p.clubId]?.playerIds.includes(p.id) === true, `giocatore ${p.id}: club ${p.clubId} non lo elenca`);
    check(ALL_ATTRS.every((k) => p.attrs[k] >= 1 && p.attrs[k] <= 20), `giocatore ${p.id}: attributo fuori scala`);
  }
  for (const a of Object.values(world.agents)) for (const id of a.clientIds) check(!!world.players[id], `agente ${a.id}: assistito ${id} inesistente`);
  for (const comp of Object.values(world.competitions)) for (const id of comp.clubIds) check(world.clubs[id]?.compId === comp.id, `campionato ${comp.id}: club ${id} non suo`);
  check(world.clubs[world.manager.clubId] !== undefined, `il club dell'allenatore non esiste`);
  return { checks, problems };
}
