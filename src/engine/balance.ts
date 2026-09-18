// Tutte le costanti di calibrazione in un unico file (GUIDA §11.3).
// Si tarano guardando il report di `pnpm sim`, mai a occhio nel codice.
import type { Position } from './model.ts';

export const BALANCE = {
  // --- partita L0 (Poisson) --- tarati il 18/09/2026: gol 2.65, casa 44%, r 0.80-0.84
  goalBase: 1.26, // gol attesi per squadra a forze pari
  strengthK: 0.011, // peso di 1 punto di differenza di forza (scala CA)
  formSigma: 0.3, // giornata storta/ispirata: rumore log-normale sui gol attesi di ogni squadra
  homeAdv: 1.12,
  awayAdv: 0.9,
  assistChance: 0.75,

  // --- generazione ---
  caFromReputation: (rep: number) => 38 + rep * 1.25, // CA medio della rosa per reputazione club
  caSpread: 13,
  ageMean: 26,
  ageSigma: 4.5,
  youthPenaltyPerYear: 6, // CA in meno per ogni anno sotto i 22

  // --- sviluppo a fine stagione (settimanale dalla F5) ---
  growthUntil: 23,
  declineFrom: 30,
  retireFrom: 33,
} as const;

// Rosa tipo per ruolo naturale (25 giocatori: 3 POR, 8 DIF, 8 CEN, 6 ATT)
export const SQUAD_TEMPLATE: Record<Position, number> = {
  GK: 3, DL: 2, DC: 4, DR: 2, DM: 2, ML: 1, MC: 3, MR: 1, AML: 1, AMC: 1, AMR: 1, ST: 4,
};

// 4-3-3 di default finché non c'è la tattica (F3/F4)
export const DEFAULT_FORMATION: Position[] = ['GK', 'DR', 'DC', 'DC', 'DL', 'DM', 'MC', 'MC', 'AMR', 'ST', 'AML'];

// peso di ogni ruolo nella forza offensiva/difensiva della squadra
export const ATTACK_W: Partial<Record<Position, number>> = { ST: 1, AML: 1, AMR: 1, AMC: 1, MC: 0.6, ML: 0.7, MR: 0.7, DM: 0.3, DL: 0.2, DR: 0.2 };
export const DEFENCE_W: Partial<Record<Position, number>> = { GK: 1.2, DC: 1, DL: 0.8, DR: 0.8, DM: 0.8, MC: 0.4, ML: 0.3, MR: 0.3 };
export const SCORER_W: Record<Position, number> = { GK: 0, DL: 0.35, DC: 0.45, DR: 0.35, DM: 0.5, ML: 1.2, MC: 1, MR: 1.2, AML: 2.5, AMC: 2.5, AMR: 2.5, ST: 5 };
export const ASSIST_W: Record<Position, number> = { GK: 0.05, DL: 1, DC: 0.3, DR: 1, DM: 1, ML: 2, MC: 2, MR: 2, AML: 3, AMC: 3, AMR: 3, ST: 1.5 };

// ruoli vicini: familiarità secondaria
export const ADJACENT: Partial<Record<Position, Position[]>> = {
  DL: ['ML'], DR: ['MR'], DC: ['DM'], DM: ['MC', 'DC'], MC: ['DM', 'AMC'],
  ML: ['AML', 'DL'], MR: ['AMR', 'DR'], AMC: ['MC', 'ST'], AML: ['ML', 'ST'], AMR: ['MR', 'ST'], ST: ['AMC'],
};
