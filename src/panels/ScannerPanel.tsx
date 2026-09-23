import { useState } from 'react';
import { useTerminal } from '../context/TerminalContext';
import PanelHeader from './PanelHeader';
import { Search, Play, Filter } from 'lucide-react';

interface ScannerResult {
  symbol: string;
  instrumentId: string;
  price: number;
  change5m: number;
  volumeZScore: number;
  rsi14: number;
  oiChange1h: number;
  fundingRate: number;
}

const SAMPLE_SCANNER_DATA: ScannerResult[] = [
  { symbol: 'BTC/USDT', instrumentId: 'BTC-USDT:BINANCE', price: 64520.1, change5m: 1.24, volumeZScore: 3.42, rsi14: 64.2, oiChange1h: 4.8, fundingRate: 0.0084 },
  { symbol: 'SOL/USDT', instrumentId: 'SOL-USDT:BINANCE', price: 154.2, change5m: 2.15, volumeZScore: 4.12, rsi14: 71.8, oiChange1h: 6.2, fundingRate: 0.0125 },
  { symbol: 'ETH/USDT', instrumentId: 'ETH-USDT:BINANCE', price: 2795.4, change5m: 0.65, volumeZScore: 2.18, rsi14: 56.4, oiChange1h: 1.9, fundingRate: 0.0062 },
  { symbol: 'XRP/USDT', instrumentId: 'XRP-USDT:BINANCE', price: 0.5842, change5m: -0.42, volumeZScore: 0.84, rsi14: 38.2, oiChange1h: -1.2, fundingRate: -0.0021 },
  { symbol: 'NVDA', instrumentId: 'NVDA:NASDAQ', price: 118.4, change5m: 0.45, volumeZScore: 2.85, rsi14: 62.1, oiChange1h: 0.0, fundingRate: 0.0 },
  { symbol: 'BNB/USDT', instrumentId: 'BNB-USDT:BINANCE', price: 588.0, change5m: 0.12, volumeZScore: 1.45, rsi14: 49.8, oiChange1h: 0.8, fundingRate: 0.0041 },
];

export default function ScannerPanel() {
  const { setLinkedSymbol } = useTerminal();
  const [query, setQuery] = useState('FROM crypto WHERE volume_zscore > 2.0 SORT BY volume_zscore DESC');
  const [results, setResults] = useState<ScannerResult[]>(SAMPLE_SCANNER_DATA);

  const presets = [
    { label: 'Volume Z-Score > 2.0', q: 'FROM crypto WHERE volume_zscore > 2.0 SORT BY volume_zscore DESC' },
    { label: 'High Momentum (5m > 1%)', q: 'FROM crypto WHERE change5m > 1.0 SORT BY change5m DESC' },
    { label: 'RSI Divergence', q: 'FROM crypto WHERE rsi14 < 40 OR rsi14 > 70' },
    { label: 'OI Expansion > 3%', q: 'FROM crypto WHERE oi_change_1h > 3.0' },
  ];

  const handleRunQuery = () => {
    // Simple in-memory FinQL parser evaluation
    const lower = query.toLowerCase();
    let filtered = [...SAMPLE_SCANNER_DATA];

    if (lower.includes('volume_zscore > 2')) {
      filtered = filtered.filter((r) => r.volumeZScore > 2.0);
    }
    if (lower.includes('change5m > 1')) {
      filtered = filtered.filter((r) => r.change5m > 1.0);
    }
    if (lower.includes('rsi14 < 40')) {
      filtered = filtered.filter((r) => r.rsi14 < 40 || r.rsi14 > 70);
    }
    if (lower.includes('oi_change_1h > 3')) {
      filtered = filtered.filter((r) => r.oiChange1h > 3.0);
    }
    if (lower.includes('sort by volume_zscore desc')) {
      filtered.sort((a, b) => b.volumeZScore - a.volumeZScore);
    }

    setResults(filtered);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title="FINQL SCANNER & SCREENER"
        actions={
          <span className="text-[10px] text-muted">
            MATCHES: <span className="text-text font-bold">{results.length}</span>
          </span>
        }
      />

      {/* Query Bar */}
      <div className="p-2 bg-[#121419] border-b border-border/50 space-y-1.5">
        <div className="flex space-x-2">
          <div className="relative flex-grow">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2 top-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="FinQL query: FROM crypto WHERE volume_zscore > 2.0..."
              className="w-full bg-black/60 border border-border/80 rounded pl-7 pr-2 py-1 text-xs text-text outline-none focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={handleRunQuery}
            className="bg-accent hover:bg-accent/80 text-white font-bold px-3 py-1 rounded flex items-center space-x-1 transition-colors text-xs shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>EXEC</span>
          </button>
        </div>

        {/* Presets */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px]">
          <span className="text-muted flex items-center space-x-1 shrink-0">
            <Filter className="w-2.5 h-2.5" />
            <span>PRESETS:</span>
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(p.q);
                handleRunQuery();
              }}
              className="bg-white/5 hover:bg-accent/20 hover:text-accent text-muted px-2 py-0.5 rounded shrink-0 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#14161a] sticky top-0 text-[10px] uppercase text-muted tracking-wider border-b border-border/60">
            <tr>
              <th className="py-1 px-2 font-normal">Symbol</th>
              <th className="py-1 px-2 font-normal text-right">Price</th>
              <th className="py-1 px-2 font-normal text-right">5m Chg%</th>
              <th className="py-1 px-2 font-normal text-right">Vol Z-Score</th>
              <th className="py-1 px-2 font-normal text-right">RSI (14)</th>
              <th className="py-1 px-2 font-normal text-right">OI 1h%</th>
              <th className="py-1 px-2 font-normal text-right">Funding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-[11px]">
            {results.map((r) => (
              <tr
                key={r.symbol}
                onClick={() => setLinkedSymbol('BLUE', r.instrumentId)}
                className="hover:bg-white/5 cursor-pointer"
              >
                <td className="py-1 px-2 font-bold text-text">{r.symbol}</td>
                <td className="py-1 px-2 text-right">${r.price.toLocaleString()}</td>
                <td className={`py-1 px-2 text-right font-medium ${r.change5m >= 0 ? 'text-up' : 'text-down'}`}>
                  {r.change5m >= 0 ? '+' : ''}
                  {r.change5m}%
                </td>
                <td className="py-1 px-2 text-right">
                  <span className={`font-bold ${r.volumeZScore >= 2.0 ? 'text-accent' : 'text-text'}`}>
                    {r.volumeZScore.toFixed(2)}σ
                  </span>
                </td>
                <td className="py-1 px-2 text-right">
                  <span className={r.rsi14 >= 70 ? 'text-down' : r.rsi14 <= 30 ? 'text-up' : 'text-text'}>
                    {r.rsi14.toFixed(1)}
                  </span>
                </td>
                <td className="py-1 px-2 text-right text-text">
                  {r.oiChange1h >= 0 ? '+' : ''}
                  {r.oiChange1h}%
                </td>
                <td className="py-1 px-2 text-right text-muted">
                  {(r.fundingRate * 100).toFixed(4)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
