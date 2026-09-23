const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// Configure AutoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  if (!app.isPackaged) return; // Only run in production installed desktop app

  autoUpdater.on('checking-for-update', () => {
    console.log('[FinPulse AutoUpdater] Checking for updates on GitHub Releases...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[FinPulse AutoUpdater] Update found: v${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[FinPulse AutoUpdater] App is at latest version.');
  });

  autoUpdater.on('error', (err) => {
    console.warn('[FinPulse AutoUpdater] Error checking update:', err?.message || err);
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update FinPulse Tersedia',
          message: `Pembaruan FinPulse Wave MAX v${info.version} telah selesai diunduh secara instan!`,
          detail: 'Restart aplikasi sekarang untuk langsung menerapkan versi terbaru?',
          buttons: ['Restart Sekarang', 'Nanti Saja'],
          defaultId: 0,
          cancelId: 1,
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    }
  });

  // Check for updates 3 seconds after boot, then check every 2 hours
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 3000);

  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 1000 * 60 * 120);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 650,
    title: 'FinPulse Wave MAX',
    backgroundColor: '#07080a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false, // Prevent chart freezing when window is unfocused
    },
  });

  // Open external links in default OS browser rather than inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
