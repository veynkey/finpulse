import type { Candle } from '../types';
import rawGenesis from './btcGenesisData.json';

let cachedGenesis: Candle[] | null = null;

/**
 * Returns full historical daily candles for Bitcoin from July 17, 2010 to August 16, 2017.
 * Covers Mt. Gox inception ($0.0495) through early Bitstamp exchange data up to Binance launch.
 */
export function getBtcGenesisCandles(): Candle[] {
  if (cachedGenesis) return cachedGenesis;

  cachedGenesis = (rawGenesis as number[][]).map(([time, open, high, low, close, volume]) => ({
    time,
    open,
    high,
    low,
    close,
    volume,
  }));

  return cachedGenesis;
}
