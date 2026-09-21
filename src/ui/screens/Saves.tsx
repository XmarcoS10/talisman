import { useReducer, useRef, useState } from 'react';
import type { WorldState } from '../../engine/model.ts';
import { fmtDate, fmtSeason, t } from '../i18n.ts';
import { SLOTS, currentSlot, deleteSlot, exportFile, importFile, loadFrom, saveTo, setCurrentSlot, slotInfo, type Slot, savesDir } from '../storage.ts';

export function Saves({ world, onLoad }: { world: WorldState; onLoad: (w: WorldState) => void }) {
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = currentSlot();
  const club = world.clubs[world.manager.clubId]!;

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
      saveTo(cur, w);
      onLoad(w);
    } catch (e) {
      setMsg(t('saves.importError', { err: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="grid" style={{ maxWidth: 760 }}>
      <div className="panel">
        <h2>{t('saves.title')}</h2>
        {savesDir() && <div className="muted">{t('saves.where', { dir: savesDir()! })}</div>}
        <table>
          <tbody>
            {SLOTS.map((s) => {
              const info = slotInfo(s);
              return (
                <tr key={s} className={s === cur ? 'me' : ''}>
                  <td className="num">{t('saves.slot', { slot: s })}</td>
                  <td>{info ? <><b>{info.clubName}</b> · {info.manager}</> : <span className="muted">{t('saves.empty')}</span>}</td>
                  <td className="muted num">{info ? `${fmtSeason(info.season)} · ${fmtDate(info.season, info.day)}` : ''}</td>
                  <td className="r">
                    <span className="row" style={{ justifyContent: 'flex-end', gap: 'var(--s-1)' }}>
                      <button className="btn" onClick={() => save(s)}>{t('saves.save')}</button>
                      <button className="btn" disabled={!info} onClick={() => load(s)}>{t('saves.load')}</button>
                      <button className="btn" disabled={!info} onClick={() => remove(s)} aria-label={t('saves.delete')}>✕</button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="muted">{t('saves.autosave', { slot: cur })}</div>
      </div>
      <div className="panel">
        <h3>{t('saves.file')}</h3>
        <div className="row">
          <button className="btn" onClick={() => exportFile(world, club.name)}>{t('saves.export')}</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>{t('saves.import')}</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
        </div>
        <div className="muted">{t('saves.fileHint')}</div>
      </div>
      {msg && <div className="panel">{msg}</div>}
    </div>
  );
}
