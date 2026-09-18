// PRNG deterministico xoshiro128**. Regola del progetto: il caso nativo di JS è vietato,
// tutto passa da qui così stesso seed = stessa partita = stesso mondo.

export type RngState = [number, number, number, number];

const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));

function splitmix32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export class Rng {
  s: RngState;

  constructor(seedOrState: number | RngState) {
    if (typeof seedOrState === 'number') {
      const sm = splitmix32(seedOrState);
      this.s = [sm(), sm(), sm(), sm()];
    } else {
      this.s = [...seedOrState];
    }
  }

  u32(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return result;
  }

  /** [0, 1) */
  next(): number {
    return this.u32() / 4294967296;
  }

  /** intero in [min, max] inclusi */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Box-Muller */
  gauss(mu = 0, sigma = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  pick<T>(arr: readonly T[]): T {
    const v = arr[Math.floor(this.next() * arr.length)];
    if (v === undefined) throw new Error('pick su array vuoto');
    return v;
  }

  /** scelta pesata: restituisce l'indice */
  weighted(weights: readonly number[]): number {
    let x = this.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) if ((x -= weights[i]!) < 0) return i;
    return weights.length - 1;
  }

  /** Fisher-Yates, restituisce una copia */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  poisson(lambda: number): number {
    const l = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > l);
    return k - 1;
  }

  /** flusso indipendente derivato da un'etichetta: aggiungere caso in un sistema non sposta gli altri */
  fork(label: string): Rng {
    let h = this.u32();
    for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
    return new Rng(h >>> 0);
  }
}
