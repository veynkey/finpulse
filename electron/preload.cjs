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
  toggleFullscreen: () => {
    ipcRenderer.send('toggle-fullscreen');
  },
  isFullscreen: () => {
    return ipcRenderer.invoke('is-fullscreen');
  },
  onFullscreenChange: (callback) => {
    const handler = (_event, isFull) => callback(isFull);
    ipcRenderer.on('fullscreen-change', handler);
    return () => ipcRenderer.removeListener('fullscreen-change', handler);
  },
});
