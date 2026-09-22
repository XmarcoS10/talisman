// Maglia del club (procgen/kit.ts, GP2): prima o seconda, col numero se serve.
import type { Club } from '../engine/model.ts';
import { kitDataUri } from './procgen/kit.ts';

export function Kit({ club, away = false, number, size = 40, title }: { club: Club; away?: boolean; number?: number; size?: number; title?: string }) {
  return <img src={kitDataUri(club, { away, number, size })} width={size} height={size} alt={title ?? ''} title={title} draggable={false} style={{ flex: 'none' }} />;
}
