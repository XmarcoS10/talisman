// Foto dell'interfaccia nell'app vera a 1280×800 (interfaccia v2): Scrivania, sua modifica con la galleria, tema chiaro,
// partita dal vivo e resoconto.
// Uso: pnpm build && npx electron tools/ui-shots.cjs [cartella]   (predefinita: la cartella temporanea del sistema)
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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
  const shot = async (name) => { await wait(500); fs.writeFileSync(path.join(out, `${name}.png`), (await win.webContents.capturePage()).toPNG()); console.log(`foto: ${path.join(out, name)}.png`); };
  try {
    await loaded();
    win.setContentSize(1280, 800);
    win.webContents.setBackgroundThrottling(false); // la finestra può finire dietro le altre: la partita deve correre lo stesso
    win.show();
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ lang: 'it', hints: false, guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 } })); location.reload();`);
    await loaded();
    await wait(800);
    await click('button', 'Slot 1');
    await wait(1500);
    await shot('scrivania');
    for (const [nav, name] of [['Rosa', 'rosa'], ['Tattica', 'tattica'], ['Mercato', 'mercato'], ['Calendario', 'calendario'], ['Finanze', 'finanze']]) {
      await click('.sidebar button', nav);
      await wait(800);
      await shot(name);
    }
    await click('.sidebar button', 'Rosa');
    await wait(500);
    await click('tbody tr');
    await wait(800);
    await shot('giocatore');
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
    await until(`!!document.querySelector('canvas.pitch2d')`, 100);
    await wait(4000);
    await shot('partita');
    await click('button', 'Salta al finale');
    await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Vai al risultato'))`, 600);
    await shot('partita-fine');
    await click('button', 'Vai al risultato');
    await until(`!!document.querySelector('.modal')`, 200);
    await shot('resoconto-fondo');
    await js(`document.querySelectorAll('.modal, .modal *').forEach((e) => { e.scrollTop = 0; }); true`);
    await shot('resoconto');
  } catch (e) { console.error(e); }
  app.quit();
});
