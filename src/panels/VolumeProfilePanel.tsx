import { useState, useMemo, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import type { LinkGroup, Candle } from '../types';
import PanelHeader from './PanelHeader';
import { Layers } from 'lucide-react';

interface VolumeBucket {
  price: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export default function VolumeProfilePanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('15m');
  const [bucketCount, setBucketCount] = useState<number>(36);
  const [candles, setCandles] = useState<Candle[]>([]);

  const activeInstrument = getSymbolForGroup(linkGroup);

  // Fetch candles
  useEffect(() => {
    const data = marketData.getHistoricalCandles(activeInstrument.id, timeframe);
    setCandles(data);
  }, [activeInstrument.id, timeframe]);

  // Compute Volume Profile
  const profile = useMemo(() => {
    if (!candles || candles.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalVol = 0;

    for (const c of candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      totalVol += c.volume;
    }

    if (minPrice >= maxPrice || totalVol <= 0) return null;

    const priceRange = maxPrice - minPrice;
    const bucketSize = priceRange / bucketCount;

    const buckets: VolumeBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
      price: minPrice + (i + 0.5) * bucketSize,
      totalVolume: 0,
      buyVolume: 0,
      sellVolume: 0,
      isPoc: false,
      isValueArea: false,
    }));

    for (const c of candles) {
      const idx = Math.min(Math.floor((c.close - minPrice) / bucketSize), bucketCount - 1);
      const isUp = c.close >= c.open;
      if (idx >= 0 && idx < bucketCount) {
        buckets[idx].totalVolume += c.volume;
        if (isUp) {
          buckets[idx].buyVolume += c.volume * 0.65;
          buckets[idx].sellVolume += c.volume * 0.35;
        } else {
          buckets[idx].buyVolume += c.volume * 0.35;
          buckets[idx].sellVolume += c.volume * 0.65;
        }
      }
    }

    // Find Point of Control (POC)
    let maxBucketVol = 0;
    let pocIdx = 0;
    for (let i = 0; i < bucketCount; i++) {
      if (buckets[i].totalVolume > maxBucketVol) {
        maxBucketVol = buckets[i].totalVolume;
        pocIdx = i;
      }
    }
    buckets[pocIdx].isPoc = true;

    // Find Value Area (70% of total volume around POC)
    const targetValueAreaVol = totalVol * 0.7;
    let currentVaVol = maxBucketVol;
    buckets[pocIdx].isValueArea = true;

    let upperIdx = pocIdx;
    let lowerIdx = pocIdx;

    while (currentVaVol < targetValueAreaVol && (upperIdx < bucketCount - 1 || lowerIdx > 0)) {
      const nextUpperVol = upperIdx + 1 < bucketCount ? buckets[upperIdx + 1].totalVolume : 0;
      const nextLowerVol = lowerIdx - 1 >= 0 ? buckets[lowerIdx - 1].totalVolume : 0;

      if (nextUpperVol >= nextLowerVol && upperIdx + 1 < bucketCount) {
        upperIdx++;
        currentVaVol += buckets[upperIdx].totalVolume;
        buckets[upperIdx].isValueArea = true;
      } else if (lowerIdx - 1 >= 0) {
        lowerIdx--;
        currentVaVol += buckets[lowerIdx].totalVolume;
        buckets[lowerIdx].isValueArea = true;
      } else {
        break;
      }
    }

    const pocPrice = buckets[pocIdx].price;
    const vahPrice = buckets[upperIdx].price;
    const valPrice = buckets[lowerIdx].price;

    return {
      buckets,
      maxBucketVol: Math.max(1, maxBucketVol),
      pocPrice,
      vahPrice,
      valPrice,
      totalVol,
    };
  }, [candles, bucketCount]);

  return (
    <div className="flex flex-col h-full bg-[#090a0d] text-xs font-mono select-none">
      <PanelHeader
        title={`VOLUME PROFILE [${activeInstrument.displaySymbol}]`}
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-1.5 text-[10px]">
            {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  timeframe === tf ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
                }`}
              >
                {tf}
              </button>
            ))}
            <div className="w-[1px] h-3 bg-border/40" />
            <select
              value={bucketCount}
              onChange={(e) => setBucketCount(Number(e.target.value))}
              aria-label="Profile row count"
              className="bg-surface text-text border border-border/50 rounded px-1 py-0.5 text-[10px] focus:outline-none"
            >
              <option value={24}>24 Rows</option>
              <option value={36}>36 Rows</option>
              <option value={48}>48 Rows</option>
            </select>
          </div>
        }
      />

      {/* Value Area / POC Metrics Ribbon */}
      {profile && (
        <div className="h-6 bg-[#111317] border-b border-border/40 px-3 flex items-center justify-between text-[10px] shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-muted">
              VAH:{' '}
              <span className="text-up font-bold">
                {profile.vahPrice.toFixed(activeInstrument.priceDecimals)}
              </span>
            </span>
            <span className="text-muted">
              POC:{' '}
              <span className="text-warning font-bold">
                {profile.pocPrice.toFixed(activeInstrument.priceDecimals)}
              </span>
            </span>
            <span className="text-muted">
              VAL:{' '}
              <span className="text-down font-bold">
                {profile.valPrice.toFixed(activeInstrument.priceDecimals)}
              </span>
            </span>
          </div>
          <div className="text-muted">
            TOTAL VOL: <span className="text-text font-bold">{Math.round(profile.totalVol).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Histogram Viewport */}
      <div className="flex-grow p-2 overflow-y-auto min-h-0 flex flex-col justify-between">
        {!profile || profile.buckets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted">
            <Layers size={14} className="mr-1.5 animate-pulse" />
            Aggregating Volume Profile...
          </div>
        ) : (
          <div className="flex flex-col space-y-[2px] h-full justify-evenly">
            {profile.buckets.slice().reverse().map((b, i) => {
              const buyPct = (b.buyVolume / profile.maxBucketVol) * 100;
              const sellPct = (b.sellVolume / profile.maxBucketVol) * 100;

              return (
                <div
                  key={i}
                  className={`flex items-center h-[14px] text-[9px] px-1 rounded transition-colors ${
                    b.isPoc
                      ? 'bg-warning/15 font-bold border-l-2 border-warning'
                      : b.isValueArea
                      ? 'bg-surface/50 border-l border-accent/40'
                      : 'opacity-70'
                  }`}
                >
                  {/* Price Tag */}
                  <div
                    className={`w-16 shrink-0 truncate ${
                      b.isPoc ? 'text-warning font-bold' : b.isValueArea ? 'text-text' : 'text-muted'
                    }`}
                  >
                    {b.price.toFixed(activeInstrument.priceDecimals)}
                  </div>

                  {/* Volume Bar Visualizer */}
                  <div className="flex-grow flex items-center h-2 bg-background/50 rounded overflow-hidden mx-1.5 relative">
                    {/* Buy Vol */}
                    <div
                      style={{ width: `${Math.min(buyPct, 50)}%` }}
                      className="h-full bg-up/70"
                      title={`Buy Vol: ${Math.round(b.buyVolume)}`}
                    />
                    {/* Sell Vol */}
                    <div
                      style={{ width: `${Math.min(sellPct, 50)}%` }}
                      className="h-full bg-down/70"
                      title={`Sell Vol: ${Math.round(b.sellVolume)}`}
                    />
                  </div>

                  {/* Volume Label & POC marker */}
                  <div className="w-14 text-right shrink-0 text-muted">
                    {b.isPoc ? (
                      <span className="text-warning font-bold">POC</span>
                    ) : (
                      Math.round(b.totalVolume).toLocaleString()
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
