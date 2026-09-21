// Salvataggi: 5 slot con nome e tempo di gioco + esporta/importa la carriera su file.
// In Electron gli slot sono file veri nella cartella dati dell'app (electron/preload.cjs): il localStorage regge
// circa 5 milioni di caratteri per tutta l'app, e tre carriere dopo qualche stagione lo superano.
// Nel browser (pnpm dev) resta il localStorage.
import type { WorldState } from '../engine/model.ts';
import { deserialize, migrate, serialize, type Raw } from '../engine/save.ts';

interface SavesFs { read(name: string): string | null; head(name: string): string | null; write(name: string, data: string): boolean; remove(name: string): boolean; dir(): string; size(name: string): number; open(): Promise<string> }
declare global { interface Window { talismanFs?: SavesFs } }

/** dove stanno gli slot: file se siamo in Electron, altrimenti localStorage */
const disk = typeof window !== 'undefined' ? window.talismanFs : undefined;

function readSlot(k: string): string | null {
  if (!disk) return localStorage.getItem(k);
  const onDisk = disk.read(k);
  if (onDisk !== null) return onDisk;
  // prima volta con i file: si copia lo slot dal localStorage, che resta com'è come copia di riserva
  const old = localStorage.getItem(k);
  if (old !== null && disk.write(k, old)) return old;
  return old;
}

function writeSlot(k: string, v: string): boolean {
  if (!disk) { localStorage.setItem(k, v); return true; }
  return disk.write(k, v);
}

function removeSlot(k: string) {
  disk?.remove(k);
  localStorage.removeItem(k); // anche la riserva, se no alla prossima lettura lo slot risorgerebbe
}

/** la cartella dei salvataggi, per dirla all'utente (null nel browser) */
export const savesDir = () => disk?.dir() ?? null;

export const SLOTS = [1, 2, 3, 4, 5] as const;
export type Slot = (typeof SLOTS)[number];
const key = (s: Slot) => `talisman-save-${s}`;
const CURRENT = 'talisman-slot';
const LEGACY = 'talisman-save'; // salvataggio unico delle prime versioni

export interface SlotInfo { slot: Slot; manager: string; clubId: number; clubName: string; season: number; day: number; savedAt: number; label?: string; playMs?: number }

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

type Meta = Omit<SlotInfo, 'slot' | 'savedAt'>;
const SPLIT = ',"data":';

/**
 * formato dello slot (dalla versione 2): {"v":2,"savedAt":…,"meta":{…},"data":<il mondo>}.
 * L'intestazione sta prima del mondo, così l'elenco degli slot legge pochi byte invece di 100 MB;
 * il mondo è JSON vero dentro JSON, non un testo da rileggere una seconda volta.
 * Gli slot vecchi ({savedAt, data: "<testo>"}) si leggono ancora.
 */
function header(raw: string): { savedAt: number; meta: Meta } | null {
  const cut = raw.indexOf(SPLIT);
  if (!raw.startsWith('{"v":2') || cut < 0) return null;
  return JSON.parse(`${raw.slice(0, cut)}}`) as { savedAt: number; meta: Meta };
}

export function slotInfo(s: Slot): SlotInfo | null {
  migrateLegacy();
  return safe(() => {
    const head = disk?.head(key(s)) ?? null;
    const h = head !== null ? header(head) : null;
    if (h) return { slot: s, savedAt: h.savedAt, ...h.meta };
    // slot vecchio (o non ancora copiato su file): si legge tutto, come prima
    const raw = readSlot(key(s));
    if (!raw) return null;
    const h2 = header(raw);
    if (h2) return { slot: s, savedAt: h2.savedAt, ...h2.meta };
    const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: string };
    const w = JSON.parse(data) as WorldState;
    const club = w.clubs[w.manager.clubId];
    return { slot: s, manager: w.manager.name, clubId: w.manager.clubId, clubName: club?.name ?? '?', season: w.season, day: w.day, savedAt };
  }, null);
}

/**
 * tempo di gioco della carriera aperta: quello salvato più quello passato da quando la si è aperta.
 * È una comodità dell'interfaccia (sta nell'intestazione dello slot), non fa parte del mondo.
 */
let play = { base: 0, since: Date.now(), label: '' };
export const startClock = (base = 0, label = '') => { play = { base, since: Date.now(), label }; };
export const playTime = () => play.base + Date.now() - play.since;

export function saveTo(s: Slot, w: WorldState): boolean {
  const meta: Meta = { manager: w.manager.name, clubId: w.manager.clubId, clubName: w.clubs[w.manager.clubId]?.name ?? '?', season: w.season, day: w.day,
    playMs: playTime(), ...(play.label ? { label: play.label } : {}) };
  return safe(() => writeSlot(key(s), `{"v":2,"savedAt":${Date.now()},"meta":${JSON.stringify(meta)}${SPLIT}${serialize(w)}}`), false);
}

export function loadFrom(s: Slot): WorldState | null {
  migrateLegacy();
  return safe(() => {
    const raw = readSlot(key(s));
    if (!raw) return null;
    const slot = JSON.parse(raw) as { data: string | Raw; meta?: Meta };
    startClock(slot.meta?.playMs ?? 0, slot.meta?.label ?? '');
    return typeof slot.data === 'string' ? deserialize(slot.data) : migrate(slot.data);
  }, null);
}

/** dà un nome allo slot: si riscrive solo l'intestazione, il mondo resta com'è */
export function renameSlot(s: Slot, label: string): boolean {
  return safe(() => {
    const raw = readSlot(key(s));
    const h = raw ? header(raw) : null;
    if (!raw || !h) return false;
    if (s === currentSlot()) play.label = label;
    const meta = { ...h.meta, label };
    return writeSlot(key(s), `{"v":2,"savedAt":${h.savedAt},"meta":${JSON.stringify(meta)}${raw.slice(raw.indexOf(SPLIT))}`);
  }, false);
}

/** peso dello slot in byte (0 se vuoto) */
export function slotSize(s: Slot): number {
  return safe(() => (disk ? disk.size(key(s)) : (localStorage.getItem(key(s))?.length ?? 0)), 0);
}

/** apre la cartella dei salvataggi (solo nell'app desktop) */
export const openSavesDir = () => { void disk?.open(); };

export function deleteSlot(s: Slot) {
  safe(() => removeSlot(key(s)), undefined);
}

/** scarica il salvataggio come file */
export function exportFile(w: WorldState, clubName: string) {
  const blob = new Blob([serialize(w)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carriera-${clubName.replace(/[^\w]+/g, '-').toLowerCase()}-${w.season}.tfm`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** legge un file di salvataggio (passa dalle migrazioni, quindi anche file vecchi) */
export async function importFile(file: File): Promise<WorldState> {
  return deserialize(await file.text());
}
