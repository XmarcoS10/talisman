// Suggerimento contestuale (P13 punto 1): appare la prima volta che si apre una schermata, si chiude per sempre
// con "Ho capito", e si possono spegnere tutti.
import { useReducer } from 'react';
import { Lightbulb } from 'lucide-react';
import { markSeen, settings, updateSettings } from './settings.ts';
import { t } from './i18n.ts';

export const HINTS = ['desk', 'stories', 'squad', 'tactics', 'training', 'dressing', 'youth', 'market', 'scouts', 'finance', 'board', 'live'] as const;

export function Hint({ id }: { id: (typeof HINTS)[number] }) {
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const s = settings();
  if (!s.hints || s.seen.includes(id)) return null;
  return (
    <div className="hint" role="note">
      <span className="hint-icon"><Lightbulb size={22} /></span>
      <div><b>{t(`hint.${id}.title`)}</b><div className="muted">{t(`hint.${id}.text`)}</div></div>
      <label className="row muted"><input type="checkbox" onChange={() => { updateSettings({ hints: false }); refresh(); }} />{t('hint.off')}</label>
      <button className="btn primary big" onClick={() => { markSeen(id); refresh(); }}>{t('hint.ok')}</button>
    </div>
  );
}
