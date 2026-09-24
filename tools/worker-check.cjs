// Prova del motore nel Web Worker (Blocco 2a) nell'app vera: avanza qualche giornata, guarda una partita fino al
// risultato e misura i blocchi dell'interfaccia (long task oltre 50 ms). Uso: pnpm build && npx electron tools/worker-check.cjs
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-worker-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const date = () => js(`document.querySelector('.topbar .pill')?.textContent ?? ''`);
  const until = async (cond, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await js(cond)) return true; await wait(100); } return false; };
  const errors = [];
  win.webContents.on('console-message', (ev, level, message) => { const msg = ev?.message ?? message; if (String(msg).startsWith('T ')) console.log(msg); const lv = ev?.level ?? level; if (lv === 'error' || lv === 3) errors.push(ev?.message ?? message); });
  try {
    await loaded();
    win.show();
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 } })); location.reload();`);
    await loaded();
    await wait(800);
    await click('Slot 1');
    await wait(1000);
    await js(`window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask' }); true`);
    const d0 = await date();
    for (let i = 0; i < 8; i++) {
      const before = await date();
      await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
      await until(`!document.querySelector('.busy')`);
      await wait(300);
      const after = await date();
      if (after === before) await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`); // chiude il risultato aperto
      await wait(300);
    }
    const d1 = await date();
    const advLong = await js('window.__long.splice(0)');
    console.log(`AVANZAMENTO: ${d0} -> ${d1} · blocchi oltre 50 ms: ${advLong.length ? advLong.join(', ') + ' ms' : 'nessuno'}`);
    // una partita guardata fino al risultato
    let watched = false;
    for (let i = 0; i < 6 && !watched; i++) {
      if (await click('Guarda la partita')) { watched = true; break; }
      await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
      await until(`!document.querySelector('.busy')`);
      await wait(400);
      await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
      await wait(300);
    }
    await until(`!!document.querySelector('canvas.pitch2d')`);
    await wait(3000);
    const liveLong = await js('window.__long.splice(0)');
    await click('Salta al finale');
    await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Vai al risultato'))`, 60000);
    await click('Vai al risultato');
    const report = await until(`!document.querySelector('canvas.pitch2d') && !document.querySelector('.busy')`, 20000);
    await wait(500);
    const endLong = await js('window.__long.splice(0)');
    console.log(`PARTITA: guardata ${watched} · risultato mostrato ${report} · data ${await date()}`);
    console.log(`blocchi durante la partita: ${liveLong.join(', ') || 'nessuno'} · salta al finale + chiusura: ${endLong.join(', ') || 'nessuno'}`);
    console.log(`ERRORI in console: ${errors.length ? errors.join(' | ') : 'nessuno'}`);
  } catch (e) { console.error(e); }
  app.quit();
});
