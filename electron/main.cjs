// Guscio desktop: carica la build di Vite. contextIsolation attiva e nodeIntegration spenta (default di Electron).
// I salvataggi vivono su file nella cartella dati dell'app: il localStorage non regge più di qualche MB.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const savesDir = () => path.join(app.getPath('userData'), 'saves');
// solo nomi semplici: niente percorsi, niente risalite di cartella
const fileOf = (name) => {
  if (!/^[\w-]+$/.test(String(name))) throw new Error(`nome non valido: ${name}`);
  return path.join(savesDir(), `${name}.json`);
};

ipcMain.on('saves:read', (e, name) => {
  try { e.returnValue = fs.existsSync(fileOf(name)) ? fs.readFileSync(fileOf(name), 'utf8') : null; } catch { e.returnValue = null; }
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

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#0B1014', autoHideMenuBar: true, title: 'Talisman',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.loadFile(path.join(__dirname, '../dist/index.html'));
});
app.on('window-all-closed', () => app.quit());
