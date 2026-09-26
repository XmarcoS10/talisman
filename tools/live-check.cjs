// Prova della partita 2D nell'app vera (Blocco 3): apre una partita dalla carriera di prova, la lascia scorrere,
// misura i fotogrammi al secondo e scatta foto del campo. Non tocca i salvataggi veri (cartella dati temporanea).
// Uso: pnpm build && npx electron tools/live-check.cjs
// Variabili: VIEW (highlights | extended | full), CAMERA (wide | follow | close), SECONDS (quanto guardare, 20),
// OVERLAYS (sovrapposizioni accese, separate da virgole), THROTTLE (processore N volte più lento), SHOTS (quante foto, 4), OUT (cartella delle foto, di default una temporanea)
const { app, contentTracing } = require('electron');
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
    const s = { lang: 'it', hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 },
      view: process.env.VIEW || 'highlights', camera: process.env.CAMERA || 'follow', overlays: (process.env.OVERLAYS || '').split(',').filter(Boolean) };
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
    console.log('sovrapposizioni accese:', await js(`[...document.querySelectorAll('.chip-btn.on')].map((b) => b.textContent).join(', ') || 'nessuna'`));
    if (process.env.CSS) await win.webContents.insertCSS(process.env.CSS); // prove: quale stile costa
    const rate = Number(process.env.THROTTLE || 1);
    if (rate > 1) { // processore più lento, come su un portatile medio (emulazione di Chromium)
      win.webContents.debugger.attach('1.3');
      await win.webContents.debugger.sendCommand('Emulation.setCPUThrottlingRate', { rate });
      console.log(`processore rallentato ${rate} volte`);
    }
    await js(`window.__dt = []; window.__work = []; (() => { let l = performance.now(); const f = (n) => { window.__dt.push(n - l); l = n; requestAnimationFrame(f); setTimeout(() => window.__work.push(performance.now() - n), 0); }; requestAnimationFrame(f); })(); true`);
    if (process.env.TRACE) { // traccia di Chromium per 4 secondi: dove va il tempo del thread principale
      await wait(2000);
      await contentTracing.startRecording({ included_categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
      await wait(4000);
      const file = await contentTracing.stopRecording(path.join(out, 'trace.json'));
      const ev = JSON.parse(fs.readFileSync(file, 'utf8')).traceEvents ?? [];
      const main = new Set(ev.filter((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map((e) => `${e.pid}:${e.tid}`));
      const tot = {};
      for (const e of ev) if (e.ph === 'X' && main.has(`${e.pid}:${e.tid}`)) tot[e.name] = (tot[e.name] ?? 0) + e.dur / 1000;
      console.log('traccia (ms in 4 s):', Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(' · '));
    }
    if (process.env.PROFILE) { // profilo del JavaScript per 5 secondi: le funzioni che costano di più
      const dbg = win.webContents.debugger;
      if (!dbg.isAttached()) dbg.attach('1.3');
      await dbg.sendCommand('Profiler.enable');
      await dbg.sendCommand('Profiler.start');
      await wait(5000);
      const { profile } = await dbg.sendCommand('Profiler.stop');
      const self = {};
      const dtOf = new Map();
      profile.samples.forEach((id, i) => dtOf.set(id, (dtOf.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000));
      for (const n of profile.nodes) { const k = `${n.callFrame.functionName || '(anonima)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self[k] = (self[k] ?? 0) + (dtOf.get(n.id) ?? 0); }
      const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25);
      console.log('profilo (ms propri in 5 s):');
      for (const [k, v] of top) console.log(`  ${v.toFixed(0).padStart(5)} ${k}`);
    }
    for (let k = 0; k < SHOTS; k++) {
      await wait((SECONDS * 1000) / SHOTS);
      const img = await win.webContents.capturePage();
      const name = `live-${s.view}-${k + 1}.jpg`;
      fs.writeFileSync(path.join(out, name), img.resize({ width: 1440 }).toJPEG(85));
      const clock = await js(`document.querySelector('.sb-time')?.textContent ?? ''`);
      console.log(`foto ${name} · ${clock}`);
    }
    const work = (await js('window.__work.slice(30)')).sort((a, b) => a - b);
    const dt = (await js('window.__dt.slice(30)')).sort((a, b) => a - b);
    const fps = (1000 * dt.length) / dt.reduce((a, b) => a + b, 0);
    const p95 = dt[Math.floor(dt.length * 0.95)] ?? 0;
    const slow = dt.filter((d) => d > 25).length;
    console.log(`FPS medi ${fps.toFixed(1)} · 95° percentile ${p95.toFixed(1)} ms per fotogramma · fotogrammi oltre 25 ms: ${slow} su ${dt.length}`);
    console.log(`lavoro per fotogramma (disegno e simulazione): mediana ${(work[work.length >> 1] ?? 0).toFixed(1)} ms · 95° percentile ${(work[Math.floor(work.length * 0.95)] ?? 0).toFixed(1)} ms · oltre 16,7 ms (sotto i 60 fps): ${work.filter((w) => w > 16.7).length} su ${work.length}`);
    console.log(`foto in ${out}`);
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
