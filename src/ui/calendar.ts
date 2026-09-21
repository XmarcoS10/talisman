// Contorno del calendario, tutto derivato e deterministico: orario del calcio d'inizio, rivalità storiche, file iCal.
import type { Club, ClubId, Fixture, WorldState } from '../engine/model.ts';
import { gameDate } from './i18n.ts';

const hash = (...n: number[]) => n.reduce((h, x) => Math.imul(h ^ (x + 0x9e3779b9), 2654435761) >>> 0, 17);
const TIMES = ['12:30', '15:00', '15:00', '15:00', '18:00', '20:45', '20:45'];

/** orario della partita: stabile per quella gara, le big e le rivalità più spesso la sera */
export function kickoff(world: WorldState, fx: Fixture): string {
  if (isRivalry(world, fx.home, fx.away)) return '20:45';
  return TIMES[hash(world.season, fx.day, fx.home) % TIMES.length]!;
}

/**
 * ogni club ha una rivale storica: le coppie si formano una volta per tutte mescolando i club con un hash dell'id,
 * così restano le stesse a ogni stagione e a ogni caricamento, anche dopo promozioni e retrocessioni.
 */
const rivals = new WeakMap<Record<ClubId, Club>, Map<ClubId, ClubId>>();
export function rivalOf(world: WorldState, id: ClubId): ClubId | undefined {
  let m = rivals.get(world.clubs);
  if (!m) {
    m = new Map();
    const ids = Object.keys(world.clubs).map(Number).sort((a, b) => hash(a) - hash(b));
    for (let i = 0; i + 1 < ids.length; i += 2) { m.set(ids[i]!, ids[i + 1]!); m.set(ids[i + 1]!, ids[i]!); }
    rivals.set(world.clubs, m);
  }
  return m.get(id);
}
export const isRivalry = (world: WorldState, a: ClubId, b: ClubId) => rivalOf(world, a) === b;

/** file .ics con le partite di un club: si importa in qualsiasi calendario */
export function ical(world: WorldState, fixtures: Fixture[]): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tactic FC Manager//IT', 'CALSCALE:GREGORIAN'];
  for (const fx of fixtures) {
    const d = gameDate(world.season, fx.day);
    const [hh, mm] = kickoff(world, fx).split(':');
    const start = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${hh}${mm}00`;
    const endH = pad(Number(hh) + 2);
    const h = world.clubs[fx.home]!, a = world.clubs[fx.away]!;
    const score = fx.result ? ` ${fx.result.hg}-${fx.result.ag}` : '';
    lines.push('BEGIN:VEVENT', `UID:tfm-${world.season}-${fx.day}-${fx.home}-${fx.away}@tfm27`, `DTSTART:${start}`,
      `DTEND:${start.slice(0, 9)}${endH}${mm}00`, `SUMMARY:${h.name} - ${a.name}${score}`, `LOCATION:${h.stadium.name}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** fa scaricare un file di testo (nel browser e in Electron) */
export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
