// Come si mostra quello che non si sa (GUIDA §7.6): mai un numero preciso su un giocatore non tuo.
import type { Player, WorldState } from '../engine/model.ts';
import { knowledge, range, type Band } from '../engine/scouting/fog.ts';
import { Stars, attrClass } from './bits.tsx';
import { t } from './i18n.ts';

export const mine = (world: WorldState, p: Player) => p.clubId === world.manager.clubId;

/** un attributo stimato: il centro, e quanto ci si può sbagliare */
export function Est({ b }: { b: Band }) {
  if (b.band === 0) return <b className={attrClass(b.mid)}>{b.mid}</b>;
  return (
    <span className="est" title={t('fog.estimate', { lo: Math.max(1, Math.round(b.mid - b.band)), hi: Math.min(20, Math.round(b.mid + b.band)) })}>
      <b className={attrClass(b.mid)}>{b.mid}</b>
      <i>±{b.band}</i>
    </span>
  );
}

/** stesse unità delle stelle: 0,5 … 5 */
const inStars = (ca: number) => Math.max(0.5, Math.min(5, Math.round(((ca - 40) / 130) * 10) / 2));

/** abilità o potenziale: stelle se lo conosci, intervallo se lo stai indovinando */
export function Ability({ world, p, which }: { world: WorldState; p: Player; which: 'ca' | 'pa' }) {
  const [lo, hi] = range(world, p, which);
  if (lo === hi) return <Stars ca={lo} />;
  return (
    <span className="est range" title={t('fog.range', { lo, hi })}>
      <Stars ca={lo} />
      <i>→ {inStars(hi).toString().replace('.', ',')}</i>
    </span>
  );
}

/** quanto ne sappiamo, in chiaro: serve a capire se fidarsi del resto */
export function Known({ world, p }: { world: WorldState; p: Player }) {
  const k = Math.round(knowledge(world, p));
  return <span className={`chip ${k >= 85 ? 'ok' : k >= 50 ? '' : 'warn'}`}>{t('fog.known', { k })}</span>;
}
