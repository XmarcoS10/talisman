// Amichevoli estive (F10): tre partite di preparazione per il club dell'utente, giocate col motore vero ma senza
// lasciare traccia nelle statistiche. La condizione estiva la dà già la preparazione (TRAIN.sharpPreseason).
// Usano un generatore tutto loro (seme del mondo + stagione): non toccano il caso del resto del mondo.
import { simulate } from './match/engine.ts';
import { matchSetups } from './match.ts';
import type { Fixture, WorldState } from './model.ts';
import { Rng } from './rng.ts';

const DAYS = [-20, -12, -5]; // giorni prima dell'inizio del campionato

export function preseason(world: WorldState) {
  const me = world.manager.clubId;
  if (!world.clubs[me]) return;
  const rng = new Rng((world.seed ^ 0x51f15e) + world.season * 101);
  const others = rng.shuffle(Object.values(world.clubs).filter((c) => c.id !== me).map((c) => c.id)).slice(0, DAYS.length);
  world.friendlies = {
    season: world.season,
    games: others.map((opp, i) => {
      const home = i % 2 === 0;
      const fx: Fixture = { day: DAYS[i]!, home: home ? me : opp, away: home ? opp : me };
      const { result } = simulate(rng, matchSetups(world, fx));
      return { day: fx.day, opp, home, gf: home ? result.hg : result.ag, ga: home ? result.ag : result.hg };
    }),
  };
}
