import { useState } from 'react';
import PanelHeader from './PanelHeader';
import { Grid, TrendingUp } from 'lucide-react';

const ASSETS = ['BTC', 'ETH', 'SOL', 'NVDA', 'SPY', 'GOLD'];

const CORRELATION_DATA: Record<string, Record<string, number>> = {
  BTC: { BTC: 1.0, ETH: 0.84, SOL: 0.78, NVDA: 0.42, SPY: 0.38, GOLD: 0.18 },
  ETH: { BTC: 0.84, ETH: 1.0, SOL: 0.82, NVDA: 0.45, SPY: 0.41, GOLD: 0.14 },
  SOL: { BTC: 0.78, ETH: 0.82, SOL: 1.0, NVDA: 0.48, SPY: 0.36, GOLD: 0.08 },
  NVDA: { BTC: 0.42, ETH: 0.45, SOL: 0.48, NVDA: 1.0, SPY: 0.76, GOLD: -0.12 },
  SPY: { BTC: 0.38, ETH: 0.41, SOL: 0.36, NVDA: 0.76, SPY: 1.0, GOLD: -0.05 },
  GOLD: { BTC: 0.18, ETH: 0.14, SOL: 0.08, NVDA: -0.12, SPY: -0.05, GOLD: 1.0 },
};

const RELATIVE_RETURNS = [
  { symbol: 'SOL', return7d: 14.2, return30d: 28.4, returnYtd: 142.0 },
  { symbol: 'NVDA', return7d: 5.8, return30d: 12.1, returnYtd: 138.5 },
  { symbol: 'BTC', return7d: 4.2, return30d: 9.8, returnYtd: 58.2 },
  { symbol: 'ETH', return7d: 2.1, return30d: 4.5, returnYtd: 22.4 },
  { symbol: 'SPY', return7d: 1.2, return30d: 3.1, returnYtd: 20.8 },
  { symbol: 'GOLD', return7d: 0.8, return30d: 4.2, returnYtd: 27.5 },
];

export default function CorrelationMatrixPanel() {
  const [activeTab, setActiveTab] = useState<'CORRELATION' | 'RELATIVE_PERF'>('CORRELATION');
  const [windowPeriod, setWindowPeriod] = useState<'30D' | '90D' | '1Y'>('90D');

  const getCellColor = (val: number) => {
    if (val === 1.0) return 'bg-accent/40 text-white font-bold';
    if (val >= 0.7) return 'bg-up/30 text-up font-bold';
    if (val >= 0.4) return 'bg-up/15 text-text';
    if (val >= 0.1) return 'bg-white/5 text-muted';
    if (val >= -0.1) return 'bg-black/30 text-muted';
    return 'bg-down/20 text-down font-bold';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title="CROSS-ASSET CORRELATION & ATTRIBUTION"
        actions={
          <div className="flex items-center space-x-1">
            {(['CORRELATION', 'RELATIVE_PERF'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  activeTab === tab ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        }
      />

      {activeTab === 'CORRELATION' && (
        <div className="flex-grow overflow-auto p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-muted mb-2">
            <div className="flex items-center space-x-1">
              <Grid className="w-3.5 h-3.5 text-accent" />
              <span>PEARSON CORRELATION MATRIX ({windowPeriod})</span>
            </div>
            <div className="flex items-center space-x-1">
              {(['30D', '90D', '1Y'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWindowPeriod(w)}
                  className={`px-1.5 py-0.5 rounded text-[9px] ${
                    windowPeriod === w ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text bg-white/5'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-[11px]">
              <thead>
                <tr className="text-muted border-b border-border/50 text-[10px]">
                  <th className="py-1 px-1 font-normal text-left">Asset</th>
                  {ASSETS.map((a) => (
                    <th key={a} className="py-1 px-1 font-bold text-text">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {ASSETS.map((row) => (
                  <tr key={row}>
                    <td className="py-1 px-1 text-left font-bold text-text">{row}</td>
                    {ASSETS.map((col) => {
                      const val = CORRELATION_DATA[row]?.[col] ?? 0;
                      return (
                        <td key={col} className={`py-1 px-1 rounded-xs transition-colors ${getCellColor(val)}`}>
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#121419] p-2 rounded text-[10px] text-muted mt-2 border border-border/40">
            High positive correlation (&gt;0.70) signifies co-movement. Low correlation indicates diversification value.
          </div>
        </div>
      )}

      {activeTab === 'RELATIVE_PERF' && (
        <div className="flex-grow overflow-auto p-3">
          <div className="flex items-center space-x-1 text-[11px] text-muted mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span>NORMALIZED PERFORMANCE ATTRIBUTION (%)</span>
          </div>

          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-[#121419] text-[10px] uppercase text-muted tracking-wider border-b border-border/50">
              <tr>
                <th className="py-1 px-2 font-normal">Asset</th>
                <th className="py-1 px-2 font-normal text-right">7D Return</th>
                <th className="py-1 px-2 font-normal text-right">30D Return</th>
                <th className="py-1 px-2 font-normal text-right">YTD Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {RELATIVE_RETURNS.map((item) => (
                <tr key={item.symbol} className="hover:bg-white/5">
                  <td className="py-1 px-2 font-bold text-text">{item.symbol}</td>
                  <td className={`py-1 px-2 text-right ${item.return7d >= 0 ? 'text-up' : 'text-down'}`}>
                    +{item.return7d}%
                  </td>
                  <td className={`py-1 px-2 text-right ${item.return30d >= 0 ? 'text-up' : 'text-down'}`}>
                    +{item.return30d}%
                  </td>
                  <td className="py-1 px-2 text-right font-bold text-accent">
                    +{item.returnYtd}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
