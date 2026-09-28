// @vitest-environment happy-dom
// Prova dei clic (debito tecnico della 0.3.0): i gesti che un collaudatore fa per primi. La prova di montaggio
// (screens.test.tsx) dice che una schermata si apre; questa dice che i pulsanti fanno quello che promettono.
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advance, newWorld } from '../../engine/world.ts';
import { t } from '../i18n.ts';
import { settings } from '../settings.ts';
import { talkFor } from '../../engine/transfers/market.ts';
import { Deal } from './Deal.tsx';
import { Fixtures } from './Fixtures.tsx';
import { Market } from './Market.tsx';
import { PressRoom } from './PressRoom.tsx';
import { Records } from './Records.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { Squad } from './Squad.tsx';
import { Start } from './Start.tsx';
import { Tactics } from './Tactics.tsx';

// React vuole saperlo per far finire gli aggiornamenti dentro act()
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: (() => void) | null = null;
afterEach(() => { unmount?.(); unmount = null; document.body.innerHTML = ''; });

function mount(el: ReactElement): HTMLElement {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const root = createRoot(box);
  act(() => root.render(el));
  unmount = () => act(() => root.unmount());
  return box;
}

/** il primo elemento che corrisponde a `sel` e contiene il testo */
function find(box: ParentNode, sel: string, text?: string): HTMLElement {
  const el = [...box.querySelectorAll<HTMLElement>(sel)].find((e) => text === undefined || e.textContent!.includes(text));
  if (!el) throw new Error(`nessun ${sel}${text ? ` con «${text}»` : ''}`);
  return el;
}
const click = (el: HTMLElement) => act(() => el.click());

/** scrive in un campo controllato da React: il valore passa dal setter nativo, poi l'evento input */
function type(input: HTMLInputElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => { set.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true })); });
}

/** intercetta i file scaricati (CSV) invece di aprire il dialogo del browser */
function captureDownloads() {
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { blobs.push(b as Blob); return 'blob:prova'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  return blobs;
}

const world = () => { const w = newWorld(42); w.manager.clubId = w.competitions.ITA1!.clubIds[3]!; return w; };

describe('i clic del collaudatore', () => {
  it('nuova carriera: scelgo il club, scrivo il nome, firmo', () => {
    localStorage.clear();
    const onStart = vi.fn();
    const box = mount(<Start onLoad={() => {}} onStart={onStart} />);
    const tile = find(box, '.club-tile');
    const name = tile.querySelector('.club-name')!.textContent!;
    click(tile);
    click(find(box, 'button', t('start.toDossier')));
    const sign = find(box, 'button', t('start.sign')) as HTMLButtonElement;
    expect(sign.disabled).toBe(true); // senza nome non si firma
    type(box.querySelector<HTMLInputElement>('input.big-input')!, 'Collaudo');
    click(sign);
    expect(onStart).toHaveBeenCalledTimes(1);
    const w = onStart.mock.calls[0]![0];
    expect(w.manager.name).toBe('Collaudo');
    expect(w.clubs[w.manager.clubId].name).toBe(name);
  }, 30_000);

  it('tattica: la mentalità scelta resta nella squadra', () => {
    const w = world(), onChange = vi.fn();
    const box = mount(<Tactics world={w} onChange={onChange} onPlayer={() => {}} />);
    click(find(find(box, `[aria-label="${t('tactics.mentality')}"]`), 'button', t('mentality.5')));
    expect(w.clubs[w.manager.clubId]!.tactic.mentality).toBe(5);
    expect(onChange).toHaveBeenCalled();
  });

  it('rosa: una riga apre il giocatore, il CSV contiene la rosa', () => {
    const w = world(), onPlayer = vi.fn(), blobs = captureDownloads();
    const box = mount(<Squad world={w} clubId={w.manager.clubId} onPlayer={onPlayer} />);
    click(find(box, 'tr.clickable'));
    expect(w.clubs[w.manager.clubId]!.playerIds).toContain(onPlayer.mock.calls[0]![0]);
    click(find(box, `button[title="${t('csv.export')}"]`));
    expect(blobs).toHaveLength(1);
    expect(blobs[0]!.type).toContain('text/csv');
  });

  it('calendario: un risultato si apre col resoconto', () => {
    const w = world();
    for (let i = 0; i < 2; i++) advance(w);
    const box = mount(<Fixtures world={w} clubId={w.manager.clubId} onPlayer={() => {}} />);
    // il calendario si apre sulla prossima giornata: si torna indietro fino a una giocata
    while (!box.querySelector('.result[role="button"]')) click(find(box, 'button.small', '‹'));
    expect(document.querySelector('.modal')).toBeNull();
    click(find(box, '.result[role="button"]'));
    expect(document.querySelector('.modal')).not.toBeNull();
    click(find(document, '.overlay'));
    expect(document.querySelector('.modal')).toBeNull();
  }, 30_000);

  it('record: il pulsante esporta un CSV', () => {
    const w = world(), blobs = captureDownloads();
    const box = mount(<Records world={w} onPlayer={() => {}} />);
    click(find(box, `button[title="${t('csv.export')}"]`));
    expect(blobs).toHaveLength(1);
  });

  it('impostazioni: il tema chiaro si applica e si ricorda', () => {
    const box = mount(<SettingsPanel world={world()} />);
    click(find(box, 'button', t('settings.themeLight')));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(settings().theme).toBe('light');
    click(find(box, 'button', t('settings.themeDark')));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('mercato: «Offri» porta alla trattativa di quel giocatore, la riga alla sua scheda', () => {
    const w = world(), onOffer = vi.fn(), onPlayer = vi.fn();
    const box = mount(<Market world={w} onPlayer={onPlayer} onOffer={onOffer} />);
    click(find(box, 'button', t('market.offer')));
    const id = onOffer.mock.calls[0]![0];
    expect(w.players[id]!.clubId).not.toBe(w.manager.clubId);
    expect(onPlayer).not.toHaveBeenCalled(); // il pulsante non apre anche la scheda
    click(find(box, 'tr.clickable'));
    expect(onPlayer).toHaveBeenCalledTimes(1);
  });

  it("trattativa: si apre, si manda l'offerta e arriva una risposta", () => {
    const w = world(), onChange = vi.fn();
    const other = Object.values(w.clubs).find((c) => c.id !== w.manager.clubId && c.compId === 'ITA1')!;
    const p = w.players[other.playerIds[5]!]!;
    const box = mount(<Deal world={w} p={p} onChange={onChange} onClose={() => {}} />);
    click(find(box, 'button', t('deal.open')));
    expect(talkFor(w, p)).toBeDefined();
    unmount!(); // la trattativa aperta cambia la schermata: si ridisegna come fa l'app dopo onChange
    const again = mount(<Deal world={w} p={p} onChange={onChange} onClose={() => {}} />);
    click(find(again, 'button', t('deal.send')));
    expect(again.querySelector('.banner')).not.toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('conferenza stampa: si sceglie una risposta e si passa alla domanda dopo', () => {
    const w = world();
    for (let i = 0; i < 30 && !w.press; i++) advance(w);
    expect(w.press).not.toBeNull();
    const box = mount(<PressRoom world={w} onChange={() => {}} />);
    const confirm = find(box, 'button', t('press.confirm')) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true); // prima si sceglie
    click(find(box, '.answer-card'));
    click(confirm);
    expect(w.press!.questions[0]!.answered).toBe(0);
  }, 60_000);
});
