// Cerca i testi tagliati in tutte le schermate, a 1280×800 e 1920×1080 (Blocco 1.5). Stampa ogni testo che esce dal
// suo riquadro (anche nei grafici SVG) e salva le foto in una cartella temporanea.
// Uso: node tools/docs-world.ts && pnpm build && npx electron tools/clip-check.cjs
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

require('../electron/main.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talisman-clip-'));
app.setPath('userData', tmp);
fs.mkdirSync(path.join(tmp, 'saves'));
fs.copyFileSync(path.join(__dirname, 'docs-save.json'), path.join(tmp, 'saves', 'talisman-save-1.json'));
const out = path.join(tmp, 'foto');
fs.mkdirSync(out);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// nella pagina: elementi col testo più largo o più alto del riquadro che lo taglia, e testi SVG fuori dal disegno
const DETECT = `(() => {
  const found = [];
  const label = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || el.closest('.stars') || !el.offsetParent) continue; // le stelle sono tagliate apposta
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    const clipX = cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis';
    const clipY = cs.overflowY !== 'visible';
    if ((clipX && el.scrollWidth > el.clientWidth + 1) || (clipY && el.scrollHeight > el.clientHeight + 2 && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll'))
      found.push('taglio: ' + label(el) + ' [' + el.className + ']');
    // testo che esce da un antenato che lo taglia
    const r = el.getBoundingClientRect();
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (as.overflowX === 'visible' && as.overflowY === 'visible') continue;
      if (as.overflowX === 'auto' || as.overflowY === 'auto' || as.overflowX === 'scroll' || as.overflowY === 'scroll') break;
      const ar = a.getBoundingClientRect();
      if (r.right > ar.right + 1 || r.left < ar.left - 1) found.push('esce: ' + label(el) + ' [' + el.className + ' in ' + a.className + ']');
      break;
    }
  }
  for (const t of document.querySelectorAll('svg text')) {
    const svg = t.ownerSVGElement; if (!svg || !t.textContent.trim()) continue;
    const r = t.getBoundingClientRect(), s = svg.getBoundingClientRect();
    if (r.width && (r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1)) found.push('svg: ' + t.textContent.trim());
  }
  return [...new Set(found)];
})()`;

app.on('browser-window-created', async (_e, win) => {
  const loaded = () => new Promise((r) => win.webContents.once('did-finish-load', r));
  const js = (code) => win.webContents.executeJavaScript(code);
  const click = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const check = async (size, name, ms = 900) => {
    await wait(ms);
    const bad = await js(DETECT);
    for (const b of bad) console.log(`${size} ${name} · ${b}`);
    // la cattura a volte fallisce subito dopo un ridimensionamento: si riprova, e al limite si va avanti senza foto
    for (let k = 0; k < 3; k++) {
      try {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(out, `${size}-${name}.jpg`), img.toJPEG(80));
        break;
      } catch (e) { console.log(`${size} ${name}: foto non riuscita (${e.message})`); await wait(500); }
    }
  };
  try {
    win.webContents.setBackgroundThrottling(false);
    await loaded();
    win.show();
    await js(`localStorage.setItem('talisman-settings', JSON.stringify({ lang: 'it', hints: false, seen: [], visited: ['board', 'squad', 'tactics', 'training', 'live'], guideDone: true, volume: { ui: 0, crowd: 0, fx: 0 } })); location.reload();`);
    await loaded();
    for (const [w, h] of [[1280, 800], [1920, 1080]]) {
      win.setMinimumSize(800, 600);
      win.setContentSize(w, h);
      const size = `${w}x${h}`;
      await js('location.reload()');
      await loaded();
      await wait(800);
      await check(size, 'inizio', 300);
      await click('Slot 1');
      await check(size, 'scrivania');
      for (const nav of ['Storie & Media', 'Rosa', 'Tattica', 'Allenamento', 'Dinamiche & Spogliatoio', 'Vivaio', 'Mercato & Trasferimenti',
        'Osservatori', 'Finanze', 'Dirigenza', 'Classifiche', 'Calendario', 'Impostazioni & Salvataggi']) {
        await click(nav);
        await check(size, nav.split(' ')[0].toLowerCase());
      }
      // schede giocatore: il primo della rosa e il portiere (radar del portiere)
      for (const [pos, name] of [['', 'giocatore'], ['POR', 'portiere']]) {
        await click('Rosa');
        await wait(600);
        await js(`(() => { const rows = [...document.querySelectorAll('main tbody tr')]; const r = ${JSON.stringify(pos)} ? rows.find((r) => r.textContent.includes(${JSON.stringify(pos)})) : rows[0]; r?.click(); })()`);
        await check(size, name);
      }
      await click('Scrivania');
      if (await click('Vai alla partita')) await check(size, 'partita', 6000);
      await js('location.reload()');
      await loaded();
    }
    console.log('foto in', out);
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
