// Il CSV si apre giusto in Excel: lettere accentate, separatori dentro i nomi, decimali nella lingua di chi gioca.
import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.ts';

describe('CSV', () => {
  it('in italiano: punto e virgola, virgola decimale, BOM', () => {
    expect(toCsv([['Théo Dubois', 7.25, 3, null]], 'it')).toBe('﻿Théo Dubois;7,25;3;');
  });
  it('in inglese: virgola e punto', () => {
    expect(toCsv([['a', 7.25], ['b', 1]], 'en')).toBe('﻿a,7.25\r\nb,1');
  });
  it('le celle col separatore o le virgolette vanno tra virgolette', () => {
    expect(toCsv([['Rossi; Bianchi', 'il "Toro"']], 'it')).toBe('﻿"Rossi; Bianchi";"il ""Toro"""');
    expect(toCsv([['Smith, J.']], 'en')).toBe('﻿"Smith, J."');
  });
});
