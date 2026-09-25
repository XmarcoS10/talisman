// Tabellino dell'intervallo e della fine partita (Blocco 3, punto 8): numeri, mappa dei tiri, migliori in campo e
// il commento dell'analista su cosa cambiare. All'intervallo la partita aspetta; alla fine resta la striscia dei replay.
import type { MatchRun } from '../../engine/match/engine.ts';
import type { Club } from '../../engine/model.ts';
import { pick, type Ctx } from '../match/analyst.ts';
import type { Clip } from '../match/highlights.ts';
import { sheet, type SheetSide, type ShotDot } from '../match/sheet.ts';
import { shortName } from '../bits.tsx';
import { t } from '../i18n.ts';
import { ClipStrip } from './LiveParts.tsx';

const ROWS: { key: string; get: (s: SheetSide) => number | string }[] = [
  { key: 'xg', get: (s) => s.xg.toFixed(2) },
  { key: 'shots', get: (s) => `${s.shots} (${s.onTarget})` },
  { key: 'possession', get: (s) => `${s.possession}%` },
  { key: 'passes', get: (s) => `${s.passesOk}/${s.passes}` },
  { key: 'duels', get: (s) => s.duels },
];
const share = (s: SheetSide, o: SheetSide, key: string) => {
  const v = (x: SheetSide) => (key === 'xg' ? x.xg : key === 'shots' ? x.shots : key === 'possession' ? x.possession : key === 'passes' ? x.passesOk : x.duels);
  const a = v(s), b = v(o);
  return a + b > 0 ? (100 * a) / (a + b) : 50;
};

/** mappa dei tiri: la tua squadra attacca a destra; più grande il cerchio, più alto l'xG */
function ShotMap({ shots, me }: { shots: ShotDot[]; me: 0 | 1 }) {
  const mx = (x: number) => (me === 0 ? x : 12 - x), my = (y: number) => (me === 0 ? y : 8 - y);
  return (
    <svg viewBox="0 0 120 80" className="shot-map" role="img" aria-label={t('sheet.shotMap')}>
      <rect x="0" y="0" width="120" height="80" className="field" />
      <line x1="60" y1="0" x2="60" y2="80" /><rect x="0" y="21" width="19" height="38" /><rect x="101" y="21" width="19" height="38" />
      {shots.map((s, i) => (
        <circle key={i} cx={mx(s.x) * 10} cy={my(s.y) * 10} r={2 + s.xg * 9} className={`shot ${s.outcome} ${s.side === me ? 'me' : 'them'}`}>
          <title>{`${s.min}' xG ${s.xg.toFixed(2)} · ${t(`sheet.out.${s.outcome}`)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function LiveSheet({ run, me, clubs, step, final, ctx, clips, now, onReplay, onClose, onFinish }: {
  run: MatchRun; me: 0 | 1; clubs: readonly [Club, Club]; step: number; final: boolean; ctx: Ctx;
  clips: Clip[]; now: number; onReplay: (c: Clip) => void; onClose: () => void; onFinish: () => void;
}) {
  const { sides, shots } = sheet(run.frames, step);
  const best = [...run.teams[0].played, ...run.teams[1].played].sort((a, b) => run.rating(b) - run.rating(a)).slice(0, 3);
  const advice = pick(ctx, new Map());
  return (
    <div className="panel live-sheet">
      <div className="sheet-head">
        <h2>{t(final ? 'sheet.final' : 'sheet.half')}</h2>
        <b className="num">{clubs[0].shortName} {sides[0].goals} : {sides[1].goals} {clubs[1].shortName}</b>
      </div>
      <div className="sheet-grid">
        <div className="sheet-stats">
          {ROWS.map((r) => (
            <div key={r.key} className="sheet-row">
              <span className="num">{r.get(sides[0])}</span>
              <span className="lbl">{t(`sheet.${r.key}`)}</span>
              <span className="num">{r.get(sides[1])}</span>
              <div className="sheet-bar"><i style={{ width: `${share(sides[0], sides[1], r.key)}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="stack"><span className="caps">{t('sheet.shotMap')}</span><ShotMap shots={shots} me={me} /></div>
        <div className="stack">
          <span className="caps">{t('sheet.best')}</span>
          {best.map((m) => (
            <div key={m.p.id} className="row"><b>{shortName(m.p)}</b><span className="muted small">{clubs[run.teams[0].played.includes(m) ? 0 : 1].shortName}</span>
              <span className="num">{run.rating(m).toFixed(1)}</span></div>
          ))}
          <span className="caps">{t('live.analyst')}</span>
          <p className="sheet-advice">{advice ? t(`an.${advice.id}`, advice.vars) : t('an.quiet')}</p>
        </div>
      </div>
      <ClipStrip clips={clips} now={now} me={me} onReplay={onReplay} />
      <div className="row wrap">
        {!final && <button className="btn primary" onClick={onClose}>{t('sheet.resume')}</button>}
        {final && <button className="btn" onClick={onClose}>{t('sheet.watch')}</button>}
        {final && <button className="btn primary" onClick={onFinish}>{t('live.report')}</button>}
      </div>
    </div>
  );
}
