// Meteo e terreno (0.5.0, scelta di Marco: pioggia, vento, caldo, campo pesante). Il tempo di una partita si ricava
// dal calendario (niente date reali: il mese viene dal giorno della stagione) e non si salva. In campo sono leve
// piccole e uguali per le due squadre: la pioggia rende più difficile la palla a terra, il vento cross e lanci, caldo e
// campo pesante stancano, il campo pesante rallenta.
import { WEATHER } from './balance.ts';
import type { Fixture, WorldState } from './model.ts';

export const WEATHER_KINDS = ['clear', 'rain', 'storm', 'wind', 'heat', 'cold'] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];
export interface Weather { kind: WeatherKind; heavy: boolean } // heavy: campo pesante

/** effetti in campo: logit tolto a passaggi e dribbling, logit tolto a cross e lanci, fatica, velocità, parate più incerte */
export interface WeatherFx { pass: number; cross: number; drain: number; speed: number; slip: number } // slip: gol in più col pallone bagnato
export const CALM: WeatherFx = { pass: 0, cross: 0, drain: 1, speed: 1, slip: 0 };

/** mese dall'inizio della stagione: 0 agosto … 9 maggio (la stagione parte il 22 agosto) */
export const monthOf = (day: number) => Math.max(0, Math.min(10, Math.floor((day + 21) / 30.4)));

export function weatherFor(world: WorldState, fx: Pick<Fixture, 'day' | 'home' | 'away'>): Weather {
  const m = monthOf(fx.day);
  const probs = m <= 1 || m >= 9 ? WEATHER.summer : m >= 4 && m <= 6 ? WEATHER.winter : WEATHER.autumn;
  let h = 2166136261;
  for (const n of [world.seed, world.season, fx.day, fx.home]) h = Math.imul(h ^ (n >>> 0), 16777619) >>> 0;
  let roll = (h % 10000) / 10000;
  let kind: WeatherKind = 'clear';
  for (const k of WEATHER_KINDS) { const p = probs[k] ?? 0; if (roll < p) { kind = k; break; } roll -= p; }
  return { kind, heavy: kind === 'storm' || kind === 'cold' };
}

export function weatherFx(w: Weather): WeatherFx {
  const e = WEATHER.fx[w.kind];
  return w.heavy ? { ...e, drain: e.drain * WEATHER.heavyDrain, speed: e.speed * WEATHER.heavySpeed } : e;
}
