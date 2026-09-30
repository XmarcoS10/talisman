// Scrivania personalizzabile (interfaccia v2, fase 2; disegni docs/design/stitch-v2/01-04): riquadri su una griglia a
// 12 colonne. Si sceglie un layout pronto o si entra in «Personalizza»: si spostano (trascinando o con le frecce),
// si cambia taglia, si tolgono e si aggiungono dalla galleria. Il layout sta nelle impostazioni del giocatore.
import { ChevronLeft, ChevronRight, GripVertical, LayoutGrid, Plus, RotateCcw, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { settings, updateSettings } from '../settings.ts';
import { t } from '../i18n.ts';
import type { DeskCtx } from './DeskParts.tsx';
import { CATEGORIES, type DeskItem, PRESETS, type Preset, type Size, WIDGETS, type WidgetId } from './DeskWidgets.tsx';

const PRESET_NAMES: Preset[] = ['coach', 'director', 'essential'];

export function Desk(ctx: DeskCtx) {
  const [draft, setDraft] = useState<DeskItem[] | null>(null); // la disposizione mentre la si modifica
  const [gallery, setGallery] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [, redraw] = useState(0);
  const layout = settings().desk;
  const saved = layout.preset === 'custom' ? layout.custom : PRESETS[layout.preset];
  const items = (draft ?? saved).filter((i) => WIDGETS[i.id]?.sizes.includes(i.size)); // un layout salvato male non rompe la schermata

  const choose = (v: string) => { updateSettings({ desk: { ...layout, preset: v as Preset | 'custom' } }); redraw((x) => x + 1); };
  const edit = (f: (d: DeskItem[]) => DeskItem[]) => setDraft(f([...items]));
  const move = (from: number, to: number) => edit((d) => { const [x] = d.splice(from, 1); d.splice(Math.max(0, Math.min(d.length, to)), 0, x!); return d; });
  const save = () => { updateSettings({ desk: { preset: 'custom', custom: items } }); setDraft(null); setGallery(false); };

  return (
    <div className={`stack ${draft && gallery ? 'with-gallery' : ''}`}>
      {draft ? (
        <div className="desk-banner">
          <span className="row"><GripVertical size={16} /> {t('desk.edit.hint')}</span>
          <span className="row">
            <button className="btn" onClick={() => setGallery(true)}><Plus size={14} /> {t('desk.addWidget')}</button>
            <button className="btn" onClick={() => setDraft(PRESETS.coach)}><RotateCcw size={14} /> {t('desk.edit.reset')}</button>
            <button className="btn" onClick={() => { setDraft(null); setGallery(false); }}>{t('desk.edit.cancel')}</button>
            <button className="btn primary" onClick={save}>{t('desk.edit.save')}</button>
          </span>
        </div>
      ) : (
        <div className="row desk-head">
          <label className="row small"><LayoutGrid size={15} /> {t('desk.layout')}
            <select value={layout.preset} onChange={(e) => choose(e.target.value)} aria-label={t('desk.layout')}>
              {PRESET_NAMES.map((p) => <option key={p} value={p}>{t(`desk.preset.${p}`)}</option>)}
              {layout.custom.length > 0 && <option value="custom">{t('desk.preset.custom')}</option>}
            </select></label>
          <button className="btn" onClick={() => setDraft(items)}><Settings2 size={14} /> {t('desk.customize')}</button>
        </div>
      )}

      <div className={`desk-grid ${draft ? 'editing' : ''}`}>
        {items.map((it, i) => {
          const W = WIDGETS[it.id];
          return (
            <section key={it.id} className={`desk-cell s-${it.size} ${drag === i ? 'dragging' : ''}`} aria-label={t(`desk.w.${it.id}`)}
              onDragOver={draft ? (e) => e.preventDefault() : undefined} onDrop={draft ? () => { if (drag !== null) move(drag, i); setDrag(null); } : undefined}>
              {draft && (
                <div className="desk-tools">
                  <span className="desk-grip" draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} title={t('desk.edit.drag')}><GripVertical size={15} /></span>
                  <b>{t(`desk.w.${it.id}`)}</b>
                  <span className="desk-sizes">{W.sizes.map((s) => (
                    <button key={s} className={s === it.size ? 'on' : ''} aria-pressed={s === it.size} onClick={() => edit((d) => { d[i] = { ...it, size: s as Size }; return d; })}>{s}</button>
                  ))}</span>
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t('desk.edit.left')}><ChevronLeft size={15} /></button>
                  <button onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={t('desk.edit.right')}><ChevronRight size={15} /></button>
                  <button onClick={() => edit((d) => d.filter((_, j) => j !== i))} aria-label={t('desk.edit.remove')}><X size={15} /></button>
                </div>
              )}
              <div className="desk-body" data-empty={t('desk.edit.empty')} inert={draft ? true : undefined}><W.view {...ctx} /></div>
            </section>
          );
        })}
        {draft && <button className="desk-add s-S" onClick={() => setGallery(true)}><Plus size={22} /> {t('desk.addWidget')}</button>}
      </div>

      {draft && gallery && <Gallery onDesk={items.map((i) => i.id)} onClose={() => setGallery(false)}
        onAdd={(id) => edit((d) => [...d, { id, size: WIDGETS[id].sizes[0]! }])} />}
    </div>
  );
}

function Gallery({ onDesk, onAdd, onClose }: { onDesk: WidgetId[]; onAdd: (id: WidgetId) => void; onClose: () => void }) {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number] | 'all'>('all');
  const ids = (Object.keys(WIDGETS) as WidgetId[]).filter((id) => cat === 'all' || WIDGETS[id].cat === cat);
  return (
    <aside className="desk-gallery" aria-label={t('desk.gallery')}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{t('desk.gallery')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('desk.edit.close')}><X size={18} /></button>
      </div>
      <div className="chips">
        {(['all', ...CATEGORIES] as const).map((c) => <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{t(`desk.cat.${c}`)}</button>)}
      </div>
      {ids.map((id) => (
        <div key={id} className="gallery-item">
          <span><b>{t(`desk.w.${id}`)}</b><small className="muted">{t(`desk.wd.${id}`)}</small><small className="caps">{t('desk.sizes', { s: WIDGETS[id].sizes.join(', ') })}</small></span>
          {onDesk.includes(id)
            ? <span className="tag dim">{t('desk.onDesk')}</span>
            : <button className="btn primary" onClick={() => onAdd(id)}><Plus size={14} /> {t('desk.add')}</button>}
        </div>
      ))}
    </aside>
  );
}
