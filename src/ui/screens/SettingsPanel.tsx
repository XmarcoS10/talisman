// Impostazioni del giocatore: suggerimenti, guida, volumi, diagnostica.
import { useReducer, useState } from 'react';
import { applyVolumes, playUi } from '../audio.ts';
import { exportDiagnostics } from '../diag.ts';
import { t } from '../i18n.ts';
import { settings, updateSettings } from '../settings.ts';

export function SettingsPanel() {
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const [msg, setMsg] = useState<string | null>(null);
  const s = settings();
  const volume = (k: 'ui' | 'crowd', v: number) => {
    updateSettings({ volume: { ...s.volume, [k]: v } });
    applyVolumes();
    playUi(k === 'ui' ? 'click' : 'whistle');
    refresh();
  };

  return (
    <div className="panel">
      <h2>{t('settings.title')}</h2>
      <label className="row">
        <input type="checkbox" checked={s.hints} onChange={(e) => { updateSettings({ hints: e.target.checked }); refresh(); }} />
        {t('settings.hints')}
      </label>
      <div className="row wrap">
        <button className="btn small" onClick={() => { updateSettings({ hints: true, seen: [] }); refresh(); }}>{t('settings.hintsAgain')}</button>
        <button className="btn small" onClick={() => { updateSettings({ guideDone: false, visited: [] }); refresh(); }}>{t('settings.guideAgain')}</button>
      </div>
      {(['ui', 'crowd'] as const).map((k) => (
        <label key={k} className="row">
          <span style={{ width: 180 }}>{t(`settings.volume.${k}`)}</span>
          <input type="range" min={0} max={1} step={0.05} value={s.volume[k]} onChange={(e) => volume(k, Number(e.target.value))} />
          <span className="num muted">{Math.round(s.volume[k] * 100)}%</span>
        </label>
      ))}
      <div className="row wrap">
        <button className="btn" onClick={async () => { const f = await exportDiagnostics(); setMsg(f ? t('settings.diagSaved', { file: f }) : null); }}>
          {t('settings.diag')}
        </button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <div className="muted">{t('settings.diagHint')}</div>
    </div>
  );
}
