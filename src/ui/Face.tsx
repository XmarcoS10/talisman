// Volto del giocatore (procgen/face.ts, GP3), con la maglia del suo club.
import type { Player, WorldState } from '../engine/model.ts';
import { age } from '../engine/players.ts';
import { faceDataUri } from './procgen/face.ts';

export function Face({ world, p, width = 96 }: { world: WorldState; p: Player; width?: number }) {
  const club = p.clubId !== null ? world.clubs[p.clubId] : undefined;
  return <img className="face" src={faceDataUri(p, age(p, world.season), club)} width={width} height={width * 1.5} alt="" draggable={false} />;
}
