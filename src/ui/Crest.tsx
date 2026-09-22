// Stemma del club: quello caricato dal database dell'utente, altrimenti quello generato (procgen/crest.ts, GP1).
import type { Club } from '../engine/model.ts';
import { crestDataUri } from './procgen/crest.ts';

export function Crest({ club, size = 32 }: { club: Club; size?: number }) {
  return <img src={club.crest ?? crestDataUri(club, size)} width={size} height={size} alt="" draggable={false} style={{ flex: 'none' }} />;
}
