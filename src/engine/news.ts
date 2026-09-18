// Notizie e registro delle cause per l'utente: chiave i18n + variabili (il motore non conosce le lingue).
import type { Player, WorldState } from './model.ts';

const MAX_NEWS = 60;
const MAX_CAUSAL = 400;

export function addNews(world: WorldState, key: string, vars: Record<string, string | number> = {}) {
  world.news.push({ season: world.season, day: world.day, key, vars });
  if (world.news.length > MAX_NEWS) world.news.splice(0, world.news.length - MAX_NEWS);
}

/** Causal Log: perché è cambiato qualcosa in un giocatore dell'utente (gli altri club non si registrano) */
export function addCause(world: WorldState, p: Player, key: string, vars: Record<string, string | number> = {}) {
  if (p.clubId !== world.manager.clubId) return;
  world.causal.push({ season: world.season, day: world.day, playerId: p.id, key, vars });
  if (world.causal.length > MAX_CAUSAL) world.causal.splice(0, world.causal.length - MAX_CAUSAL);
}

export const pName = (p: Player) => `${p.firstName} ${p.lastName}`;
