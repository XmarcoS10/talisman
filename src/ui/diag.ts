// Diagnostica locale (P13 punto 8): gli errori della pagina si tengono in memoria e, in Electron, finiscono anche
// nel registro su file. "Esporta diagnostica" salva tutto in un file che l'utente può mandare a chi lo aiuta.
// Niente parte da solo: il file lo sceglie e lo invia l'utente.
import { settings } from './settings.ts';
import { SLOTS, slotInfo } from './storage.ts';

declare global { interface Window { talismanDiag?: { exportReport(extra: unknown): Promise<string | null> } } }

const errors: { when: string; msg: string }[] = [];
const keep = (msg: string) => { errors.push({ when: new Date().toISOString(), msg }); if (errors.length > 100) errors.shift(); };

/** da chiamare una volta all'avvio: raccoglie gli errori non gestiti */
export function installDiagnostics() {
  window.addEventListener('error', (e) => keep(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => keep(`promessa rifiutata: ${String(e.reason)}`));
}

const report = () => ({
  userAgent: navigator.userAgent,
  settings: settings(),
  slots: SLOTS.map(slotInfo),
  errors,
});

/** esporta la diagnostica: in Electron col dialogo di salvataggio, nel browser come download */
export async function exportDiagnostics(): Promise<string | null> {
  if (window.talismanDiag) return window.talismanDiag.exportReport(report());
  const blob = new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `talisman-diagnostica-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  return a.download;
}
