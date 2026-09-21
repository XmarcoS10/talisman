// Impostazioni e salvataggi: 5 slot con nome, peso e tempo di gioco; esporta e importa la carriera; a destra le impostazioni.
import { useReducer, useRef, useState } from 'react';
import { Bookmark, Copy, Download, FolderOpen, HardDrive, Pencil, PlusCircle, RotateCcw, Save, Shield, Trash2, Upload } from 'lucide-react';
import type { WorldState } from '../../engine/model.ts';
import { fmtDate, fmtSeason, t } from '../i18n.ts';
import { SettingsPanel } from './SettingsPanel.tsx';
import { SLOTS, currentSlot, deleteSlot, exportFile, importFile, loadFrom, openSavesDir, playTime, renameSlot, saveTo, savesDir, setCurrentSlot, slotInfo, slotSize, type Slot } from '../storage.ts';

const hours = (ms: number) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };
const mb = (b: number) => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`;
const when = (ts: number) => {
  const d = new Date(ts), now = new Date();
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === now.toDateString() ? t('saves.today', { time }) : `${d.toLocaleDateString('it-IT')} ${time}`;
};

export function Saves({ world, onLoad }: { world: WorldState; onLoad: (w: WorldState) => void }) {
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<{ slot: Slot; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = currentSlot();
  const club = world.clubs[world.manager.clubId]!;
  const dir = savesDir();

  const save = (s: Slot) => {
    if (slotInfo(s) && s !== cur && !confirm(t('saves.overwrite', { slot: s }))) return;
    setMsg(t(saveTo(s, world) ? 'saves.saved' : 'saves.error', { slot: s }));
    setCurrentSlot(s);
    refresh();
  };
  const load = (s: Slot) => {
    const w = loadFrom(s);
    if (!w) return setMsg(t('saves.error', { slot: s }));
    setCurrentSlot(s);
    onLoad(w);
  };
  const remove = (s: Slot) => {
    if (!confirm(t('saves.confirmDelete', { slot: s }))) return;
    deleteSlot(s);
    refresh();
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const w = await importFile(file);
      const free = SLOTS.find((s) => !slotInfo(s)) ?? cur;
      saveTo(free, w);
      setCurrentSlot(free);
      onLoad(w);
    } catch (e) {
      setMsg(t('saves.importError', { err: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="cols2" style={{ gridTemplateColumns: 'minmax(0, 1.25fr) minmax(340px, 1fr)' }}>
      <div className="stack">
        <div className="panel">
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div><h2><HardDrive size={18} /> {t('saves.slotsTitle')}</h2><span className="caps">{t('saves.slotsSub')}</span></div>
            {dir && <span className="row">
              <button className="btn small" onClick={() => void navigator.clipboard?.writeText(dir)}><Copy size={13} /> {t('saves.copyPath')}</button>
              <button className="btn small" onClick={openSavesDir}><FolderOpen size={13} /> {t('saves.openDir')}</button>
            </span>}
          </div>
          {dir && <div className="mini-card row" style={{ justifyContent: 'space-between' }}><span className="num small">{dir}</span><span className="caps">{t('saves.slotsCount', { n: SLOTS.length })}</span></div>}
          <div className="analyst small">{t('saves.autosave', { slot: cur })}</div>
        </div>
        {msg && <div className="banner ok">{msg}</div>}

        {SLOTS.map((s) => {
          const info = slotInfo(s);
          const active = s === cur;
          if (!info) return (
            <div key={s} className="panel save-slot empty">
              <Bookmark size={20} className="muted" />
              <span><span className="caps">{t('saves.slot', { slot: s })}</span><b className="deal-h">{t('saves.freeSlot')}</b><div className="muted small">{t('saves.freeSub')}</div></span>
              <button className="btn primary" onClick={() => save(s)}><PlusCircle size={14} /> {t('saves.createHere')}</button>
            </div>
          );
          return (
            <div key={s} className={`panel save-slot ${active ? 'active' : ''}`}>
              <span className="hint-icon" style={{ width: 44, height: 44 }}><Shield size={20} /></span>
              <div className="stack" style={{ gap: 4 }}>
                <span className="row"><span className={`tag ${active ? '' : 'dim'}`}>{t(active ? 'saves.activeTag' : 'saves.slotTag', { slot: s })}</span></span>
                {editing?.slot === s
                  ? <form onSubmit={(e) => { e.preventDefault(); renameSlot(s, editing.text.trim()); setEditing(null); refresh(); }}>
                      <input className="big-input" autoFocus value={editing.text} maxLength={40} onChange={(e) => setEditing({ slot: s, text: e.target.value })} onBlur={() => setEditing(null)} />
                    </form>
                  : <b className="deal-h">{info.label || info.clubName} {info.label && <span className="muted small">· {info.clubName}</span>}</b>}
                <span className="slot-facts num">
                  <span>{t('saves.inGame', { d: `${fmtSeason(info.season)} · ${fmtDate(info.season, info.day)}` })}</span>
                  <span>{t('saves.savedAt', { when: when(info.savedAt), size: mb(slotSize(s)) })}</span>
                  <span className="pos-mid">{t('saves.played', { h: hours(active ? playTime() : info.playMs ?? 0) })}</span>
                </span>
              </div>
              <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
                <span className="row">
                  <button className={`btn ${active ? 'primary' : ''}`} onClick={() => save(s)}><Save size={14} /> {t(active ? 'saves.saveNow' : 'saves.overwriteBtn')}</button>
                  <button className="btn" onClick={() => load(s)}><RotateCcw size={14} /> {t(active ? 'saves.reload' : 'saves.load')}</button>
                </span>
                <span className="row">
                  <button className="btn small" onClick={() => setEditing({ slot: s, text: info.label ?? '' })} aria-label={t('saves.rename')}><Pencil size={13} /></button>
                  <button className="btn small" onClick={() => remove(s)} aria-label={t('saves.delete')}><Trash2 size={13} /></button>
                </span>
              </div>
            </div>
          );
        })}

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="panel">
            <h2><Download size={18} /> {t('saves.exportTitle')}</h2>
            <span className="muted">{t('saves.exportHint')}</span>
            <button className="btn big" onClick={() => exportFile(world, club.name)}><Download size={15} /> {t('saves.export')}</button>
          </div>
          <div className="panel">
            <h2><Upload size={18} /> {t('saves.importTitle')}</h2>
            <span className="muted">{t('saves.importHint')}</span>
            <button className="btn big" onClick={() => fileRef.current?.click()}><Upload size={15} /> {t('saves.import')}</button>
            <input ref={fileRef} type="file" accept=".tfm,.json,application/json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
          </div>
        </div>
      </div>
      <SettingsPanel onChange={refresh} />
    </div>
  );
}
