const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// Configure AutoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  if (!app.isPackaged) return; // Only run in production installed desktop app

  // Explicitly set GitHub Releases repository target
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'veynkey',
    repo: 'finpulse',
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('[FinPulse AutoUpdater] Checking for updates on GitHub Releases...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[FinPulse AutoUpdater] Update found: v${info.version}`);
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('update-available', { version: info.version });
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[FinPulse AutoUpdater] App is at latest version.');
  });

  autoUpdater.on('error', (err) => {
    console.warn('[FinPulse AutoUpdater] Error checking update:', err?.message || err);
  });

  autoUpdater.on('update-downloaded', (info) => {
    // Notify all open windows (main and detached monitors)
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('update-downloaded', { version: info.version });
      }
    });
  });

  // Handle IPC command from top-right "Restart to Update" button
  ipcMain.on('restart-and-install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // Handle IPC command to manually check for updates
  ipcMain.on('check-for-updates', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.warn('[FinPulse AutoUpdater] Check error:', err);
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
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Prevent chart freezing when window is unfocused
    },
  });

  // Window open handler: allow internal multi-monitor detached desks, open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('windowType=detached_desk') || url.includes('deskId=')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1440,
          height: 900,
          minWidth: 900,
          minHeight: 600,
          title: 'FinPulse Wave MAX - Multi-Monitor Desk',
          backgroundColor: '#07080a',
          autoHideMenuBar: true,
          webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            backgroundThrottling: false,
          },
        },
      };
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // F12 or Ctrl+Shift+I to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });

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
