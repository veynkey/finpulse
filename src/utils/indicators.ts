import type { Candle } from '../types';

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerBandsResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];
  const result: IndicatorPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];
  const result: IndicatorPoint[] = [];
  const k = 2 / (period + 1);

  // Initial SMA for first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  result.push({ time: candles[period - 1].time, value: prevEma });

  for (let i = period; i < candles.length; i++) {
    const currentEma = candles[i].close * k + prevEma * (1 - k);
    result.push({ time: candles[i].time, value: currentEma });
    prevEma = currentEma;
  }

  return result;
}

/**
 * Bollinger Bands (SMA + StdDev)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsResult {
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  if (candles.length < period) {
    return { upper, middle, lower };
  }

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(candles[i - j].close - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const time = candles[i].time;
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + stdDevMultiplier * stdDev });
    lower.push({ time, value: mean - stdDevMultiplier * stdDev });
  }

  return { upper, middle, lower };
}

/**
 * Volume-Weighted Average Price (Session VWAP)
 */
export function calculateVWAP(candles: Candle[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let cumulativeTPV = 0;
  let cumulativeVol = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    cumulativeTPV += typicalPrice * vol;
    cumulativeVol += vol;

    result.push({
      time: c.time,
      value: cumulativeVol > 0 ? cumulativeTPV / cumulativeVol : typicalPrice,
    });
  }

  return result;
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period) return [];
  const result: IndicatorPoint[] = [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);
  result.push({ time: candles[period].time, value: rsi });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
    result.push({ time: candles[i].time, value: rsi });
  }

  return result;
}

/**
 * Computes Heikin-Ashi candlestick data from standard candles.
 */
export function calculateHeikinAshi(candles: Candle[]): Candle[] {
  if (!candles || candles.length === 0) return [];
  const haCandles: Candle[] = [];

  let prevHaOpen = candles[0].open;
  let prevHaClose = candles[0].close;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    haCandles.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });

    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }

  return haCandles;
}
