import { useTerminal } from '../context/TerminalContext';
import { Search, Terminal, Bell, LayoutGrid, Monitor } from 'lucide-react';

export default function CommandBar() {
  const { setIsCommandOpen, density, setDensity, activeWorkspaceId, setActiveWorkspaceId, recentAlerts } = useTerminal();

  return (
    <div className="h-8 border-b border-border flex items-center px-3 bg-[#111317] shrink-0 select-none font-mono text-xs z-20">
      {/* Brand & Terminal ID */}
      <div className="flex items-center space-x-2 mr-4">
        <Terminal className="w-4 h-4 text-accent" />
        <span className="font-extrabold tracking-wider text-text uppercase">
          FINPULSE <span className="text-accent">WAVE MAX</span>
        </span>
        <span className="text-[9px] bg-white/10 px-1 rounded text-muted font-bold">PRO-DESK</span>
      </div>

      {/* Interactive Command Prompt Trigger */}
      <div
        onClick={() => setIsCommandOpen(true)}
        className="flex-grow max-w-xl h-6 bg-black/50 border border-border/80 hover:border-accent/80 rounded px-2 flex items-center cursor-pointer text-muted hover:text-text transition-colors"
      >
        <Search className="w-3.5 h-3.5 mr-2 text-muted" />
        <span className="text-[11px] truncate">
          Click or press <kbd className="bg-white/10 px-1 rounded text-text font-bold">Ctrl+K</kbd> to execute commands (e.g. 'BTC CHART', 'SCAN VOL&gt;2', 'PRO')...
        </span>
      </div>

      {/* Workspace Profile & Density Switcher */}
      <div className="ml-auto flex items-center space-x-3 text-[11px]">
        {/* Workspace Layout Switcher */}
        <div className="flex items-center space-x-1 text-muted">
          <LayoutGrid className="w-3.5 h-3.5 text-accent" />
          {(['DEFAULT_DESK', 'ORDER_FLOW', 'RESEARCH'] as const).map((ws) => (
            <button
              key={ws}
              type="button"
              onClick={() => setActiveWorkspaceId(ws)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                activeWorkspaceId === ws ? 'bg-accent/20 text-accent font-bold' : 'hover:text-text'
              }`}
            >
              {ws.replace('_', ' ')}
            </button>
          ))}
        </div>

        <span className="text-border">|</span>

        {/* Density Mode */}
        <div className="flex items-center space-x-1">
          <Monitor className="w-3 h-3 text-muted mr-0.5" />
          {(['compact', 'professional', 'ultra'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDensity(d)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase transition-colors ${
                density === d ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
              }`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>

        <span className="text-border">|</span>

        {/* Alert Bell Badge */}
        <div className="flex items-center space-x-1 text-muted cursor-pointer hover:text-text" title={`${recentAlerts.length} live radar triggers`}>
          <Bell className="w-3.5 h-3.5 text-accent" />
          <span className="bg-accent/20 text-accent font-bold px-1 rounded text-[10px]">
            {recentAlerts.length}
          </span>
        </div>
      </div>
    </div>
  );
}
