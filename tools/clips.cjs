// Clip della partita 2D per il sito e la pagina itch.io (Blocco 3, punto 12): un gol su azione, un gol da corner e
// una parata, 20-30 secondi ciascuna, registrate dalla finestra dell'app vera (WebM). Cartella dati temporanea: i
// salvataggi veri non si toccano. Cerca le azioni giornata dopo giornata finché non le ha trovate tutte e tre.
// Uso: pnpm build && npx electron tools/clips.cjs   (le clip finiscono in site/clips/)
const { app, session } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-clips-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const out = path.join(__dirname, '..', 'site', 'clips');
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// quale azione cercare nel registro (run.frames) e quanto registrare: secondi di gioco prima del momento, secondi reali
const WANTED = {
  'gol-azione': { find: `(f) => f.kind === 'shot' && has(f, 'goal') && !has(f, 'corner') && !has(f, 'freeKick') && !has(f, 'penalty')`, before: 24, secs: 30 },
  'gol-corner': { find: `(f) => has(f, 'corner') && has(f, 'goal')`, before: 20, secs: 30 },
  'parata': { find: `(f) => (has(f, 'save') || has(f, 'parry')) && (f.beats.find((b) => b.kind === 'shot')?.xg ?? 0) >= 0.1`, before: 30, secs: 22 }, // le parate arrivano su tiri da xG basso: 0,1 è già una bella occasione
};

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const until = async (cond, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await js(cond)) return true; await wait(100); } return false; };
  const key = () => js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); true`);
  win.webContents.on('console-message', (ev, level, message) => { const lv = ev?.level ?? level; if (lv === 'error' || lv === 3) console.log('ERRORE', ev?.message ?? message); });
  session.defaultSession.setPermissionRequestHandler((_wc, _p, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);
  try {
    win.webContents.setBackgroundThrottling(false);
    await loaded();
    win.setContentSize(1440, 900);
    win.show();
    const s = { lang: 'it', hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 },
      view: 'full', camera: 'follow', overlays: [] };
    await js(`localStorage.setItem('talisman-settings', ${JSON.stringify(JSON.stringify(s))}); location.reload();`);
    await loaded();
    await wait(800);
    await click('Slot 1');
    await wait(1000);
    const todo = new Set(Object.keys(WANTED));
    for (let day = 0; day < 12 && todo.size; day++) {
      // alla prossima partita dell'utente
      let watched = false;
      for (let i = 0; i < 8 && !watched; i++) {
        if (await click('Guarda la partita')) { watched = true; break; }
        await key();
        await until(`!document.querySelector('.busy')`);
        await wait(400);
        await key();
        await wait(300);
      }
      if (!watched || !await until(`!!window.talismanLive`)) {
        console.log('bottoni:', await js(`[...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 40).join(' | ')`));
        throw new Error('la partita non si apre');
      }
      // si gioca tutta subito, e si chiudono intervallo e fine (così non interrompono la registrazione)
      await js(`(() => { const L = window.talismanLive; L.run.result(); L.seek(L.run.track[L.run.track.length - 1].at); return true; })()`);
      for (const b of ['Riprendi il secondo tempo', 'Torna al campo']) { await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes(${JSON.stringify(b)}))`, 4000); await click(b); await wait(300); }
      for (const name of [...todo]) {
        const w = WANTED[name];
        const at = await js(`(() => { const has = (f, k) => (f.beats ?? []).some((b) => b.kind === k); const L = window.talismanLive;
          const k = L.run.frames.findIndex(${w.find}); if (k < 0) return null; return L.run.track.find((p) => p.step === k).at; })()`);
        if (at === null) continue;
        await js(`window.talismanLive.speed = 2; window.talismanLive.seek(${at - w.before}); true`);
        await wait(600); // la telecamera si assesta
        const id = win.getMediaSourceId();
        const b64 = await js(`(async () => {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: ${JSON.stringify(id)}, maxWidth: 1440, maxHeight: 900, maxFrameRate: 30 } } });
          const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1500000 });
          const parts = [];
          rec.ondataavailable = (e) => parts.push(e.data);
          const done = new Promise((r) => { rec.onstop = r; });
          rec.start(1000);
          await new Promise((r) => setTimeout(r, ${w.secs * 1000}));
          rec.stop();
          await done;
          stream.getTracks().forEach((t) => t.stop());
          const buf = new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer());
          let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768));
          return btoa(s);
        })()`);
        const file = path.join(out, `${name}.webm`);
        fs.writeFileSync(file, Buffer.from(b64, 'base64'));
        console.log(`clip ${name}: giornata ${day + 1}, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
        todo.delete(name);
      }
      await js(`(() => { const L = window.talismanLive; L.speed = null; L.seek(L.run.track[L.run.track.length - 1].at); return true; })()`);
      await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Vai al risultato'))`, 5000);
      await click('Vai al risultato');
      await until(`!window.talismanLive`, 5000);
      await wait(800);
      await key();
      await until(`!document.querySelector('.busy')`);
      await wait(500);
      await key();
      await wait(500);
    }
    if (todo.size) console.log('non trovate:', [...todo].join(', '));
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
