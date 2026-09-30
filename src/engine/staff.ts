// Staff del club dell'utente (0.8.x): vice allenatore, preparatore atletico, medico. Bravura 1-20: a 10 non cambia nulla,
// sopra aiuta e sotto pesa (STAFF in balance.ts). Gli altri club hanno uno staff medio implicito: le loro partite e il
// caso del mondo non cambiano. Lo staff nasce da un generatore suo (come le offerte e gli allenatori dell'IA).
import { STAFF } from './balance.ts';
import type { ClubId, StaffMember, StaffRole, WorldState } from './model.ts';
import { NATIONS } from './names.ts';
import { Rng } from './rng.ts';
import { clamp } from './util.ts';

export const STAFF_ROLES: StaffRole[] = ['assistant', 'fitness', 'physio'];

const staffRng = (world: WorldState, salt: number) => new Rng((world.seed * 37 + world.season * 1013 + salt * 104723) >>> 0);

export const staffWage = (skill: number) => STAFF.wageBase + skill * STAFF.wagePerSkill;

function makeStaff(world: WorldState, rng: Rng, role: StaffRole, skill: number, clubId: ClubId | null): StaffMember {
  const nation = rng.next() < 0.7 ? 'ITA' : rng.pick(Object.keys(NATIONS));
  const names = NATIONS[nation] ?? NATIONS.ITA!;
  const s = Math.round(clamp(skill, 1, 20));
  const m: StaffMember = { id: world.nextStaffId++, name: `${rng.pick(names.first)} ${rng.pick(names.last)}`, nation, role, skill: s, wage: staffWage(s), clubId };
  world.staff[m.id] = m;
  return m;
}

export const staffOf = (world: WorldState, clubId: ClubId, role: StaffRole) =>
  Object.values(world.staff).find((m) => m.clubId === clubId && m.role === role);

/** −0,9 … +1: quanto il membro dello staff dell'utente sposta il suo effetto rispetto a uno medio */
export function staffEdge(world: WorldState, clubId: ClubId, role: StaffRole): number {
  if (clubId !== world.manager.clubId) return 0;
  const m = staffOf(world, clubId, role);
  return m ? (m.skill - 10) / 10 : 0;
}

/** staff medio per il club dell'utente (carriere nuove, vecchie e cambi di panchina) e candidati liberi */
export function ensureStaff(world: WorldState) {
  const me = world.manager.clubId;
  const rng = staffRng(world, 1);
  for (const role of STAFF_ROLES) {
    if (!staffOf(world, me, role)) makeStaff(world, rng, role, 10, me);
    while (Object.values(world.staff).filter((m) => m.clubId === null && m.role === role).length < STAFF.pool)
      makeStaff(world, rng, role, rng.gauss(STAFF.poolMean, 4), null);
  }
}

/** a fine stagione i liberi trovano lavoro altrove e ne arrivano di nuovi; chi lavora per altri club non conta più */
export function seasonStaff(world: WorldState) {
  for (const m of Object.values(world.staff)) if (m.clubId !== world.manager.clubId) delete world.staff[m.id];
  ensureStaff(world);
}

/** assume un libero al posto di chi ha quel ruolo (che torna libero) */
export function hireStaff(world: WorldState, id: number): boolean {
  const m = world.staff[id];
  if (!m || m.clubId !== null) return false;
  const old = staffOf(world, world.manager.clubId, m.role);
  if (old) old.clubId = null;
  m.clubId = world.manager.clubId;
  return true;
}

export const staffWages = (world: WorldState, clubId: ClubId) =>
  clubId === world.manager.clubId ? Object.values(world.staff).reduce((s, m) => s + (m.clubId === clubId ? m.wage : 0), 0) : 0;
