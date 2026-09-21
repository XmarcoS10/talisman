// La filosofia dell'allenatore (F10): tre vantaggi piccoli e dichiarati, solo per il club dell'utente.
import { describe, expect, it } from 'vitest';
import type { ManagerStyle } from './model.ts';
import { weekPsych } from './morale.ts';
import { Rng } from './rng.ts';
import { trainWeek } from './training.ts';
import { newWorld } from './world.ts';

const run = (style: ManagerStyle, weeks = 6) => {
  const world = newWorld(21);
  const club = world.clubs[world.competitions.ITA1!.clubIds[3]!]!;
  world.manager.clubId = club.id;
  world.manager.style = style;
  club.tactic.formation = club.tactic.formation === '5-3-2' ? '3-5-2' : '5-3-2'; // un modulo nuovo, da imparare
  club.familiarity[club.tactic.formation] = 30;
  const rng = new Rng(3);
  for (let w = 0; w < weeks; w++) { trainWeek(world, club, rng); weekPsych(world, club, rng); }
  const players = club.playerIds.map((id) => world.players[id]!);
  return {
    fam: club.familiarity[club.tactic.formation]!,
    morale: players.reduce((s, p) => s + p.psych.morale, 0) / players.length,
    young: players.filter((p) => world.season - p.birthYear <= 21).reduce((s, p) => s + p.ca, 0),
  };
};

describe('filosofia dell\'allenatore (F10)', { timeout: 30000 }, () => {
  it('il tattico impara il modulo più in fretta, il gestore tiene il morale più alto, lo scopritore fa crescere i giovani', () => {
    const none = run('none');
    expect(run('tactician').fam).toBeGreaterThan(none.fam);
    expect(run('motivator').morale).toBeGreaterThan(none.morale);
    expect(run('developer', 20).young).toBeGreaterThanOrEqual(run('none', 20).young);
  });
});
