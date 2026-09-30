export interface TimeRange {
  from: number; // Unix timestamp in seconds
  to: number;   // Unix timestamp in seconds
}

export interface ChartRange {
  from: number;
  to: number;
}

export interface CrosshairPoint {
  time: number | null;
  price?: number;
  ratioX?: number; // relative horizontal position 0.0 to 1.0
}

type TimeRangeListener = (range: TimeRange, instrumentId?: string) => void;
type RangeListener = (range: ChartRange, instrumentId?: string) => void;
type CrosshairListener = (point: CrosshairPoint, instrumentId?: string) => void;
export type TimeframeListener = (timeframe: string, instrumentId?: string) => void;

class ChartSyncService {
  private channel: BroadcastChannel | null = null;
  private timeRangeListeners: Map<string, TimeRangeListener> = new Map();
  private rangeListeners: Map<string, RangeListener> = new Map();
  private crosshairListeners: Map<string, CrosshairListener> = new Map();
  private timeframeListeners: Map<string, TimeframeListener> = new Map();
  private lastTimeBroadcastSource = '';
  private lastTimeBroadcastTimestamp = 0;
  private lastLogicalBroadcastSource = '';
  private lastLogicalBroadcastTimestamp = 0;
  private lastTimeframeBroadcastSource = '';
  private lastTimeframeBroadcastTimestamp = 0;
  private lastKnownTimeRanges: Map<string, TimeRange> = new Map();
  private lastKnownLogicalRanges: Map<string, ChartRange> = new Map();
  private lastKnownTimeframes: Map<string, string> = new Map();

  constructor() {
    try {
      this.channel = new BroadcastChannel('finpulse_chart_sync');
      this.channel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'SYNC_TIME_RANGE' && data.range) {
          if (data.instrumentId) {
            this.lastKnownTimeRanges.set(data.instrumentId, data.range);
          }
          this.notifyLocalTimeRangeListeners(data.sourceId, data.range, data.instrumentId);
        } else if (data.type === 'SYNC_LOGICAL_RANGE' && data.range) {
          if (data.instrumentId) {
            this.lastKnownLogicalRanges.set(data.instrumentId, data.range);
          }
          this.notifyLocalRangeListeners(data.sourceId, data.range, data.instrumentId);
        } else if (data.type === 'SYNC_CROSSHAIR') {
          this.notifyLocalCrosshairListeners(data.sourceId, data.point, data.instrumentId);
        } else if (data.type === 'SYNC_TIMEFRAME' && data.timeframe) {
          if (data.instrumentId) {
            this.lastKnownTimeframes.set(data.instrumentId, data.timeframe);
          }
          this.notifyLocalTimeframeListeners(data.sourceId, data.timeframe, data.instrumentId);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment:', e);
    }
  }

  // TIME RANGE (TIMESTAMP BASED: SCROLL / ZOOM / PAN) SYNC
  public broadcastTimeRange(sourceId: string, range: TimeRange, instrumentId?: string) {
    if (!range || typeof range.from !== 'number' || typeof range.to !== 'number') return;
    if (isNaN(range.from) || isNaN(range.to) || range.from >= range.to) return;

    const now = performance.now();
    if (this.lastTimeBroadcastSource === sourceId && now - this.lastTimeBroadcastTimestamp < 16) {
      return;
    }
    this.lastTimeBroadcastSource = sourceId;
    this.lastTimeBroadcastTimestamp = now;

    if (instrumentId) {
      this.lastKnownTimeRanges.set(instrumentId, range);
    }

    // 1. Notify local in-window subscribers
    this.notifyLocalTimeRangeListeners(sourceId, range, instrumentId);

    // 2. Broadcast across monitors / windows
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_TIME_RANGE',
          sourceId,
          instrumentId,
          range,
        });
      } catch {}
    }
  }

  public subscribeTimeRange(id: string, callback: TimeRangeListener): () => void {
    this.timeRangeListeners.set(id, callback);
    return () => {
      this.timeRangeListeners.delete(id);
    };
  }

  private notifyLocalTimeRangeListeners(sourceId: string, range: TimeRange, instrumentId?: string) {
    this.timeRangeListeners.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(range, instrumentId);
      }
    });
  }

  // LOGICAL RANGE (INDEX-BASED) SYNC
  public broadcastLogicalRange(sourceId: string, range: ChartRange, instrumentId?: string) {
    const now = performance.now();
    if (this.lastLogicalBroadcastSource === sourceId && now - this.lastLogicalBroadcastTimestamp < 16) {
      return;
    }
    this.lastLogicalBroadcastSource = sourceId;
    this.lastLogicalBroadcastTimestamp = now;

    if (instrumentId) {
      this.lastKnownLogicalRanges.set(instrumentId, range);
    }

    this.notifyLocalRangeListeners(sourceId, range, instrumentId);

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_LOGICAL_RANGE',
          sourceId,
          instrumentId,
          range,
        });
      } catch {}
    }
  }

  public subscribeLogicalRange(id: string, callback: RangeListener): () => void {
    this.rangeListeners.set(id, callback);
    return () => {
      this.rangeListeners.delete(id);
    };
  }

  private notifyLocalRangeListeners(sourceId: string, range: ChartRange, instrumentId?: string) {
    this.rangeListeners.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(range, instrumentId);
      }
    });
  }

  // TIMEFRAME SYNC
  public broadcastTimeframe(sourceId: string, timeframe: string, instrumentId?: string) {
    if (!timeframe) return;
    const now = performance.now();
    if (this.lastTimeframeBroadcastSource === sourceId && now - this.lastTimeframeBroadcastTimestamp < 16) {
      return;
    }
    this.lastTimeframeBroadcastSource = sourceId;
    this.lastTimeframeBroadcastTimestamp = now;

    if (instrumentId) {
      this.lastKnownTimeframes.set(instrumentId, timeframe);
    }

    this.notifyLocalTimeframeListeners(sourceId, timeframe, instrumentId);

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_TIMEFRAME',
          sourceId,
          instrumentId,
          timeframe,
        });
      } catch {}
    }
  }

  public subscribeTimeframe(id: string, callback: TimeframeListener): () => void {
    this.timeframeListeners.set(id, callback);
    return () => {
      this.timeframeListeners.delete(id);
    };
  }

  private notifyLocalTimeframeListeners(sourceId: string, timeframe: string, instrumentId?: string) {
    this.timeframeListeners.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(timeframe, instrumentId);
      }
    });
  }

  public getLastKnownTimeRange(instrumentId: string): TimeRange | undefined {
    return this.lastKnownTimeRanges.get(instrumentId);
  }

  public getLastKnownLogicalRange(instrumentId: string): ChartRange | undefined {
    return this.lastKnownLogicalRanges.get(instrumentId);
  }

  public getLastKnownTimeframe(instrumentId: string): string | undefined {
    return this.lastKnownTimeframes.get(instrumentId);
  }

  // CROSSHAIR MIRRORING SYNC
  public broadcastCrosshair(sourceId: string, point: CrosshairPoint, instrumentId?: string) {
    this.notifyLocalCrosshairListeners(sourceId, point, instrumentId);

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_CROSSHAIR',
          sourceId,
          instrumentId,
          point,
        });
      } catch {}
    }
  }

  public clearCrosshair(sourceId: string, instrumentId?: string) {
    this.broadcastCrosshair(sourceId, { time: null }, instrumentId);
  }

  public subscribeCrosshair(id: string, callback: CrosshairListener): () => void {
    this.crosshairListeners.set(id, callback);
    return () => {
      this.crosshairListeners.delete(id);
    };
  }

  private notifyLocalCrosshairListeners(sourceId: string, point: CrosshairPoint, instrumentId?: string) {
    this.crosshairListeners.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(point, instrumentId);
      }
    });
  }
}

export const chartSyncService = new ChartSyncService();
