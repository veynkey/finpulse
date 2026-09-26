import { useTerminal } from '../context/TerminalContext';
import { Search } from 'lucide-react';
import type { LinkGroup } from '../types';

interface QuickCoinSelectorProps {
  currentGroup?: LinkGroup;
  compact?: boolean;
}

const PRESET_COINS = [
  { label: 'BTC', id: 'BTC-USDT:BINANCE' },
  { label: 'ETH', id: 'ETH-USDT:BINANCE' },
  { label: 'SOL', id: 'SOL-USDT:BINANCE' },
  { label: 'BNB', id: 'BNB-USDT:BINANCE' },
  { label: 'NVDA', id: 'NVDA:NASDAQ' },
];

export default function QuickCoinSelector({
  currentGroup = 'BLUE',
  compact = false,
}: QuickCoinSelectorProps) {
  const { setLinkedSymbol, getSymbolForGroup, setIsCommandOpen } = useTerminal();
  const activeInstrument = getSymbolForGroup(currentGroup);

  const activeRaw = activeInstrument?.symbol || 'BTCUSDT';
  const displayLabel = activeRaw.replace('USDT', '');

  return (
    <div className="flex items-center space-x-1 font-mono text-[10px] select-none">
      {!compact && (
        <span className="text-muted tracking-wider uppercase font-semibold text-[9px] mr-1 hidden sm:inline">
          Koin:
        </span>
      )}

      {/* Preset Coin Pills */}
      <div className="flex items-center space-x-0.5 bg-[#0a0c10] p-0.5 rounded border border-border/60">
        {PRESET_COINS.map((coin) => {
          const isActive =
            activeInstrument?.id === coin.id ||
            displayLabel.toUpperCase() === coin.label.toUpperCase();
          return (
            <button
              key={coin.id}
              type="button"
              onClick={() => setLinkedSymbol(currentGroup, coin.id)}
              className={`px-1.5 py-0.5 rounded font-bold transition-all text-[9px] tracking-wider cursor-pointer ${
                isActive
                  ? 'bg-accent text-white shadow-sm ring-1 ring-accent/50'
                  : 'text-muted hover:text-white hover:bg-white/10'
              }`}
              title={`Beralih ke ${coin.label} (${currentGroup} Group)`}
            >
              {coin.label}
            </button>
          );
        })}

        {/* Search All Tickers Button */}
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-muted hover:text-accent hover:bg-accent/15 transition-colors text-[9px] font-bold border-l border-border/40 ml-0.5 cursor-pointer"
          title="Cari koin atau instrumen lain di universe pasar (Ctrl+K)"
        >
          <Search size={9} />
          {!compact && <span>Cari</span>}
        </button>
      </div>

      {/* Active Symbol Pill Indicator */}
      <span className="px-1.5 py-0.5 rounded bg-surface border border-border/60 text-white font-extrabold text-[9px] tracking-wider hidden md:inline">
        {activeInstrument.displaySymbol}
      </span>
    </div>
  );
}
