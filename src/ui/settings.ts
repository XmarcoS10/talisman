// Impostazioni del giocatore (non della carriera): suggerimenti già visti, volumi, guida iniziale.
// Stanno nel localStorage: sono comodità di chi usa questo computer, e il gioco funziona anche se si perdono.

export interface Settings {
  hints: boolean; // suggerimenti alla prima apertura di ogni schermata
  seen: string[]; // suggerimenti già letti
  visited: string[]; // schermate aperte almeno una volta (per la prima partita guidata)
  guideDone: boolean; // la prima partita guidata è finita o è stata chiusa
  volume: { ui: number; crowd: number; fx: number }; // 0-1: interfaccia, pubblico, effetti partita (fischio, gol)
  muteOnBlur: boolean; // silenzio quando la finestra non è in primo piano
  autosave: boolean; // salva da solo a ogni avanzamento
  pauseNews: boolean; // dopo un avanzamento mostra le notizie importanti prima di tutto
  currency: 'EUR' | 'USD' | 'GBP'; // solo visualizzazione: il motore conta in euro
  dateFmt: 'long' | 'short';
  win: string; // misura della finestra nell'app desktop, "1440x900"; vuoto = quella di partenza
}

const KEY = 'talisman-settings';
export const DEFAULTS: Settings = { hints: true, seen: [], visited: [], guideDone: false, volume: { ui: 0.5, crowd: 0.4, fx: 0.65 },
  muteOnBlur: true, autosave: true, pauseNews: true, currency: 'EUR', dateFmt: 'long', win: '' };

let cache: Settings | null = null;

export function settings(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const got = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    cache = { ...DEFAULTS, ...got, volume: { ...DEFAULTS.volume, ...got.volume } }; // i volumi aggiunti dopo prendono il default
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...settings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* senza memoria si ricomincia da capo: non è grave */ }
}

declare global { interface Window { talismanWin?: { size(w: number, h: number): void } } }
/** misure della finestra offerte nelle impostazioni (solo app desktop) */
export const WIN_SIZES = ['1280x800', '1440x900', '1600x1000', '1920x1080', '2560x1440'];
export const applyWin = (v: string) => { const [w, h] = v.split('x').map(Number); if (w && h) window.talismanWin?.size(w, h); };

export const markSeen = (id: string) => { if (!settings().seen.includes(id)) updateSettings({ seen: [...settings().seen, id] }); };
export const markVisited = (id: string) => { if (!settings().visited.includes(id)) updateSettings({ visited: [...settings().visited, id] }); };
