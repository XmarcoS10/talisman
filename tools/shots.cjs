// Screenshot del gioco vero per il sito (site/img): apre l'app con un mondo di prova in una cartella dati temporanea,
// così non tocca i salvataggi veri, passa per le schermate principali e le fotografa.
// Uso: node tools/shots-world.ts tools/shots-save.json && pnpm build && npx electron tools/shots.cjs
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-shots-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'shots-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
require('../electron/main.cjs');

const out = path.join(__dirname, '..', 'site', 'img');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const shot = async (name, ms = 900) => {
    await wait(ms);
    // la finestra deve ridisegnarsi davvero, se no la foto è quella di prima
    win.webContents.invalidate();
    await js('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await wait(250);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${name}.jpg`), img.resize({ width: 1440 }).toJPEG(84)); // JPEG: un terzo del peso
    console.log('scattata', name);
  };
  try {
    win.webContents.setBackgroundThrottling(false);
    await loaded();
    win.show();
    win.focus();
    // niente suggerimenti né guida nelle foto, audio spento
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0 } })); location.reload();`);
    await loaded();
    await wait(800);
    await shot('inizio', 300);
    await click('Slot 1');
    await shot('scrivania');
    for (const [nav, name] of [['Storie', 'storie'], ['Spogliatoio', 'spogliatoio'], ['Mercato', 'mercato'], ['Tattica', 'tattica']]) {
      await click(nav);
      await shot(name);
    }
    if (await click('Guarda la partita')) await shot('partita', 14000);
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
