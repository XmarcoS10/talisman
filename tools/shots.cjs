// Screenshot del gioco vero per il sito (site/img): apre l'app con un mondo di prova in una cartella dati temporanea,
// così non tocca i salvataggi veri, passa per le schermate principali e le fotografa.
// Uso: node tools/shots-world.ts tools/shots-save.json && pnpm build && npx electron tools/shots.cjs
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

app.disableHardwareAcceleration(); // con lo schermo spento la cattura via GPU fallisce (UnknownVizError)
require('../electron/main.cjs');
// DOPO main.cjs, che fissa la cartella dati vera: qui va sostituita con una temporanea, o si toccano i dati di chi gioca
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-shots-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'shots-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));

const out = path.join(__dirname, '..', 'site', 'img');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const nav = (text) => js(`(() => { const b = [...document.querySelectorAll('.sidebar button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const shot = async (name, ms = 1600) => { // le schermate pesanti (classifiche) finiscono il disegno dopo più di un secondo
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
    win.setContentSize(1280, 800); // la misura delle prove dell'interfaccia (ui-shots)
    win.show();
    win.focus();
    // niente suggerimenti né guida nelle foto, audio spento
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ lang: 'it', hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 }, view: 'full', camera: 'follow', overlays: [] })); location.reload();`);
    await loaded();
    await wait(800);
    // nuova carriera (interfaccia v2): la scelta del club con il primo selezionato, poi di nuovo al menu
    await click('Nuova carriera');
    await js(`document.querySelector('.club-tile')?.click(); true`);
    await shot('inizio', 600);
    await click('Indietro al menu principale');
    await wait(500);
    await click('Slot 1');
    await shot('scrivania');
    for (const [label, name] of [['Storie', 'storie'], ['Spogliatoio', 'spogliatoio'], ['Mercato', 'mercato'], ['Tattica', 'tattica']]) {
      await nav(label);
      await shot(name);
    }
    // al giorno di una partita dell'utente: «Continua» (spazio) finché la partita non si apre
    await nav('Scrivania');
    let open = false;
    for (let i = 0; i < 8 && !open; i++) {
      open = (await click('Vai alla partita')) || (await js(`!!document.querySelector('.live-talk')`));
      if (open) break;
      await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
      await wait(2500);
      await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`); // chiude il risultato aperto
      await wait(500);
    }
    if (open) {
      // a metà di un'azione vera del secondo tempo, con il punteggio e il racconto già pieni
      const until = async (cond, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await js(cond)) return true; await wait(100); } return false; };
      await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Nessun discorso'))`);
      await click('Nessun discorso'); // discorso prima della partita (0.8.0)
      await until('!!window.talismanLive');
      // la partita corre veloce fino al 60' circa (niente salti: analista, punteggio e cartellini devono essere quelli del
      // momento), poi va a velocità normale e la foto arriva qualche secondo dopo, a metà di un'azione vera
      await js(`window.talismanLive.speed = 40; true`);
      const last = () => js(`window.talismanLive?.run.track.at(-1)?.at ?? 0`);
      for (let t = 0; t < 240000 && (await last()) < 3300; t += 150) {
        for (const b of ['Riprendi il secondo tempo', 'Torna al campo']) await click(b);
        await wait(150);
      }
      await js(`window.talismanLive.speed = 1; true`);
      await shot('partita', 3200);
    }
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
