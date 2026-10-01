// Momenti al rallentatore (analisi della partita 2D, 01/10): nella partita vera trova un contrasto, un intercetto,
// un tiro e un gol, e fotografa il campo ogni 0,1 s di gioco da 1,5 s prima a 2,5 s dopo (riproduzione ferma e
// spostata a mano: si vede esattamente quello che disegna lo schermo). Uso: pnpm build && npx electron tools/match-moments.cjs <cartella>
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

app.disableHardwareAcceleration(); // con lo schermo spento la cattura via GPU fallisce (UnknownVizError)
require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-moments-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const out = path.resolve(process.argv.find((a, i) => i > 1 && !a.endsWith('.cjs') && !a.startsWith('-')) ?? tmp);
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WANTED = { contrasto: 'tackle', intercetto: 'intercept', tiro: 'shot', gol: 'goal' };

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
    win.setContentSize(1440, 900);
    win.show();
    const s = { lang: 'it', hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 }, view: 'full', camera: 'wide', overlays: [] };
    await js(`localStorage.setItem('talisman-settings', ${JSON.stringify(JSON.stringify(s))}); location.reload();`);
    await loaded();
    await wait(800);
    await click('Slot 1');
    await wait(1200);
    for (let i = 0; i < 8 && !(await js(`!!document.querySelector('.live-talk')`)); i++) {
      if (await click('Vai alla partita')) { await wait(800); continue; }
      await key(); await wait(2500); await key(); await wait(500);
    }
    await click('Nessun discorso');
    await until('!!window.talismanLive');
    await js(`(() => { const L = window.talismanLive; L.run.result(); L.speed = 0; return true; })()`);
    for (const b of ['Riprendi il secondo tempo', 'Torna al campo']) { await js(`window.talismanLive.seek(window.talismanLive.run.track.at(-1).at)`); await wait(300); await click(b); }
    for (const [name, kind] of Object.entries(WANTED)) {
      const at = await js(`(() => { const L = window.talismanLive; const k = L.run.frames.findIndex((f, i) => i > 40 && (f.beats ?? []).some((b) => b.kind === ${JSON.stringify(kind)}));
        if (k < 0) return null; return L.run.track.find((p) => p.step === k).at; })()`);
      if (at === null) { console.log('non trovato', name); continue; }
      const dir = path.join(out, name);
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i <= 40; i++) {
        await js(`window.talismanLive.speed = 0; window.talismanLive.seek(${at - 1.5 + i * 0.1}); true`);
        await wait(70);
        const png = await js(`document.querySelector('canvas.pitch2d').toDataURL('image/png')`);
        if (png.length < 100) { console.log('campo vuoto; bottoni:', await js(`[...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 30).join(' | ')`)); break; }
        fs.writeFileSync(path.join(dir, `t${String(i).padStart(2, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
      }
      console.log(name, 'a', at.toFixed(1), 's →', dir);
    }
  } catch (e) { console.error(e); }
  app.quit();
});
