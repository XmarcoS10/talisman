// Piccole primitive condivise tra le schermate.
import type { Player, Position } from '../engine/model.ts';
import { t } from './i18n.ts';
import { teamForms } from '../engine/narrative/italian.ts';

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

/** una squadra col suo articolo o preposizione: team(club, 'di') → "della Vignarola" */
export const team = (c: { city: string } | undefined, form: '' | 'di' | 'a' | 'da' | 'in' | 'su' | 'con' | 'contro' = '') =>
  c ? teamForms('x', c.city)[form ? `x_${form}` : 'x']! : '?';

// attributi 1-20 (DESIGN.md): 16-20 smeraldo, 11-15 ambra, 8-10 neutro, 1-7 rosso
export const attrClass = (v: number) => (v <= 7 ? 'a1' : v <= 10 ? 'a2' : v <= 15 ? 'a3' : 'a4');

/** voto in pagella come chip colorato: 8+ smeraldo, 6,8-7,9 ciano, 6-6,7 grigio, sotto 6 rosso */
export const rateClass = (v: number) => (v >= 8 ? 'top' : v >= 6.8 ? 'good' : v >= 6 ? 'ok' : 'bad');
export const Rating = ({ v }: { v: number }) => <span className={`rate ${rateClass(v)}`}>{v ? v.toFixed(1) : '–'}</span>;

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