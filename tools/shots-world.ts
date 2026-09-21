// Un mondo per gli screenshot del sito: metà girone d'andata giocato, così ci sono classifica, notizie e storie.
// Uso: node tools/shots-world.ts <file di uscita>
import { writeFileSync } from 'node:fs';
import { serialize } from '../src/engine/save.ts';
import { advance, newWorld } from '../src/engine/world.ts';
import { preseason } from '../src/engine/friendlies.ts';

const out = process.argv[2] ?? 'talisman-save-1.json';
const world = newWorld(2026);
const comp = world.competitions.ITA1!;
world.manager.clubId = [...comp.clubIds].sort((a, b) => world.clubs[b]!.reputation - world.clubs[a]!.reputation)[6]!;
world.manager.name = 'Marco';
preseason(world);
for (let i = 0; i < 12; i++) advance(world);
const club = world.clubs[world.manager.clubId]!;
const meta = { manager: world.manager.name, clubId: club.id, clubName: club.name, season: world.season, day: world.day };
writeFileSync(out, `{"v":2,"savedAt":${Date.now()},"meta":${JSON.stringify(meta)},"data":${serialize(world)}}`);
console.log(`mondo per gli screenshot: ${club.name}, giornata ${world.day}`);
