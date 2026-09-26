import { useState } from 'react';
import type { PanelCategory, PanelDefinition } from '../types';
import {
  X,
  Search,
  Plus,
  TrendingUp,
  Activity,
  Layers,
  Newspaper,
  Cpu,
  ShieldAlert,
  RotateCcw,
  BarChart2,
  Table,
} from 'lucide-react';

export const PANEL_DEFINITIONS: PanelDefinition[] = [
  {
    id: 'watchlist',
    title: 'Multi-Asset Watchlist',
    category: 'MARKET',
    description: 'Dynamic asset watchlist with 24h change, sparklines, and fast filtering across Crypto, Equities, Forex, and Commodities.',
    defaultWidth: 3,
    defaultHeight: 7,
  },
  {
    id: 'chart',
    title: 'Professional Chart Workstation',
    category: 'MARKET',
    description: 'Hardware-accelerated candlestick charting with drawing tools, multi-indicator overlays, and position risk/reward calculator.',
    defaultWidth: 6,
    defaultHeight: 7,
  },
  {
    id: 'volumeprofile',
    title: 'Volume Profile (VPVR)',
    category: 'MARKET',
    description: 'Volume-at-price distribution, Point of Control (POC), Value Area (VAH/VAL 70%), and buy/sell delta breakdown.',
    defaultWidth: 4,
    defaultHeight: 6,
  },
  {
    id: 'marketconditions',
    title: 'Market Conditions & Analyzability',
    category: 'ANALYTICS',
    description: 'Regime classification, session timeline (Asia, London, NY), choppiness index, and actionable execution quality ratings.',
    defaultWidth: 4,
    defaultHeight: 6,
  },
  {
    id: 'correlation',
    title: 'Cross-Asset Correlation Matrix',
    category: 'ANALYTICS',
    description: 'Pearson correlation heatmap and normalized relative performance attribution over multi-period lookbacks.',
    defaultWidth: 5,
    defaultHeight: 6,
  },
  {
    id: 'orderbook',
    title: 'Level 2 Depth Order Book',
    category: 'TRADING',
    description: 'Real-time aggregated bid/ask depth ladder with visual cumulative liquidity bars and wall detection.',
    defaultWidth: 3,
    defaultHeight: 6,
  },
  {
    id: 'orderflow',
    title: 'Time & Sales Tape',
    category: 'TRADING',
    description: 'Tick-by-tick transaction stream with trade size filtering, side coloring, and cumulative delta.',
    defaultWidth: 3,
    defaultHeight: 6,
  },
  {
    id: 'cvd',
    title: 'CVD Spot & Futures Delta',
    category: 'TRADING',
    description: 'Authoritative Cumulative Volume Delta tracking with Spot vs USD-M Perpetual Futures market selection, candle-synchronized timeframes, and divergence detection.',
    defaultWidth: 5,
    defaultHeight: 6,
  },
  {
    id: 'radar',
    title: 'Market Anomaly Radar',
    category: 'ANALYTICS',
    description: 'Real-time algorithmic event detection: volume spikes, absorption walls, liquidity vacuums, and breakout traps.',
    defaultWidth: 3,
    defaultHeight: 7,
  },
  {
    id: 'news',
    title: 'News Intelligence & Linking',
    category: 'NEWS',
    description: 'Clustered financial wire feeds with sentiment tagging, image previews, and direct entity-to-chart linking.',
    defaultWidth: 4,
    defaultHeight: 6,
  },
  {
    id: 'macro',
    title: 'Global Macro Calendar',
    category: 'NEWS',
    description: 'Economic releases (FOMC, CPI, NFP, GDP, PMI) with consensus vs actual variance and historical impact tagging.',
    defaultWidth: 4,
    defaultHeight: 6,
  },
  {
    id: 'ai',
    title: 'Evidence AI Analyst',
    category: 'AI',
    description: 'Local-first reasoning model with verified telemetry evidence cards, tool execution, and local diagnostics.',
    defaultWidth: 4,
    defaultHeight: 6,
  },
  {
    id: 'scanner',
    title: 'FinQL Multi-Asset Scanner',
    category: 'RESEARCH',
    description: 'Real-time query engine filtering assets by RSI divergence, volume anomalies, volatility breakouts, and moving average crosses.',
    defaultWidth: 6,
    defaultHeight: 6,
  },
  {
    id: 'portrisk',
    title: 'Portfolio & Value-at-Risk (VaR)',
    category: 'PORTFOLIO',
    description: 'Position risk analytics: parametric VaR (95%/99%), maximum drawdown, beta, Sharpe ratio, and margin utilization.',
    defaultWidth: 5,
    defaultHeight: 6,
  },
  {
    id: 'replay',
    title: 'Market Tape Replay',
    category: 'SYSTEM',
    description: 'Deterministic tick-level historical replay engine for strategy backtesting, execution review, and post-trade analytics.',
    defaultWidth: 4,
    defaultHeight: 5,
  },
  {
    id: 'trend_direction',
    title: 'Trend Direction Gauges (LTTD, MID, MACRO, STTD)',
    category: 'ANALYTICS',
    description: 'Circular radial gauges displaying multi-timeframe directional trend alignment for active coin with dynamic bullish/bearish fills.',
    defaultWidth: 5,
    defaultHeight: 5,
  },
  {
    id: 'zscore',
    title: 'Price & Volume Z-Score',
    category: 'ANALYTICS',
    description: 'Statistical standard deviation and mean reversion probability bell curve for active coin based on 20/50 lookback.',
    defaultWidth: 4,
    defaultHeight: 5,
  },
  {
    id: 'rsi_standalone',
    title: 'RSI Momentum Oscillator',
    category: 'ANALYTICS',
    description: 'Standalone multi-timeframe 14-period RSI matrix (15M, 1H, 4H, 1D) with regular and hidden divergence detection for active coin.',
    defaultWidth: 4,
    defaultHeight: 5,
  },
  {
    id: 'volume_analysis',
    title: 'Volume Dynamics & Flow Meter',
    category: 'TRADING',
    description: 'Relative volume (RVOL) multiplier, aggressive buyer vs seller pressure gauge, and volume anomaly spike alert for active coin.',
    defaultWidth: 4,
    defaultHeight: 5,
  },
  {
    id: 'regime_indicator',
    title: 'Market Regime & Structure Classifier',
    category: 'ANALYTICS',
    description: 'Mathematical Choppiness Index (CHOP) and volatility structure classifier (Trending, Choppy, Squeeze Compression) with actionable strategy playbook.',
    defaultWidth: 4,
    defaultHeight: 5,
  },
];

interface PanelLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPanel: (panelId: string, title: string) => void;
  onDragStartPanel?: (e: React.DragEvent<HTMLElement>, panel: PanelDefinition) => void;
  activePanelIds: string[];
}

export default function PanelLibraryModal({
  isOpen,
  onClose,
  onAddPanel,
  onDragStartPanel,
  activePanelIds,
}: PanelLibraryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = ['ALL', 'MARKET', 'ANALYTICS', 'TRADING', 'NEWS', 'RESEARCH', 'PORTFOLIO', 'AI', 'SYSTEM'];

  const filteredPanels = PANEL_DEFINITIONS.filter((panel) => {
    const matchesCategory = selectedCategory === 'ALL' || panel.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      panel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (cat: PanelCategory) => {
    switch (cat) {
      case 'MARKET':
        return <TrendingUp size={13} className="text-accent" />;
      case 'ANALYTICS':
        return <Activity size={13} className="text-warning" />;
      case 'TRADING':
        return <Table size={13} className="text-up" />;
      case 'NEWS':
        return <Newspaper size={13} className="text-accent" />;
      case 'RESEARCH':
        return <Layers size={13} className="text-muted" />;
      case 'PORTFOLIO':
        return <ShieldAlert size={13} className="text-down" />;
      case 'AI':
        return <Cpu size={13} className="text-accent" />;
      case 'SYSTEM':
        return <RotateCcw size={13} className="text-muted" />;
      default:
        return <BarChart2 size={13} className="text-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111319] border border-border/80 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-xs font-mono">
        {/* Header */}
        <div className="p-3 bg-[#151922] border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers size={16} className="text-accent" />
            <span className="font-bold text-text text-sm">ADD WORKSPACE PANEL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3 border-b border-border/40 space-y-2 bg-[#0c0e13]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="Search panels by name, category, or functionality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161a24] border border-border/60 rounded pl-8 pr-3 py-1.5 text-xs text-text placeholder-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent text-white'
                    : 'bg-surface hover:bg-surface-hover text-muted hover:text-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Catalog Grid */}
        <div className="flex-grow overflow-y-auto p-3 space-y-2">
          {filteredPanels.map((panel) => {
            const isAlreadyActive = activePanelIds.includes(panel.id);

            return (
              <div
                key={panel.id}
                draggable
                onDragStart={(e) => {
                  if (onDragStartPanel) {
                    onDragStartPanel(e, panel);
                  }
                }}
                className="bg-[#141720] border border-border/60 hover:border-accent/60 cursor-grab active:cursor-grabbing rounded p-2.5 flex items-start justify-between space-x-3 transition-colors group"
                title="Drag this panel directly into any workspace docking target, or click Add Panel"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(panel.category)}
                    <span className="font-bold text-text text-xs group-hover:text-accent transition-colors">
                      {panel.title}
                    </span>
                    <span className="bg-surface px-1.5 py-0.2 rounded text-[9px] text-muted uppercase">
                      {panel.category}
                    </span>
                  </div>
                  <div className="text-muted text-[10px] leading-relaxed">
                    {panel.description}
                  </div>
                </div>

                <div className="shrink-0 flex items-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAddPanel(panel.id, panel.title);
                      onClose();
                    }}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                      isAlreadyActive
                        ? 'bg-surface hover:bg-accent/20 text-muted hover:text-accent border border-border/60'
                        : 'bg-accent hover:bg-accent/80 text-white'
                    }`}
                  >
                    <Plus size={11} />
                    <span>{isAlreadyActive ? 'Add Another' : 'Add Panel'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#151922] border-t border-border/60 flex items-center justify-between text-[10px] text-muted">
          <span>Panels can also be launched instantly via Command Bar (Ctrl+K).</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-surface hover:bg-surface-hover text-text rounded font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
