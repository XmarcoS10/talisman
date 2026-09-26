// Grammatica inglese dei testi generati (Blocco 5), come italian.test.ts per l'italiano.
import { describe, expect, it } from 'vitest';
import { numWordEn, ordinalNumEn, ordinalWordEn, possessive, tidyEn } from './english.ts';

describe('grammatica inglese', () => {
  it('numeri in lettere', () => {
    expect([0, 7, 13, 20, 21, 38, 99].map(numWordEn)).toEqual(['zero', 'seven', 'thirteen', 'twenty', 'twenty-one', 'thirty-eight', 'ninety-nine']);
  });
  it('ordinali in lettere e in cifre', () => {
    expect([1, 2, 3, 5, 8, 9, 12, 20, 21, 42].map(ordinalWordEn)).toEqual(['first', 'second', 'third', 'fifth', 'eighth', 'ninth', 'twelfth', 'twentieth', 'twenty-first', 'forty-second']);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 91].map(ordinalNumEn)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '91st']);
  });
  it('genitivo sassone', () => {
    expect(possessive('Vignarola')).toBe("Vignarola's");
    expect(possessive('Santos')).toBe("Santos'");
  });
  it('a/an, spazi, maiuscole', () => {
    expect(tidyEn('a  important win . a unique goal: a one-two ! what a hour')).toBe('An important win. A unique goal: a one-two! What an hour');
  });
});
