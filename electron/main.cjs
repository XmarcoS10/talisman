// Guscio desktop: carica la build di Vite. contextIsolation attiva e nodeIntegration spenta (default di Electron).
// I salvataggi vivono su file nella cartella dati dell'app: il localStorage non regge più di qualche MB.
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// la cartella dati resta «talisman» anche col nome nuovo, così i salvataggi di prima si ritrovano
app.setPath('userData', path.join(app.getPath('appData'), 'talisman'));

const savesDir = () => path.join(app.getPath('userData'), 'saves');
// solo nomi semplici: niente percorsi, niente risalite di cartella
const fileOf = (name) => {
  if (!/^[\w-]+$/.test(String(name))) throw new Error(`nome non valido: ${name}`);
  return path.join(savesDir(), `${name}.json`);
};

ipcMain.on('saves:read', (e, name) => {
  try { e.returnValue = fs.existsSync(fileOf(name)) ? fs.readFileSync(fileOf(name), 'utf8') : null; } catch { e.returnValue = null; }
});
// solo l'inizio del file: basta per l'intestazione dello slot, senza leggere 100 MB
ipcMain.on('saves:head', (e, name) => {
  try {
    if (!fs.existsSync(fileOf(name))) { e.returnValue = null; return; }
    const fd = fs.openSync(fileOf(name), 'r');
    const buf = Buffer.alloc(8192);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    e.returnValue = buf.subarray(0, n).toString('utf8');
  } catch { e.returnValue = null; }
});
ipcMain.on('saves:write', (e, name, data) => {
  try {
    fs.mkdirSync(savesDir(), { recursive: true });
    // scrittura atomica: prima un file temporaneo, poi lo si rinomina. Un crash a metà non rovina il salvataggio
    const tmp = `${fileOf(name)}.tmp`;
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, fileOf(name));
    e.returnValue = true;
  } catch { e.returnValue = false; }
});
ipcMain.on('saves:remove', (e, name) => {
  try { fs.rmSync(fileOf(name), { force: true }); e.returnValue = true; } catch { e.returnValue = false; }
});
ipcMain.on('saves:dir', (e) => { e.returnValue = savesDir(); });

// registro degli errori su file (P13 punto 8): resta sul computer, non parte niente verso internet
const logFile = () => path.join(app.getPath('userData'), 'logs', 'talisman.log');
const NL = String.fromCharCode(10);
function log(level, msg) {
  try {
    fs.mkdirSync(path.dirname(logFile()), { recursive: true });
    if (fs.existsSync(logFile()) && fs.statSync(logFile()).size > 2e6) fs.renameSync(logFile(), `${logFile()}.old`); // non cresce all'infinito
    fs.appendFileSync(logFile(), `${new Date().toISOString()} [${level}] ${String(msg).replace(/\s+/g, ' ')}${NL}`);
  } catch { /* se non si riesce a scrivere il registro, pazienza: non deve far cadere il gioco */ }
}
process.on('uncaughtException', (e) => log('crash', e?.stack ?? e));

// la diagnostica: versioni, sistema, ultime righe del registro, elenco dei salvataggi. La salva l'utente dove vuole
ipcMain.handle('diag:export', async (e, extra) => {
  const tail = fs.existsSync(logFile()) ? fs.readFileSync(logFile(), 'utf8').split(NL).slice(-400).join(NL) : '';
  const saves = fs.existsSync(savesDir()) ? fs.readdirSync(savesDir()).map((f) => ({ file: f, bytes: fs.statSync(path.join(savesDir(), f)).size })) : [];
  const report = { app: app.getVersion(), versions: process.versions, platform: `${process.platform} ${process.arch}`, when: new Date().toISOString(), saves, log: tail, ui: extra };
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: `talisman-diagnostica-${Date.now()}.json` });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  return filePath;
});

app.whenReady().then(() => {
  log('info', `avvio ${app.getVersion()} · electron ${process.versions.electron} · ${process.platform}`);
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#0c1117', autoHideMenuBar: true, title: 'Tactic F.C. Manager',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  // gli errori della pagina finiscono nel registro (le versioni recenti di Electron passano un oggetto, le vecchie gli argomenti)
  win.webContents.on('console-message', (ev, level, message) => {
    const lv = typeof ev?.level === 'string' ? ev.level : ['debug', 'info', 'warning', 'error'][level] ?? 'info';
    const msg = typeof ev?.message === 'string' ? ev.message : message;
    if (lv === 'warning' || lv === 'error') log(lv, msg);
  });
  win.webContents.on('render-process-gone', (_e, d) => log('crash', `pagina chiusa: ${d.reason}`));
  win.on('unresponsive', () => log('warning', 'la finestra non risponde'));
});
app.on('window-all-closed', () => app.quit());
