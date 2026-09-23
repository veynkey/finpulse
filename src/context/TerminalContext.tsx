import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LinkGroup, Instrument, TelemetryData, ReplayState, RadarEvent } from '../types';
import { CANONICAL_INSTRUMENTS, getInstrumentById } from '../services/instruments';

export type TerminalDensity = 'compact' | 'professional' | 'ultra';

interface TerminalContextType {
  // Linked Contexts
  linkedSymbols: Record<LinkGroup, string>;
  setLinkedSymbol: (group: LinkGroup, instrumentId: string) => void;
  getSymbolForGroup: (group: LinkGroup) => Instrument;

  // Workspace Density & Appearance
  density: TerminalDensity;
  setDensity: (density: TerminalDensity) => void;

  // Command Palette
  isCommandOpen: boolean;
  setIsCommandOpen: (open: boolean) => void;
  executeCommand: (cmd: string) => { success: boolean; message: string };

  // Telemetry
  telemetry: TelemetryData;
  updateTelemetry: (partial: Partial<TelemetryData>) => void;

  // Replay
  replay: ReplayState;
  setReplay: React.Dispatch<React.SetStateAction<ReplayState>>;

  // Alerts
  recentAlerts: RadarEvent[];
  addAlert: (event: RadarEvent) => void;

  // Active Workspace Layout preset
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
}

const defaultTelemetry: TelemetryData = {
  wsStatus: 'CONNECTED',
  wsLatencyMs: 14,
  messagesPerSecond: 18450,
  dbQueueDepth: 3,
  dbLatencyMs: 2.1,
  cpuPercent: 12.4,
  memoryMb: 840,
  gpuPercent: 28.5,
  vramMb: 1420,
  aiStatus: 'READY',
  activeSubscriptions: 5,
};

const defaultReplay: ReplayState = {
  isActive: false,
  isPlaying: false,
  speed: 1,
  currentTimestamp: Date.now(),
  startTimestamp: Date.now() - 3600 * 1000 * 24,
  endTimestamp: Date.now(),
};

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [linkedSymbols, setLinkedSymbols] = useState<Record<LinkGroup, string>>({
    BLUE: 'BTC-USDT:BINANCE',
    GREEN: 'ETH-USDT:BINANCE',
    ORANGE: 'SOL-USDT:BINANCE',
    PURPLE: 'NVDA:NASDAQ',
    NONE: 'BTC-USDT:BINANCE',
  });

  const [density, setDensity] = useState<TerminalDensity>('professional');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [replay, setReplay] = useState<ReplayState>(defaultReplay);
  const [recentAlerts, setRecentAlerts] = useState<RadarEvent[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('DEFAULT_DESK');

  const setLinkedSymbol = useCallback((group: LinkGroup, instrumentId: string) => {
    if (group === 'NONE') return;
    setLinkedSymbols((prev) => ({
      ...prev,
      [group]: instrumentId,
    }));
  }, []);

  const getSymbolForGroup = useCallback(
    (group: LinkGroup): Instrument => {
      const id = linkedSymbols[group] || 'BTC-USDT:BINANCE';
      return getInstrumentById(id) || CANONICAL_INSTRUMENTS[0];
    },
    [linkedSymbols]
  );

  const updateTelemetry = useCallback((partial: Partial<TelemetryData>) => {
    setTelemetry((prev) => ({ ...prev, ...partial }));
  }, []);

  const addAlert = useCallback((event: RadarEvent) => {
    setRecentAlerts((prev) => [event, ...prev.slice(0, 49)]);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Open Command Bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      // Escape: Close Command Bar or Modals
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulated Telemetry updates (realistic jitter)
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        wsLatencyMs: Math.max(8, Math.min(45, prev.wsLatencyMs + (Math.random() * 6 - 3))),
        messagesPerSecond: Math.floor(Math.max(12000, Math.min(28000, prev.messagesPerSecond + (Math.random() * 800 - 400)))),
        dbLatencyMs: parseFloat((Math.max(1.2, Math.min(6.5, prev.dbLatencyMs + (Math.random() * 0.4 - 0.2)))).toFixed(1)),
        cpuPercent: parseFloat((Math.max(8, Math.min(35, prev.cpuPercent + (Math.random() * 2 - 1)))).toFixed(1)),
      }));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Command Execution Grammar
  const executeCommand = useCallback(
    (cmdRaw: string): { success: boolean; message: string } => {
      const cmd = cmdRaw.trim();
      if (!cmd) return { success: false, message: 'Empty command' };

      const parts = cmd.split(/\s+/);
      const first = parts[0].toUpperCase();

      // Check direct symbol switch (e.g. "BTC" or "ETH" or "NVDA")
      const matched = CANONICAL_INSTRUMENTS.find(
        (inst) => inst.symbol.startsWith(first) || inst.displaySymbol.replace('/', '') === first
      );

      if (matched && parts.length === 1) {
        setLinkedSymbol('BLUE', matched.id);
        return { success: true, message: `Active BLUE group set to ${matched.displaySymbol}` };
      }

      if (matched && parts.length > 1) {
        const action = parts[1].toUpperCase();
        setLinkedSymbol('BLUE', matched.id);
        return { success: true, message: `Loaded ${action} for ${matched.displaySymbol}` };
      }

      if (first === 'COMPACT') {
        setDensity('compact');
        return { success: true, message: 'Density set to Compact' };
      }
      if (first === 'PRO' || first === 'PROFESSIONAL') {
        setDensity('professional');
        return { success: true, message: 'Density set to Professional' };
      }
      if (first === 'ULTRA') {
        setDensity('ultra');
        return { success: true, message: 'Density set to Ultra Dense' };
      }

      if (first === 'REPLAY') {
        setReplay((prev) => ({ ...prev, isActive: !prev.isActive, isPlaying: true }));
        return { success: true, message: 'Toggled Replay Mode' };
      }

      return { success: false, message: `Command recognized: "${cmd}"` };
    },
    [setLinkedSymbol]
  );

  return (
    <TerminalContext.Provider
      value={{
        linkedSymbols,
        setLinkedSymbol,
        getSymbolForGroup,
        density,
        setDensity,
        isCommandOpen,
        setIsCommandOpen,
        executeCommand,
        telemetry,
        updateTelemetry,
        replay,
        setReplay,
        recentAlerts,
        addAlert,
        activeWorkspaceId,
        setActiveWorkspaceId,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = (): TerminalContextType => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};
