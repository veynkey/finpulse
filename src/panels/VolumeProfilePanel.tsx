import { useState, useMemo, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import type { LinkGroup, Candle } from '../types';
import PanelHeader from './PanelHeader';
import { Layers, Clock } from 'lucide-react';

interface VolumeBucket {
  price: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export type LookbackRange = '24H' | '48H' | '7D' | 'ALL';

export default function VolumeProfilePanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('1h');
  const [lookback, setLookback] = useState<LookbackRange>('24H');
  const [bucketCount, setBucketCount] = useState<number>(36);
  const [candles, setCandles] = useState<Candle[]>([]);

  const activeInstrument = getSymbolForGroup(linkGroup);

  // Fetch candles and subscribe to live candle updates
  useEffect(() => {
    let isMounted = true;
    const initialData = marketData.getHistoricalCandles(activeInstrument.id, timeframe);
    if (initialData.length > 0) {
      setCandles(initialData);
    } else {
      marketData.fetchAuthoritativeHistory(activeInstrument.id, timeframe).then((fresh) => {
        if (isMounted && fresh && fresh.length > 0) {
          setCandles(fresh);
        }
      });
    }

    const unsubCandle = marketData.subscribeCandles(activeInstrument.id, timeframe, (candle: Candle) => {
      setCandles((prev) => {
        if (!prev || prev.length === 0) return [candle];
        const last = prev[prev.length - 1];
        if (last.time === candle.time) {
          return [...prev.slice(0, -1), candle];
        } else if (candle.time > last.time) {
          return [...prev, candle];
        }
        return prev;
      });
    });

    return () => {
      isMounted = false;
      unsubCandle();
    };
  }, [activeInstrument.id, timeframe]);

  // Filter candles based on chosen lookback period
  const filteredCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    if (lookback === 'ALL') return candles;

    const nowSec = Math.floor(Date.now() / 1000);
    const hours = lookback === '24H' ? 24 : lookback === '48H' ? 48 : 24 * 7;
    const cutoffSec = nowSec - hours * 3600;

    const subset = candles.filter((c) => c.time >= cutoffSec);
    // If subset is too sparse (e.g. newly loaded data), fallback to recent count
    if (subset.length < 5 && candles.length >= 5) {
      const minCount = lookback === '24H' ? 24 : lookback === '48H' ? 48 : candles.length;
      return candles.slice(-minCount);
    }
    return subset.length > 0 ? subset : candles;
  }, [candles, lookback]);

  // Timing summary information (from when until now)
  const rangeInfo = useMemo(() => {
    if (!filteredCandles || filteredCandles.length === 0) return null;
    const first = filteredCandles[0];
    const last = filteredCandles[filteredCandles.length - 1];

    const startDate = new Date(first.time * 1000);
    const endDate = new Date(last.time * 1000);

    const nowSec = Math.floor(Date.now() / 1000);
    const elapsedSec = Math.max(0, nowSec - first.time);
    const elapsedHours = Math.round(elapsedSec / 3600);
    const elapsedDays = (elapsedHours / 24).toFixed(1);

    const formatDt = (d: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = d.getDate().toString().padStart(2, '0');
      const mon = months[d.getMonth()];
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${day} ${mon} ${h}:${m}`;
    };

    let elapsedLabel = '';
    if (elapsedHours < 1) {
      const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));
      elapsedLabel = `${elapsedMin} menit yang lalu`;
    } else if (elapsedHours < 24) {
      elapsedLabel = `${elapsedHours} jam yang lalu`;
    } else {
      elapsedLabel = `${elapsedDays} hari (${elapsedHours} jam) yang lalu`;
    }

    return {
      startTimeStr: formatDt(startDate),
      endTimeStr: formatDt(endDate),
      elapsedHours,
      elapsedDays,
      elapsedLabel,
      candleCount: filteredCandles.length,
    };
  }, [filteredCandles]);

  // Compute Volume Profile over filtered candle subset
  const profile = useMemo(() => {
    if (!filteredCandles || filteredCandles.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalVol = 0;
    let totalBuyVol = 0;
    let totalSellVol = 0;

    for (const c of filteredCandles) {
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

    for (const c of filteredCandles) {
      const idx = Math.min(Math.floor((c.close - minPrice) / bucketSize), bucketCount - 1);
      if (idx >= 0 && idx < bucketCount) {
        buckets[idx].totalVolume += c.volume;
        // Use authentic taker buy volume from Binance klines
        const buyVol = c.takerBuyVolume !== undefined
          ? c.takerBuyVolume
          : (c.close >= c.open ? c.volume * 0.5 : c.volume * 0.5);
        const sellVol = Math.max(0, c.volume - buyVol);
        buckets[idx].buyVolume += buyVol;
        buckets[idx].sellVolume += sellVol;
        totalBuyVol += buyVol;
        totalSellVol += sellVol;
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

    const buyPct = totalVol > 0 ? (totalBuyVol / totalVol) * 100 : 50;
    const sellPct = totalVol > 0 ? (totalSellVol / totalVol) * 100 : 50;

    return {
      buckets,
      maxBucketVol: Math.max(1, maxBucketVol),
      pocPrice,
      vahPrice,
      valPrice,
      totalVol,
      totalBuyVol,
      totalSellVol,
      buyPct,
      sellPct,
    };
  }, [filteredCandles, bucketCount]);

  const baseAsset = useMemo(() => {
    const raw = activeInstrument?.displaySymbol || activeInstrument?.symbol || 'BTC';
    return raw.replace(/[-/]?USDT.*$/i, '').replace(/[-/]?USD.*$/i, '') || 'Unit';
  }, [activeInstrument?.displaySymbol, activeInstrument?.symbol]);

  const formatVol = (num: number) => {
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return Math.round(num).toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-[#090a0d] text-xs font-mono select-none">
      <PanelHeader
        title={`VOLUME PROFILE [${activeInstrument.displaySymbol}]`}
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-1.5 text-[10px] flex-wrap gap-y-1">
            {/* Timeframe switch */}
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

            {/* Lookback Range Selector */}
            {(['24H', '48H', '7D', 'ALL'] as const).map((lb) => (
              <button
                key={lb}
                type="button"
                onClick={() => setLookback(lb)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  lookback === lb
                    ? 'bg-white/20 text-white font-bold border border-white/30'
                    : 'text-muted hover:text-text'
                }`}
                title={`Rentang analisis: ${
                  lb === '24H'
                    ? '24 Jam Terakhir'
                    : lb === '48H'
                    ? '48 Jam Terakhir'
                    : lb === '7D'
                    ? '7 Hari Terakhir'
                    : 'Semua Riwayat'
                }`}
              >
                {lb}
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
          <div className="flex items-center space-x-3 text-muted">
            <span>
              BUY: <span className="text-up font-bold">{profile.buyPct.toFixed(1)}%</span>
            </span>
            <span>
              SELL: <span className="text-down font-bold">{profile.sellPct.toFixed(1)}%</span>
            </span>
            <span>
              TOTAL: <span className="text-text font-bold">{formatVol(profile.totalVol)}</span>
            </span>
          </div>
        </div>
      )}

      {/* Time Range & Narrative Explanation Banner */}
      {profile && rangeInfo && (
        <div className="bg-[#10131a] border-b border-border/40 px-3 py-2 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-text font-semibold">
              <Clock size={12} className="text-accent shrink-0" />
              <span>
                Rentang: {lookback === 'ALL' ? 'Semua Riwayat' : lookback} ({rangeInfo.elapsedLabel} s/d Sekarang)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              <span>{rangeInfo.startTimeStr} - {rangeInfo.endTimeStr}</span>
              <span className="px-1.5 py-0.5 rounded bg-surface border border-border/40 text-text font-bold text-[9px]">
                {rangeInfo.candleCount} candle ({timeframe})
              </span>
            </div>
          </div>

          <div className="text-[10px] text-muted leading-relaxed bg-[#0c0e14] p-2 rounded border border-white/5">
            Volume profile diakumulasi sejak <span className="text-text font-bold">{rangeInfo.elapsedLabel} ({rangeInfo.startTimeStr})</span> sampai saat ini dengan total volume <span className="text-text font-bold">{formatVol(profile.totalVol)} {baseAsset}</span>. Komposisi transaksi: <span className="text-up font-bold">{profile.buyPct.toFixed(1)}% Beli ({formatVol(profile.totalBuyVol)})</span> vs <span className="text-down font-bold">{profile.sellPct.toFixed(1)}% Jual ({formatVol(profile.totalSellVol)})</span>, dengan volume terpadat (POC) di level <span className="text-warning font-bold">${profile.pocPrice.toFixed(activeInstrument.priceDecimals)}</span>.
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
