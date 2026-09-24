// Foto delle schermate per la documentazione (docs/img): come tools/shots.cjs, ma passa per tutte le schermate.
// Uso: node tools/docs-world.ts && pnpm build && npx electron tools/shots-docs.cjs
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

require('../electron/main.cjs');
// DOPO main.cjs, che fissa la cartella dati vera: qui va sostituita con una temporanea
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-docs-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));

const out = path.join(__dirname, '..', 'docs', 'img');
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const shot = async (name, ms = 900) => {
    await wait(ms);
    win.webContents.invalidate();
    await js('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await wait(250);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${name}.jpg`), img.resize({ width: 1280 }).toJPEG(82));
    console.log('scattata', name);
  };
  try {
    win.webContents.setBackgroundThrottling(false);
    await loaded();
    win.show();
    win.focus();
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 } })); location.reload();`);
    await loaded();
    await wait(800);
    await shot('01-inizio', 300);
    await click('Slot 1');
    await shot('02-scrivania');
    const pagine = [
      ['Storie & Media', '03-storie'], ['Rosa', '04-rosa'], ['Tattica', '05-tattica'], ['Allenamento', '06-allenamento'],
      ['Dinamiche & Spogliatoio', '07-spogliatoio'], ['Vivaio', '08-vivaio'], ['Mercato & Trasferimenti', '09-mercato'],
      ['Osservatori', '10-osservatori'], ['Finanze', '11-finanze'], ['Dirigenza', '12-dirigenza'],
      ['Classifiche', '13-classifiche'], ['Calendario', '14-calendario'], ['Impostazioni & Salvataggi', '15-salvataggi'],
    ];
    for (const [nav, name] of pagine) {
      await click(nav);
      await shot(name);
    }
    // scheda giocatore: dalla rosa, il primo nome della tabella
    await click('Rosa');
    await wait(600);
    await js(`(() => { const td = document.querySelector('main tbody tr td:nth-child(2)'); td?.parentElement?.click(); })()`);
    await shot('16-giocatore');
    await click('Scrivania');
    if (await click('Vai alla partita')) await shot('17-partita', 16000);
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
