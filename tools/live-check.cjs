// Prova della partita 2D nell'app vera (Blocco 3): apre una partita dalla carriera di prova, la lascia scorrere,
// misura i fotogrammi al secondo e scatta foto del campo. Non tocca i salvataggi veri (cartella dati temporanea).
// Uso: pnpm build && npx electron tools/live-check.cjs
// Variabili: VIEW (highlights | extended | full), CAMERA (wide | follow | close), SECONDS (quanto guardare, 20),
// SHOTS (quante foto, 4), OUT (cartella delle foto, di default una temporanea)
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-live-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const out = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-shots-'));
fs.mkdirSync(out, { recursive: true });
const SECONDS = Number(process.env.SECONDS || 20), SHOTS = Number(process.env.SHOTS || 4);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const until = async (cond, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await js(cond)) return true; await wait(100); } return false; };
  const key = () => js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
  win.webContents.on('console-message', (ev, level, message) => { const lv = ev?.level ?? level; if (lv === 'error' || lv === 3) console.log('ERRORE', ev?.message ?? message); });
  try {
    win.webContents.setBackgroundThrottling(false);
    await loaded();
    win.show();
    const s = { hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 },
      view: process.env.VIEW || 'highlights', camera: process.env.CAMERA || 'follow' };
    await js(`localStorage.setItem('talisman-settings', ${JSON.stringify(JSON.stringify(s))}); location.reload();`);
    await loaded();
    await wait(800);
    await click('Slot 1');
    await wait(1000);
    let watched = false;
    for (let i = 0; i < 8 && !watched; i++) {
      if (await click('Guarda la partita')) { watched = true; break; }
      await key();
      await until(`!document.querySelector('.busy')`);
      await wait(400);
      await key();
      await wait(300);
    }
    if (!await until(`!!document.querySelector('canvas.pitch2d')`)) throw new Error('la partita non si apre');
    await js(`window.__dt = []; (() => { let l = performance.now(); const f = (n) => { window.__dt.push(n - l); l = n; requestAnimationFrame(f); }; requestAnimationFrame(f); })(); true`);
    for (let k = 0; k < SHOTS; k++) {
      await wait((SECONDS * 1000) / SHOTS);
      const img = await win.webContents.capturePage();
      const name = `live-${s.view}-${k + 1}.jpg`;
      fs.writeFileSync(path.join(out, name), img.resize({ width: 1440 }).toJPEG(85));
      const clock = await js(`document.querySelector('.sb-time')?.textContent ?? ''`);
      console.log(`foto ${name} · ${clock}`);
    }
    const dt = (await js('window.__dt.slice(30)')).sort((a, b) => a - b);
    const fps = (1000 * dt.length) / dt.reduce((a, b) => a + b, 0);
    const p95 = dt[Math.floor(dt.length * 0.95)] ?? 0;
    const slow = dt.filter((d) => d > 25).length;
    console.log(`FPS medi ${fps.toFixed(1)} · 95° percentile ${p95.toFixed(1)} ms per fotogramma · fotogrammi oltre 25 ms: ${slow} su ${dt.length}`);
    console.log(`foto in ${out}`);
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
