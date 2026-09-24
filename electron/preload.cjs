const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, data) => callback(data));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, data) => callback(data));
  },
  restartToUpdate: () => {
    ipcRenderer.send('restart-and-install-update');
  },
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates');
  },
});
