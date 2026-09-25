import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    // 1. Initial check from Electron if available
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.isFullscreen) {
      electronAPI.isFullscreen().then((isFull: boolean) => {
        setIsFullscreen(Boolean(isFull));
      }).catch(() => {});
    }

    // 2. Listen to Electron fullscreen-change IPC
    let unsubElectron: (() => void) | undefined;
    if (electronAPI?.onFullscreenChange) {
      unsubElectron = electronAPI.onFullscreenChange((isFull: boolean) => {
        setIsFullscreen(Boolean(isFull));
      });
    }

    // 3. Listen to standard HTML5 fullscreenchange
    const handleHtmlFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleHtmlFullscreenChange);

    return () => {
      if (unsubElectron) unsubElectron();
      document.removeEventListener('fullscreenchange', handleHtmlFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.toggleFullscreen) {
      electronAPI.toggleFullscreen();
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.toggleFullscreen && isFullscreen) {
      electronAPI.toggleFullscreen();
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, [isFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    exitFullscreen,
  };
}
