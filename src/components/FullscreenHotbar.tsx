import { useState } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { useFullscreen } from '../hooks/useFullscreen';
import {
  Terminal,
  Minimize2,
  Search,
  Layers,
  LayoutGrid,
  Monitor,
  Activity,
} from 'lucide-react';

const HOTBAR_SYMBOLS = [
  { label: 'BTC', id: 'BINANCE:BTCUSDT' },
  { label: 'ETH', id: 'BINANCE:ETHUSDT' },
  { label: 'SOL', id: 'BINANCE:SOLUSDT' },
  { label: 'BNB', id: 'BINANCE:BNBUSDT' },
];

const HOTBAR_DESKS = [
  { id: 'desk_trading', name: 'TRADING' },
  { id: 'desk_cvd', name: 'CVD & ORDER FLOW' },
  { id: 'desk_research', name: 'RESEARCH' },
  { id: 'desk_macro', name: 'MACRO' },
];

export default function FullscreenHotbar() {
  const {
    getSymbolForGroup,
    setLinkedSymbol,
    density,
    setDensity,
    setIsCommandOpen,
  } = useTerminal();
  const { exitFullscreen } = useFullscreen();

  const activeInstrument = getSymbolForGroup('BLUE');
  const [activeTf, setActiveTf] = useState<string>('15m');

  const handleTimeframeChange = (tf: string) => {
    setActiveTf(tf);
    // Broadcast timeframe preference across panels if desired
    window.dispatchEvent(new CustomEvent('finpulse-hotbar-timeframe', { detail: tf }));
  };

  const handleDeskSelect = (deskId: string) => {
    window.dispatchEvent(new CustomEvent('finpulse-switch-desk', { detail: deskId }));
  };

  return (
    <div
      data-testid="fullscreen-hotbar"
      className="h-9 w-full bg-[#0a0c10]/95 border-b border-[#1c2230] backdrop-blur-md px-3 flex items-center justify-between text-xs font-mono select-none z-50 shadow-xl shrink-0"
    >
      {/* Left: Brand, Active Symbol & Fast Symbol Selector */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-accent/15 border border-accent/40 text-accent font-extrabold text-[11px] tracking-wider uppercase">
          <Terminal size={13} />
          <span>FULLSCREEN HOTBAR</span>
        </div>

        {/* Active Instrument Pill */}
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-text border border-border/80 transition-colors cursor-pointer text-[11px]"
          title="Click to search or switch instruments (Ctrl+K)"
        >
          <Activity size={12} className="text-[#00c087]" />
          <span className="font-extrabold text-[#00c087]">{activeInstrument?.symbol || 'BTC/USDT'}</span>
          <Search size={11} className="text-muted ml-0.5" />
        </button>

        {/* Quick Symbol Switchers */}
        <div className="hidden sm:flex items-center space-x-1 pl-1">
          {HOTBAR_SYMBOLS.map((sym) => {
            const isSelected = activeInstrument?.id === sym.id;
            return (
              <button
                key={sym.id}
                type="button"
                onClick={() => setLinkedSymbol('BLUE', sym.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-text hover:bg-surface'
                }`}
              >
                {sym.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Timeframe Fast Switcher & CVD Sync Status */}
      <div className="flex items-center space-x-3">
        {/* Timeframe Quick Buttons */}
        <div className="flex items-center space-x-0.5 bg-[#12151d] px-1 py-0.5 rounded border border-border/60">
          {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => handleTimeframeChange(tf)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                activeTf === tf
                  ? 'bg-[#0070f3] text-white shadow-xs'
                  : 'text-muted hover:text-text hover:bg-white/5'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Real-time CVD & Chart Sync Indicator Badge */}
        <div
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#00c087]/15 border border-[#00c087]/40 text-[#00c087] text-[10px] font-bold"
          title="Authoritative Cross-Chart Time & Mirrored Crosshair Synchronization is Active"
        >
          <Layers size={11} className="animate-pulse" />
          <span>SYNC ACTIVE</span>
        </div>
      </div>

      {/* Right: Desks Switcher, Density & Exit Fullscreen Button */}
      <div className="flex items-center space-x-2">
        {/* Desks Switcher */}
        <div className="hidden md:flex items-center space-x-1 text-muted">
          <LayoutGrid size={12} className="text-accent mr-0.5" />
          {HOTBAR_DESKS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handleDeskSelect(d.id)}
              className="px-1.5 py-0.5 rounded text-[10px] hover:text-text hover:bg-surface transition-colors cursor-pointer"
            >
              {d.name}
            </button>
          ))}
        </div>

        <span className="text-border hidden md:inline">|</span>

        {/* Density Mode */}
        <div className="flex items-center space-x-1">
          <Monitor size={12} className="text-muted mr-0.5" />
          {(['compact', 'professional', 'ultra'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDensity(mode)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase transition-colors cursor-pointer ${
                density === mode ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
              }`}
            >
              {mode.slice(0, 3)}
            </button>
          ))}
        </div>

        <span className="text-border">|</span>

        {/* Exit Fullscreen Button */}
        <button
          type="button"
          onClick={exitFullscreen}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#ff4444]/20 hover:bg-[#ff4444]/35 text-[#ff6666] hover:text-white border border-[#ff4444]/50 font-extrabold text-[10px] tracking-wider uppercase transition-colors cursor-pointer shadow-sm"
          title="Exit Fullscreen (or press F11 / Esc)"
        >
          <Minimize2 size={12} />
          <span>EXIT (F11)</span>
        </button>
      </div>
    </div>
  );
}
