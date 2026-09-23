import { useState, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import type { RadarEvent, LinkGroup } from '../types';
import PanelHeader from './PanelHeader';
import { Activity, AlertTriangle, Zap, TrendingUp, Info } from 'lucide-react';

export default function RadarPanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { setLinkedSymbol, addAlert } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const [events, setEvents] = useState<RadarEvent[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  useEffect(() => {
    const unsub = marketData.subscribeRadar((event) => {
      setEvents((prev) => [event, ...prev.slice(0, 35)]);
      addAlert(event);
    });
    return () => {
      unsub();
    };
  }, [addAlert]);

  const severityBadges: Record<RadarEvent['severity'], { bg: string; text: string; icon: any }> = {
    INFO: { bg: 'bg-[#0070f3]/20', text: 'text-[#0070f3]', icon: Info },
    ELEVATED: { bg: 'bg-[#ff9100]/20', text: 'text-[#ff9100]', icon: TrendingUp },
    HIGH: { bg: 'bg-[#ff6d00]/20', text: 'text-[#ff6d00]', icon: Zap },
    CRITICAL: { bg: 'bg-[#ff1744]/20', text: 'text-[#ff1744]', icon: AlertTriangle },
  };

  const filtered = events.filter((e) => {
    if (filterSeverity === 'ALL') return true;
    return e.severity === filterSeverity;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title="MARKET RADAR (ANOMALY ENGINE)"
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-1">
            {['ALL', 'HIGH', 'CRITICAL'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  filterSeverity === sev ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-grow overflow-auto p-2 space-y-2">
        {filtered.map((e) => {
          const badge = severityBadges[e.severity];
          const Icon = badge.icon;
          const time = new Date(e.timestamp).toLocaleTimeString();

          return (
            <div
              key={e.id}
              onClick={() => setLinkedSymbol(linkGroup, e.instrumentId)}
              className="bg-[#12151b] border border-border/70 hover:border-accent/60 p-2 rounded cursor-pointer transition-all duration-150"
            >
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] flex items-center space-x-1 ${badge.bg} ${badge.text}`}>
                    <Icon className="w-2.5 h-2.5 mr-0.5" />
                    {e.severity}
                  </span>
                  <span className="font-bold text-text hover:underline">{e.symbol}</span>
                  <span className="text-muted text-[10px]">{e.eventType}</span>
                </div>
                <span className="text-muted text-[10px]">{time}</span>
              </div>

              <div className="text-text font-medium leading-snug mb-1.5 text-[11px]">
                {e.headline}
              </div>

              <div className="grid grid-cols-3 bg-black/40 rounded p-1 text-[10px] text-muted">
                <div>
                  METRIC: <span className="text-text font-semibold">{e.metric}</span>
                </div>
                <div>
                  BASELINE: <span className="text-text">{e.baseline}</span>
                </div>
                <div className="text-right">
                  DEV: <span className="text-accent font-bold">{e.deviation}</span>
                </div>
              </div>

              {e.relatedAssets.length > 0 && (
                <div className="mt-1.5 flex items-center space-x-1 text-[9px] text-muted">
                  <span>CONTAGION / CORRELATED:</span>
                  {e.relatedAssets.map((asset) => (
                    <span key={asset} className="bg-white/10 px-1 py-0.2 rounded text-text font-semibold">
                      {asset}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted flex flex-col items-center">
            <Activity className="w-6 h-6 mb-2 opacity-40 text-accent animate-pulse" />
            <span>Market anomaly radar scanning active feeds...</span>
          </div>
        )}
      </div>
    </div>
  );
}
