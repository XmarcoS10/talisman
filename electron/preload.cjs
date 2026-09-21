// Ponte fra la pagina e il disco: poche operazioni sui file dei salvataggi, niente altro di Node esposto.
// Sincrono di proposito: l'interfaccia salva in modo sincrono come faceva col localStorage.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('talismanFs', {
  read: (name) => ipcRenderer.sendSync('saves:read', name),
  head: (name) => ipcRenderer.sendSync('saves:head', name),
  write: (name, data) => ipcRenderer.sendSync('saves:write', name, data),
  remove: (name) => ipcRenderer.sendSync('saves:remove', name),
  dir: () => ipcRenderer.sendSync('saves:dir'),
  size: (name) => ipcRenderer.sendSync('saves:size', name),
  open: () => ipcRenderer.invoke('saves:open'),
});

contextBridge.exposeInMainWorld('talismanWin', {
  size: (w, h) => ipcRenderer.send('win:size', w, h),
});

contextBridge.exposeInMainWorld('talismanDiag', {
  exportReport: (extra) => ipcRenderer.invoke('diag:export', extra),
});
