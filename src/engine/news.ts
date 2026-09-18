// Notizie per l'utente: chiave i18n + variabili (il motore non conosce le lingue).
import type { WorldState } from './model.ts';

const MAX_NEWS = 60;

export function addNews(world: WorldState, key: string, vars: Record<string, string | number> = {}) {
  world.news.push({ season: world.season, day: world.day, key, vars });
  if (world.news.length > MAX_NEWS) world.news.splice(0, world.news.length - MAX_NEWS);
}
