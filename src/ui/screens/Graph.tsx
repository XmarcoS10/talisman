import { useMemo, useState } from 'react';
import type { Club, Player, WorldState } from '../../engine/model.ts';
import { shortName } from '../bits.tsx';

const W = 640, H = 460;
export const moraleClass = (m: number) => (m < 40 ? 'bad' : m < 60 ? 'mid' : 'good');

/** disposizione force-directed (Fruchterman-Reingold): gli amici si avvicinano, i rivali si respingono. Deterministica. */
function layout(players: Player[]): Map<number, { x: number; y: number }> {
  const n = players.length;
  const pos = players.map((_, i) => ({ x: W / 2 + Math.cos((i / n) * 2 * Math.PI) * 180, y: H / 2 + Math.sin((i / n) * 2 * Math.PI) * 150 }));
  const k = Math.sqrt((W * H) / n) * 0.75;
  for (let it = 0, temp = 40; it < 250; it++, temp *= 0.985) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i]!.x - pos[j]!.x, dy = pos[i]!.y - pos[j]!.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const s = players[i]!.rel[players[j]!.id] ?? 0;
        // repulsione per tutti, attrazione solo per chi si vuole bene; i rivali si respingono di più
        const f = (k * k) / d * (s < 0 ? 1.6 : 1) - (s > 0 ? ((d * d) / k) * (s / 100) : 0);
        disp[i]!.x += (dx / d) * f; disp[i]!.y += (dy / d) * f;
        disp[j]!.x -= (dx / d) * f; disp[j]!.y -= (dy / d) * f;
      }
    pos.forEach((p, i) => {
      const d = disp[i]!;
      const l = Math.max(1, Math.sqrt(d.x * d.x + d.y * d.y));
      p.x = Math.max(40, Math.min(W - 40, p.x + (d.x / l) * Math.min(l, temp) + (W / 2 - p.x) * 0.01));
      p.y = Math.max(30, Math.min(H - 30, p.y + (d.y / l) * Math.min(l, temp) + (H / 2 - p.y) * 0.01));
    });
  }
  return new Map(players.map((p, i) => [p.id, pos[i]!]));
}

export function Graph({ world, club, infl, onPlayer }: { world: WorldState; club: Club; infl: Map<number, number>; onPlayer: (id: number) => void }) {
  const players = club.playerIds.map((id) => world.players[id]!);
  const key = players.map((p) => `${p.id}:${Object.entries(p.rel).map(([a, s]) => `${a}=${Math.round(s / 10)}`).join()}`).join('|');
  const pos = useMemo(() => layout(players), [key]); // si ricalcola solo quando cambia il grafo
  const [hover, setHover] = useState<number | null>(null);
  const feud = (a: number, b: number) => club.feuds.some((f) => (f.a === a && f.b === b) || (f.a === b && f.b === a));
  const edges: { a: Player; b: Player; s: number }[] = [];
  for (const a of players) for (const [id, s] of Object.entries(a.rel)) {
    const b = world.players[Number(id)];
    if (b && b.clubId === club.id && a.id < b.id && Math.abs(s) >= 25) edges.push({ a, b, s });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="graph" role="img">
      {edges.map(({ a, b, s }) => {
        const pa = pos.get(a.id), pb = pos.get(b.id);
        if (!pa || !pb) return null;
        const dim = hover !== null && hover !== a.id && hover !== b.id;
        return <line key={`${a.id}-${b.id}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={`edge ${s > 0 ? 'friend' : 'rival'} ${feud(a.id, b.id) ? 'feud' : ''}`}
          strokeWidth={Math.abs(s) / 35} opacity={dim ? 0.08 : 0.2 + Math.abs(s) / 150} />;
      })}
      {players.map((p) => {
        const q = pos.get(p.id);
        if (!q) return null;
        const r = 7 + ((infl.get(p.id) ?? 0) / 100) * 13;
        return (
          <g key={p.id} className="node" transform={`translate(${q.x},${q.y})`} onClick={() => onPlayer(p.id)}
            onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} opacity={hover !== null && hover !== p.id && !(p.rel[hover] && Math.abs(p.rel[hover]!) >= 25) ? 0.35 : 1}>
            <title>{`${shortName(p)} · morale ${Math.round(p.psych.morale)}`}</title>
            <circle r={r} className={`m-${moraleClass(p.psych.morale)} ${club.excluded.includes(p.id) ? 'out' : ''}`} />
            <text y={r + 11} textAnchor="middle">{p.lastName}</text>
          </g>
        );
      })}
    </svg>
  );
}
