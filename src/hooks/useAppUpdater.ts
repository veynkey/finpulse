import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      onUpdateAvailable?: (callback: (data: { version: string }) => void) => void;
      onUpdateDownloaded?: (callback: (data: { version: string }) => void) => void;
      restartToUpdate?: () => void;
      checkForUpdates?: () => void;
    };
  }
}

export function useAppUpdater() {
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string>('');

  useEffect(() => {
    let updaterChannel: BroadcastChannel | null = null;
    try {
      updaterChannel = new BroadcastChannel('finpulse_updater_sync');
      updaterChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'UPDATE_AVAILABLE') {
          setDownloadingUpdate(true);
          if (data.version) setNewVersion(data.version);
        } else if (data.type === 'UPDATE_DOWNLOADED') {
          setUpdateDownloaded(true);
          setDownloadingUpdate(false);
          if (data.version) setNewVersion(data.version);
        } else if (data.type === 'TRIGGER_RESTART') {
          if (window.electronAPI?.restartToUpdate) {
            window.electronAPI.restartToUpdate();
          }
        }
      };
    } catch {
      // Safe fallback if BroadcastChannel is unavailable
    }

    // Connect to Electron IPC via Preload if running in desktop app
    if (window.electronAPI) {
      if (window.electronAPI.onUpdateAvailable) {
        window.electronAPI.onUpdateAvailable((data) => {
          setDownloadingUpdate(true);
          if (data?.version) {
            setNewVersion(data.version);
            try {
              updaterChannel?.postMessage({ type: 'UPDATE_AVAILABLE', version: data.version });
            } catch {}
          }
        });
      }

      if (window.electronAPI.onUpdateDownloaded) {
        window.electronAPI.onUpdateDownloaded((data) => {
          setUpdateDownloaded(true);
          setDownloadingUpdate(false);
          if (data?.version) {
            setNewVersion(data.version);
            try {
              updaterChannel?.postMessage({ type: 'UPDATE_DOWNLOADED', version: data.version });
            } catch {}
          }
        });
      }
    }

    // Development / diagnostic testing helper
    (window as any).__simulateUpdateDownloaded = (simulatedVersion = '1.0.3') => {
      setUpdateDownloaded(true);
      setDownloadingUpdate(false);
      setNewVersion(simulatedVersion);
      try {
        updaterChannel?.postMessage({ type: 'UPDATE_DOWNLOADED', version: simulatedVersion });
      } catch {}
    };

    return () => {
      if (updaterChannel) {
        updaterChannel.close();
      }
    };
  }, []);

  const restartToUpdate = useCallback(() => {
    if (window.electronAPI?.restartToUpdate) {
      window.electronAPI.restartToUpdate();
    } else {
      // Try broadcasting to main window
      try {
        const ch = new BroadcastChannel('finpulse_updater_sync');
        ch.postMessage({ type: 'TRIGGER_RESTART' });
        ch.close();
      } catch {}
    }
  }, []);

  const checkForUpdates = useCallback(() => {
    if (window.electronAPI?.checkForUpdates) {
      window.electronAPI.checkForUpdates();
    }
  }, []);

  return {
    updateDownloaded,
    downloadingUpdate,
    newVersion,
    restartToUpdate,
    checkForUpdates,
  };
}
