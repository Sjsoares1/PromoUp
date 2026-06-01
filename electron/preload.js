const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPort: () => ipcRenderer.invoke('get-port'),
  openDisplayWindow: (tvRoute) => ipcRenderer.invoke('open-display-window', tvRoute),
  selectFile: (options) => ipcRenderer.invoke('dialog:openFile', options)
});