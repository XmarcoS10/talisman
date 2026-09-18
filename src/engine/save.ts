// Salvataggi versionati (GUIDA §2.5): ogni save ha schemaVersion e passa dalla catena di migrazioni.
import type { WorldState } from './model.ts';

export const SCHEMA_VERSION = 1;

// MIGRATIONS[n] porta un save dalla versione n+1 alla n+2. Mai modificarne una già pubblicata.
type Raw = Record<string, unknown> & { schemaVersion: number };
const MIGRATIONS: ((w: Raw) => void)[] = [];

export function serialize(world: WorldState): string {
  return JSON.stringify(world);
}

export function deserialize(json: string): WorldState {
  const raw = JSON.parse(json) as Raw;
  if (typeof raw.schemaVersion !== 'number') throw new Error('Salvataggio non valido');
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('Salvataggio creato da una versione più recente del gioco');
  while (raw.schemaVersion < SCHEMA_VERSION) {
    MIGRATIONS[raw.schemaVersion - 1]!(raw);
    raw.schemaVersion++;
  }
  return raw as unknown as WorldState; // struttura garantita dalla catena di migrazioni
}
