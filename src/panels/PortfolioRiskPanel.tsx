import { useState } from 'react';
import type { Position, PortfolioRiskMetrics } from '../types';
import PanelHeader from './PanelHeader';
import { ShieldAlert, Activity, TrendingDown } from 'lucide-react';

const SAMPLE_POSITIONS: Position[] = [
  {
    instrumentId: 'BTC-USDT:BINANCE',
    symbol: 'BTC/USDT',
    side: 'LONG',
    quantity: 1.85,
    entryPrice: 59200.0,
    markPrice: 64520.1,
    unrealizedPnl: 9847.18,
    unrealizedPnlPercent: 8.98,
    realizedPnl: 1420.5,
    marginUsed: 23862.4,
    weight: 48.2,
  },
  {
    instrumentId: 'ETH-USDT:BINANCE',
    symbol: 'ETH/USDT',
    side: 'LONG',
    quantity: 18.5,
    entryPrice: 2680.0,
    markPrice: 2795.4,
    unrealizedPnl: 2134.9,
    unrealizedPnlPercent: 4.31,
    realizedPnl: -240.0,
    marginUsed: 10342.9,
    weight: 20.8,
  },
  {
    instrumentId: 'NVDA:NASDAQ',
    symbol: 'NVDA',
    side: 'LONG',
    quantity: 120,
    entryPrice: 112.5,
    markPrice: 118.4,
    unrealizedPnl: 708.0,
    unrealizedPnlPercent: 5.24,
    realizedPnl: 850.0,
    marginUsed: 14208.0,
    weight: 28.6,
  },
  {
    instrumentId: 'SOL-USDT:BINANCE',
    symbol: 'SOL/USDT',
    side: 'SHORT',
    quantity: 40,
    entryPrice: 158.0,
    markPrice: 154.2,
    unrealizedPnl: 152.0,
    unrealizedPnlPercent: 2.4,
    realizedPnl: 45.0,
    marginUsed: 1233.6,
    weight: 2.4,
  },
];

const INITIAL_RISK: PortfolioRiskMetrics = {
  totalEquity: 247890.5,
  dailyPnl: 3412.8,
  dailyPnlPercent: 1.39,
  unrealizedPnl: 12842.08,
  realizedPnl: 2075.5,
  var95: 14250.0,
  var99: 22100.0,
  maxDrawdown: 11.4,
  portfolioBeta: 1.18,
  sharpeRatio: 1.94,
  leverage: 1.25,
};

export default function PortfolioRiskPanel() {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'RISK_VAR' | 'STRESS'>('POSITIONS');
  const [positions] = useState<Position[]>(SAMPLE_POSITIONS);
  const [risk] = useState<PortfolioRiskMetrics>(INITIAL_RISK);

  const stressScenarios = [
    { name: 'BTC Shock (-30%)', impactUsd: -35808, impactPct: -14.4, assumption: 'Beta correlation 0.85 across altcoins' },
    { name: 'Tech Correction (-15%)', impactUsd: -18590, impactPct: -7.5, assumption: 'NASDAQ 100 benchmark beta 1.18' },
    { name: 'USD Surge (+5%)', impactUsd: -4950, impactPct: -2.0, assumption: 'Foreign exchange & gold inverse elasticity' },
    { name: 'Yield Spike (+100bps)', impactUsd: -8670, impactPct: -3.5, assumption: 'Discount rate sensitivity on tech & crypto duration' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title="PORTFOLIO & QUANT RISK ENGINE"
        actions={
          <div className="flex items-center space-x-1">
            {(['POSITIONS', 'RISK_VAR', 'STRESS'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  activeTab === tab ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />

      {/* Top summary KPIs */}
      <div className="grid grid-cols-4 bg-[#111419] p-2 border-b border-border/50 text-[11px]">
        <div>
          <div className="text-[10px] text-muted">TOTAL EQUITY</div>
          <div className="text-text font-bold text-sm">${risk.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted">UNREALIZED P&L</div>
          <div className={`font-bold ${risk.unrealizedPnl >= 0 ? 'text-up' : 'text-down'}`}>
            +${risk.unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted">1-DAY VaR (95%)</div>
          <div className="text-accent font-bold">${risk.var95.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted">MAX DRAWDOWN</div>
          <div className="text-down font-bold">{risk.maxDrawdown}%</div>
        </div>
      </div>

      {/* Tab 1: Positions */}
      {activeTab === 'POSITIONS' && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#14161a] sticky top-0 text-[10px] uppercase text-muted tracking-wider border-b border-border/60">
              <tr>
                <th className="py-1 px-2 font-normal">Asset</th>
                <th className="py-1 px-2 font-normal text-center">Side</th>
                <th className="py-1 px-2 font-normal text-right">Qty</th>
                <th className="py-1 px-2 font-normal text-right">Entry</th>
                <th className="py-1 px-2 font-normal text-right">Mark</th>
                <th className="py-1 px-2 font-normal text-right">Unrealized P&L</th>
                <th className="py-1 px-2 font-normal text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-[11px]">
              {positions.map((pos) => (
                <tr key={pos.instrumentId} className="hover:bg-white/5">
                  <td className="py-1 px-2 font-bold text-text">{pos.symbol}</td>
                  <td className="py-1 px-2 text-center">
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${pos.side === 'LONG' ? 'bg-up/20 text-up' : 'bg-down/20 text-down'}`}>
                      {pos.side}
                    </span>
                  </td>
                  <td className="py-1 px-2 text-right">{pos.quantity}</td>
                  <td className="py-1 px-2 text-right text-muted">${pos.entryPrice.toLocaleString()}</td>
                  <td className="py-1 px-2 text-right font-medium">${pos.markPrice.toLocaleString()}</td>
                  <td className={`py-1 px-2 text-right font-bold ${pos.unrealizedPnl >= 0 ? 'text-up' : 'text-down'}`}>
                    {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({pos.unrealizedPnlPercent}%)
                  </td>
                  <td className="py-1 px-2 text-right text-muted">{pos.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Quant Risk Analytics */}
      {activeTab === 'RISK_VAR' && (
        <div className="flex-grow overflow-auto p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#12151b] p-2.5 rounded border border-border/50">
              <div className="text-[10px] text-muted flex items-center space-x-1 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-accent" />
                <span>PARAMETRIC VALUE AT RISK</span>
              </div>
              <div className="text-sm font-bold text-text">${risk.var95.toLocaleString()} (95% 1-day)</div>
              <div className="text-[10px] text-muted mt-1">VaR 99%: ${risk.var99.toLocaleString()}</div>
            </div>

            <div className="bg-[#12151b] p-2.5 rounded border border-border/50">
              <div className="text-[10px] text-muted flex items-center space-x-1 mb-1">
                <Activity className="w-3.5 h-3.5 text-up" />
                <span>PORTFOLIO BETA & SHARPE</span>
              </div>
              <div className="text-sm font-bold text-text">Beta: {risk.portfolioBeta} (vs S&P 500)</div>
              <div className="text-[10px] text-muted mt-1">Annualized Sharpe: {risk.sharpeRatio}</div>
            </div>
          </div>

          <div className="bg-[#12151b] p-2.5 rounded border border-border/50 text-[11px]">
            <div className="font-semibold text-text mb-2">ASSET CLASS CONCENTRATION</div>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[10px] text-muted mb-0.5">
                  <span>CRYPTO (BTC, ETH, SOL)</span>
                  <span>71.4%</span>
                </div>
                <div className="w-full h-1.5 bg-[#222] rounded overflow-hidden">
                  <div className="bg-accent h-full" style={{ width: '71.4%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted mb-0.5">
                  <span>EQUITIES (NVDA)</span>
                  <span>28.6%</span>
                </div>
                <div className="w-full h-1.5 bg-[#222] rounded overflow-hidden">
                  <div className="bg-up h-full" style={{ width: '28.6%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Stress Scenario Testing */}
      {activeTab === 'STRESS' && (
        <div className="flex-grow overflow-auto p-3 space-y-2">
          <div className="text-[10px] text-muted mb-1 flex items-center space-x-1">
            <TrendingDown className="w-3 h-3 text-down" />
            <span>ESTIMATED PORTFOLIO STRESS IMPACT</span>
          </div>

          {stressScenarios.map((scen, idx) => (
            <div key={idx} className="bg-[#12151b] border border-border/60 p-2.5 rounded space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-text">{scen.name}</span>
                <span className="text-down font-bold">
                  -${Math.abs(scen.impactUsd).toLocaleString()} ({scen.impactPct}%)
                </span>
              </div>
              <div className="text-[10px] text-muted">
                Assumption: {scen.assumption}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
