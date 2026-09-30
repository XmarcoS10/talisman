// Foto dell'interfaccia nell'app vera a 1280×800 (interfaccia v2): Scrivania, sua modifica con la galleria, tema chiaro.
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
    win.show();
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ lang: 'it', hints: false, guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 } })); location.reload();`);
    await loaded();
    await wait(800);
    await click('button', 'Slot 1');
    await wait(1500);
    await shot('scrivania');
    await click('.desk-head button', 'Personalizza');
    await click('.desk-add');
    await shot('scrivania-modifica');
    await click('.desk-banner button', 'Annulla');
    await click('.continue .more');
    await shot('continua-menu');
    await js(`document.body.click(); true`);
    await click('.topbar .icon-btn[aria-label="Tema chiaro o scuro"]');
    await shot('scrivania-chiaro');
  } catch (e) { console.error(e); }
  app.quit();
});
