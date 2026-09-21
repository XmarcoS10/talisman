// Ponte fra la pagina e il disco: solo quattro operazioni sui file dei salvataggi, niente altro di Node esposto.
// Sincrono di proposito: l'interfaccia salva in modo sincrono come faceva col localStorage.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('talismanFs', {
  read: (name) => ipcRenderer.sendSync('saves:read', name),
  write: (name, data) => ipcRenderer.sendSync('saves:write', name, data),
  remove: (name) => ipcRenderer.sendSync('saves:remove', name),
  dir: () => ipcRenderer.sendSync('saves:dir'),
});
