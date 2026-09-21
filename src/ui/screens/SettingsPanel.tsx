// Impostazioni del giocatore: interfaccia, valuta e data, schermo, audio, manutenzione e diagnostica.
import { useReducer, useState } from 'react';
import { Bug, Maximize, SlidersHorizontal, Users, Volume2, Whistle, Wrench, MousePointerClick } from 'lucide-react';
import { version } from '../../../package.json';
import { SCHEMA_VERSION, integrity } from '../../engine/save.ts';
import { applyVolumes, playUi } from '../audio.ts';
import { exportDiagnostics } from '../diag.ts';
import { t } from '../i18n.ts';
import { DEFAULTS, WIN_SIZES, applyWin, settings, updateSettings, type Settings } from '../settings.ts';
import type { WorldState } from '../../engine/model.ts';

function Check({ on, set, title, sub }: { on: boolean; set: (v: boolean) => void; title: string; sub: string }) {
  return (
    <label className="set-row">
      <span><b>{title}</b><small>{sub}</small></span>
      <input type="checkbox" className="big-check" checked={on} onChange={(e) => set(e.target.checked)} />
    </label>
  );
}

export function SettingsPanel({ world, onChange }: { world: WorldState; onChange?: () => void }) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const refresh = () => { rerender(); onChange?.(); };
  const [msg, setMsg] = useState<string | null>(null);
  const s = settings();
  const set = (patch: Partial<Settings>) => { updateSettings(patch); refresh(); };
  const volume = (k: 'ui' | 'crowd' | 'fx', v: number) => {
    updateSettings({ volume: { ...s.volume, [k]: v } });
    applyVolumes();
    playUi(k === 'ui' ? 'click' : 'whistle');
    refresh();
  };
  const full = typeof document !== 'undefined' && !!document.fullscreenElement;
  const [check, setCheck] = useState<{ checks: number; problems: string[] } | null>(null);

  return (
    <div className="stack">
      <div className="panel">
        <h2><SlidersHorizontal size={18} /> {t('settings.title')}</h2>
        <Check on={s.hints} set={(v) => set({ hints: v })} title={t('settings.hints')} sub={t('settings.hintsSub')} />
        <Check on={s.autosave} set={(v) => set({ autosave: v })} title={t('settings.autosave')} sub={t('settings.autosaveSub')} />
        <Check on={s.pauseNews} set={(v) => set({ pauseNews: v })} title={t('settings.pauseNews')} sub={t('settings.pauseNewsSub')} />
        <span className="caps">{t('settings.currency')}</span>
        <div className="seg-tabs" style={{ alignSelf: 'stretch' }}>
          {(['EUR', 'USD', 'GBP'] as const).map((c) => <button key={c} className={s.currency === c ? 'active hot' : ''} onClick={() => set({ currency: c })}>{t(`settings.cur.${c}`)}</button>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field"><span className="caps">{t('settings.dateFmt')}</span>
            <select value={s.dateFmt} onChange={(e) => set({ dateFmt: e.target.value as Settings['dateFmt'] })}>
              <option value="long">{t('settings.date.long')}</option><option value="short">{t('settings.date.short')}</option>
            </select></label>
          <label className="field"><span className="caps">{t('settings.screen')}</span>
            <button className="btn" onClick={() => { void (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).then(refresh); }}>
              <Maximize size={14} /> {t(full ? 'settings.windowed' : 'settings.fullscreen')}</button></label>
        </div>
        {window.talismanWin && (
          <label className="field"><span className="caps">{t('settings.resolution')}</span>
            <select value={s.win} onChange={(e) => { set({ win: e.target.value }); applyWin(e.target.value); }}>
              <option value="">—</option>{WIN_SIZES.map((v) => <option key={v} value={v}>{v.replace('x', ' × ')}</option>)}
            </select></label>
        )}
        <div className="row wrap">
          <button className="btn small" onClick={() => set({ hints: true, seen: [] })}>{t('settings.hintsAgain')}</button>
          <button className="btn small" onClick={() => set({ guideDone: false, visited: [] })}>{t('settings.guideAgain')}</button>
        </div>
      </div>

      <div className="panel">
        <h2><Volume2 size={18} /> {t('settings.audio')}</h2>
        {([['ui', MousePointerClick], ['crowd', Users], ['fx', Whistle]] as const).map(([k, Icon]) => (
          <label key={k} className="field">
            <span className="row" style={{ justifyContent: 'space-between' }}><span className="row"><Icon size={14} /> {t(`settings.volume.${k}`)}</span><b className="num pos-good small">{Math.round(s.volume[k] * 100)}%</b></span>
            <input type="range" min={0} max={1} step={0.05} value={s.volume[k]} onChange={(e) => volume(k, Number(e.target.value))} />
          </label>
        ))}
        <Check on={s.muteOnBlur} set={(v) => set({ muteOnBlur: v })} title={t('settings.muteOnBlur')} sub={t('settings.muteOnBlurSub')} />
      </div>

      <div className="panel">
        <h2><Wrench size={18} /> {t('settings.maint')}</h2>
        <div className="mini-card row" style={{ justifyContent: 'space-between' }}><span className="caps">{t('settings.version')}</span><b className="num small">TFM 27 v{version} · {t('settings.schema', { n: SCHEMA_VERSION })}</b></div>
        <button className="mini-card row" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => setCheck(integrity(world))}>
          <span className="caps">{t('settings.integrity')}</span>
          {check ? <b className={`num small ${check.problems.length ? 'pos-bad' : 'pos-good'}`}>{check.problems.length
            ? t('settings.integrityBad', { n: check.problems.length })
            : t('settings.integrityOk', { pct: 100, n: check.checks.toLocaleString('it-IT') })}</b> : <span className="small pos-good">{t('settings.integrityRun')}</span>}
        </button>
        <span className="muted small">{t('settings.diagHint')}</span>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className="btn" onClick={async () => { const f = await exportDiagnostics(); setMsg(f ? t('settings.diagSaved', { file: f }) : null); }}><Bug size={14} /> {t('settings.diag')}</button>
          <button className="btn" onClick={() => { if (confirm(t('settings.resetConfirm'))) { updateSettings({ ...DEFAULTS, seen: s.seen, visited: s.visited, guideDone: s.guideDone }); applyVolumes(); refresh(); } }}>{t('settings.reset')}</button>
        </div>
        {msg && <span className="muted small">{msg}</span>}
      </div>
    </div>
  );
}
