// GP3: volti ripetibili, che invecchiano, e che non toccano il caso del resto del programma.
import { describe, expect, it } from 'vitest';
import { faceFor, faceDataUri } from './face.ts';

const p = { id: 42, nation: 'ITA', heightCm: 185 };

describe('volti (GP3)', () => {
  it('stesso giocatore, stesso volto', () => {
    expect(faceFor(p, 24)).toEqual(faceFor(p, 24));
    expect(faceDataUri(p, 24)).toBe(faceDataUri({ ...p }, 24));
  });

  it('giocatori diversi hanno volti diversi', () => {
    const faces = new Set(Array.from({ length: 50 }, (_, id) => JSON.stringify(faceFor({ ...p, id }, 24))));
    expect(faces.size).toBe(50);
  });

  it('con gli anni arrivano rughe e capelli grigi', () => {
    const young = faceFor(p, 22), old = faceFor(p, 36);
    expect(young.hair.color).not.toBe(old.hair.color);
    expect(old.smileLine.id).not.toBe('none');
  });

  it('Math.random torna quello di prima', () => {
    const real = Math.random;
    faceFor({ ...p, id: 7 }, 30);
    expect(Math.random).toBe(real);
  });
});
