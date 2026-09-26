// Spareggi della Serie B e Serie C di contorno nelle classifiche (Blocco 4): il tabellone dei playoff e del playout
// quando c'è, e la Serie C che non si gioca partita per partita (la classifica si decide a fine stagione).
import type { ClubId, Competition, Fixture, WorldState } from '../../engine/model.ts';
import { t } from '../i18n.ts';

const score = (f: Fixture) => (f.result ? `${f.result.hg}-${f.result.ag}` : '–');

function Tie({ world, games, me }: { world: WorldState; games: Fixture[]; me: ClubId }) {
  const name = (id: ClubId) => world.clubs[id]!.shortName;
  const [a] = games;
  if (!a) return null;
  const mine = games.some((f) => f.home === me || f.away === me);
  return (
    <div className={`tie ${mine ? 'me' : ''}`}>
      <b>{name(a.home)}</b> – <b>{name(a.away)}</b>
      <span className="muted small num">{games.map(score).join(' · ')}</span>
    </div>
  );
}

/** il tabellone: preliminare, semifinali, finale; e il playout se si gioca */
export function PlayoffBracket({ world, me }: { world: WorldState; me: ClubId }) {
  const po = world.playoffs;
  if (!po || po.season !== world.season) return null;
  const on = (d: number[], stage: Fixture['stage'] = 'playoff') => po.ties.filter((f) => d.includes(f.day) && f.stage === stage);
  // un doppio confronto è la coppia andata/ritorno con le stesse due squadre
  const pairs = (games: Fixture[]) => {
    const out: Fixture[][] = [];
    for (const g of games) {
      const other = out.find((p) => p[0]!.home === g.away && p[0]!.away === g.home);
      if (other) other.push(g); else out.push([g]);
    }
    return out;
  };
  const rounds: [string, Fixture[][]][] = [
    ['playoff.prelim', on([po.days.prelim]).map((g) => [g])],
    ['playoff.semi', pairs(on(po.days.semi))],
    ['playoff.final', pairs(on(po.days.final))],
  ];
  return (
    <div className="panel">
      <h2>{t('playoff.title')}</h2>
      {rounds.filter(([, ties]) => ties.length).map(([k, ties]) => (
        <div key={k} className="stack"><span className="caps">{t(k)}</span>{ties.map((g, i) => <Tie key={i} world={world} games={g} me={me} />)}</div>
      ))}
      {po.winner !== null && <div className="pos-good">{t('playoff.winner', { club: world.clubs[po.winner]!.name })}</div>}
      <span className="caps">{t('playout.title')}</span>
      {po.playout ? <Tie world={world} games={on(po.days.playout, 'playout')} me={me} /> : <span className="muted small">{t('playout.none', { club: world.clubs[po.relegated!]!.name })}</span>}
    </div>
  );
}

/** Serie C senza il club dell'utente: niente partite, la classifica si calcola a fine stagione dalla forza */
export function ShadowLeague({ world, comp, onClub }: { world: WorldState; comp: Competition; onClub: (id: number) => void }) {
  const clubs = comp.clubIds.map((id) => world.clubs[id]!).sort((a, b) => b.reputation - a.reputation);
  return (
    <div className="panel">
      <h2>{comp.name}</h2>
      <p className="muted">{t('tables.shadow', { n: comp.promote })}</p>
      <div className="chips">
        {clubs.map((c) => <button key={c.id} className="chip-btn" onClick={() => onClub(c.id)}>{c.name}</button>)}
      </div>
    </div>
  );
}
