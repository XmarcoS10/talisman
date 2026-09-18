// Guscio desktop: carica la build di Vite. contextIsolation attiva e nodeIntegration spenta (default di Electron).
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1100, minHeight: 700, backgroundColor: '#0B1014', autoHideMenuBar: true, title: 'Talisman' });
  win.loadFile(path.join(__dirname, '../dist/index.html'));
});
app.on('window-all-closed', () => app.quit());
