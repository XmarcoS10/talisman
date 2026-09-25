// Audio (P13 punto 5): effetti dell'interfaccia e ambiente dello stadio, con volumi separati.
// Tutto sintetizzato con la Web Audio: nessun file da scaricare, nessuna licenza da verificare. È un gancio:
// quando arriveranno suoni registrati basterà sostituire le funzioni qui sotto.
import { settings } from './settings.ts';

let ctx: AudioContext | null = null;
let uiBus: GainNode | null = null;
let crowdBus: GainNode | null = null;
let fxBus: GainNode | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    uiBus = ctx.createGain();
    crowdBus = ctx.createGain();
    fxBus = ctx.createGain();
    uiBus.connect(ctx.destination);
    crowdBus.connect(ctx.destination);
    fxBus.connect(ctx.destination);
    applyVolumes();
  } catch {
    ctx = null; // niente audio (browser senza supporto, test): il gioco va avanti muto
  }
  return ctx;
}

export function applyVolumes() {
  const v = settings().volume;
  const on = muted ? 0 : 1;
  if (uiBus) uiBus.gain.value = v.ui * on;
  if (crowdBus) crowdBus.gain.value = v.crowd * on;
  if (fxBus) fxBus.gain.value = v.fx * on;
}

// finestra in secondo piano: silenzio, se il giocatore l'ha chiesto
if (typeof window !== 'undefined') {
  window.addEventListener('blur', () => { muted = settings().muteOnBlur; applyVolumes(); });
  window.addEventListener('focus', () => { muted = false; applyVolumes(); });
}

/** rumore rosa approssimato: il materiale di cui è fatta una folla */
function noise(a: AudioContext, seconds: number): AudioBuffer {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1; // qui il caso nativo va bene: è l'interfaccia, non il motore
    b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
    d[i] = (b0 + b1 + b2 + w * 0.02) * 0.9;
  }
  return buf;
}

function tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', bus = uiBus) {
  const a = audio();
  if (!a || !bus) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(bus);
  o.start();
  o.stop(a.currentTime + dur);
  return o;
}

export type UiSound = 'click' | 'whistle' | 'goal' | 'error';

export function playUi(kind: UiSound) {
  const a = audio();
  if (!a || !uiBus || !crowdBus || !fxBus) return;
  if (kind === 'click') tone(880, 0.05, 0.08, 'triangle');
  else if (kind === 'error') tone(180, 0.2, 0.15, 'square');
  else if (kind === 'whistle') {
    // fischio dell'arbitro: una nota acuta con un trillo veloce
    const o = tone(2900, 0.45, 0.12, 'sine', fxBus);
    if (o) {
      const lfo = a.createOscillator();
      const depth = a.createGain();
      lfo.frequency.value = 38;
      depth.gain.value = 120;
      lfo.connect(depth).connect(o.frequency);
      lfo.start();
      lfo.stop(a.currentTime + 0.45);
    }
  } else if (kind === 'goal') {
    // il boato: una folata di rumore che sale e si spegne in qualche secondo
    const src = a.createBufferSource();
    src.buffer = noise(a, 3.5);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 0.6;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(1.2, a.currentTime + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 3.4);
    src.connect(f).connect(g).connect(fxBus);
    src.start();
  }
}

/**
 * la folla reagisce (Blocco 3, punto 9), sul volume del pubblico: «ooh» che sale quando parte un tiro pericoloso,
 * «aah» deluso quando va fuori o lo para il portiere, applauso breve per una parata o un dribbling
 */
export type CrowdReaction = 'ooh' | 'aah' | 'applause';

let reactNoise: AudioBuffer | null = null; // un solo buffer per tutte le reazioni: niente calcoli durante la partita

export function crowdReact(kind: CrowdReaction) {
  const a = audio();
  if (!a || !crowdBus) return;
  reactNoise ??= noise(a, 2);
  const [freq, q, peak, rise, dur] = kind === 'ooh' ? [520, 1.2, 0.9, 0.5, 1.6] : kind === 'aah' ? [330, 1.4, 0.7, 0.15, 1.8] : [2400, 0.4, 0.35, 0.05, 1.4];
  const src = a.createBufferSource();
  src.buffer = reactNoise;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  if (kind === 'aah') f.frequency.exponentialRampToValueAtTime(freq * 0.7, a.currentTime + dur); // la voce che scende
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, a.currentTime + rise);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  src.connect(f).connect(g).connect(crowdBus);
  src.start();
}

let crowd: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

/** il brusio dello stadio durante la partita; `intensity` 0-1 segue il momento */
export function crowdStart() {
  const a = audio();
  if (!a || !crowdBus || crowd) return;
  const src = a.createBufferSource();
  src.buffer = noise(a, 4);
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  const gain = a.createGain();
  gain.gain.value = 0.25;
  src.connect(f).connect(gain).connect(crowdBus);
  src.start();
  crowd = { src, gain };
}

export function crowdIntensity(x: number) {
  if (crowd && ctx) crowd.gain.gain.setTargetAtTime(0.15 + 0.35 * Math.max(0, Math.min(1, x)), ctx.currentTime, 0.8);
}

export function crowdStop() {
  if (!crowd) return;
  crowd.src.stop();
  crowd = null;
}
