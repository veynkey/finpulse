import { useState, useEffect, useMemo } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import { calculateEMA } from '../utils/indicators';
import PanelHeader from './PanelHeader';
import QuickCoinSelector from '../components/QuickCoinSelector';
import type { LinkGroup, Candle } from '../types';
import { Compass, Gauge, Shield, CheckCircle } from 'lucide-react';

interface RegimeIndicatorPanelProps {
  defaultGroup?: LinkGroup;
}

export type MarketRegimeType =
  | 'TRENDING_BULL'
  | 'TRENDING_BEAR'
  | 'CHOPPY_ACCUMULATION'
  | 'VOLATILITY_COMPRESSION'
  | 'HIGH_VOLATILITY_EXPANSION';

export default function RegimeIndicatorPanel({ defaultGroup = 'BLUE' }: RegimeIndicatorPanelProps) {
  const { getSymbolForGroup } = useTerminal();
  const [currentGroup, setCurrentGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(currentGroup);
  const [candles, setCandles] = useState<Candle[]>([]);

  const symbol = activeInstrument?.symbol || 'BTCUSDT';
  const displaySymbol = symbol.replace('USDT', '/USDT');

  // Load candles for active coin
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

  // Compute Choppiness Index (CHOP) & Market Regime
  const regimeAnalysis = useMemo(() => {
    if (candles.length < 20) {
      return {
        regime: 'CHOPPY_ACCUMULATION' as MarketRegimeType,
        chopIndex: 55,
        atrPercentile: 50,
        label: 'CHOPPY ACCUMULATION (KONSOLIDASI)',
        color: '#f59e0b',
        playbook: 'Fokus scalping batas support/resistance. Hindari mengejar breakout.',
        description: 'Pasar berada dalam fase sideways konsolidasi tanpa arah tren dominan.',
      };
    }

    const n = 14;
    const slice = candles.slice(-n);

    // 1. Calculate True Ranges and sum
    let trueRangeSum = 0;
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let i = 0; i < slice.length; i++) {
      const cur = slice[i];
      const prevClose = i > 0 ? slice[i - 1].close : cur.open;
      const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prevClose), Math.abs(cur.low - prevClose));
      trueRangeSum += tr;

      if (cur.high > highestHigh) highestHigh = cur.high;
      if (cur.low < lowestLow) lowestLow = cur.low;
    }

    const priceSpan = highestHigh - lowestLow || 0.0001;
    // Choppiness Index Formula: 100 * LOG10(Sum(TR) / (MaxHigh - MinLow)) / LOG10(n)
    let chop = 100 * (Math.log10(trueRangeSum / priceSpan) / Math.log10(n));
    if (isNaN(chop)) chop = 50;
    chop = Math.max(0, Math.min(100, Math.round(chop * 10) / 10));

    // 2. Trend direction via EMA
    const ema21 = calculateEMA(candles, 21);
    const ema50 = calculateEMA(candles, 50);
    const lastPrice = candles[candles.length - 1].close;
    const lastEma21 = ema21.length > 0 ? ema21[ema21.length - 1].value : lastPrice;
    const lastEma50 = ema50.length > 0 ? ema50[ema50.length - 1].value : lastPrice;

    // 3. Classify Regime
    let regime: MarketRegimeType = 'CHOPPY_ACCUMULATION';
    let label = 'CHOPPY ACCUMULATION';
    let color = '#f59e0b';
    let playbook = 'Fokus pada fade rentang harga support/resistance. Kurangi ukuran posisi.';
    let description = 'Pasar bergerak dalam batas sideways tanpa kelanjutan momentum satu arah.';

    if (chop < 38.2) {
      if (lastPrice >= lastEma21 && lastEma21 >= lastEma50) {
        regime = 'TRENDING_BULL';
        label = 'STRONG TRENDING BULL (EKSPANSI NAIK)';
        color = '#00c087';
        playbook = 'Gunakan strategi Trend-Following. Beli saat pullback ke area EMA21, pasang trailing stop.';
        description = 'Tren bullish kuat dan terkonfirmasi, pembeli agresif mengendalikan dinamika harga.';
      } else if (lastPrice < lastEma21 && lastEma21 < lastEma50) {
        regime = 'TRENDING_BEAR';
        label = 'STRONG TRENDING BEAR (EKSPANSI TURUN)';
        color = '#f6465d';
        playbook = 'Trend-Following bearish aktif. Cari entri short pada retest resisten EMA, hindari buy di tengah jalan.';
        description = 'Tren bearish kuat dan dominan, tekanan jual terus mencetak lower high dan lower low.';
      } else {
        regime = 'HIGH_VOLATILITY_EXPANSION';
        label = 'HIGH VOLATILITY EXPANSION';
        color = '#38bdf8';
        playbook = 'Volatilitas tinggi terdeteksi. Gunakan stop-loss lebih lebar dengan size posisi lebih terukur.';
        description = 'Rentang lilin melebar dengan kecepatan eksekusi tinggi di kedua arah.';
      }
    } else if (chop > 61.8) {
      regime = 'CHOPPY_ACCUMULATION';
      label = 'CHOPPY CONSOLIDATION (PASAR SIDEWAYS)';
      color = '#f59e0b';
      playbook = 'Hindari strategi breakout. Lakukan akumulasi di support bawah atau ambil profit di resisten atas.';
      description = 'Indeks Choppiness tinggi mengindikasikan pasar sedang membangun likuiditas sebelum ekspansi berikutnya.';
    } else {
      // 38.2 to 61.8
      const spread = Math.abs(lastEma21 - lastEma50) / lastEma50;
      if (spread < 0.002) {
        regime = 'VOLATILITY_COMPRESSION';
        label = 'VOLATILITY COMPRESSION (SQUEEZE PRE-BREAKOUT)';
        color = '#a855f7';
        playbook = 'Kompresi harga ketat. Siapkan stop order di luar range konsolidasi untuk menangkap ledakan breakout.';
        description = 'Harga terjepit dalam rentang sempit. Kompresi volatilitas biasanya mendahului ledakan tren besar.';
      } else if (lastPrice > lastEma21) {
        regime = 'TRENDING_BULL';
        label = 'MODERATE BULLISH STRUCTURE';
        color = '#00c087';
        playbook = 'Bias condong bullish. Akumulasi saat koreksi minor ke support dinamis.';
        description = 'Struktur harga bergerak naik secara moderat dengan volatilitas teratur.';
      } else {
        regime = 'TRENDING_BEAR';
        label = 'MODERATE BEARISH STRUCTURE';
        color = '#f6465d';
        playbook = 'Bias condong bearish. Waspadai penurunan saat harga gagal menembus resisten terdekat.';
        description = 'Struktur harga bergerak turun perlahan didominasi distribusi bertahap.';
      }
    }

    return {
      regime,
      chopIndex: chop,
      atrPercentile: Math.round(100 - chop),
      label,
      color,
      playbook,
      description,
    };
  }, [candles]);

  const { chopIndex, label, color, playbook, description } = regimeAnalysis;

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-text font-mono select-none overflow-hidden">
      <PanelHeader
        title={`MARKET REGIME & STRUCTURE [${displaySymbol}]`}
        linkGroup={currentGroup}
        onLinkGroupChange={setCurrentGroup}
        actions={
          <div className="flex items-center space-x-2 text-[10px]">
            <QuickCoinSelector currentGroup={currentGroup} compact />
            <span className="text-muted hidden md:inline">CHOP:</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded hidden md:inline ${
                chopIndex > 61.8 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#00c087]/20 text-[#00c087]'
              }`}
            >
              {chopIndex.toFixed(1)}
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
                className="text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {label}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              Klasifikasi struktur pasar dan tingkat saturasi tren untuk instrumen{' '}
              <span className="text-text font-bold">{displaySymbol}</span> berbasis Choppiness Index.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-muted uppercase">Indeks Choppiness</div>
            <div className="text-base font-black tracking-tight" style={{ color }}>
              {chopIndex.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Choppiness Index Gauge (<38.2 Trending, >61.8 Choppy) */}
        <div className="bg-[#0b0d13] border border-border/60 rounded-md p-3 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted font-bold flex items-center gap-1">
              <Gauge size={11} className="text-accent" />
              CHOPPINESS INDEX SPECTRUM (TREND VS CHOP)
            </span>
            <span className="text-[9px] text-muted">Ambang Batas: 38.2 / 61.8</span>
          </div>

          <div className="relative w-full h-7 bg-[#12151c] rounded border border-border/40 overflow-hidden flex items-center px-2">
            <div className="absolute inset-0 flex pointer-events-none text-[8px] font-bold">
              <div className="w-[38.2%] bg-[#00c087]/20 border-r border-[#00c087]/40 flex items-center justify-center text-[#00c087]">
                STRONG TREND (&lt;38.2)
              </div>
              <div className="w-[23.6%] bg-white/5 border-r border-border/40 flex items-center justify-center text-muted">
                TRANSITION
              </div>
              <div className="w-[38.2%] bg-[#f59e0b]/20 flex items-center justify-center text-yellow-400">
                CHOPPY / RANGE (&gt;61.8)
              </div>
            </div>

            {/* Current Chop Marker */}
            <div
              className="absolute top-1 bottom-1 w-2.5 rounded-full z-20 -translate-x-1/2 shadow-lg transition-all duration-300"
              style={{
                left: `${Math.max(2, Math.min(98, chopIndex))}%`,
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}`,
              }}
            />
          </div>

          <div className="flex justify-between text-[9px] text-muted font-mono px-1">
            <span className="text-[#00c087] font-bold">0 (Tren Maksimum)</span>
            <span>38.2 (Ambang Tren)</span>
            <span>50.0 (Netral)</span>
            <span className="text-yellow-400 font-bold">61.8 (Ambang Choppy)</span>
            <span className="text-[#f6465d] font-bold">100 (Sideways Penuh)</span>
          </div>
        </div>

        {/* Detailed Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Market Status Description */}
          <div className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-white flex items-center gap-1.5 mb-1">
                <Compass size={12} className="text-accent" />
                Deskripsi Keadaan Pasar
              </div>
              <p className="text-[10px] text-muted leading-relaxed">{description}</p>
            </div>
            <div className="mt-2 text-[9px] text-accent font-bold">
              Koin Terpantau: {displaySymbol}
            </div>
          </div>

          {/* Actionable Strategy Playbook */}
          <div className="bg-[#0b0d13] border border-border/60 rounded-md p-2.5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-white flex items-center gap-1.5 mb-1">
                <Shield size={12} className="text-[#00c087]" />
                Pedoman Strategi Eksekusi
              </div>
              <p className="text-[10px] text-text font-medium leading-relaxed">{playbook}</p>
            </div>
            <div className="mt-2 flex items-center space-x-1 text-[9px] text-[#00c087] font-bold">
              <CheckCircle size={10} />
              <span>Sesuai dengan probabilitas matematis rezim aktif</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
