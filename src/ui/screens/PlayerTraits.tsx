// Tratti del giocatore nel profilo (0.10.0), come in Football Manager: i suoi, quello che sta imparando e, per i tuoi,
// «Insegna un tratto» e «Disimpara». Dei giocatori altrui si vedono solo quando gli osservatori li conoscono (§7.6).
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Player, WorldState } from '../../engine/model.ts';
import { learnRate, startLearning, teachable, type Trait } from '../../engine/traits.ts';
import { t } from '../i18n.ts';

export function PlayerTraits({ world, p, own, known, onChange }: { world: WorldState; p: Player; own: boolean; known: boolean; onChange: () => void }) {
  const options = own ? teachable(p) : [];
  const [pick, setPick] = useState<Trait | ''>('');
  const l = p.learning;
  const rate = own && l ? learnRate(world, p) : 0;
  const act = (f: () => void) => { f(); setPick(''); onChange(); };
  return (
    <div className="panel">
      <h2><Sparkles size={18} /> {t('traits.title')}</h2>
      {!known ? <span className="muted small">{t('traits.unknown')}</span> : <>
        {p.traits.length === 0 && <span className="muted small">{t('traits.none')}</span>}
        {p.traits.map((k) => (
          <span key={k} className="trait-row">
            <span><b className="small">{t(`trait.${k}`)}</b><span className="muted small">{t(`trait.desc.${k}`)}</span></span>
            {own && !l && <button className="link small" onClick={() => act(() => startLearning(p, k, true))}>{t('traits.unlearn')}</button>}
          </span>
        ))}
      </>}
      {own && l && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="small">{t(l.remove ? 'traits.unlearning' : 'traits.learning', { trait: t(`trait.${l.trait}`) })}</span>
          <div className="meter"><i style={{ width: `${l.progress}%` }} /></div>
          <span className="row" style={{ justifyContent: 'space-between' }}>
            <span className={`small ${rate ? 'muted' : 'pos-bad'}`}>{rate ? t('traits.weeks', { n: Math.ceil((100 - l.progress) / rate) }) : t('traits.stuck')}</span>
            <button className="link small" onClick={() => act(() => { p.learning = null; })}>{t('traits.cancel')}</button>
          </span>
        </div>
      )}
      {own && !l && options.length > 0 && (
        <span className="row">
          <select value={pick} onChange={(e) => setPick(e.target.value as Trait)} aria-label={t('traits.teach')}>
            <option value="">{t('traits.choose')}</option>
            {options.map((k) => <option key={k} value={k}>{t(`trait.${k}`)}</option>)}
          </select>
          <button className="btn" disabled={!pick} onClick={() => pick && act(() => startLearning(p, pick))}>{t('traits.teach')}</button>
        </span>
      )}
    </div>
  );
}
