// Film della partita 2D per analizzarla (01/10): dal calcio d'inizio, a velocità normale e senza salti, registra un
// video WebM della finestra e salva un fotogramma del campo al secondo (PNG del canvas). Telecamera a campo intero,
// vista Completa. Cartella dati temporanea: i salvataggi veri non si toccano.
// Uso: pnpm build && npx electron tools/match-film.cjs <cartella> [secondi=60] [camera=wide]
const { app, session } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

app.disableHardwareAcceleration(); // con lo schermo spento la cattura via GPU fallisce (UnknownVizError)
require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-film-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const args = process.argv.filter((a, i) => i > 1 && !a.endsWith('.cjs') && !a.startsWith('-'));
const out = path.resolve(args[0] ?? tmp);
const secs = Number(args[1] ?? 60);
const camera = args[2] ?? 'wide';
const step = Number(process.env.STEP ?? 1000); // ms fra un fotogramma e l'altro
const skip = Number(process.env.SKIP ?? 0); // secondi di gioco da far passare prima (a velocità 20)
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const until = async (cond, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await js(cond)) return true; await wait(100); } return false; };
  const key = () => js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
  session.defaultSession.setPermissionRequestHandler((_wc, _p, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);
  try {
    win.webContents.setBackgroundThrottling(false);
    await loaded();
    win.setContentSize(1440, 900);
    win.show();
    const s = { lang: 'it', hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 },
      view: 'full', camera, overlays: [] };
    await js(`localStorage.setItem('talisman-settings', ${JSON.stringify(JSON.stringify(s))}); location.reload();`);
    await loaded();
    await wait(800);
    await click('Slot 1');
    await wait(1200);
    for (let i = 0; i < 8 && !(await js(`!!document.querySelector('.live-talk')`)); i++) {
      if (await click('Vai alla partita')) { await wait(800); continue; }
      await key(); await wait(2500); await key(); await wait(500);
    }
    await until(`!!document.querySelector('.live-talk')`);
    await click('Nessun discorso');
    await until('!!window.talismanLive');
    if (skip) {
      await js(`window.talismanLive.speed = 20; true`);
      await until(`(window.talismanLive?.run.track.at(-1)?.at ?? 0) > ${skip}`, 120000);
      for (const b of ['Riprendi il secondo tempo', 'Torna al campo']) await click(b);
    }
    await js(`window.talismanLive.speed = 1; true`);
    await wait(500);
    fs.writeFileSync(path.join(out, 'schermata.png'), (await win.webContents.capturePage()).toPNG());
    // video della finestra, in parallelo ai fotogrammi
    const id = win.getMediaSourceId();
    await js(`window.__film = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: ${JSON.stringify(id)}, maxWidth: 1440, maxHeight: 900, maxFrameRate: 30 } } });
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2000000 });
      const parts = []; rec.ondataavailable = (e) => parts.push(e.data);
      const done = new Promise((r) => { rec.onstop = r; });
      rec.start(1000); await new Promise((r) => setTimeout(r, ${secs * 1000})); rec.stop(); await done;
      stream.getTracks().forEach((t) => t.stop());
      const buf = new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768));
      return btoa(s);
    })(); true`);
    for (let t = 0; t < (secs * 1000) / step; t++) {
      const png = await js(`document.querySelector('canvas.pitch2d')?.toDataURL('image/png') ?? ''`);
      const info = await js(`(() => { const s = document.querySelector('.scoreboard, .live-score')?.textContent ?? ''; return s.replace(/\s+/g, ' ').trim().slice(0, 60); })()`);
      if (png) fs.writeFileSync(path.join(out, `f${String(t).padStart(3, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
      if (t % 20 === 0) console.log(`fotogramma ${t}: ${info}`);
      await wait(step);
    }
    const b64 = await js('window.__film');
    fs.writeFileSync(path.join(out, 'partita.webm'), Buffer.from(b64, 'base64'));
    console.log('video:', path.join(out, 'partita.webm'), (fs.statSync(path.join(out, 'partita.webm')).size / 1e6).toFixed(1), 'MB');
  } catch (e) { console.error(e); }
  app.quit();
});
