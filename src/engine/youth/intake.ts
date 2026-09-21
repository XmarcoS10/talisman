// Il vivaio (GUIDA §7.8): ogni estate arriva un'annata di ragazzi. Quanti e quanto buoni dipende da
// strutture, reclutamento, blasone e un po' di fortuna — con il colpo raro: un potenziale da campione
// anche in un club piccolo, la storia che racconterai agli amici.
import { BALANCE, YOUTH } from '../balance.ts';
import type { Club, Player, Position, WorldState } from '../model.ts';
import { addNews, pName } from '../news.ts';
import { makePlayer, pickNation } from '../players.ts';
import type { Rng } from '../rng.ts';
import { initRelations } from '../social.ts';
import { clamp } from '../util.ts';

// i ruoli di un'annata: più centrocampisti e difensori, pochi portieri, come nei settori giovanili veri
const ROLES: Position[] = ['GK', 'DC', 'DC', 'DL', 'DR', 'DM', 'MC', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR', 'ST', 'ST'];

/** quanti ragazzi arrivano quest'anno */
export const intakeSize = (club: Club, rng: Rng) =>
  YOUTH.base + Math.round(club.youth.recruitment * YOUTH.perRecruitment) + (rng.next() < YOUTH.extraP ? 1 : 0);

/** il potenziale di un ragazzo del vivaio, col colpo di fortuna raro */
export function youthPa(club: Club, rng: Rng): { pa: number; jackpot: boolean } {
  if (rng.next() < YOUTH.jackpotP) return { pa: rng.int(YOUTH.jackpotPa[0], YOUTH.jackpotPa[1]), jackpot: true };
  const mean = YOUTH.paBase + club.youth.facilities * YOUTH.paFacilities + club.reputation * YOUTH.paRep;
  return { pa: Math.round(clamp(rng.gauss(mean, YOUTH.paSigma), 60, 200)), jackpot: false };
}

/** l'annata di un club: ragazzi di 15-16 anni, per lo più del paese della lega */
export function intake(world: WorldState, rng: Rng, club: Club): Player[] {
  const out: Player[] = [];
  const n = intakeSize(club, rng);
  const foreign = club.youth.recruitment * YOUTH.foreignPerRecruitment;
  for (let i = 0; i < n; i++) {
    const pos = rng.pick(ROLES);
    const nation = rng.next() < foreign ? pickNation(rng) : 'ITA';
    const p = makePlayer(rng, world.nextPlayerId++, pos, BALANCE.caFromReputation(club.reputation), world.season, [YOUTH.age[0], YOUTH.age[1]], nation);
    const { pa, jackpot } = youthPa(club, rng);
    p.pa = Math.max(p.ca, pa);
    p.contract.until = world.season + 3;
    p.clubId = club.id;
    world.players[p.id] = p;
    club.playerIds.push(p.id);
    out.push(p);
    if (jackpot && club.id === world.manager.clubId) addNews(world, 'news.youth.jackpot', { name: pName(p) });
  }
  initRelations(world, club, rng, out);
  return out;
}

/** l'estate del vivaio per tutti i club; all'utente arriva la notizia col migliore dell'annata */
export function yearlyIntake(world: WorldState, rng: Rng) {
  for (const club of Object.values(world.clubs)) {
    const kids = intake(world, rng, club);
    if (club.id !== world.manager.clubId || !kids.length) continue;
    world.intake.push({ season: world.season, clubId: club.id, playerIds: kids.map((p) => p.id) });
    if (world.intake.length > 6) world.intake.shift();
    const best = [...kids].sort((a, b) => b.pa - a.pa)[0]!;
    addNews(world, 'news.youth.intake', { n: kids.length, name: pName(best) });
  }
}

/** minutaggio dei giovani: chi ha meno di 21 (o 23) anni e quanto sta giocando (§7.8, gestione dei minuti) */
export function youngsters(world: WorldState, club: Club, maxAge = 21) {
  return club.playerIds.map((id) => world.players[id]!)
    .filter((p) => world.season - p.birthYear <= maxAge)
    .sort((a, b) => b.pa - a.pa);
}
