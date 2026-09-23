import type { Candle } from '../types';
import { canonicalizeInstrumentId } from './instruments';

export interface CacheRangeMeta {
  instrumentId: string;
  timeframe: string;
  startTime: number;
  endTime: number;
  lastUpdated: number;
  barCount: number;
}

const STORAGE_PREFIX = 'finpulse_mirror_candles_';

export type CandleUpdateListener = (instrumentId: string, timeframe: string, candles: Candle[]) => void;

class MarketDataMirrorService {
  // In-memory Hot Cache (RAM tier)
  private memoryCache: Map<string, Candle[]> = new Map();
  // Range metadata map
  private rangeMeta: Map<string, CacheRangeMeta> = new Map();
  // Candle update listeners
  private listeners: Set<CandleUpdateListener> = new Set();

  constructor() {
    this.restoreCacheIndex();
  }

  public subscribeCandles(cb: CandleUpdateListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private getCacheKey(instrumentId: string, timeframe: string): string {
    const canonical = canonicalizeInstrumentId(instrumentId);
    return `${canonical}::${timeframe}`;
  }

  public getCoverage(instrumentId: string, timeframe: string): CacheRangeMeta | null {
    const key = this.getCacheKey(instrumentId, timeframe);
    return this.rangeMeta.get(key) || null;
  }

  private restoreCacheIndex() {
    try {
      const indexStr = localStorage.getItem('finpulse_mirror_meta_index');
      if (indexStr) {
        const parsed: CacheRangeMeta[] = JSON.parse(indexStr);
        for (const meta of parsed) {
          this.rangeMeta.set(this.getCacheKey(meta.instrumentId, meta.timeframe), meta);
        }
      }
    } catch {
      // Ignore
    }
  }

  private persistCacheIndex() {
    try {
      const metas = Array.from(this.rangeMeta.values());
      localStorage.setItem('finpulse_mirror_meta_index', JSON.stringify(metas.slice(0, 50)));
    } catch {
      // Quota safe
    }
  }

  /**
   * Retrieves candles from hot memory or persistent cache immediately.
   * Stale-While-Revalidate: Return immediately, sync deltas asynchronously.
   */
  public getCachedCandles(instrumentId: string, timeframe: string): Candle[] | null {
    const key = this.getCacheKey(instrumentId, timeframe);

    // 1. Check RAM Hot Cache
    if (this.memoryCache.has(key)) {
      const data = this.memoryCache.get(key)!;
      if (data.length > 0) return data;
    }

    // 2. Check Warm Local Storage
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (stored) {
        const parsed: Candle[] = JSON.parse(stored);
        if (parsed.length > 0) {
          this.memoryCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      // Ignore
    }

    // 3. Try to resample from 1m base candles if available
    if (timeframe !== '1m') {
      const baseCandles = this.getCachedCandles(instrumentId, '1m');
      if (baseCandles && baseCandles.length > 0) {
        const resampled = this.resampleCandles(baseCandles, timeframe);
        if (resampled.length > 0) {
          this.setCachedCandles(instrumentId, timeframe, resampled);
          return resampled;
        }
      }
    }

    return null;
  }

  public setCachedCandles(instrumentId: string, timeframe: string, candles: Candle[]): void {
    if (!candles || candles.length === 0) return;
    const key = this.getCacheKey(instrumentId, timeframe);

    // Ensure strictly monotonic order and deduplication
    const sorted = this.cleanAndDeduplicate(candles);
    this.memoryCache.set(key, sorted);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const meta: CacheRangeMeta = {
      instrumentId,
      timeframe,
      startTime: first.time,
      endTime: last.time,
      lastUpdated: Date.now(),
      barCount: sorted.length,
    };
    this.rangeMeta.set(key, meta);
    this.persistCacheIndex();

    // Persist top 150 bars to localStorage for instant startup
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(sorted.slice(-150)));
    } catch {
      // Quota safe
    }

    // Notify active subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(instrumentId, timeframe, sorted);
      } catch {
        // Safe guard
      }
    });
  }

  /**
   * Merges delta bars into existing cached bars with deterministic deduplication and monotonicity.
   */
  public mergeDelta(instrumentId: string, timeframe: string, newBars: Candle[]): Candle[] {
    if (!newBars || newBars.length === 0) {
      return this.getCachedCandles(instrumentId, timeframe) || [];
    }

    const existing = this.getCachedCandles(instrumentId, timeframe) || [];
    const map = new Map<number, Candle>();

    for (const b of existing) {
      map.set(b.time, b);
    }
    for (const b of newBars) {
      map.set(b.time, b);
    }

    const merged = Array.from(map.values()).sort((a, b) => a.time - b.time);
    this.setCachedCandles(instrumentId, timeframe, merged);
    return merged;
  }

  /**
   * Resamples 1m base candles into 5m, 15m, 1h, 4h, or 1D candles deterministically.
   * Section 10: Local Timeframe Resampling
   */
  public resampleCandles(base1m: Candle[], targetTimeframe: string): Candle[] {
    const intervalSec = this.timeframeToSeconds(targetTimeframe);
    if (intervalSec <= 60 || base1m.length === 0) return base1m;

    const resampled: Candle[] = [];
    let currentBucket: Candle[] = [];
    let currentBucketTime = Math.floor(base1m[0].time / intervalSec) * intervalSec;

    for (const bar of base1m) {
      const barBucketTime = Math.floor(bar.time / intervalSec) * intervalSec;

      if (barBucketTime !== currentBucketTime && currentBucket.length > 0) {
        resampled.push(this.aggregateBucket(currentBucket, currentBucketTime));
        currentBucket = [];
        currentBucketTime = barBucketTime;
      }
      currentBucket.push(bar);
    }

    if (currentBucket.length > 0) {
      resampled.push(this.aggregateBucket(currentBucket, currentBucketTime));
    }

    return resampled;
  }

  private aggregateBucket(bucket: Candle[], bucketTime: number): Candle {
    const open = bucket[0].open;
    const close = bucket[bucket.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;

    for (const b of bucket) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume;
    }

    return {
      time: bucketTime,
      open,
      high,
      low,
      close,
      volume,
    };
  }

  private cleanAndDeduplicate(candles: Candle[]): Candle[] {
    const map = new Map<number, Candle>();
    for (const c of candles) {
      // Sanity check: valid numbers only
      if (
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close) &&
        c.high >= Math.max(c.open, c.close) &&
        c.low <= Math.min(c.open, c.close) &&
        c.low > 0
      ) {
        map.set(c.time, c);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }

  public timeframeToSeconds(tf: string): number {
    switch (tf) {
      case '1m':
        return 60;
      case '3m':
        return 180;
      case '5m':
        return 300;
      case '15m':
        return 900;
      case '30m':
        return 1800;
      case '1h':
        return 3600;
      case '2h':
        return 7200;
      case '4h':
        return 14400;
      case '1D':
      case '1d':
        return 86400;
      default:
        return 900;
    }
  }

  public getFreshnessLabel(instrumentId: string, timeframe: string): { label: string; isLive: boolean } {
    const key = this.getCacheKey(instrumentId, timeframe);
    const meta = this.rangeMeta.get(key);
    if (!meta) return { label: 'NO CACHE', isLive: false };

    const ageSec = Math.floor((Date.now() - meta.lastUpdated) / 1000);
    if (ageSec < 5) return { label: 'LIVE', isLive: true };
    if (ageSec < 60) return { label: `${ageSec}s ago`, isLive: true };
    const mins = Math.floor(ageSec / 60);
    if (mins < 60) return { label: `${mins}m ago`, isLive: false };
    return { label: 'OFFLINE CACHE', isLive: false };
  }
}

export const marketMirror = new MarketDataMirrorService();
