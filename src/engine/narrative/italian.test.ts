// Italiano corretto prima di tutto: articoli, preposizioni articolate, numeri, accordi.
import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import { article, numWord, ordinal, teamForms, teamGender, tidy } from './italian.ts';
import { expand, write } from './text.ts';

describe('italiano dei testi (F8)', () => {
  it('il genere delle squadre segue il nome della città', () => {
    expect(teamGender('Vignarola')).toBe('f');
    expect(teamGender('Ventimonti')).toBe('m');
    expect(teamGender('Torre Alta')).toBe('f');
    expect(teamGender('Rocca d\'Oro')).toBe('f');
    expect(teamGender('San Ferrante')).toBe('m');
    expect(teamGender('Porto Aldo')).toBe('m');
  });

  it('articoli: il, lo, l\', la', () => {
    expect(article('Ventimonti', 'm')).toBe('il');
    expect(article('Sporting', 'm')).toBe('lo');
    expect(article('Zagabria', 'm')).toBe('lo');
    expect(article('Acquanera', 'f')).toBe("l'");
    expect(article('Ortanova', 'f')).toBe("l'");
    expect(article('Vignarola', 'f')).toBe('la');
  });

  it('preposizioni articolate e forme di squadra', () => {
    const v = teamForms('club', 'Vignarola');
    expect(v.club).toBe('la Vignarola');
    expect(v.club_di).toBe('della Vignarola');
    expect(v.club_a).toBe('alla Vignarola');
    expect(v.club_contro).toBe('contro la Vignarola');
    const m = teamForms('club', 'Ventimonti');
    expect(m.club_di).toBe('del Ventimonti');
    expect(m.club_in).toBe('nel Ventimonti');
    const e = teamForms('club', 'Acquanera');
    expect(e.club).toBe("l'Acquanera");
    expect(e.club_di).toBe("dell'Acquanera");
    expect(e.club_su).toBe("sull'Acquanera");
    const s = teamForms('club', 'Stellanza');
    expect(s.club_di).toBe('della Stellanza');
    expect(teamForms('x', 'Spezzano').x_di).toBe('dello Spezzano');
    expect(teamForms('x', 'Sant\'Elmo').x).toBe("il Sant'Elmo");
  });

  it('numeri e ordinali in lettere', () => {
    expect(numWord(3)).toBe('tre');
    expect(numWord(21)).toBe('ventuno');
    expect(numWord(28)).toBe('ventotto');
    expect(numWord(34)).toBe('trentaquattro');
    expect(ordinal(3, 'm')).toBe('terzo');
    expect(ordinal(3, 'f')).toBe('terza');
    expect(ordinal(11, 'f')).toBe('undicesima');
    expect(ordinal(23, 'm')).toBe('ventitreesimo');
    expect(ordinal(20, 'm')).toBe('ventesimo');
  });

  it('la frase esce pulita: maiuscola, niente spazi doppi, apostrofi attaccati', () => {
    expect(tidy('  il Ventimonti  vince ,  e bene .')).toBe('Il Ventimonti vince, e bene.');
    expect(tidy("dell' Acquanera")).toBe("Dell'Acquanera");
    expect(tidy('fine. il Ventimonti vince! la gente esulta: il resto no')).toBe('Fine. Il Ventimonti vince! La gente esulta: il resto no');
    expect(tidy('segna per la ottava volta, una altra rete della ultima giornata')).toBe("Segna per l'ottava volta, un'altra rete dell'ultima giornata");
    expect(tidy('La ottava')).toBe("L'ottava");
  });

  it('la grammatica espande variabili, frammenti e scelte annidate', () => {
    const g = { verbo: ['vince', 'passa'] };
    const s = expand('{club} #verbo# [a [casa|domicilio]|in trasferta].', { club: 'il Ventimonti' }, g, new Rng(1));
    expect(s).toMatch(/^Il Ventimonti (vince|passa) (a (casa|domicilio)|in trasferta)\.$/);
  });

  it('i pesi contano: una scelta a peso 9 esce molto più spesso', () => {
    const rng = new Rng(5);
    let heavy = 0;
    for (let i = 0; i < 200; i++) if (expand('[sì^9|no]', {}, {}, rng) === 'Sì') heavy++;
    expect(heavy).toBeGreaterThan(150);
  });

  it('la stessa frase non esce più di tre volte, se ci sono alternative', () => {
    const seen = new Map<string, number>();
    const rng = new Rng(2);
    const out = Array.from({ length: 9 }, () => write(['[uno|due|tre] gol'], {}, {}, rng, seen));
    for (const n of seen.values()) expect(n).toBeLessThanOrEqual(3);
    expect(new Set(out).size).toBe(3);
  });
});
