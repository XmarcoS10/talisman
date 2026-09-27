// Radiocronaca (0.5.0): tutte le frasi esistono in italiano e in inglese, i gol raccontati tornano col risultato,
// la stessa partita si racconta sempre allo stesso modo.
import { describe, expect, it } from 'vitest';
import { advance, newWorld } from '../../engine/world.ts';
import en from '../en.json' with { type: 'json' };
import it_ from '../it.json' with { type: 'json' };
import { RADIO_KEYS, radio } from './radio.ts';

describe('radiocronaca', () => {
  const w = newWorld(4);
  w.manager.clubId = -1;
  for (let i = 0; i < 3; i++) advance(w);
  const played = w.competitions.ITA1!.fixtures.filter((f) => f.result);

  it('ogni frase ha la sua versione in tutte e due le lingue', () => {
    expect(RADIO_KEYS.filter((k) => !(k in it_) || !(k in en))).toEqual([]);
  });

  it('dal fischio d\'inizio al finale, con i gol giusti e il punteggio che torna', () => {
    expect(played.length).toBeGreaterThan(20);
    for (const fx of played) {
      const lines = radio(w, fx);
      expect(lines[0]!.min).toBe(0);
      expect(lines.at(-1)!.text).toContain(`${fx.result!.hg}-${fx.result!.ag}`);
      const goals = fx.result!.events.filter((e) => e.type === 'goal' || e.type === 'penGoal').length;
      expect(lines.slice(0, -1).filter((l) => l.big).length).toBeGreaterThanOrEqual(goals); // l'ultima riga è il finale
      expect(lines.some((l) => l.text.includes('{'))).toBe(false); // nessun segnaposto rimasto scoperto
      expect(radio(w, fx)).toEqual(lines);
    }
  });
});
