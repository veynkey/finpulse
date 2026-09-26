import { useState, useEffect, useMemo } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import { marketMirror } from '../services/marketMirror';
import { canonicalizeInstrumentId } from '../services/instruments';
import { calculateEMA, calculateSMA } from '../utils/indicators';
import PanelHeader from './PanelHeader';
import QuickCoinSelector from '../components/QuickCoinSelector';
import type { LinkGroup, Candle } from '../types';
import { TrendingUp, TrendingDown, Activity, Compass, Loader2, ShieldCheck } from 'lucide-react';

interface TrendDirectionPanelProps {
  defaultGroup?: LinkGroup;
}

interface TrendMetric {
  key: string;
  name: string;
  fullName: string;
  timeframe: string;
  isPositive: boolean;
  score: number; // 0 to 100
  label: string;
  description: string;
}

export default function TrendDirectionPanel({ defaultGroup = 'BLUE' }: TrendDirectionPanelProps) {
  const { getSymbolForGroup } = useTerminal();
  const [currentGroup, setCurrentGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(currentGroup);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candles1D, setCandles1D] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const symbol = activeInstrument?.symbol || 'BTCUSDT';
  const displaySymbol = symbol.replace('USDT', '/USDT');

  // Load candles for active coin with authoritative exchange fetching
  useEffect(() => {
    if (!activeInstrument) return;
    let isMounted = true;
    setIsLoading(true);

    const initial15m = marketData.getHistoricalCandles(activeInstrument.id, '15m');
    const initial1D = marketData.getHistoricalCandles(activeInstrument.id, '1D');
    if (initial15m.length > 0) {
      setCandles(initial15m);
      setIsLoading(false);
    }
    if (initial1D.length > 0) setCandles1D(initial1D);

    // Fetch authoritative historical candles from Binance REST API
    Promise.all([
      marketData.fetchAuthoritativeHistory(activeInstrument.id, '15m'),
      marketData.fetchAuthoritativeHistory(activeInstrument.id, '1D'),
    ])
      .then(() => {
        if (!isMounted) return;
        const fresh15m = marketData.getHistoricalCandles(activeInstrument.id, '15m');
        const fresh1D = marketData.getHistoricalCandles(activeInstrument.id, '1D');
        if (fresh15m.length > 0) setCandles(fresh15m);
        if (fresh1D.length > 0) setCandles1D(fresh1D);
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // Subscribe to Stale-While-Revalidate mirror cache
    const canonical = canonicalizeInstrumentId(activeInstrument.id);
    const unsubMirror = marketMirror.subscribeCandles((instId, tf, freshCandles) => {
      if (!isMounted) return;
      if (canonicalizeInstrumentId(instId) === canonical) {
        if (tf === '15m' && freshCandles.length > 0) {
          setCandles(freshCandles);
          setIsLoading(false);
        }
        if (tf === '1D' && freshCandles.length > 0) {
          setCandles1D(freshCandles);
        }
      }
    });

    // Real-time authoritative kline stream subscriber
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
      unsubMirror();
      unsubCandles();
    };
  }, [activeInstrument?.id]);

  // Compute trend metrics for LTTD, MID, MACRO, STTD from real candles
  const metrics: TrendMetric[] = useMemo(() => {
    if (candles.length === 0) return [];

    const list = candles;
    const listDaily = candles1D.length > 0 ? candles1D : candles;

    const lastPrice = list[list.length - 1].close;
    const firstPrice = list[0].close;
    const change24h = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    // 1. MACRO (Macro Trend Direction: Daily/Weekly horizon based on Daily SMA20/SMA50 or 15m EMA100)
    let macroPositive = true;
    let macroScore = 50;
    if (listDaily.length >= 20) {
      const sma = calculateSMA(listDaily, Math.min(50, listDaily.length));
      const lastSma = sma.length > 0 ? sma[sma.length - 1].value : lastPrice;
      macroPositive = lastPrice >= lastSma;
      const diffPct = Math.abs((lastPrice - lastSma) / lastSma) * 100;
      macroScore = Math.min(100, Math.max(10, Math.round(diffPct * 12 + 50)));
    } else {
      macroPositive = change24h >= 0;
      const momentumPct = Math.min(5, Math.abs(change24h));
      macroScore = Math.min(100, Math.max(10, Math.round(momentumPct * 10 + 50)));
    }

    // 2. LTTD (Long-Term Trend Direction: Daily EMA20 or 15m EMA50)
    let lttdPositive = true;
    let lttdScore = 50;
    if (listDaily.length >= 10) {
      const ema = calculateEMA(listDaily, Math.min(20, listDaily.length));
      const lastEma = ema.length > 0 ? ema[ema.length - 1].value : lastPrice;
      lttdPositive = lastPrice >= lastEma;
      const diffPct = Math.abs((lastPrice - lastEma) / lastEma) * 100;
      lttdScore = Math.min(100, Math.max(15, Math.round(diffPct * 15 + 50)));
    } else if (list.length >= 30) {
      const ema50 = calculateEMA(list, 30);
      const lastEma50 = ema50.length > 0 ? ema50[ema50.length - 1].value : lastPrice;
      lttdPositive = lastPrice >= lastEma50;
      const diffPct = Math.abs((lastPrice - lastEma50) / lastEma50) * 100;
      lttdScore = Math.min(100, Math.max(15, Math.round(diffPct * 20 + 50)));
    } else {
      lttdPositive = change24h >= 0;
      lttdScore = 50;
    }

    // 3. MID (Mid-Term Trend Direction: 15m EMA21 & EMA50)
    let midPositive = true;
    let midScore = 50;
    if (list.length >= 21) {
      const ema21 = calculateEMA(list, 21);
      const ema50 = calculateEMA(list, Math.min(50, list.length));
      const lastEma21 = ema21.length > 0 ? ema21[ema21.length - 1].value : lastPrice;
      const lastEma50 = ema50.length > 0 ? ema50[ema50.length - 1].value : lastPrice;
      midPositive = lastEma21 >= lastEma50;
      const spread = Math.abs((lastEma21 - lastEma50) / lastEma50) * 100;
      midScore = Math.min(100, Math.max(20, Math.round(spread * 35 + 50)));
    } else {
      midPositive = change24h >= 0;
      midScore = 50;
    }

    // 4. STTD (Short-Term Tactical Trend Direction: 15m EMA9 & Immediate Price Action)
    let sttdPositive = true;
    let sttdScore = 50;
    if (list.length >= 9) {
      const ema9 = calculateEMA(list, 9);
      const lastEma9 = ema9.length > 0 ? ema9[ema9.length - 1].value : lastPrice;
      sttdPositive = lastPrice >= lastEma9;
      const mom = Math.abs((lastPrice - lastEma9) / lastEma9) * 100;
      sttdScore = Math.min(100, Math.max(25, Math.round(mom * 50 + 50)));
    } else {
      sttdPositive = change24h > 0;
      sttdScore = 50;
    }

    return [
      {
        key: 'MACRO',
        name: 'MACRO',
        fullName: 'Macro Regime (1D/1W)',
        timeframe: '1D / 1W',
        isPositive: macroPositive,
        score: macroScore,
        label: macroPositive ? 'BULLISH REGIME' : 'BEARISH REGIME',
        description: macroPositive
          ? 'Harga di atas baseline structural long-term.'
          : 'Harga di bawah baseline structural long-term.',
      },
      {
        key: 'LTTD',
        name: 'LTTD',
        fullName: 'Long-Term Trend Direction',
        timeframe: 'Daily / 4H',
        isPositive: lttdPositive,
        score: lttdScore,
        label: lttdPositive ? 'STRONG BULL' : 'BEAR EXPANSION',
        description: lttdPositive
          ? 'EMA menopang tren naik jangka panjang.'
          : 'Tekanan jual menembus EMA jangka panjang.',
      },
      {
        key: 'MID',
        name: 'MID',
        fullName: 'Mid-Term Trend Direction',
        timeframe: '4H / 1H',
        isPositive: midPositive,
        score: midScore,
        label: midPositive ? 'ACCUMULATION UP' : 'DISTRIBUTION DOWN',
        description: midPositive
          ? 'EMA21 di atas EMA50 mengonfirmasi tren menengah naik.'
          : 'EMA21 di bawah EMA50 mengonfirmasi tren menengah turun.',
      },
      {
        key: 'STTD',
        name: 'STTD',
        fullName: 'Short-Term Tactical Trend',
        timeframe: '15M / 5M',
        isPositive: sttdPositive,
        score: sttdScore,
        label: sttdPositive ? 'TACTICAL EXPANSION' : 'TACTICAL PULLBACK',
        description: sttdPositive
          ? 'Momentum jangka pendek mendorong harga di atas EMA9.'
          : 'Momentum jangka pendek melemah di bawah EMA9.',
      },
    ];
  }, [candles, candles1D]);

  const bullishCount = metrics.filter((m) => m.isPositive).length;
  const overallConfluence =
    bullishCount === 4
      ? 'FULL BULLISH CONFLUENCE (4/4)'
      : bullishCount === 3
      ? 'MODERATE BULLISH BIAS (3/4)'
      : bullishCount === 2
      ? 'MIXED REGIME / CHOPPY (2/4)'
      : bullishCount === 1
      ? 'MODERATE BEARISH BIAS (1/4)'
      : 'FULL BEARISH CONFLUENCE (0/4)';

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-text font-mono select-none overflow-hidden">
      <PanelHeader
        title={`TREND DIRECTION [${displaySymbol}]`}
        linkGroup={currentGroup}
        onLinkGroupChange={setCurrentGroup}
        actions={
          <div className="flex items-center space-x-2 text-[10px]">
            <QuickCoinSelector currentGroup={currentGroup} compact />
            <span className="flex items-center gap-1 bg-[#12151c] px-2 py-0.5 rounded border border-border/60 hidden md:inline-flex">
              <Compass size={11} className="text-accent" />
              <span className="text-muted">Koin:</span>
              <span className="text-accent font-bold">{displaySymbol}</span>
            </span>
          </div>
        }
      />

      {isLoading && candles.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-3">
          <Loader2 size={24} className="text-accent animate-spin" />
          <div className="text-xs text-white font-bold">Memuat Data Tren Resmi [{displaySymbol}]</div>
          <div className="text-[11px] text-muted max-w-xs">
            Mengunduh lilin bursa Binance untuk menghitung orientasi vektor tren MACRO, LTTD, MID, dan STTD...
          </div>
        </div>
      ) : (
        <div className="flex-grow p-3 flex flex-col space-y-3 overflow-y-auto">
          {/* Dynamic Coin Explanation Banner */}
          <div className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                bullishCount >= 3
                  ? 'bg-[#00c087]/20 text-[#00c087] border border-[#00c087]/50'
                  : bullishCount <= 1
                  ? 'bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]/50'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              }`}
            >
              {bullishCount >= 3 ? (
                <TrendingUp size={15} />
              ) : bullishCount <= 1 ? (
                <TrendingDown size={15} />
              ) : (
                <Activity size={15} />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white tracking-wider">{displaySymbol}</span>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                    bullishCount >= 3
                      ? 'bg-[#00c087]/20 text-[#00c087]'
                      : bullishCount <= 1
                      ? 'bg-[#f6465d]/20 text-[#f6465d]'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {overallConfluence}
                </span>
              </div>
              <p className="text-[10px] text-muted mt-0.5">
                Indikator mengukur orientasi vektor arah tren dari 4 timeframe untuk aset{' '}
                <span className="text-text font-bold">{displaySymbol}</span> secara real-time.
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted uppercase">Harga Terkini</div>
            <div className="text-xs font-bold text-white">
              ${(candles[candles.length - 1]?.close || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* 4 Circular Visual Gauges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-grow">
          {metrics.map((m) => {
            const fillColor = m.isPositive ? '#00c087' : '#f6465d';
            const radius = 38;
            const strokeWidth = 7;
            const circumference = 2 * Math.PI * radius;
            // Fully filled when positive or negative
            const strokeDashoffset = circumference - (m.score / 100) * circumference;

            return (
              <div
                key={m.key}
                className="bg-[#0b0d13] border border-border/60 hover:border-border rounded-md p-3 flex flex-col items-center justify-between transition-colors shadow-sm relative group"
              >
                {/* Gauge Header */}
                <div className="w-full flex items-center justify-between text-[10px] mb-1">
                  <span className="font-extrabold tracking-widest text-white text-xs">{m.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted font-mono">
                    {m.timeframe}
                  </span>
                </div>

                {/* Circular Graphic (Bulat Berbentuk Graphic) */}
                <div className="relative my-2 w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Background Ring Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="text-white/5"
                      strokeWidth={strokeWidth}
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Glowing Filled Ring */}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      stroke={fillColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill={m.isPositive ? 'rgba(0, 192, 135, 0.12)' : 'rgba(246, 70, 93, 0.12)'}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  {/* Inner Circular Value Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span
                      className="text-lg font-black tracking-tight"
                      style={{ color: fillColor }}
                    >
                      {m.isPositive ? '+' : '-'}{m.score}%
                    </span>
                    <span
                      className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
                      style={{
                        backgroundColor: m.isPositive ? 'rgba(0, 192, 135, 0.2)' : 'rgba(246, 70, 93, 0.2)',
                        color: fillColor,
                      }}
                    >
                      {m.isPositive ? 'BULL' : 'BEAR'}
                    </span>
                  </div>
                </div>

                {/* Subtitle & Direction Status */}
                <div className="w-full text-center mt-1">
                  <div className="text-[10px] font-bold text-white truncate" title={m.fullName}>
                    {m.fullName}
                  </div>
                  <div className="text-[9px] text-muted mt-0.5 line-clamp-1" title={m.description}>
                    {m.description}
                  </div>
                </div>

                {/* Bottom Status Tag */}
                <div
                  className="w-full mt-2 py-1 rounded text-center text-[9px] font-extrabold tracking-wider uppercase border"
                  style={{
                    borderColor: m.isPositive ? 'rgba(0, 192, 135, 0.3)' : 'rgba(246, 70, 93, 0.3)',
                    backgroundColor: m.isPositive ? 'rgba(0, 192, 135, 0.08)' : 'rgba(246, 70, 93, 0.08)',
                    color: fillColor,
                  }}
                >
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quant Insight Summary */}
        <div className="bg-[#0b0d13] border border-border/50 rounded-md p-2 flex items-center justify-between text-[10px] text-muted">
          <div className="flex items-center space-x-2">
            <ShieldCheck size={13} className="text-accent" />
            <span>
              Konfirmasi Vektor Tren: Lingkaran hijau penuh menandakan dorongan buyer dominan di timeframe terkait.
            </span>
          </div>
          <div className="text-text font-bold">
            Status: <span className={bullishCount >= 2 ? 'text-[#00c087]' : 'text-[#f6465d]'}>{overallConfluence}</span>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
