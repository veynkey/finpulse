import { useState } from 'react';
import type { LinkGroup } from '../types';
import ErrorBoundary from './ErrorBoundary';

// Panels
import OrderBookPanel from '../panels/OrderBookPanel';
import OrderFlowPanel from '../panels/OrderFlowPanel';
import MarketConditionsPanel from '../panels/MarketConditionsPanel';
import CorrelationMatrixPanel from '../panels/CorrelationMatrixPanel';
import VolumeProfilePanel from '../panels/VolumeProfilePanel';
import MacroCalendarPanel from '../panels/MacroCalendarPanel';
import NewsPanel from '../panels/NewsPanel';
import AIPanel from '../panels/AIPanel';
import PortfolioRiskPanel from '../panels/PortfolioRiskPanel';
import ScannerPanel from '../panels/ScannerPanel';
import ReplayPanel from '../panels/ReplayPanel';

type DockTab =
  | 'orderflow'
  | 'orderbook'
  | 'marketconditions'
  | 'correlation'
  | 'volumeprofile'
  | 'macro'
  | 'news'
  | 'ai'
  | 'portrisk'
  | 'scanner'
  | 'replay';

interface ContextualDockProps {
  defaultGroup?: LinkGroup;
}

export default function ContextualDock({ defaultGroup = 'BLUE' }: ContextualDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>('orderflow');

  const tabs: { id: DockTab; label: string }[] = [
    { id: 'orderflow', label: 'TIME & SALES' },
    { id: 'orderbook', label: 'ORDER BOOK' },
    { id: 'marketconditions', label: 'CONDITIONS & QUALITY' },
    { id: 'correlation', label: 'CORRELATION MATRIX' },
    { id: 'volumeprofile', label: 'VOLUME PROFILE' },
    { id: 'macro', label: 'MACRO CALENDAR' },
    { id: 'news', label: 'NEWS INTELLIGENCE' },
    { id: 'ai', label: 'AI ANALYST' },
    { id: 'portrisk', label: 'PORTFOLIO RISK' },
    { id: 'scanner', label: 'FINQL SCANNER' },
    { id: 'replay', label: 'MARKET REPLAY' },
  ];

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'orderflow':
        return <OrderFlowPanel defaultGroup={defaultGroup} />;
      case 'orderbook':
        return <OrderBookPanel defaultGroup={defaultGroup} />;
      case 'marketconditions':
        return <MarketConditionsPanel defaultGroup={defaultGroup} />;
      case 'correlation':
        return <CorrelationMatrixPanel />;
      case 'volumeprofile':
        return <VolumeProfilePanel defaultGroup={defaultGroup} />;
      case 'macro':
        return <MacroCalendarPanel />;
      case 'news':
        return <NewsPanel defaultGroup={defaultGroup} />;
      case 'ai':
        return <AIPanel defaultGroup={defaultGroup} />;
      case 'portrisk':
        return <PortfolioRiskPanel />;
      case 'scanner':
        return <ScannerPanel />;
      case 'replay':
        return <ReplayPanel />;
      default:
        return <OrderFlowPanel defaultGroup={defaultGroup} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090b0e] text-xs font-mono select-none overflow-hidden">
      {/* Contextual Dock Tab Header */}
      <div className="h-7 bg-[#12151b] border-b border-border/60 px-2 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center space-x-1 shrink-0">
          <span className="text-muted text-[10px] uppercase font-bold mr-1.5 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>CONTEXT DOCK:</span>
          </span>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-accent text-white font-bold'
                    : 'text-muted hover:text-text hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dock Content Viewport */}
      <div className="flex-grow min-h-0 relative">
        <ErrorBoundary fallbackTitle={`${activeTab.toUpperCase()} Dock Panel Error`}>
          {renderActivePanel()}
        </ErrorBoundary>
      </div>
    </div>
  );
}
