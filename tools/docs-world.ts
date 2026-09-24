// Un mondo per le foto della documentazione: stagione avviata, qualche storia aperta e tre offerte sul tavolo.
// Uso: node tools/docs-world.ts [file di uscita]
import { writeFileSync } from 'node:fs';
import { serialize } from '../src/engine/save.ts';
import { advance, newWorld } from '../src/engine/world.ts';
import { preseason } from '../src/engine/friendlies.ts';
import { makeOffer } from '../src/engine/transfers/offers.ts';
import { isWinterWindow } from '../src/engine/transfers/market.ts';

const out = process.argv[2] ?? 'tools/docs-save.json';
const world = newWorld(2026);
const comp = world.competitions.ITA1!;
world.manager.clubId = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation)[6]!;
world.manager.name = 'Marco';
preseason(world);
// fino alla finestra di gennaio: le offerte dell'IA arrivano solo nelle finestre di mercato
while (!isWinterWindow(world.day)) advance(world);

// tre offerte per la Scrivania: i club più blasonati cercano i migliori della rosa
const mine = world.clubs[world.manager.clubId]!;
const big = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation).map((id) => world.clubs[id]!);
const squad = mine.playerIds.map((id) => world.players[id]!).sort((a, b) => b.ca - a.ca);
squad[0]!.personality.ambition = 18;
for (const [i, p] of [squad[0]!, squad[2]!, squad[5]!].entries()) makeOffer(world, big[i]!, p, 90e6, 0.8);

const meta = { manager: world.manager.name, clubId: mine.id, clubName: mine.name, season: world.season, day: world.day };
writeFileSync(out, `{"v":2,"savedAt":${Date.now()},"meta":${JSON.stringify(meta)},"data":${serialize(world)}}`);
console.log(`mondo per la documentazione: ${mine.name}, giornata ${world.day}, offerte ${world.offers.length}`);
