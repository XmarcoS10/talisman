// Colonna sinistra della partita live: la tua squadra in campo, con condizione, voto e cambi (GUIDA §8.4).
import { useState } from 'react';
import type { MP, MatchRun } from '../../engine/match/engine.ts';
import { ratingAt } from '../../engine/players.ts';
import { PosBadge, shortName } from '../bits.tsx';
import { t } from '../i18n.ts';

export function LiveBench({ run, me, onChange }: { run: MatchRun; me: 0 | 1; onChange: () => void }) {
  const [out, setOut] = useState<MP | null>(null);
  const team = run.teams[me];
  const sub = (inId: number) => {
    if (out && run.sub(me, out.p.id, inId)) onChange();
    setOut(null);
  };
  return (
    <div className="panel live-bench">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{t('live.squad')}</h3>
        <span className="muted">{t('live.subsLeft', { n: team.subs })}</span>
      </div>
      <table>
        <tbody>
          {team.on.map((m) => {
            const r = run.rating(m);
            return (
              <tr key={m.p.id} className={`clickable ${out === m ? 'me' : ''}`} onClick={() => setOut(out === m ? null : m)}>
                <td><PosBadge pos={m.pos} /></td>
                <td>{shortName(m.p)}{m.st.yellows > 0 && <span className="status ban"> 🟨</span>}{m.st.injured && <span className="status inj"> ✚</span>}</td>
                <td className={`num r ${m.energy < 62 ? 'pos-bad' : m.energy < 75 ? 'pos-mid' : 'muted'}`}>{Math.round(m.energy)}</td>
                <td className={`num r ${r >= 7.5 ? 'pos-good' : r < 6 ? 'pos-bad' : ''}`}>{r.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {out && (
        <div className="grid" style={{ gap: 'var(--s-2)' }}>
          <div className="muted">{t('live.replace', { name: shortName(out.p) })}</div>
          {team.bench.length === 0 || team.subs === 0
            ? <div className="muted">{t('live.noSubs')}</div>
            : [...team.bench]
                .sort((a, b) => ratingAt(b, out.pos) - ratingAt(a, out.pos))
                .map((p) => (
                  <button key={p.id} className="btn" onClick={() => sub(p.id)}>
                    {shortName(p)} <span className="muted">{t(`pos.${p.position}`)} · {p.condition.fitness}%</span>
                  </button>
                ))}
        </div>
      )}
    </div>
  );
}
