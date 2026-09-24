import { useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import Workspace from './Workspace';
import { Terminal, Monitor, Minimize2 } from 'lucide-react';

interface DetachedDeskShellProps {
  deskId: string;
  deskName: string;
}

export default function DetachedDeskShell({ deskId, deskName }: DetachedDeskShellProps) {
  const { density } = useTerminal();

  // Listen to cross-window sync messages
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('finpulse_workspace_sync');
      channel.onmessage = (event) => {
        // Reserved for future deep cross-window events
        if (event.data?.type === 'CLOSE_DETACHED_WINDOW' && event.data?.deskId === deskId) {
          window.close();
        }
      };
    } catch {
      // Safe fallback
    }

    return () => {
      if (channel) channel.close();
    };
  }, [deskId]);

  return (
    <div
      data-density={density}
      className={`h-screen w-screen flex flex-col bg-[#07080a] text-text overflow-hidden select-none font-mono density-${density}`}
    >
      {/* Detached Window Top Bar */}
      <div className="h-7 bg-[#0b0d13] border-b border-border/80 flex items-center justify-between px-3 shrink-0 select-none text-xs z-30">
        {/* Left: Terminal Brand & Detached Desk Identifier */}
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <span className="font-extrabold tracking-wider text-text uppercase text-[11px]">
            FINPULSE <span className="text-accent">WAVE MAX</span>
          </span>
          <span className="text-[9px] bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded border border-accent/40 flex items-center gap-1">
            <Monitor size={10} /> DESK: {deskName.toUpperCase()}
          </span>
          <span className="text-[9px] bg-white/10 text-muted px-1.5 py-0.5 rounded">
            MONITOR 2 / SECONDARY WINDOW
          </span>
        </div>

        {/* Right: Dock Back & Close Window */}
        <div className="flex items-center space-x-2 text-[10px]">
          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-text border border-border/60 transition-colors"
            title="Dock this Desk back into Main Window"
          >
            <Minimize2 size={11} className="text-accent" />
            <span>Dock to Main</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area locked to this Desk */}
      <div className="flex-grow overflow-hidden relative">
        <Workspace forcedDeskId={deskId} isDetachedMode={true} />
      </div>
    </div>
  );
}
