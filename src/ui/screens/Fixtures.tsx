import { useState } from 'react';
import type { Fixture, WorldState } from '../../engine/model.ts';
import { DAYS_BETWEEN_ROUNDS } from '../../engine/world.ts';
import { Crest } from '../Crest.tsx';
import { fmtDate, t } from '../i18n.ts';

/** esito dal punto di vista di un club: W/D/L */
export function outcome(fx: Fixture, clubId: number): 'W' | 'D' | 'L' | null {
  if (!fx.result) return null;
  const { hg, ag } = fx.result;
  const mine = fx.home === clubId ? hg - ag : ag - hg;
  return mine > 0 ? 'W' : mine < 0 ? 'L' : 'D';
}

export function ResultsList({ world, fixtures, highlight }: { world: WorldState; fixtures: Fixture[]; highlight?: number }) {
  return (
    <table>
      <tbody>
        {fixtures.map((fx) => {
          const h = world.clubs[fx.home]!, a = world.clubs[fx.away]!;
          return (
            <tr key={`${fx.home}-${fx.away}`} className={fx.home === highlight || fx.away === highlight ? 'me' : ''}>
              <td className="r">{h.name} <Crest club={h} size={16} /></td>
              <td className="c num"><b>{fx.result ? `${fx.result.hg} - ${fx.result.ag}` : '-'}</b></td>
              <td><Crest club={a} size={16} /> {a.name}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Fixtures({ world, clubId }: { world: WorldState; clubId: number }) {
  const comp = world.competitions[world.clubs[clubId]!.compId]!;
  const mine = comp.fixtures.filter((f) => f.home === clubId || f.away === clubId);
  const nextIdx = mine.findIndex((f) => !f.result);
  const [round, setRound] = useState(Math.max(0, nextIdx === -1 ? mine.length - 1 : nextIdx - 1));
  const roundDay = round * DAYS_BETWEEN_ROUNDS;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
      <div className="panel">
        <h2>{comp.name}</h2>
        <table>
          <thead><tr><th>#</th><th>{t('col.date')}</th><th>{t('col.opponent')}</th><th className="c">{t('col.result')}</th></tr></thead>
          <tbody>
            {mine.map((fx, i) => {
              const home = fx.home === clubId;
              const opp = world.clubs[home ? fx.away : fx.home]!;
              const o = outcome(fx, clubId);
              return (
                <tr key={i} className={`clickable ${i === round ? 'me' : ''}`} onClick={() => setRound(i)}>
                  <td className="num muted">{i + 1}</td>
                  <td className="num">{fmtDate(world.season, fx.day)}</td>
                  <td><span className="row" style={{ gap: 'var(--s-2)' }}><Crest club={opp} size={18} />{opp.name} <span className="muted">({home ? 'C' : 'T'})</span></span></td>
                  <td className="c">{o && <span className="row" style={{ justifyContent: 'center', gap: 'var(--s-2)' }}><span className={`form ${o}`}>{t(`col.${o === 'W' ? 'w' : o === 'D' ? 'd' : 'l'}`)}</span><span className="num">{fx.result!.hg}-{fx.result!.ag}</span></span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="panel" style={{ position: 'sticky', top: 0 }}>
        <h3>{t('fixtures.round', { n: round + 1 })} · {t('fixtures.allResults')}</h3>
        <ResultsList world={world} fixtures={comp.fixtures.filter((f) => f.day === roundDay)} highlight={clubId} />
      </div>
    </div>
  );
}
