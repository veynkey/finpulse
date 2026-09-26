import { useState, useEffect, useMemo } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import { calculateRSI } from '../utils/indicators';
import PanelHeader from './PanelHeader';
import type { LinkGroup, Candle } from '../types';
import { Activity, Zap } from 'lucide-react';

interface RSIPanelProps {
  defaultGroup?: LinkGroup;
}

interface TimeframeRSI {
  tf: string;
  rsi: number;
  status: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  color: string;
}

export default function RSIPanel({ defaultGroup = 'BLUE' }: RSIPanelProps) {
  const { getSymbolForGroup } = useTerminal();
  const [currentGroup, setCurrentGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(currentGroup);
  const [candles15m, setCandles15m] = useState<Candle[]>([]);
  const [candles1h, setCandles1h] = useState<Candle[]>([]);
  const [candles4h, setCandles4h] = useState<Candle[]>([]);
  const [candles1D, setCandles1D] = useState<Candle[]>([]);

  const symbol = activeInstrument?.symbol || 'BTCUSDT';
  const displaySymbol = symbol.replace('USDT', '/USDT');

  // Load candles across multiple timeframes for the active coin
  useEffect(() => {
    if (!activeInstrument) return;

    setCandles15m(marketData.getHistoricalCandles(activeInstrument.id, '15m'));
    setCandles1h(marketData.getHistoricalCandles(activeInstrument.id, '1h'));
    setCandles4h(marketData.getHistoricalCandles(activeInstrument.id, '4h'));
    setCandles1D(marketData.getHistoricalCandles(activeInstrument.id, '1D'));

    const gen = Date.now();
    const unsub = marketData.subscribeAuthoritativeCandles(
      activeInstrument.id,
      '15m',
      gen,
      (candle) => {
        setCandles15m((prev) => {
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.time === candle.time) {
            return [...prev.slice(0, -1), candle];
          }
          return [...prev, candle];
        });
      }
    );

    return () => unsub();
  }, [activeInstrument.id]);

  // Compute RSI for each timeframe
  const rsiMatrix: TimeframeRSI[] = useMemo(() => {
    const computeVal = (list: Candle[]): number => {
      if (list.length <= 14) return 50;
      const pts = calculateRSI(list, 14);
      return pts.length > 0 ? Math.round(pts[pts.length - 1].value * 10) / 10 : 50;
    };

    const tfs = [
      { tf: '15M', list: candles15m },
      { tf: '1H', list: candles1h },
      { tf: '4H', list: candles4h },
      { tf: '1D', list: candles1D },
    ];

    return tfs.map(({ tf, list }) => {
      const val = computeVal(list);
      let status: TimeframeRSI['status'] = 'NEUTRAL';
      let color = '#848e9c';

      if (val >= 70) {
        status = 'OVERBOUGHT';
        color = '#f6465d';
      } else if (val <= 30) {
        status = 'OVERSOLD';
        color = '#00c087';
      } else if (val >= 55) {
        status = 'BULLISH';
        color = '#38bdf8';
      } else if (val <= 45) {
        status = 'BEARISH';
        color = '#f59e0b';
      }

      return { tf, rsi: val, status, color };
    });
  }, [candles15m, candles1h, candles4h, candles1D]);

  const activeRSI = rsiMatrix[0]?.rsi || 50;

  // Divergence Detection
  const divergenceInfo = useMemo(() => {
    if (candles15m.length < 30) {
      return { type: 'NONE', label: 'TIDAK ADA DIVERGENSI', description: 'Momentum selaras dengan pergerakan harga.' };
    }
    const rsiPoints = calculateRSI(candles15m, 14);
    if (rsiPoints.length < 20) {
      return { type: 'NONE', label: 'TIDAK ADA DIVERGENSI', description: 'Data candle sedang dikumpulkan.' };
    }

    const lastCandle = candles15m[candles15m.length - 1];
    const prevCandle = candles15m[candles15m.length - 10];
    const lastRsi = rsiPoints[rsiPoints.length - 1]?.value || 50;
    const prevRsi = rsiPoints[rsiPoints.length - 10]?.value || 50;

    // Regular Bullish: Price Lower Low, RSI Higher Low
    if (lastCandle.close < prevCandle.close && lastRsi > prevRsi + 3) {
      return {
        type: 'BULLISH',
        label: 'REGULAR BULLISH DIVERGENCE',
        description: 'Harga mencetak lower low namun RSI mencetak higher low (Potensi Reversal Naik).',
      };
    }

    // Regular Bearish: Price Higher High, RSI Lower High
    if (lastCandle.close > prevCandle.close && lastRsi < prevRsi - 3) {
      return {
        type: 'BEARISH',
        label: 'REGULAR BEARISH DIVERGENCE',
        description: 'Harga mencetak higher high namun RSI mencetak lower high (Potensi Reversal Turun).',
      };
    }

    return {
      type: 'CONVERGENT',
      label: 'NORMAL MOMENTUM CONVERGENCE',
      description: 'Struktur harga bergerak searah dengan dorongan osilator momentum.',
    };
  }, [candles15m]);

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-text font-mono select-none overflow-hidden">
      <PanelHeader
        title={`RSI MOMENTUM OSCILLATOR [${displaySymbol}]`}
        linkGroup={currentGroup}
        onLinkGroupChange={setCurrentGroup}
        actions={
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="text-muted">Periode:</span>
            <span className="font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/30">
              14
            </span>
          </div>
        }
      />

      <div className="flex-grow p-3 flex flex-col space-y-3 overflow-y-auto">
        {/* Dynamic Coin Explanation Banner */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white tracking-wider">{displaySymbol}</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                  activeRSI >= 70
                    ? 'bg-[#f6465d]/20 text-[#f6465d]'
                    : activeRSI <= 30
                    ? 'bg-[#00c087]/20 text-[#00c087]'
                    : 'bg-accent/20 text-accent'
                }`}
              >
                RSI 15M: {activeRSI.toFixed(1)}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              Analisis kekuatan tren dan osilasi momentum multi-timeframe untuk instrumen{' '}
              <span className="text-text font-bold">{displaySymbol}</span>.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted uppercase">Status Intraday</div>
            <div
              className="text-xs font-extrabold tracking-wider"
              style={{ color: rsiMatrix[0]?.color || '#848e9c' }}
            >
              {rsiMatrix[0]?.status || 'NEUTRAL'}
            </div>
          </div>
        </div>

        {/* Multi-Timeframe Matrix Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {rsiMatrix.map((item) => (
            <div
              key={item.tf}
              className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex flex-col items-center justify-between shadow-sm"
            >
              <div className="w-full flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-white text-xs">{item.tf}</span>
                <span
                  className="text-[9px] font-bold px-1 rounded uppercase"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  {item.status}
                </span>
              </div>

              {/* Numerical Value */}
              <div className="text-xl font-black my-1" style={{ color: item.color }}>
                {item.rsi.toFixed(1)}
              </div>

              {/* Mini Horizontal Bar Indicator */}
              <div className="w-full bg-[#12151c] h-1.5 rounded-full overflow-hidden border border-border/40 mt-1">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${item.rsi}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Master Gauge View (0 to 100) */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted font-bold flex items-center gap-1">
              <Activity size={11} className="text-accent" />
              RSI SPECTRUM & OVERBOUGHT / OVERSOLD THRESHOLDS
            </span>
            <span className="text-[9px] text-muted">Batas Standar: 30 / 70</span>
          </div>

          <div className="relative w-full h-8 bg-[#12151c] rounded border border-border/40 overflow-hidden flex items-center px-2">
            {/* Zones */}
            <div className="absolute inset-0 flex pointer-events-none text-[8px] font-mono font-bold">
              <div className="w-[30%] bg-[#00c087]/20 border-r border-[#00c087]/40 flex items-center justify-center text-[#00c087]">
                OVERSOLD (&lt;30)
              </div>
              <div className="w-[40%] bg-white/5 border-r border-border/40 flex items-center justify-center text-muted">
                EQUILIBRIUM (30 - 70)
              </div>
              <div className="w-[30%] bg-[#f6465d]/20 flex items-center justify-center text-[#f6465d]">
                OVERBOUGHT (&gt;70)
              </div>
            </div>

            {/* Current RSI Cursor Pointer */}
            <div
              className="absolute top-1 bottom-1 w-2.5 rounded-full z-20 -translate-x-1/2 shadow-lg transition-all duration-300"
              style={{
                left: `${Math.max(2, Math.min(98, activeRSI))}%`,
                backgroundColor: activeRSI >= 70 ? '#f6465d' : activeRSI <= 30 ? '#00c087' : '#38bdf8',
                boxShadow: `0 0 10px ${activeRSI >= 70 ? '#f6465d' : activeRSI <= 30 ? '#00c087' : '#38bdf8'}`,
              }}
            />
          </div>

          <div className="flex justify-between text-[9px] text-muted font-mono px-1">
            <span className="text-[#00c087] font-bold">0 (Ekstrim Jual)</span>
            <span>30 (Oversold)</span>
            <span className="text-white font-bold">50 (Center)</span>
            <span>70 (Overbought)</span>
            <span className="text-[#f6465d] font-bold">100 (Ekstrim Beli)</span>
          </div>
        </div>

        {/* Divergence Detection Summary Card */}
        <div className="bg-[#0b0d13] border border-border/50 rounded-md p-2.5 flex items-start space-x-2 text-[10px] text-muted">
          <Zap
            size={14}
            className={`shrink-0 mt-0.5 ${
              divergenceInfo.type === 'BULLISH'
                ? 'text-[#00c087]'
                : divergenceInfo.type === 'BEARISH'
                ? 'text-[#f6465d]'
                : 'text-accent'
            }`}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold">Deteksi Divergensi {displaySymbol}:</span>
              <span
                className={`font-black text-[9px] px-1.5 py-0.2 rounded uppercase ${
                  divergenceInfo.type === 'BULLISH'
                    ? 'bg-[#00c087]/20 text-[#00c087]'
                    : divergenceInfo.type === 'BEARISH'
                    ? 'bg-[#f6465d]/20 text-[#f6465d]'
                    : 'bg-white/10 text-muted'
                }`}
              >
                {divergenceInfo.label}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">{divergenceInfo.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
