// Alla prima apertura si sceglie la lingua (Blocco 5): i testi sono nelle due lingue insieme, non se ne sa ancora nessuna.
import { LANGS, type Lang } from '../settings.ts';

const LABEL: Record<Lang, string> = { it: 'Italiano', en: 'English' };

export function LanguageGate({ onPick }: { onPick: (l: Lang) => void }) {
  return (
    <div className="lang-gate">
      <h1>Tactic F.C. Manager</h1>
      <p className="muted">Scegli la lingua · Choose your language</p>
      <div className="row">
        {LANGS.map((l) => <button key={l} className="btn primary big" onClick={() => onPick(l)}>{LABEL[l]}</button>)}
      </div>
      <p className="muted small">Si cambia quando vuoi dalle Impostazioni · You can change it any time in Settings</p>
    </div>
  );
}
