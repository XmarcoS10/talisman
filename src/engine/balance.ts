// Tutte le costanti di calibrazione in un unico file (GUIDA §11.3).
// Si tarano guardando il report di `pnpm sim`, mai a occhio nel codice.
import type { Position } from './model.ts';

export const BALANCE = {
  // --- generazione ---
  caFromReputation: (rep: number) => 48 + rep * 1.08, // CA medio della rosa per reputazione club
  caSpread: 13,
  ageMean: 26,
  ageSigma: 4.5,
  youthPenaltyPerYear: 6, // CA in meno per ogni anno sotto i 22

  // --- sviluppo a fine stagione (settimanale dalla F5) ---
  growthUntil: 23,
  declineFrom: 30,
  retireFrom: 33,
} as const;

// --- motore partita L2 (GUIDA §6) ---
// Unità: il campo è 12x8 zone (1 zona ≈ 8,75 m in lunghezza, 8,5 m in larghezza). "logit" = argomento della sigmoide.
export const MATCH = {
  // durata delle azioni (secondi di gioco)
  passTime: 3.8, // + passTimePerZone per zona di distanza
  passTimePerZone: 0.5,
  dribbleTime: 3.5,
  turnoverTime: 2,
  restartTime: 22, // palla inattiva: rimessa, rinvio dal fondo, punizione
  goalTime: 55, // esultanza + calcio d'inizio

  // valore del possesso (expected threat): xT(x) = xtA·e^(xtB·x), ridotto verso le fasce
  xtA: 0.0006,
  xtB: 0.45,
  xtWing: 0.05, // riduzione per zona di distanza dal centro
  lossWeight: 0.6, // quanto pesa perdere palla: valore regalato all'avversario
  possessionValue: 0.03, // K: valore di avere la palla in sé (azioni future, gestione): rende prudenti

  // passaggio: logit di riuscita = base − dist·d − corsia − marcatura − pressione + abilità
  passBase: 4.0,
  passDist: 0.45,
  passLane: 0.8, // difensori vicini alla linea di passaggio
  passMark: 0.9, // difensori vicini al ricevitore
  passPress: 0.35,
  passSkill: 0.06, // per punto di Passaggio sopra/sotto 11
  passVision: 0.05, // Visione, solo sui passaggi lunghi
  passTouch: 0.06, // Primo controllo del ricevitore
  laneRadius: 0.9,
  markRadius: 1.5,
  pressRadius: 1.4,
  runSpeed: 0.55, // zone al secondo con cui un giocatore raggiunge la sua posizione (≈ 4,8 m/s di media)
  offBallMove: 1.2, // ampiezza (zone) degli smarcamenti casuali di chi attacca
  patience: 0.0015, // voglia di verticalizzare in più per ogni passaggio consecutivo oltre il 5°
  boxRun: 0.6, // zone di inserimento in area (× Inserimenti/20) per centrocampisti e trequartisti
  defCompact: 0.75, // senza palla: quanto si accorcia il modulo verso la propria porta (1 = per niente)
  mentalityCompact: 0.04, // per livello di mentalità: più offensiva = meno uomini che rientrano
  mentalityPush: 0.1, // zone in avanti in possesso per livello di mentalità
  mentalityCover: 0.15, // per livello: impegno difensivo in meno (pressione, corsie, marcature)
  mentalityRisk: 0.04, // per livello: quanto meno pesa perdere palla
  mentalityShot: 0.04, // per livello: voglia di tirare
  markTightness: 0.75, // quanto i difensori stringono sull'uomo nella propria metà campo
  markGoalSide: 0.35, // distanza tenuta tra uomo e porta
  spareStepUp: 1.2, // zone di cui avanza un difensore senza uomo da marcare
  // palla in profondità
  gkLineX: 11.2, // fin dove si spinge l'attaccante in corsa prima che esca il portiere
  throughDepth: 1.5, // zone guadagnate alle spalle della linea
  throughBase: -0.6,
  throughRace: 0.1, // per punto di velocità in più dell'attaccante rispetto al difensore
  throughOffside: 0.12,
  offsideWindow: 0.6, // zone prima della linea difensiva in cui un inserimento rischia il fuorigioco
  offsideBase: 0.03,
  offsidePerZone: 0.15, // per zona oltre la linea difensiva

  // dribbling
  dribBase: 0.1,
  dribSkill: 0.09,
  dribDef: 0.08,
  dribPress: 0.9,
  dribGain: 1.0, // zone guadagnate

  // tiro e xG (§6.3): logit = base + angolo·a − distanza_m·d − pressione·p (+ colpo di testa)
  shotMinX: 7,
  xgBase: -1.33,
  xgAngle: 1.6,
  xgDist: 0.1,
  xgPress: 0.45,
  xgHeader: -0.9,
  penaltyXg: 0.76,
  shotSkill: 0.025, // Finalizzazione: moltiplicatore sulla probabilità di gol
  gkSkill: 0.025, // Portiere: riduzione
  onTargetBase: 0.25,
  onTargetXg: 0.3,
  blockedShare: 0.25,

  // cross e piazzati
  crossMinX: 8.3,
  crossBase: 0.2,
  crossSkill: 0.1,
  crossAtt: 0.35, // per attaccante in area
  crossDef: 0.25, // per difensore in area
  crossPress: 0.5,
  headerXg: 0.1,
  cornerAfterSave: 0.45,
  cornerAfterBlock: 0.5,
  cornerAfterClear: 0.6,
  cornerHeader: 0.3,
  cornerHeaderXg: 0.07,
  fkShot: 0.4,
  fkXg: 0.05,

  // scelta dell'opzione (§6.2 punto 4): softmax con temperatura
  tempBase: 0.008,
  tempDecisions: 0.04, // per punto di Decisioni sotto 11
  tempPressure: 0.25,
  directnessK: 0.004, // bonus per zona guadagnata, scalato dall'istruzione "verticalità"
  shotBias: 0.86,

  // contrasti, falli, cartellini, infortuni
  foulBase: 0.3,
  foulAggression: 0.05,
  foulInBox: 0.12, // in area si entra con più cautela
  pressFoul: 0.045, // fallo "di pressione" per unità di pressione, a ogni azione
  yellowP: 0.18,
  bookedCaution: 0.35, // probabilità di giallo ridotta per chi è già ammonito
  redP: 0.003,
  injuryOnFoul: 0.025,
  injuryPerPlayer: 0.006, // infortunio "senza contatto" per giocatore a partita
  injuryMeanDays: 14,

  // condizione fisica
  drainBase: 0.22, // energia persa al minuto
  drainStamina: 0.25, // in più con Resistenza bassa
  energySkill: 0.012, // logit perso per ogni punto di energia sotto 100
  fitnessRecoveryPerDay: 12,
  subMinutes: [58, 68, 78],
  subEnergy: 74,
  maxSubs: 5,
  benchSize: 9,

  // momentum (§6.5)
  momentumGoal: 25,
  momentumShot: 3,
  momentumDecay: 0.97,
  momentumK: 0.15, // logit massimo dato dal momentum, attenuato dalla Compostezza

  homeBoost: 0.12, // logit in più per la squadra di casa (pubblico)
  protectLeadFrom: 55, // minuto da cui chi è in vantaggio abbassa la mentalità di 1
  chaseFrom: 60, // minuto da cui chi è sotto la alza di 1 (di 2 dal 75')
} as const;

// Rosa tipo per ruolo naturale (25 giocatori: 3 POR, 8 DIF, 8 CEN, 6 ATT)
export const SQUAD_TEMPLATE: Record<Position, number> = {
  GK: 3, DL: 2, DC: 4, DR: 2, DM: 2, ML: 1, MC: 3, MR: 1, AML: 1, AMC: 1, AMR: 1, ST: 4,
};

// ruoli vicini: familiarità secondaria
export const ADJACENT: Partial<Record<Position, Position[]>> = {
  DL: ['ML'], DR: ['MR'], DC: ['DM'], DM: ['MC', 'DC'], MC: ['DM', 'AMC'],
  ML: ['AML', 'DL'], MR: ['AMR', 'DR'], AMC: ['MC', 'ST'], AML: ['ML', 'ST'], AMR: ['MR', 'ST'], ST: ['AMC'],
};
