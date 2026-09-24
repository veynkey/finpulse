export interface ChartRange {
  from: number;
  to: number;
}

export interface CrosshairPoint {
  time: number | null;
  price?: number;
  ratioX?: number; // relative horizontal position 0.0 - 1.0
}

type RangeListener = (range: ChartRange) => void;
type CrosshairListener = (point: CrosshairPoint) => void;

class ChartSyncService {
  private channel: BroadcastChannel | null = null;
  private rangeListeners: Map<string, RangeListener> = new Map();
  private crosshairListeners: Map<string, CrosshairListener> = new Map();
  private lastBroadcastSource = '';
  private lastBroadcastTime = 0;

  constructor() {
    try {
      this.channel = new BroadcastChannel('finpulse_chart_sync');
      this.channel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'SYNC_LOGICAL_RANGE' && data.range) {
          this.notifyLocalRangeListeners(data.sourceId, data.range);
        } else if (data.type === 'SYNC_CROSSHAIR') {
          this.notifyLocalCrosshairListeners(data.sourceId, data.point);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment:', e);
    }
  }

  // --- LOGICAL RANGE (SCROLL / ZOOM / PAN) SYNC ---

  public broadcastLogicalRange(sourceId: string, range: ChartRange) {
    // Prevent flood
    const now = performance.now();
    if (this.lastBroadcastSource === sourceId && now - this.lastBroadcastTime < 16) {
      return;
    }
    this.lastBroadcastSource = sourceId;
    this.lastBroadcastTime = now;

    // 1. Notify local in-window subscribers
    this.notifyLocalRangeListeners(sourceId, range);

    // 2. Broadcast across monitors / windows
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_LOGICAL_RANGE',
          sourceId,
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

  private notifyLocalRangeListeners(sourceId: string, range: ChartRange) {
    this.rangeListeners.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(range);
      }
    });
  }

  // --- CROSSHAIR MIRRORING SYNC ---

  public broadcastCrosshair(sourceId: string, point: CrosshairPoint) {
    // 1. Notify local in-window subscribers
    this.notifyLocalCrosshairListeners(sourceId, point);

    // 2. Broadcast across monitors / windows
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_CROSSHAIR',
          sourceId,
          point,
        });
      } catch {}
    }
  }

  public clearCrosshair(sourceId: string) {
    this.broadcastCrosshair(sourceId, { time: null });
  }

  public subscribeCrosshair(id: string, callback: CrosshairListener): () => void {
    this.crosshairListeners.set(id, callback);
    return () => {
      this.crosshairListeners.delete(id);
    };
  }

  private notifyLocalCrosshairListeners(sourceId: string, point: CrosshairPoint) {
    this.crosshairListeners.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(point);
      }
    });
  }
}

export const chartSyncService = new ChartSyncService();
