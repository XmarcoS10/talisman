// Ruoli (GUIDA §6.4): ogni ruolo è un insieme di tendenze che modificano posizioni e scelte nel motore.
// Numeri neutri: push 0, dy 0, hold 1, shoot 1, cross 1, dribble 0, direct 0, press 1.
// I ruoli di default (DEFAULT_ROLE) riproducono la taratura della F3: le differenze vengono solo dalle scelte dell'allenatore.
import type { Position } from '../model.ts';

export interface Role {
  pos: Position[]; // ruoli in cui si può usare
  follow: number; // in possesso: quanto segue la palla in avanti
  push: number; // in possesso: zone in più rispetto al modulo
  maxX: number; // fin dove si spinge
  runs: boolean; // attacca l'area negli ultimi 30 metri
  dy: number; // in possesso: + si allarga, − stringe verso il centro
  hold: number; // senza palla: >1 resta alto (rientra meno), <1 rientra di più
  shoot: number; // moltiplicatore della voglia di tirare
  cross: number; // moltiplicatore della voglia di crossare
  dribble: number; // bonus di utilità al dribbling
  direct: number; // bonus di verticalità nei passaggi
  press: number; // contributo alla pressione sul portatore
  aerial: number; // bonus quando si sceglie chi va di testa in area
  baseX: number; // in possesso: posizione di partenza minima (0 = quella del modulo)
  drain: number; // fatica: i ruoli che corrono di più si stancano prima
}

// nota di bilanciamento: hold > 1 (restare alti senza palla) dà uno sbocco al contropiede ma toglie un uomo alla
// difesa. Lo usa solo l'ala del 4-3-3 e del 4-2-3-1 (1,2, intervento 9): con le ali che rientravano del tutto
// il 4-3-3 batteva ogni modulo (1,66 punti a partita contro 1,2-1,4 degli altri)
const base: Omit<Role, 'pos'> = { follow: 0.5, push: 0, maxX: 8.5, runs: false, dy: 0, hold: 1, shoot: 1, cross: 1, dribble: 0, direct: 0, press: 1, aerial: 0, baseX: 0, drain: 1 };
const r = (pos: Position[], o: Partial<Role>): Role => ({ ...base, pos, ...o });
const FB: Position[] = ['DL', 'DR'];
const WIDE: Position[] = ['ML', 'MR'];
const WING_AM: Position[] = ['AML', 'AMR'];

export const ROLES = {
  // portieri
  gk: r(['GK'], {}),
  sweeperKeeper: r(['GK'], { direct: 0.003 }),
  // centrali
  cb: r(['DC'], {}),
  ballPlayingDef: r(['DC'], { direct: 0.004, push: 0.3 }),
  stopper: r(['DC'], { press: 1.3, drain: 1.05 }),
  // terzini
  fb: r(FB, { follow: 0.6, push: 0.6, maxX: 9.5 }),
  // in possesso il quinto parte almeno dalla linea dei centrocampisti (baseX), anche se nel modulo è un terzino
  wingBack: r([...FB, ...WIDE], { follow: 0.7, push: 1.0, maxX: 10.2, runs: true, cross: 1.2, dy: 0.3, baseX: 6.2, drain: 1.4 }),
  invertedFB: r(FB, { follow: 0.5, push: 0.2, maxX: 8.5, dy: -1.5, direct: 0.002 }),
  // mediani
  anchor: r(['DM'], { follow: 0.6 }),
  regista: r(['DM', 'MC'], { follow: 0.6, direct: 0.005, press: 0.9 }),
  ballWinner: r(['DM', 'MC'], { follow: 0.6, press: 1.2, direct: -0.002, drain: 1.1 }),
  // centrocampisti
  cm: r(['MC'], { follow: 0.7, push: 0.4, maxX: 10, runs: true }),
  mezzala: r(['MC'], { follow: 0.7, push: 0.7, maxX: 10.2, runs: true, dy: 0.9, shoot: 1.1, drain: 1.1 }),
  boxToBox: r(['MC'], { follow: 0.8, push: 0.6, maxX: 10.2, runs: true, press: 1.15, drain: 1.25 }),
  playmaker: r(['MC', 'AMC'], { follow: 0.6, push: 0.2, maxX: 9.5, direct: 0.004 }),
  // esterni
  wideMid: r(WIDE, { follow: 0.7, push: 1.4, maxX: 10.2, runs: true }),
  winger: r(WIDE, { follow: 0.7, push: 1.6, maxX: 10.3, runs: true, dy: 0.4, cross: 1.3, dribble: 0.003, drain: 1.15 }),
  wideForward: r(WING_AM, { follow: 0.5, maxX: 10.1, runs: true, hold: 1.2 }),
  defWinger: r(WIDE, { follow: 0.6, push: 0.6, maxX: 9.5, runs: false, hold: 0.9, press: 1.15 }),
  insideForward: r(WING_AM, { follow: 0.55, push: 0.3, maxX: 10.4, runs: true, dy: -0.8, shoot: 1.4, dribble: 0.004, cross: 0.8 }),
  // trequartisti
  am: r(['AMC'], { follow: 0.5, maxX: 10.1, runs: true }),
  shadowStriker: r(['AMC'], { follow: 0.55, push: 0.4, maxX: 10.4, runs: true, shoot: 1.2, drain: 1.1 }),
  enganche: r(['AMC'], { follow: 0.45, maxX: 9.6, direct: 0.005, press: 0.7, drain: 0.85 }),
  // punte
  advancedForward: r(['ST'], { follow: 0.35, maxX: 10.3 }),
  targetMan: r(['ST'], { follow: 0.3, maxX: 10.4, aerial: 5, dribble: -0.003 }),
  falseNine: r(['ST'], { follow: 0.4, push: -0.5, maxX: 9.8, direct: 0.005, shoot: 0.95, dribble: 0.002 }),
  poacher: r(['ST'], { follow: 0.35, maxX: 10.35, shoot: 1.1, press: 0.6, drain: 0.9 }),
} satisfies Record<string, Role>;

export type RoleId = keyof typeof ROLES;
export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

/** ruolo di default per posizione */
export const DEFAULT_ROLE: Record<Position, RoleId> = {
  GK: 'gk', DC: 'cb', DL: 'fb', DR: 'fb', DM: 'anchor', MC: 'cm', ML: 'wideMid', MR: 'wideMid',
  AMC: 'am', AML: 'wideForward', AMR: 'wideForward', ST: 'advancedForward',
};

export const rolesFor = (pos: Position) => ROLE_IDS.filter((id) => ROLES[id].pos.includes(pos));
export const validRole = (id: string | undefined, pos: Position): RoleId =>
  id && id in ROLES && ROLES[id as RoleId].pos.includes(pos) ? (id as RoleId) : DEFAULT_ROLE[pos];
