// Radar ottagonale (DESIGN.md): otto assi 1-20, poligono verde traslucido su anelli di riferimento ottagonali.
// Per i giocatori non tuoi i valori sono le stime degli osservatori (§7.6).
import type { AttrKey, Player, WorldState } from '../engine/model.ts';
import { estimate } from '../engine/scouting/fog.ts';
import { t } from './i18n.ts';

const OUTFIELD: [string, AttrKey[]][] = [
  ['pace', ['pace', 'acceleration']], ['physical', ['strength', 'stamina', 'balance']], ['defending', ['tackling', 'marking', 'positioning']],
  ['aerial', ['heading', 'bravery']], ['mental', ['decisions', 'composure', 'concentration']], ['passing', ['passing', 'vision']],
  ['technique', ['technique', 'firstTouch', 'dribbling']], ['attacking', ['finishing', 'offTheBall', 'longShots']],
];
const KEEPER: [string, AttrKey[]][] = [
  ['reflexes', ['reflexes']], ['handling', ['handling']], ['oneOnOnes', ['oneOnOnes']], ['aerialReach', ['aerialReach', 'commandOfArea']],
  ['kicking', ['kicking']], ['communication', ['communication']], ['mental', ['decisions', 'composure', 'concentration']], ['physical', ['agility', 'strength']],
];

export function Radar({ world, p, own, size = 320 }: { world: WorldState; p: Player; own: boolean; size?: number }) {
  const axes = p.position === 'GK' ? KEEPER : OUTFIELD;
  const val = (k: AttrKey) => (own ? p.attrs[k] : estimate(world, p, k).mid);
  const values = axes.map(([, ks]) => ks.reduce((s, k) => s + val(k), 0) / ks.length);
  const c = size / 2, R = size / 2 - 62; // margine per le etichette
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r] as const;
  };
  const ring = (f: number) => axes.map((_, i) => pt(i, R * f).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="radar" role="img" aria-label={t('radar.label')}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ring(f)} className="radar-ring" />)}
      {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-ring" />; })}
      <polygon points={values.map((v, i) => pt(i, (R * v) / 20).join(',')).join(' ')} className="radar-shape" />
      {axes.map(([id], i) => {
        const [x, y] = pt(i, R + 26);
        return <text key={id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-label">{t(`radar.${id}`)} <tspan className="radar-val">{Math.round(values[i]!)}</tspan></text>;
      })}
    </svg>
  );
}
