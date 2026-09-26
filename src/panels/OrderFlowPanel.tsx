import { useState, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData, type TakerFlowStats } from '../services/marketData';
import type { LinkGroup, Trade } from '../types';
import PanelHeader from './PanelHeader';

export default function OrderFlowPanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(linkGroup);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [flowStats, setFlowStats] = useState<TakerFlowStats>(() =>
    marketData.getTakerFlowStats(activeInstrument.id)
  );

  useEffect(() => {
    // Reset trade tape when instrument changes
    setTrades([]);

    const canonicalId = activeInstrument.id;
    const unsubFlow = marketData.subscribeTakerFlow(canonicalId, (stats) => {
      setFlowStats(stats);
    });
    const unsubTrades = marketData.subscribeTrades(canonicalId, 1, (trade) => {
      setTrades((prev) => [trade, ...prev.slice(0, 40)]);
    });

    return () => {
      unsubFlow();
      unsubTrades();
    };
  }, [activeInstrument.id]);

  const { buyPct, sellPct, cvd } = flowStats;

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-xs font-mono select-none">
      <PanelHeader
        title={`TIME & SALES / CVD [${activeInstrument.displaySymbol}]`}
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-2 text-[10px]">
            <span>
              CVD:{' '}
              <span className={cvd >= 0 ? 'text-up font-bold' : 'text-down font-bold'}>
                {cvd >= 0 ? '+' : ''}
                {cvd.toFixed(2)}
              </span>
            </span>
          </div>
        }
      />

      {/* CVD & Volume pressure gauge */}
      <div className="bg-[#121419] p-2 border-b border-border/50 text-[11px]">
        <div className="flex justify-between text-muted mb-1 text-[10px]">
          <span className="text-up">BUY: {buyPct}%</span>
          <span className="font-semibold text-text">AGGRESSIVE PRESSURE</span>
          <span className="text-down">SELL: {sellPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden flex">
          <div className="bg-up h-full transition-all duration-300" style={{ width: `${buyPct}%` }} />
          <div className="bg-down h-full transition-all duration-300" style={{ width: `${sellPct}%` }} />
        </div>
      </div>

      {/* Trade Tape Table */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#14161a] sticky top-0 text-[10px] uppercase text-muted tracking-wider border-b border-border/60">
            <tr>
              <th className="py-1 px-2 font-normal">Time</th>
              <th className="py-1 px-2 font-normal text-right">Price</th>
              <th className="py-1 px-2 font-normal text-right">Size</th>
              <th className="py-1 px-2 font-normal text-center">Side</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-[11px]">
            {trades.map((t) => {
              const date = new Date(t.timestamp);
              const timeStr = date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0').slice(0, 2);
              return (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="py-0.5 px-2 text-muted">{timeStr}</td>
                  <td className={`py-0.5 px-2 text-right font-medium ${t.side === 'BUY' ? 'text-up' : 'text-down'}`}>
                    {t.price.toFixed(activeInstrument.priceDecimals)}
                  </td>
                  <td className="py-0.5 px-2 text-right text-text">{t.quantity.toFixed(activeInstrument.quantityDecimals)}</td>
                  <td className="py-0.5 px-2 text-center">
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        t.side === 'BUY' ? 'bg-up/20 text-up' : 'bg-down/20 text-down'
                      }`}
                    >
                      {t.side}
                    </span>
                  </td>
                </tr>
              );
            })}
            {trades.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted">
                  Awaiting market executions for {activeInstrument.displaySymbol}...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
