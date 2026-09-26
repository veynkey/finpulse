import { useState, useEffect, useMemo } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData, type TakerFlowStats } from '../services/marketData';
import { marketMirror } from '../services/marketMirror';
import { canonicalizeInstrumentId } from '../services/instruments';
import PanelHeader from './PanelHeader';
import QuickCoinSelector from '../components/QuickCoinSelector';
import type { LinkGroup, Candle } from '../types';
import { BarChart2, Flame, ArrowUpRight, ArrowDownRight, AlertTriangle, Loader2 } from 'lucide-react';

interface VolumeAnalysisPanelProps {
  defaultGroup?: LinkGroup;
}

export default function VolumeAnalysisPanel({ defaultGroup = 'BLUE' }: VolumeAnalysisPanelProps) {
  const { getSymbolForGroup } = useTerminal();
  const [currentGroup, setCurrentGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(currentGroup);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flowStats, setFlowStats] = useState<TakerFlowStats>(() =>
    marketData.getTakerFlowStats(activeInstrument?.id || 'BTC-USDT:BINANCE')
  );

  const symbol = activeInstrument?.symbol || 'BTCUSDT';
  const displaySymbol = symbol.replace('USDT', '/USDT');

  // Load candles and subscribe to authoritative taker flow for active coin
  useEffect(() => {
    if (!activeInstrument) return;
    let isMounted = true;
    setIsLoading(true);

    const initial = marketData.getHistoricalCandles(activeInstrument.id, '15m');
    if (initial.length > 0) {
      setCandles(initial);
      setIsLoading(false);
    }

    // Fetch authoritative historical candles from Binance REST API
    marketData
      .fetchAuthoritativeHistory(activeInstrument.id, '15m')
      .then(() => {
        if (!isMounted) return;
        const fresh = marketData.getHistoricalCandles(activeInstrument.id, '15m');
        if (fresh.length > 0) setCandles(fresh);
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // Synchronize authoritative taker pressure matching OrderFlowPanel
    const unsubFlow = marketData.subscribeTakerFlow(activeInstrument.id, (stats) => {
      if (!isMounted) return;
      setFlowStats(stats);
    });

    // Subscribe to Stale-While-Revalidate mirror cache
    const canonical = canonicalizeInstrumentId(activeInstrument.id);
    const unsubMirror = marketMirror.subscribeCandles((instId, tf, freshCandles) => {
      if (!isMounted) return;
      if (canonicalizeInstrumentId(instId) === canonical && tf === '15m') {
        if (freshCandles.length > 0) {
          setCandles(freshCandles);
          setIsLoading(false);
        }
      }
    });

    const gen = Date.now();
    const unsubCandles = marketData.subscribeAuthoritativeCandles(
      activeInstrument.id,
      '15m',
      gen,
      (candle) => {
        if (!isMounted) return;
        setIsLoading(false);
        setCandles((prev) => {
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.time === candle.time) {
            return [...prev.slice(0, -1), candle];
          }
          return [...prev, candle];
        });
      }
    );

    return () => {
      isMounted = false;
      unsubFlow();
      unsubMirror();
      unsubCandles();
    };
  }, [activeInstrument?.id]);

  // Compute Volume Dynamics & RVOL strictly from authoritative candles
  const volumeStats = useMemo(() => {
    if (candles.length === 0) {
      return {
        rvol: 1.0,
        avgVol20: 0,
        currentVol: 0,
        isSpike: false,
        spikeMultiplier: 1.0,
        volumeTrend: 'CALCULATING',
      };
    }

    const count = Math.min(20, candles.length);
    const recent = candles.slice(-count);
    const avgVol20 = recent.reduce((sum, c) => sum + c.volume, 0) / count;
    const current = recent[recent.length - 1];
    const currentVol = current.volume;

    const rvol = avgVol20 > 0 ? currentVol / avgVol20 : 1.0;
    const isSpike = rvol >= 1.75;

    const volumeTrend =
      rvol >= 2.0
        ? 'EXTREME SURGE'
        : rvol >= 1.4
        ? 'ELEVATED INFLOW'
        : rvol <= 0.6
        ? 'LOW LIQUIDITY'
        : 'STEADY BASELINE';

    return {
      rvol,
      avgVol20,
      currentVol,
      isSpike,
      spikeMultiplier: Math.round(rvol * 10) / 10,
      volumeTrend,
    };
  }, [candles]);

  const { rvol, avgVol20, currentVol, isSpike, spikeMultiplier, volumeTrend } = volumeStats;

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-text font-mono select-none overflow-hidden">
      <PanelHeader
        title={`VOLUME DYNAMICS & FLOW [${displaySymbol}]`}
        linkGroup={currentGroup}
        onLinkGroupChange={setCurrentGroup}
        actions={
          <div className="flex items-center space-x-2 text-[10px]">
            <QuickCoinSelector currentGroup={currentGroup} compact />
            {isSpike && (
              <span className="flex items-center gap-1 bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]/50 px-2 py-0.5 rounded font-bold animate-pulse">
                <Flame size={11} />
                SPIKE {spikeMultiplier}x
              </span>
            )}
            <span className="text-muted hidden md:inline">RVOL:</span>
            <span className={`font-bold ${rvol >= 1.5 ? 'text-[#00c087]' : 'text-text'}`}>
              {rvol.toFixed(2)}x
            </span>
          </div>
        }
      />

      {isLoading && candles.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-3">
          <Loader2 size={24} className="text-accent animate-spin" />
          <div className="text-xs text-white font-bold">Memuat Data Volume Resmi [{displaySymbol}]</div>
          <div className="text-[11px] text-muted max-w-xs">
            Mengunduh volume & taker orderflow real-time dari bursa Binance...
          </div>
        </div>
      ) : (
        <div className="flex-grow p-3 flex flex-col space-y-3 overflow-y-auto">
        {/* Dynamic Coin Explanation Card */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white tracking-wider">{displaySymbol}</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                  isSpike
                    ? 'bg-[#f6465d]/20 text-[#f6465d]'
                    : rvol >= 1.2
                    ? 'bg-[#00c087]/20 text-[#00c087]'
                    : 'bg-surface text-muted'
                }`}
              >
                {volumeTrend}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              Analisis likuiditas transaksi dan tekanan beli vs jual instrumen{' '}
              <span className="text-text font-bold">{displaySymbol}</span> terhadap rata-rata 20 candle.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted uppercase">RVOL 15M</div>
            <div
              className={`text-base font-black tracking-tight ${
                rvol >= 1.5 ? 'text-[#00c087]' : rvol < 0.7 ? 'text-muted' : 'text-accent'
              }`}
            >
              {rvol.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Orderflow Pressure Gauge (Buyer vs Seller Flow) */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted font-bold flex items-center gap-1">
              <BarChart2 size={11} className="text-accent" />
              TAKER ORDERFLOW PRESSURE (BUY VS SELL INTENSITY)
            </span>
            <span className="text-[9px] text-muted">
              Pembeli: <strong className="text-[#00c087]">{flowStats.buyPct}%</strong> | Penjual:{' '}
              <strong className="text-[#f6465d]">{flowStats.sellPct}%</strong>
            </span>
          </div>

          {/* Dual Flow Pressure Bar */}
          <div className="w-full h-4 bg-[#12151c] rounded overflow-hidden flex border border-border/40">
            <div
              className="bg-[#00c087] h-full flex items-center justify-start pl-2 text-[9px] font-extrabold text-black transition-all duration-300"
              style={{ width: `${flowStats.buyPct}%` }}
            >
              {flowStats.buyPct > 20 && `${flowStats.buyPct}%`}
            </div>
            <div
              className="bg-[#f6465d] h-full flex items-center justify-end pr-2 text-[9px] font-extrabold text-white transition-all duration-300"
              style={{ width: `${flowStats.sellPct}%` }}
            >
              {flowStats.sellPct > 20 && `${flowStats.sellPct}%`}
            </div>
          </div>

          <div className="flex justify-between text-[9px] text-muted font-mono">
            <span className="flex items-center gap-0.5 text-[#00c087] font-bold">
              <ArrowUpRight size={10} /> Dominasi Beli (Aggressive Buyers: {flowStats.buyVol.toFixed(2)})
            </span>
            <span className="flex items-center gap-0.5 text-[#f6465d] font-bold">
              Dominasi Jual (Aggressive Sellers: {flowStats.sellVol.toFixed(2)}) <ArrowDownRight size={10} />
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Volume Bar Saat Ini</div>
            <div className="text-xs font-bold text-white mt-0.5">{Math.round(currentVol).toLocaleString()}</div>
          </div>
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Rata-Rata 20 Bar</div>
            <div className="text-xs font-bold text-accent mt-0.5">{Math.round(avgVol20).toLocaleString()}</div>
          </div>
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Volume 24H Kumulatif</div>
            <div className="text-xs font-bold text-white mt-0.5">
              {Math.round(candles.slice(-96).reduce((acc, c) => acc + c.volume, 0)).toLocaleString()}
            </div>
          </div>
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Anomali Volume</div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                isSpike ? 'text-[#f6465d] font-black' : 'text-[#00c087]'
              }`}
            >
              {isSpike ? `LONJAKAN AKTIF (${spikeMultiplier}x)` : 'NORMAL'}
            </div>
          </div>
        </div>

        {/* Volume Context Insight */}
        <div className="bg-[#0b0d13] border border-border/50 rounded-md p-2.5 flex items-start space-x-2 text-[10px] text-muted">
          <AlertTriangle
            size={14}
            className={`shrink-0 mt-0.5 ${isSpike ? 'text-[#f6465d]' : 'text-accent'}`}
          />
          <div>
            <span className="text-white font-bold">Kondisi Likuiditas & Aliran Dana {displaySymbol}: </span>
            {isSpike ? (
              <span>
                Terdeteksi lonjakan volume abnormal ({spikeMultiplier}x lipat dari rata-rata). Ini mengindikasikan adanya institusi atau order besar yang masuk ke pasar secara agresif. Waspadai kelanjutan breakout atau potensi absorption trap.
              </span>
            ) : (
              <span>
                Aliran dana berjalan stabil mendekati volume rata-rata berkala. Likuiditas pasar memadai untuk eksekusi tanpa selip harga berlebih.
              </span>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
