// Il motore nel Web Worker (Blocco 2a, docs/design/motore-v2.md D3): giornata, fine stagione, apertura e chiusura della
// giornata seguita girano fuori dal thread dell'interfaccia, che così non si blocca. Le partite tornano come chiavi e si
// ritrovano nel mondo nuovo. Se il worker non c'è o si rompe, la stessa funzione gira qui: il gioco rallenta ma non si ferma.
import { deserialize, serialize } from '../engine/save.ts';
import type { SimOutput } from '../engine/match/engine.ts';
import { matchSetups } from '../engine/match.ts';
import { runMatch } from '../engine/match/engine.ts';
import type { WorldState } from '../engine/model.ts';
import { Rng } from '../engine/rng.ts';
import type { LiveDay } from '../engine/world.ts';
import { findFx, handle, keyOf, type Req, type Res } from './engine-ops.ts';

let worker: Worker | null = null;
let broken = typeof Worker === 'undefined';
let next = 1;
const waiting = new Map<number, { ok: (r: Res) => void; ko: (e: unknown) => void }>();

function start(): Worker | null {
  if (worker || broken) return worker;
  try {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; res?: Res; error?: string }>) => {
      const w = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      if (e.data.res) w?.ok(e.data.res); else w?.ko(new Error(e.data.error));
    };
    worker.onerror = (e) => { console.error('Worker del motore', e.message); broken = true; for (const w of waiting.values()) w.ko(e); waiting.clear(); };
  } catch (e) { console.error('Worker del motore non disponibile', e); broken = true; }
  return worker;
}

async function call(req: Req): Promise<Res> {
  const w = start();
  if (w) {
    try {
      return await new Promise<Res>((ok, ko) => { const id = next++; waiting.set(id, { ok, ko }); w.postMessage({ id, req }); });
    } catch (e) { console.error('Il worker del motore ha fallito, si prosegue sul thread principale', e); }
  }
  return handle(req);
}

const as = <O extends Res['op']>(r: Res, op: O) => r as Extract<Res, { op: O }>; // call risponde con la stessa op della richiesta

export async function advanceWorld(world: WorldState) {
  const r = as(await call({ op: 'advance', world: serialize(world) }), 'advance');
  const w = deserialize(r.world);
  return { world: w, json: r.world, played: r.played.map((k) => findFx(w, k)) };
}

export async function endSeasonWorld(world: WorldState) {
  const r = as(await call({ op: 'endSeason', world: serialize(world) }), 'endSeason');
  return { world: deserialize(r.world), json: r.world, summary: r.summary };
}

/** apre la giornata dell'utente nel worker; la partita da guardare si gioca qui, azione per azione (Live) */
export async function openDay(world: WorldState): Promise<{ world: WorldState; live: LiveDay | null }> {
  const r = as(await call({ op: 'open', world: serialize(world) }), 'open');
  const w = deserialize(r.world);
  if (!r.open) return { world: w, live: null };
  const fx = findFx(w, r.open.fx), rng = new Rng(r.open.rng);
  return { world: w, live: { day: r.open.day, fx, rng, run: runMatch(rng, matchSetups(w, fx, true), []) } };
}

/** chiude la giornata seguita: la partita finisce qui, il resto (le altre partite, i giorni dopo) nel worker */
export async function closeDay(world: WorldState, live: LiveDay) {
  const out: SimOutput = live.run.result(); // prima il risultato: finire la partita consuma ancora casualità
  const req: Req = { op: 'close', world: serialize(world), day: live.day, fx: keyOf(live.fx), rng: live.rng.s, out };
  const r = as(await call(req), 'close');
  const w = deserialize(r.world);
  return { world: w, json: r.world, played: r.played.map((k) => findFx(w, k)) };
}
