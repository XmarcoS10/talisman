// Piani partita (Blocco 2b, intervento 10): scattano al minuto giusto e solo se il punteggio è quello previsto,
// una volta; cambiano mentalità e modulo per quella partita, poi la tattica del club torna com'era.
import { describe, expect, it } from 'vitest';
import { matchSetups } from '../match.ts';
import { Rng } from '../rng.ts';
import { newWorld } from '../world.ts';
import { runMatch } from './engine.ts';

const setup = () => {
  const w = newWorld(12);
  w.manager.clubId = -1;
  const [home, away] = w.competitions.ITA1!.clubIds;
  const club = w.clubs[home!]!;
  club.tactic.formation = '4-3-3';
  club.tactic.plans = [
    { name: 'Assalto', when: { score: 'behind', by: 1, from: 70 }, set: { mentality: 5, formation: '3-5-2' } },
    { name: 'Controllo', when: { score: 'ahead', by: 9, from: 30 }, set: { mentality: 1 } }, // non vale mai
  ];
  return { club, run: runMatch(new Rng(3), matchSetups(w, { day: 0, home: home!, away: away! })) };
};

describe('piani partita', () => {
  it('sotto dopo il 70\': scatta una volta, cambia mentalità e modulo, e a fine partita la tattica torna com\'era', () => {
    const { club, run } = setup();
    while (run.minute() < 69) run.tick();
    expect(run.events.some((e) => e.type === 'plan')).toBe(false);
    run.score[0] = 0; run.score[1] = 1; // la partita va così: sotto di uno
    while (run.minute() < 71) run.tick();
    const fired = run.events.filter((e) => e.type === 'plan');
    expect(fired).toHaveLength(1);
    expect(fired[0]).toMatchObject({ side: 0, plan: 'Assalto' });
    expect(fired[0]!.min).toBeGreaterThanOrEqual(70);
    expect(run.teams[0].baseMentality).toBe(5);
    expect(run.teams[0].on.filter((m) => m.pos === 'DC')).toHaveLength(3); // 3-5-2
    run.result();
    expect(run.events.filter((e) => e.type === 'plan')).toHaveLength(1); // il piano "sopra di 9" non vale mai
    expect(club.tactic.formation).toBe('4-3-3');
  });
});
