import { useState, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { MarketConditionsEngine } from '../services/marketConditions';
import type { MarketConditionState, LinkGroup } from '../types';
import PanelHeader from './PanelHeader';
import { ShieldCheck, Compass, Clock } from 'lucide-react';

export default function MarketConditionsPanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(linkGroup);
  const [conditions, setConditions] = useState<MarketConditionState>(() =>
    MarketConditionsEngine.evaluateConditions(activeInstrument, 0.4, 64520.1)
  );

  useEffect(() => {
    const update = () => {
      setConditions(MarketConditionsEngine.evaluateConditions(activeInstrument, 0.35, 64520.1));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [activeInstrument.id]);

  const qualityBadge: Record<
    MarketConditionState['overallQuality'],
    { bg: string; text: string; label: string }
  > = {
    EXCELLENT: { bg: 'bg-up/20', text: 'text-up', label: 'EXCELLENT / ORDERLY' },
    GOOD: { bg: 'bg-accent/20', text: 'text-accent', label: 'GOOD / HIGH INFORMATION' },
    MIXED: { bg: 'bg-[#ff9100]/20', text: 'text-[#ff9100]', label: 'MIXED / SELECTIVE' },
    DIFFICULT: { bg: 'bg-down/20', text: 'text-down', label: 'DIFFICULT / CHOPPY' },
    DISORDERLY: { bg: 'bg-down/30', text: 'text-down', label: 'DISORDERLY / UNSTABLE' },
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title={`MARKET CONDITIONS & QUALITY [${activeInstrument.displaySymbol}]`}
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-1">
            <span
              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                qualityBadge[conditions.overallQuality].bg
              } ${qualityBadge[conditions.overallQuality].text}`}
            >
              {qualityBadge[conditions.overallQuality].label}
            </span>
          </div>
        }
      />

      <div className="flex-grow overflow-auto p-3 space-y-3">
        {/* Top Session & Overall Analyzability Card */}
        <div className="bg-[#12151b] border border-border/70 rounded p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-2 border-b border-border/40 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-accent" />
              <span className="text-muted">ACTIVE GLOBAL REGIME:</span>
              <span className="font-bold text-text">{conditions.sessionDescription}</span>
            </div>
            <div className="text-[10px] text-muted flex items-center space-x-1">
              <Clock className="w-3 h-3 text-accent" />
              <span>UTC TIMELINE</span>
            </div>
          </div>

          {/* Session Overlap Timeline Bar (Section 28) */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-[9px] text-muted">
              <span>00:00 TOKYO</span>
              <span className="text-accent font-semibold">08:00 LONDON</span>
              <span className="text-up font-bold">13:30 LONDON/NY OVERLAP</span>
              <span>20:00 NY CLOSE</span>
            </div>
            <div className="w-full h-2 bg-[#1a1d24] rounded-full overflow-hidden flex">
              <div className="w-1/3 bg-[#333] h-full" title="Asia Session" />
              <div className="w-1/4 bg-[#0070f3]/40 h-full" title="London Session" />
              <div className="w-1/6 bg-up/60 h-full" title="London / NY Overlap" />
              <div className="w-1/4 bg-[#0070f3]/40 h-full" title="New York Session" />
            </div>
          </div>

          <div className="text-[11px] text-text">
            Overall Analytical Environment:{' '}
            <strong className={qualityBadge[conditions.overallQuality].text}>
              {conditions.overallQuality}
            </strong>{' '}
            (Empirical signal-to-noise ratio is favorable for technical structure evaluation).
          </div>
        </div>

        {/* Core Metric Matrix (Section 25) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-[#12151b] p-2 rounded border border-border/50">
            <div className="text-[10px] text-muted">LIQUIDITY</div>
            <div className="font-bold text-text text-sm">{conditions.liquidity}</div>
            <div className="text-[10px] text-muted">Spread: {conditions.spreadBps.toFixed(1)} bps</div>
          </div>

          <div className="bg-[#12151b] p-2 rounded border border-border/50">
            <div className="text-[10px] text-muted">VOLUME REGIME</div>
            <div className={`font-bold text-sm ${conditions.volumeRegime === 'ABOVE_NORMAL' ? 'text-accent' : 'text-text'}`}>
              {conditions.volumeRegime.replace('_', ' ')}
            </div>
            <div className="text-[10px] text-muted">Z-Score: +{conditions.volumeZScore.toFixed(1)}σ</div>
          </div>

          <div className="bg-[#12151b] p-2 rounded border border-border/50">
            <div className="text-[10px] text-muted">TREND STRUCTURE</div>
            <div className="font-bold text-text text-sm">{conditions.trendStructure.replace('_', ' ')}</div>
            <div className="text-[10px] text-muted">Choppiness: {Math.round(conditions.choppinessIndex)}/100</div>
          </div>

          <div className="bg-[#12151b] p-2 rounded border border-border/50">
            <div className="text-[10px] text-muted">EVENT / NEWS RISK</div>
            <div className="font-bold text-up text-sm">{conditions.eventRisk}</div>
            <div className="text-[10px] text-muted truncate">No Tier-1 in &lt;60m</div>
          </div>
        </div>

        {/* Why Market Quality Changed (Section 27) */}
        <div className="bg-[#12151b] border border-border/60 rounded p-2.5">
          <div className="text-[10px] uppercase font-bold text-muted tracking-wider mb-1.5 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>EMPIRICAL DRIVERS BEHIND CURRENT MARKET QUALITY</span>
          </div>

          <ul className="space-y-1 text-[11px] text-text">
            {conditions.reasons.map((r, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-accent font-bold mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
            <li className="flex items-start space-x-2">
              <span className="text-up font-bold mt-0.5">•</span>
              <span>{conditions.eventRiskDetail}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
