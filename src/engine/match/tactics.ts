// Moduli: posizione base di ogni ruolo sulla griglia 12x8 (GUIDA §6.1).
// Coordinate nel sistema "in attacco": x = 0 porta propria → 12 porta avversaria, y = 0..8 da destra a sinistra.
import type { FormationId, Position, Tactic } from '../model.ts';

/** wide: in possesso si comporta da esterno alto (quinto di centrocampo) anche se il ruolo è da terzino */
export type Slot = { pos: Position; x: number; y: number; wide?: boolean };

const GK: Slot = { pos: 'GK', x: 0.6, y: 4 };
const BACK4: Slot[] = [{ pos: 'DR', x: 3, y: 1.2 }, { pos: 'DC', x: 2.4, y: 3 }, { pos: 'DC', x: 2.4, y: 5 }, { pos: 'DL', x: 3, y: 6.8 }];
const TWO_ST: Slot[] = [{ pos: 'ST', x: 9.2, y: 3.2 }, { pos: 'ST', x: 9.2, y: 4.8 }];

export const FORMATIONS: Record<FormationId, Slot[]> = {
  '4-3-3': [GK, ...BACK4, { pos: 'DM', x: 4.6, y: 4 }, { pos: 'MC', x: 6, y: 2.6 }, { pos: 'MC', x: 6, y: 5.4 },
    { pos: 'AMR', x: 8.6, y: 1.3 }, { pos: 'ST', x: 9.6, y: 4 }, { pos: 'AML', x: 8.6, y: 6.7 }],
  '4-4-2': [GK, ...BACK4, { pos: 'MR', x: 6.2, y: 1.2 }, { pos: 'MC', x: 5.6, y: 3 }, { pos: 'MC', x: 5.6, y: 5 }, { pos: 'ML', x: 6.2, y: 6.8 }, ...TWO_ST],
  '4-2-3-1': [GK, ...BACK4, { pos: 'DM', x: 4.8, y: 3 }, { pos: 'DM', x: 4.8, y: 5 },
    { pos: 'AMR', x: 7.8, y: 1.3 }, { pos: 'AMC', x: 7.8, y: 4 }, { pos: 'AML', x: 7.8, y: 6.7 }, { pos: 'ST', x: 9.6, y: 4 }],
  '3-5-2': [GK, { pos: 'DC', x: 2.4, y: 2.2 }, { pos: 'DC', x: 2.2, y: 4 }, { pos: 'DC', x: 2.4, y: 5.8 },
    { pos: 'MR', x: 6, y: 0.9 }, { pos: 'MC', x: 5.8, y: 2.8 }, { pos: 'DM', x: 4.6, y: 4 }, { pos: 'MC', x: 5.8, y: 5.2 }, { pos: 'ML', x: 6, y: 7.1 }, ...TWO_ST],
  '5-3-2': [GK, { pos: 'DR', x: 3.4, y: 0.9, wide: true }, { pos: 'DC', x: 2.3, y: 2.4 }, { pos: 'DC', x: 2.1, y: 4 }, { pos: 'DC', x: 2.3, y: 5.6 }, { pos: 'DL', x: 3.4, y: 7.1, wide: true },
    { pos: 'MC', x: 5.6, y: 2.5 }, { pos: 'DM', x: 5, y: 4 }, { pos: 'MC', x: 5.6, y: 5.5 }, ...TWO_ST],
};

export const DEFAULT_TACTIC: Tactic = { formation: '4-3-3', mentality: 3, pressing: 1, tempo: 1, width: 1, line: 1, directness: 1 };
