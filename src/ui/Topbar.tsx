// Barra in alto alla Openfoot: titolo della schermata con la data, ricerca, tema, cassa, «Salva» e il grande «Continua»
// col suo menu (come giocare le proprie partite).
import { forwardRef, useState } from 'react';
import { ArrowLeft, Banknote, CalendarDays, Check, ChevronDown, ChevronRight, Eye, FastForward, Moon, Save, Sun } from 'lucide-react';
import type { WorldState } from '../engine/model.ts';
import { applyTheme, settings, updateSettings, type MatchMode } from './settings.ts';
import { fmtDate, fmtMoney, t } from './i18n.ts';
import { Search } from './Search.tsx';

interface Props {
  world: WorldState; title: string; onBack?: () => void;
  onPlayer: (id: number) => void; onClub: (id: number) => void;
  /** il prossimo turno è una partita del club dell'utente */
  matchDay: boolean; seasonOver: boolean;
  onContinue: () => void; onSave: () => boolean;
}

const MODES: [MatchMode, typeof Eye][] = [['live', Eye], ['result', FastForward]];

export const Topbar = forwardRef<HTMLInputElement, Props>(function Topbar(p, searchRef) {
  const [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState(false);
  const [, redraw] = useState(0); // dopo aver cambiato modo o tema
  const mode = settings().matchMode;
  const light = document.documentElement.dataset.theme === 'light';
  const club = p.world.clubs[p.world.manager.clubId]!;
  const label = p.seasonOver ? t('top.endSeason') : p.matchDay ? t(`top.mode.${mode}`) : t('top.continue');
  const save = () => { if (p.onSave()) { setFlash(true); setTimeout(() => setFlash(false), 1500); } };
  const pick = (m: MatchMode) => { updateSettings({ matchMode: m }); redraw((x) => x + 1); setMenu(false); };

  return (
    <header className="topbar">
      {p.onBack && <button className="icon-btn" onClick={p.onBack} title={t('top.back')} aria-label={t('top.back')}><ArrowLeft size={20} /></button>}
      <div className="top-title">
        <h1>{p.title}</h1>
        <span className="muted small"><CalendarDays size={13} /> {fmtDate(p.world.season, p.world.day)}</span>
      </div>
      <Search ref={searchRef} world={p.world} onPlayer={p.onPlayer} onClub={p.onClub} />
      <button className="icon-btn" title={t('top.theme')} aria-label={t('top.theme')}
        onClick={() => { updateSettings({ theme: light ? 'dark' : 'light' }); applyTheme(); redraw((x) => x + 1); }}>{light ? <Moon size={18} /> : <Sun size={18} />}</button>
      <span className="pill num" title={t('top.balance')}><Banknote size={15} />{fmtMoney(club.balance)}</span>
      <button className={`btn save-btn ${flash ? 'done' : ''}`} onClick={save} title={t('top.saveHint')}><Save size={15} /> {t(flash ? 'top.saved' : 'top.save')}</button>
      <div className="continue" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMenu(false); }}>
        <button className="btn primary" onClick={p.onContinue} title={t('top.advanceHint')}>{label} <ChevronRight size={16} /></button>
        {!p.seasonOver && <button className="btn primary more" onClick={() => setMenu(!menu)} aria-label={t('top.modes')} aria-expanded={menu}><ChevronDown size={16} /></button>}
        {menu && (
          <div className="continue-menu" role="menu">
            {MODES.map(([m, Icon]) => (
              <button key={m} role="menuitemradio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => pick(m)}>
                <Icon size={16} /><span><b>{t(`top.mode.${m}`)}</b><small>{t(`top.modeDesc.${m}`)}</small></span>{mode === m && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
});
