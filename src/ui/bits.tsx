// Piccole primitive condivise tra le schermate.
import type { Player, Position } from '../engine/model.ts';
import { t } from './i18n.ts';

/** abilità in stelle, scala FM: 0.5-5 (CA 40 → ½, CA 170+ → 5) */
export function Stars({ ca }: { ca: number }) {
  const v = Math.max(0.5, Math.min(5, Math.round(((ca - 40) / 130) * 10) / 2));
  return (
    <span className="stars" title={`${v} / 5`}>
      ★★★★★<span style={{ width: `${v * 20}%` }}>★★★★★</span>
    </span>
  );
}

export const PosBadge = ({ pos }: { pos: Position }) => <span className={`badge ${pos}`}>{t(`pos.${pos}`)}</span>;

export const attrClass = (v: number) => (v <= 5 ? 'a1' : v <= 10 ? 'a2' : v <= 15 ? 'a3' : 'a4');

/** etichetta di personalità derivata dai 6 assi (GUIDA §4.4), mai salvata */
export function personalityKey(p: Player): string {
  const x = p.personality;
  if (x.professionalism >= 16 && x.ambition >= 14) return 'pers.model';
  if (x.pressureTolerance >= 17) return 'pers.icecold';
  if (x.ambition >= 17) return 'pers.ambitious';
  if (x.loyalty >= 17) return 'pers.loyal';
  if (x.temperament <= 4) return 'pers.fiery';
  if (x.professionalism <= 5) return 'pers.lazy';
  if (x.sociability >= 17) return 'pers.social';
  if (x.sociability <= 4) return 'pers.loner';
  return 'pers.balanced';
}

export const fullName = (p: Player) => `${p.firstName} ${p.lastName}`;
export const shortName = (p: Player) => `${p.firstName[0]}. ${p.lastName}`;