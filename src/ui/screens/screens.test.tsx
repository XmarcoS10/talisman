// Prova di montaggio delle schermate: ognuna si disegna senza errori su un mondo appena nato e su uno a metà
// stagione. Prende l'errore più comune: una schermata che si rompe appena la apri. I clic in clicks.test.tsx.
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { Player, WorldState } from '../../engine/model.ts';
import { range } from '../../engine/scouting/fog.ts';
import { fullName } from '../bits.tsx';
import { advance, newWorld } from '../../engine/world.ts';
import { BoardView } from './BoardView.tsx';
import { ClubView } from './ClubView.tsx';
import { Desk } from './Desk.tsx';
import { Dressing } from './Dressing.tsx';
import { Finance } from './Finance.tsx';
import { Fixtures } from './Fixtures.tsx';
import { Market } from './Market.tsx';
import { PlayerView } from './PlayerView.tsx';
import { Records } from './Records.tsx';
import { Scouts } from './Scouts.tsx';
import { Staff } from './Staff.tsx';
import { Squad } from './Squad.tsx';
import { Stories } from './Stories.tsx';
import { Tables } from './Tables.tsx';
import { Tactics } from './Tactics.tsx';
import { Training } from './Training.tsx';
import { Youth } from './Youth.tsx';

const nop = () => {};

function screens(w: WorldState): [string, ReactElement][] {
  const me = w.manager.clubId;
  const other = Object.values(w.clubs).find((c) => c.id !== me)!;
  const mine = w.clubs[me]!.playerIds[0]!;
  const theirs = other.playerIds[0]!;
  return [
    ['Scrivania', <Desk world={w} onNav={nop} onChange={nop} onPlayer={nop} />],
    ['Storie', <Stories world={w} onChange={nop} />],
    ['Rosa', <Squad world={w} clubId={me} onPlayer={nop} />],
    ['Tattica', <Tactics world={w} onChange={nop} onPlayer={nop} />],
    ['Allenamento', <Training world={w} onChange={nop} onPlayer={nop} />],
    ['Spogliatoio', <Dressing world={w} onChange={nop} onPlayer={nop} />],
    ['Vivaio', <Youth world={w} onPlayer={nop} onChange={nop} />],
    ['Mercato', <Market world={w} onPlayer={nop} onOffer={nop} />],
    ['Osservatori', <Scouts world={w} onChange={nop} onPlayer={nop} />],
    ['Staff', <Staff world={w} onChange={nop} />],
    ['Finanze', <Finance world={w} />],
    ['Dirigenza', <BoardView world={w} onChange={nop} />],
    ['Classifiche', <Tables world={w} clubId={me} onPlayer={nop} onClub={nop} />],
    ['Calendario', <Fixtures world={w} clubId={me} onPlayer={nop} />],
    ['Giocatore mio', <PlayerView world={w} playerId={mine} onBack={nop} onClub={nop} onChange={nop} onPlayer={nop} />],
    ['Giocatore altrui', <PlayerView world={w} playerId={theirs} onBack={nop} onClub={nop} onChange={nop} onPlayer={nop} />],
    ['Record', <Records world={w} onPlayer={nop} />],
    ['Club', <ClubView world={w} clubId={other.id} onPlayer={nop} onBack={nop} />],
  ];
}

const fresh = newWorld(42);
const midSeason = newWorld(42);
for (let i = 0; i < 6; i++) advance(midSeason);

describe.each([['mondo nuovo', fresh], ['metà stagione', midSeason]])('schermate su %s', (_, w) => {
  it.each(screens(w))('%s si disegna', (_name, el) => {
    expect(renderToString(el).length).toBeGreaterThan(100);
  });
});

describe('nebbia nella rosa degli altri (§7.6)', () => {
  it("l'ordine segue le stime, non l'abilità vera", () => {
    const w = fresh;
    const center = (p: Player) => { const [lo, hi] = range(w, p, 'ca'); return (lo + hi) / 2; };
    let differs = 0;
    for (const club of Object.values(w.clubs).filter((c) => c.id !== w.manager.clubId).slice(0, 10)) {
      const html = renderToString(<Squad world={w} clubId={club.id} onPlayer={nop} />);
      const players = club.playerIds.map((id) => w.players[id]!);
      for (const pos of new Set(players.map((p) => p.position))) {
        const group = players.filter((p) => p.position === pos);
        const shown = [...group].sort((a, b) => html.indexOf(`>${fullName(a)}<`) - html.indexOf(`>${fullName(b)}<`)).map((p) => p.id);
        expect(shown).toEqual([...group].sort((a, b) => center(b) - center(a)).map((p) => p.id));
        if (shown.join() !== [...group].sort((a, b) => b.ca - a.ca).map((p) => p.id).join()) differs++;
      }
    }
    expect(differs).toBeGreaterThan(0); // la prova ha senso solo se stime e verità non coincidono sempre
  });
});
