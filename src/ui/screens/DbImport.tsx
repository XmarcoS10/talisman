// Database della community nella nuova carriera (0.4.0): si carica un file col mondo intero, oppure si esporta il
// mondo generato per riscriverlo. Il file si controlla tutto prima di entrare nel gioco.
import { useRef, useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { validateDb, worldFromDb, worldToDb, type DbFile } from '../../engine/database.ts';
import type { WorldState } from '../../engine/model.ts';
import { download } from '../calendar.ts';
import { t } from '../i18n.ts';

const MAX_BYTES = 40_000_000; // un database con tutti gli stemmi sta ampiamente sotto

export function DbImport({ world, dbName, onWorld }: { world: WorldState; dbName: string | null; onWorld: (w: WorldState, name: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const load = async (file: File) => {
    setErrors([]);
    if (file.size > MAX_BYTES) return setErrors([t('db.tooBig')]);
    let raw: unknown;
    try { raw = JSON.parse(await file.text()); } catch { return setErrors([t('db.notJson')]); }
    const problems = validateDb(raw);
    if (problems.length) return setErrors(problems);
    const db = raw as DbFile; // struttura verificata da validateDb
    // il seme viene dall'orologio solo qui, nella UI: il motore resta deterministico
    onWorld(worldFromDb(db, Date.now() >>> 0), db.name);
  };
  const exportWorld = () => download(`database-${world.season}.json`, JSON.stringify(worldToDb(world, t('db.exportName')), null, 1), 'application/json');
  return (
    <div className="mini-card">
      <span className="row"><Database size={16} /> <b>{dbName ?? t('db.generated')}</b></span>
      <div className="row wrap">
        <button className="btn" onClick={() => input.current?.click()}><Upload size={14} /> {t('db.load')}</button>
        <button className="btn" onClick={exportWorld} title={t('db.exportHint')}><Download size={14} /> {t('db.export')}</button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ''; }} />
      </div>
      <span className="muted small">{t('db.hint')}</span>
      {errors.length > 0 && (
        <div className="small pos-bad">
          <b>{t('db.invalid', { n: errors.length })}</b>
          <ul>{errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
