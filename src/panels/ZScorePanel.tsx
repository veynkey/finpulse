import { useState, useEffect, useMemo } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import PanelHeader from './PanelHeader';
import type { LinkGroup, Candle } from '../types';
import { AlertCircle, ArrowRightLeft } from 'lucide-react';

interface ZScorePanelProps {
  defaultGroup?: LinkGroup;
}

export default function ZScorePanel({ defaultGroup = 'BLUE' }: ZScorePanelProps) {
  const { getSymbolForGroup } = useTerminal();
  const [currentGroup, setCurrentGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(currentGroup);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState<number>(20);

  const symbol = activeInstrument?.symbol || 'BTCUSDT';
  const displaySymbol = symbol.replace('USDT', '/USDT');

  // Load candle data for the active coin
  useEffect(() => {
    if (!activeInstrument) return;
    const data = marketData.getHistoricalCandles(activeInstrument.id, '15m');
    setCandles(data);

    const gen = Date.now();
    const unsub = marketData.subscribeAuthoritativeCandles(
      activeInstrument.id,
      '15m',
      gen,
      (candle) => {
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

    return () => unsub();
  }, [activeInstrument.id]);

  // Compute Price and Volume Z-Score
  const zScoreStats = useMemo(() => {
    if (candles.length < period) {
      const fallbackPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
      return {
        priceZ: 0,
        volumeZ: 0,
        meanPrice: fallbackPrice,
        stdDevPrice: 1,
        meanVol: 100,
        stdDevVol: 1,
        currentPrice: fallbackPrice,
        currentVol: 0,
        distribution: [],
      };
    }

    const slice = candles.slice(-period);
    const prices = slice.map((c) => c.close);
    const volumes = slice.map((c) => c.volume);

    // Price Mean & StdDev
    const meanPrice = prices.reduce((a, b) => a + b, 0) / period;
    const priceVariance = prices.reduce((a, b) => a + Math.pow(b - meanPrice, 2), 0) / period;
    const stdDevPrice = Math.sqrt(priceVariance) || 0.0001;

    const currentPrice = prices[prices.length - 1];
    const priceZ = (currentPrice - meanPrice) / stdDevPrice;

    // Volume Mean & StdDev
    const meanVol = volumes.reduce((a, b) => a + b, 0) / period;
    const volVariance = volumes.reduce((a, b) => a + Math.pow(b - meanVol, 2), 0) / period;
    const stdDevVol = Math.sqrt(volVariance) || 0.0001;

    const currentVol = volumes[volumes.length - 1];
    const volumeZ = (currentVol - meanVol) / stdDevVol;

    // Distribution series for mini histogram
    const recentZ = candles.slice(-40).map((c, idx, arr) => {
      if (idx < period) return 0;
      const sub = arr.slice(idx - period, idx);
      const m = sub.reduce((a, b) => a + b.close, 0) / period;
      const v = Math.sqrt(sub.reduce((a, b) => a + Math.pow(b.close - m, 2), 0) / period) || 1;
      return (c.close - m) / v;
    });

    return {
      priceZ,
      volumeZ,
      meanPrice,
      stdDevPrice,
      meanVol,
      stdDevVol,
      currentPrice,
      currentVol,
      distribution: recentZ,
    };
  }, [candles, period, activeInstrument]);

  const { priceZ, volumeZ, meanPrice, stdDevPrice, currentPrice } = zScoreStats;

  // Evaluation & Mean Reversion Signal
  const zScoreSeverity =
    priceZ > 2.5
      ? 'EXTREME OVERBOUGHT (+2.5σ)'
      : priceZ > 1.5
      ? 'ELEVATED EXPANSION (+1.5σ)'
      : priceZ < -2.5
      ? 'EXTREME OVERSOLD (-2.5σ)'
      : priceZ < -1.5
      ? 'ELEVATED COMPRESSION (-1.5σ)'
      : 'NORMAL EQUILIBRIUM (±1σ)';

  const zScoreColor =
    priceZ > 2.0 ? '#f6465d' : priceZ < -2.0 ? '#00c087' : priceZ > 0 ? '#38bdf8' : '#a855f7';

  // Position on meter (-3.5 to +3.5 mapped to 0% to 100%)
  const clampedZ = Math.max(-3.5, Math.min(3.5, priceZ));
  const meterPercent = ((clampedZ + 3.5) / 7.0) * 100;

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-text font-mono select-none overflow-hidden">
      <PanelHeader
        title={`PRICE & VOLUME Z-SCORE [${displaySymbol}]`}
        linkGroup={currentGroup}
        onLinkGroupChange={setCurrentGroup}
        actions={
          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-muted">Lookback:</span>
            {[20, 50].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  period === p ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-text'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-grow p-3 flex flex-col space-y-3 overflow-y-auto">
        {/* Dynamic Coin Explanation Card */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white tracking-wider">{displaySymbol}</span>
              <span
                className="text-[10px] font-extrabold px-1.5 py-0.2 rounded"
                style={{ backgroundColor: `${zScoreColor}20`, color: zScoreColor }}
              >
                {zScoreSeverity}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              Z-Score mengukur jarak statistik harga <span className="text-text font-bold">{displaySymbol}</span> relatif terhadap rata-rata deviasi standar {period} periode.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted">Deviasi Harga (Price Z)</div>
            <div className="text-base font-black tracking-tight" style={{ color: zScoreColor }}>
              {priceZ >= 0 ? `+${priceZ.toFixed(2)}σ` : `${priceZ.toFixed(2)}σ`}
            </div>
          </div>
        </div>

        {/* Visual Bell Curve Meter (-3σ to +3σ) */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted font-bold flex items-center gap-1">
              <ArrowRightLeft size={11} className="text-accent" />
              STATISTICAL DISTRIBUTION SPECTRUM
            </span>
            <span className="text-[9px] text-muted">Mean Target: ${meanPrice.toFixed(2)}</span>
          </div>

          {/* Meter Track */}
          <div className="relative w-full h-7 bg-[#12151c] rounded border border-border/40 overflow-hidden flex items-center px-2">
            {/* Zones */}
            <div className="absolute inset-0 flex pointer-events-none">
              <div className="w-[14.28%] bg-[#00c087]/20 border-r border-[#00c087]/30" title="Extreme Oversold (< -2.5σ)" />
              <div className="w-[14.28%] bg-[#00c087]/10 border-r border-border/30" />
              <div className="w-[42.88%] bg-white/5 border-r border-border/30" />
              <div className="w-[14.28%] bg-[#f6465d]/10 border-r border-border/30" />
              <div className="w-[14.28%] bg-[#f6465d]/20" title="Extreme Overbought (> +2.5σ)" />
            </div>

            {/* Zero Axis Center Marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/30 z-10" />

            {/* Current Value Indicator Marker */}
            <div
              className="absolute top-1 bottom-1 w-2.5 rounded-full z-20 -translate-x-1/2 shadow-lg transition-all duration-300"
              style={{
                left: `${meterPercent}%`,
                backgroundColor: zScoreColor,
                boxShadow: `0 0 10px ${zScoreColor}`,
              }}
            />
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between text-[9px] text-muted font-mono px-1">
            <span className="text-[#00c087] font-bold">-3.0σ</span>
            <span>-2.0σ</span>
            <span>-1.0σ</span>
            <span className="text-white font-bold">0.0 (Mean)</span>
            <span>+1.0σ</span>
            <span>+2.0σ</span>
            <span className="text-[#f6465d] font-bold">+3.0σ</span>
          </div>
        </div>

        {/* Quant Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Harga Terkini</div>
            <div className="text-xs font-bold text-white mt-0.5">${currentPrice.toFixed(2)}</div>
          </div>
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Mean SMA({period})</div>
            <div className="text-xs font-bold text-accent mt-0.5">${meanPrice.toFixed(2)}</div>
          </div>
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Std Deviation (1σ)</div>
            <div className="text-xs font-bold text-white mt-0.5">±${stdDevPrice.toFixed(2)}</div>
          </div>
          <div className="bg-[#0b0d13] border border-border/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted uppercase">Volume Z-Score</div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                volumeZ > 2.0 ? 'text-[#00c087]' : volumeZ < -1.0 ? 'text-muted' : 'text-text'
              }`}
            >
              {volumeZ >= 0 ? `+${volumeZ.toFixed(2)}σ` : `${volumeZ.toFixed(2)}σ`}
            </div>
          </div>
        </div>

        {/* Mean Reversion Actionable Insight */}
        <div className="bg-[#0b0d13] border border-border/50 rounded-md p-2.5 flex items-start space-x-2 text-[10px] text-muted">
          <AlertCircle size={14} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-grow">
            <span className="text-white font-bold">Interpretasi Mean Reversion untuk {displaySymbol}: </span>
            {Math.abs(priceZ) > 2.0 ? (
              <span>
                Deviasi berada pada rentang ekstrim ({priceZ.toFixed(2)}σ). Secara statistik terdapat probabilitas tinggi 95% harga akan bergerak kembali menuju titik ekuilibrium Mean ${meanPrice.toFixed(2)}.
              </span>
            ) : (
              <span>
                Harga bergerak dalam rentang variansi normal (±1.5σ). Momentum trend masih stabil tanpa indikasi overextension yang berlebihan.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
