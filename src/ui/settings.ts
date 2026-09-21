// Impostazioni del giocatore (non della carriera): suggerimenti già visti, volumi, guida iniziale.
// Stanno nel localStorage: sono comodità di chi usa questo computer, e il gioco funziona anche se si perdono.

export interface Settings {
  hints: boolean; // suggerimenti alla prima apertura di ogni schermata
  seen: string[]; // suggerimenti già letti
  visited: string[]; // schermate aperte almeno una volta (per la prima partita guidata)
  guideDone: boolean; // la prima partita guidata è finita o è stata chiusa
  volume: { ui: number; crowd: number }; // 0-1, separati come chiede P13
}

const KEY = 'talisman-settings';
const DEFAULTS: Settings = { hints: true, seen: [], visited: [], guideDone: false, volume: { ui: 0.5, crowd: 0.4 } };

let cache: Settings | null = null;

export function settings(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...settings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* senza memoria si ricomincia da capo: non è grave */ }
}

export const markSeen = (id: string) => { if (!settings().seen.includes(id)) updateSettings({ seen: [...settings().seen, id] }); };
export const markVisited = (id: string) => { if (!settings().visited.includes(id)) updateSettings({ visited: [...settings().visited, id] }); };
