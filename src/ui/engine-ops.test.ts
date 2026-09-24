// Il motore nel worker (Blocco 2a): passare dal worker, col mondo in testo, deve dare esattamente lo stesso mondo che
// far girare tutto sul posto. Qui si prova `handle`, cioè quello che esegue il worker.
import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../engine/save.ts';
import { advance, beginMatchDay, finishMatchDay, isSeasonOver, newWorld } from '../engine/world.ts';
import { findFx, handle, keyOf } from './engine-ops.ts';
import { Rng } from '../engine/rng.ts';
import { runMatch } from '../engine/match/engine.ts';
import { matchSetups } from '../engine/match.ts';

const start = () => {
  const w = newWorld(11);
  w.manager.clubId = w.competitions.ITA1!.clubIds[4]!;
  return w;
};

describe('motore nel worker', { timeout: 60000 }, () => {
  it('una giornata passata dal worker è identica a quella giocata sul posto', () => {
    const a = start(), b = deserialize(serialize(start()));
    for (let i = 0; i < 3; i++) advance(a);
    let json = serialize(b);
    for (let i = 0; i < 3; i++) {
      const r = handle({ op: 'advance', world: json });
      if (r.op !== 'advance') throw new Error(r.op);
      json = r.world;
    }
    expect(json).toBe(serialize(a));
  });

  it('la partita guardata: aperta nel worker, giocata qui, chiusa nel worker, come beginMatchDay + finishMatchDay', () => {
    const a = start();
    while (!isSeasonOver(a) && !beginMatchDayProbe(a)) advance(a);
    const b = deserialize(serialize(a));
    // sul posto
    const live = beginMatchDay(a)!;
    const playedA = finishMatchDay(a, live).map(keyOf);
    // come fa l'interfaccia
    const o = handle({ op: 'open', world: serialize(b) });
    if (o.op !== 'open' || !o.open) throw new Error('nessuna partita');
    const w = deserialize(o.world);
    const rng = new Rng(o.open.rng);
    const out = runMatch(rng, matchSetups(w, findFx(w, o.open.fx), true), []).result();
    const c = handle({ op: 'close', world: serialize(w), day: o.open.day, fx: o.open.fx, rng: rng.s, out: structuredClone(out) });
    if (c.op !== 'close') throw new Error(c.op);
    expect(c.played).toEqual(playedA);
    expect(c.world).toBe(serialize(a));
  });
});

/** c'è una partita dell'utente da guardare? (senza toccare il mondo) */
function beginMatchDayProbe(w: ReturnType<typeof newWorld>) {
  return beginMatchDay(deserialize(serialize(w))) !== null;
}
