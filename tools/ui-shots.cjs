// Foto dell'interfaccia nell'app vera a 1280×800 (interfaccia v2): Scrivania, sua modifica con la galleria, tema chiaro,
// partita dal vivo e resoconto; nuova carriera e le altre schermate (fase 6).
// Uso: pnpm build && npx electron tools/ui-shots.cjs [cartella]   (predefinita: la cartella temporanea del sistema)
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

app.disableHardwareAcceleration(); // con lo schermo bloccato o spento la cattura via GPU fallisce (UnknownVizError)
require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-shots-'));
const out = path.resolve(process.argv.find((a, i) => i > 1 && !a.endsWith('.cjs') && !a.startsWith('-')) ?? tmp);
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (sel, text = '') => js(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const shot = async (name) => {
    await wait(500);
    fs.writeFileSync(path.join(out, `${name}.png`), (await win.webContents.capturePage()).toPNG());
    // la pagina non deve scorrere di lato a 1280×800: se succede lo si dice, con quanti pixel
    const over = await js(`(() => { const m = document.querySelector('main') ?? document.body; return m.scrollWidth - m.clientWidth; })()`);
    // e la barra laterale deve stare tutta nell'altezza
    const side = await js(`(() => { const n = document.querySelector('.side-nav'); return n ? n.scrollHeight - n.clientHeight : 0; })()`);
    console.log(`foto: ${path.join(out, name)}.png${over > 1 ? ` · ESCE DI LATO di ${over} px` : ''}${side > 1 ? ` · BARRA LATERALE TAGLIATA di ${side} px` : ''}`);
  };
  try {
    await loaded();
    win.setContentSize(1280, 800);
    win.webContents.setBackgroundThrottling(false); // la finestra può finire dietro le altre: la partita deve correre lo stesso
    win.show();
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ lang: 'it', hints: false, guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 } })); location.reload();`);
    await loaded();
    await wait(800);
    // nuova carriera: scelta del club e dossier, poi di nuovo al menu
    await click('button', 'Nuova carriera');
    await wait(800);
    await shot('nuova-carriera');
    await click('.club-tile');
    await click('button', 'Vai al dossier del club');
    await shot('nuova-carriera-dossier');
    await click('button', 'Indietro al menu principale');
    await wait(500);
    await click('button', 'Slot 1');
    await wait(1500);
    await shot('scrivania');
    for (const [nav, name] of [['Rosa', 'rosa'], ['Tattica', 'tattica'], ['Mercato', 'mercato'], ['Calendario', 'calendario'], ['Finanze', 'finanze'], ['Staff', 'staff'],
      ['Allenamento', 'allenamento'], ['Spogliatoio', 'spogliatoio'], ['Vivaio', 'vivaio'], ['Osservatori', 'osservatori'], ['Dirigenza', 'dirigenza'],
      ['Storie', 'storie'], ['Classifiche', 'classifiche'], ['Record', 'record'], ['Impostazioni', 'impostazioni']]) {
      await click('.sidebar button', nav);
      await wait(800);
      await shot(name);
    }
    // tattica a due fasi: 4-4-2 senza palla, vista «Senza palla»
    await click('.sidebar button', 'Tattica');
    await wait(500);
    await js(`(() => { const s = document.querySelectorAll('.tactic-head select')[1]; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '4-4-2'); s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await click('.phase-tabs button', 'Senza palla');
    await wait(500);
    await shot('tattica-senza-palla');
    await click('.sidebar button', 'Rosa');
    await wait(500);
    await click('tbody tr');
    await wait(800);
    await shot('giocatore');
    // colloquio individuale (0.13.0): la risposta del giocatore nel pannello umore
    await click('main .seg-tabs button', 'Dinamiche');
    await wait(400);
    await click('button', 'Lodare il rendimento');
    await js(`document.querySelector('main').scrollTop = 1e5; true`);
    await shot('colloquio');
    await click('.sidebar button', 'Scrivania');
    await wait(500);
    await click('.desk-head button', 'Personalizza');
    await click('.desk-add');
    await shot('scrivania-modifica');
    await click('.desk-banner button', 'Annulla');
    await click('.continue .more');
    await shot('continua-menu');
    await js(`document.body.click(); true`);
    await click('.topbar .icon-btn[aria-label="Tema chiaro o scuro"]');
    await shot('scrivania-chiaro');
    await click('.topbar .icon-btn[aria-label="Tema chiaro o scuro"]');
    const until = async (cond, n) => { for (let i = 0; i < n && !(await js(cond)); i++) await wait(100); };
    await click('button', 'Vai alla partita');
    await until(`!!document.querySelector('.live-talk')`, 100);
    await shot('discorso');
    await click('.live-talk .answer-card', 'Motivare');
    await shot('discorso-reazione');
    await click('.live-talk .btn', "Calcio d'inizio");
    await wait(4000);
    await shot('partita');
    await click('button', 'Salta al finale');
    await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Vai al risultato'))`, 600);
    await click('.live-sheet .answer-card', 'Lodare');
    await shot('partita-fine');
    await click('button', 'Vai al risultato');
    await until(`!!document.querySelector('.modal')`, 200);
    await shot('resoconto-fondo');
    await js(`document.querySelectorAll('.modal, .modal *').forEach((e) => { e.scrollTop = 0; }); true`);
    await shot('resoconto');
  } catch (e) { console.error(e); }
  app.quit();
});
