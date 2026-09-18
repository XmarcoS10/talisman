// Salvataggi: 3 slot nel browser/Electron (localStorage) + esporta/importa su file .json.
// ponytail: localStorage regge ~5 MB (un mondo ne pesa ~1-2); file veri via preload Electron quando il mondo crescerà.
import type { WorldState } from '../engine/model.ts';
import { deserialize, serialize } from '../engine/save.ts';

export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];
const key = (s: Slot) => `talisman-save-${s}`;
const CURRENT = 'talisman-slot';
const LEGACY = 'talisman-save'; // salvataggio unico delle prime versioni

export interface SlotInfo { slot: Slot; manager: string; clubId: number; clubName: string; season: number; day: number; savedAt: number }

function safe<T>(f: () => T, fallback: T): T {
  try { return f(); } catch { return fallback; }
}

/** porta il vecchio salvataggio unico nello slot 1 (una volta sola) */
function migrateLegacy() {
  safe(() => {
    const old = localStorage.getItem(LEGACY);
    if (old && !localStorage.getItem(key(1))) localStorage.setItem(key(1), JSON.stringify({ savedAt: Date.now(), data: old }));
    localStorage.removeItem(LEGACY);
  }, undefined);
}

export function currentSlot(): Slot {
  const v = Number(safe(() => localStorage.getItem(CURRENT), null));
  return (SLOTS as readonly number[]).includes(v) ? (v as Slot) : 1;
}

export function setCurrentSlot(s: Slot) {
  safe(() => localStorage.setItem(CURRENT, String(s)), undefined);
}

export function slotInfo(s: Slot): SlotInfo | null {
  migrateLegacy();
  return safe(() => {
    const raw = localStorage.getItem(key(s));
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: string };
    const w = JSON.parse(data) as WorldState; // lettura leggera: solo i campi per l'elenco
    const club = w.clubs[w.manager.clubId];
    return { slot: s, manager: w.manager.name, clubId: w.manager.clubId, clubName: club?.name ?? '?', season: w.season, day: w.day, savedAt };
  }, null);
}

export function saveTo(s: Slot, w: WorldState): boolean {
  return safe(() => { localStorage.setItem(key(s), JSON.stringify({ savedAt: Date.now(), data: serialize(w) })); return true; }, false);
}

export function loadFrom(s: Slot): WorldState | null {
  migrateLegacy();
  return safe(() => {
    const raw = localStorage.getItem(key(s));
    return raw ? deserialize((JSON.parse(raw) as { data: string }).data) : null;
  }, null);
}

export function deleteSlot(s: Slot) {
  safe(() => localStorage.removeItem(key(s)), undefined);
}

/** scarica il salvataggio come file */
export function exportFile(w: WorldState, clubName: string) {
  const blob = new Blob([serialize(w)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `talisman-${clubName.replace(/[^\w]+/g, '-').toLowerCase()}-${w.season}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** legge un file di salvataggio (passa dalle migrazioni, quindi anche file vecchi) */
export async function importFile(file: File): Promise<WorldState> {
  return deserialize(await file.text());
}
