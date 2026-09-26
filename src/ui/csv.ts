// Esportazione CSV (0.3.0) per rosa, classifiche, finanze e record. Excel apre il file com'è: BOM per le lettere
// accentate; in italiano punto e virgola e virgola decimale, in inglese virgola e punto.
import { download } from './calendar.ts';
import { lang } from './i18n.ts';

export type Cell = string | number | null;

export function toCsv(rows: Cell[][], l: 'it' | 'en' = 'it'): string {
  const sep = l === 'it' ? ';' : ',';
  const cell = (v: Cell) => {
    let s = v === null ? '' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : v;
    if (typeof v === 'number' && l === 'it') s = s.replace('.', ',');
    return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(sep)).join('\r\n');
}

export const downloadCsv = (name: string, rows: Cell[][]) => download(name, toCsv(rows, lang()), 'text/csv;charset=utf-8');
