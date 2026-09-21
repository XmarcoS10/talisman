// Coppa nazionale nel calendario: i turni uno sotto l'altro, con risultati, rigori e il cammino del tuo club.
import { Trophy } from 'lucide-react';
import { tieWinner } from '../../engine/cup.ts';
import type { WorldState } from '../../engine/model.ts';
import { Crest } from '../Crest.tsx';
import { kickoff } from '../calendar.ts';
import { fmtDate, t } from '../i18n.ts';

const roundName = (n: number, i: number) => t(n - i === 1 ? 'cup.final' : n - i === 2 ? 'cup.semi' : n - i === 3 ? 'cup.quarter' : 'cup.round', { n: i + 1 });

export function CupView({ world, clubId }: { world: WorldState; clubId: number }) {
  const cup = world.cup;
  if (!cup) return <div className="panel muted">{t('cup.none')}</div>;
  const n = cup.rounds.length;
  const out = cup.rounds.flatMap((r) => r.ties).find((fx) => (fx.home === clubId || fx.away === clubId) && tieWinner(fx) !== null && tieWinner(fx) !== clubId);
  const past = world.cupWinners.slice(-5).reverse();
  return (
    <div className="cols2">
      <div className="stack">
        {cup.rounds.map((r, i) => (
          <div key={r.day} className="panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2><Trophy size={16} /> {roundName(n, i)}</h2>
              <span className="caps">{fmtDate(world.season, r.day)}</span>
            </div>
            {r.ties.length === 0 && <span className="muted">{t('cup.toDraw')}</span>}
            <div className="results">
              {r.ties.map((fx) => {
                const h = world.clubs[fx.home]!, a = world.clubs[fx.away]!;
                const w = tieWinner(fx);
                const me = fx.home === clubId || fx.away === clubId;
                return (
                  <div key={`${fx.home}-${fx.away}`} className={`result ${me ? 'me' : ''}`}>
                    <span className={`r ${w === fx.away ? 'muted' : ''}`}>{h.name} <Crest club={h} size={16} /></span>
                    <b className="num c">{fx.result ? `${fx.result.hg} - ${fx.result.ag}` : kickoff(world, fx)}{fx.pens && <small className="muted"> ({t('cup.pens', { a: fx.pens[0], b: fx.pens[1] })})</small>}</b>
                    <span className={w === fx.home ? 'muted' : ''}><Crest club={a} size={16} /> {a.name}</span>
                  </div>
                );
              })}
            </div>
            {i === 0 && cup.byes.length > 0 && <span className="muted small">{t('cup.byes', { n: cup.byes.length })}</span>}
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="panel">
          <h2>{t('cup.us')}</h2>
          {cup.winner === clubId ? <b className="pos-good deal-h">{t('cup.weWon')}</b>
            : out ? <span className="pos-bad">{t('cup.weOut', { opp: world.clubs[out.home === clubId ? out.away : out.home]!.name })}</span>
            : <span className="pos-good">{cup.winner !== null ? '' : t('cup.stillIn')}</span>}
          {cup.winner !== null && <span>{t('cup.winner', { club: world.clubs[cup.winner]!.name })}</span>}
          <span className="muted small">{t('cup.hint')}</span>
        </div>
        <div className="panel">
          <h2>{t('cup.roll')}</h2>
          {past.length === 0 && <span className="muted">{t('cup.noRoll')}</span>}
          {past.map((p) => <div key={p.season} className="row"><span className="num muted">{p.season}/{String(p.season + 1).slice(2)}</span> <b>{world.clubs[p.clubId]?.name}</b></div>)}
        </div>
      </div>
    </div>
  );
}

/** le amichevoli estive del club dell'utente, in una riga */
export function Preseason({ world }: { world: WorldState }) {
  const f = world.friendlies;
  if (!f || f.season !== world.season) return null;
  const res = (g: (typeof f.games)[number]) => (g.gf > g.ga ? 'W' : g.gf === g.ga ? 'D' : 'L');
  const n = (k: string) => f.games.filter((g) => res(g) === k).length;
  return (
    <div className="panel preseason">
      <span className="caps">{t('friendly.title')}</span>
      {f.games.map((g) => (
        <span key={g.day} className="friendly">
          <span className={`form ${res(g)}`}>{t(`col.${res(g) === 'W' ? 'w' : res(g) === 'D' ? 'd' : 'l'}`)}</span>
          <b className="num">{g.gf}-{g.ga}</b>
          <span className="small">{t(g.home ? 'friendly.vsHome' : 'friendly.vsAway', { club: world.clubs[g.opp]?.name ?? '' })}</span>
          <span className="muted small">{t('friendly.ago', { n: -g.day })}</span>
        </span>
      ))}
      <span className="muted small">{t('friendly.sum', { w: n('W'), d: n('D'), l: n('L'), gd: f.games.reduce((s, g) => s + g.gf - g.ga, 0) })}</span>
    </div>
  );
}
