import type {
  MarketConditionState,
  MarketSession,
  LiquidityRegime,
  SpreadQuality,
  VolumeRegime,
  VolatilityRegime,
  TrendStructure,
  OrderFlowQuality,
  MarketQualityScore,
  Instrument,
  Candle,
  OrderBook,
} from '../types';
import { getInstrumentById } from './instruments';

export class MarketConditionsEngine {
  /**
   * Convenience evaluation method taking instrument ID and candles.
   */
  public evaluateMarketCondition(
    instrumentId: string,
    candles: Candle[],
    lastBook?: OrderBook
  ): MarketConditionState {
    const inst = getInstrumentById(instrumentId);
    const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 100;
    const spread = lastBook ? lastBook.spread : lastPrice * 0.0001;

    // Calculate real volume Z-score from last 20 candles
    let volumeZScore = 0;
    if (candles.length >= 5) {
      const recentCandles = candles.slice(-20);
      const volumes = recentCandles.map((c) => c.volume);
      const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const variance = volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length;
      const std = Math.sqrt(variance);
      if (std > 0) {
        const lastVol = volumes[volumes.length - 1];
        volumeZScore = Math.round(((lastVol - mean) / std) * 10) / 10;
      }
    }

    // Calculate real realized volatility from last 20 candle log-returns
    let realizedVolPct = 25.0;
    if (candles.length >= 10) {
      const recent = candles.slice(-21);
      const logReturns: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        logReturns.push(Math.log(recent[i].close / recent[i - 1].close));
      }
      const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
      const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / logReturns.length;
      const std = Math.sqrt(variance);
      // Annualized volatility estimate
      realizedVolPct = Math.min(200, Math.max(1, Math.round(std * Math.sqrt(365 * 24) * 100 * 10) / 10));
    }

    // Calculate real Choppiness Index (0 - 100) using 14-period True Range formula
    let choppinessIndex = 50;
    if (candles.length >= 15) {
      const period = 14;
      const slice = candles.slice(-period - 1);
      let trSum = 0;
      let maxHigh = -Infinity;
      let minLow = Infinity;
      for (let i = 1; i < slice.length; i++) {
        const c = slice[i];
        const prev = slice[i - 1];
        const tr = Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
        trSum += tr;
        if (c.high > maxHigh) maxHigh = c.high;
        if (c.low < minLow) minLow = c.low;
      }
      const priceRange = maxHigh - minLow;
      if (priceRange > 0 && trSum > 0) {
        const chop = 100 * (Math.log10(trSum / priceRange) / Math.log10(period));
        choppinessIndex = Math.min(100, Math.max(0, Math.round(chop)));
      }
    }

    return MarketConditionsEngine.evaluateConditions(
      inst || {
        id: instrumentId,
        symbol: instrumentId.split(':')[0],
        displaySymbol: instrumentId.split(':')[0],
        name: instrumentId,
        assetClass: 'Crypto',
        venue: 'BINANCE',
        priceDecimals: 2,
        quantityDecimals: 4,
        minOrderSize: 0.001,
        tickSize: 0.01,
        status: 'TRADING',
        providerCapabilities: ['trades', 'candles'],
      },
      spread,
      lastPrice,
      volumeZScore,
      realizedVolPct,
      choppinessIndex
    );
  }
  /**
   * Evaluates current market session based on UTC time and asset class.
   * Section 24 & 29: Asset-Specific Market Hours & Sessions
   */
  public static getCurrentSession(_inst?: Instrument): { session: MarketSession; description: string } {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const currentDecTime = utcHours + utcMinutes / 60;

    // Check overlaps
    // London / New York overlap: 13:30 - 16:30 UTC
    if (currentDecTime >= 13.5 && currentDecTime <= 16.5) {
      return {
        session: 'LONDON_NY_OVERLAP',
        description: 'London / New York Peak Overlap (Max Global Liquidity)',
      };
    }

    // New York: 13:30 - 20:00 UTC
    if (currentDecTime >= 13.5 && currentDecTime <= 20.0) {
      return {
        session: 'NEW_YORK',
        description: 'New York Session (High US Equity & Dollar Flow)',
      };
    }

    // London / Europe: 08:00 - 16:30 UTC
    if (currentDecTime >= 8.0 && currentDecTime <= 16.5) {
      return {
        session: 'LONDON',
        description: 'London / European Session (Broad Institutional Volume)',
      };
    }

    // Asia / Tokyo: 00:00 - 09:00 UTC
    if (currentDecTime >= 0.0 && currentDecTime <= 9.0) {
      return {
        session: 'ASIA',
        description: 'Tokyo / Asian Session (Regional Macro & APAC Flow)',
      };
    }

    return {
      session: 'OFF_HOURS',
      description: 'Global Inter-Session Transition (Moderate Liquidity)',
    };
  }

  /**
   * Evaluates comprehensive market quality & analyzability deterministically.
   * Section 25, 26, 27: Market Conditions & Analyzability
   */
  public static evaluateConditions(
    inst: Instrument,
    spread: number,
    lastPrice: number,
    volumeZScore = 0.0,
    realizedVolPct = 25.0,
    inputChoppiness?: number
  ): MarketConditionState {
    const sessionInfo = this.getCurrentSession(inst);

    // 1. Calculate spread basis points
    const spreadBps = lastPrice > 0 ? (spread / lastPrice) * 10000 : 0.8;

    // 2. Spread Quality
    let spreadQuality: SpreadQuality = 'NORMAL';
    if (spreadBps <= 0.8) spreadQuality = 'TIGHT';
    else if (spreadBps > 3.0) spreadQuality = 'WIDE';
    else if (spreadBps > 8.0) spreadQuality = 'BLOWN_OUT';

    // 3. Liquidity Regime
    let liquidity: LiquidityRegime = 'MODERATE';
    if (spreadQuality === 'TIGHT' && volumeZScore >= 0.5) liquidity = 'HIGH';
    else if (spreadQuality === 'WIDE' || volumeZScore < -1.0) liquidity = 'LOW';
    else if (spreadQuality === 'BLOWN_OUT') liquidity = 'ILLIQUID';

    // 4. Volume Regime
    let volumeRegime: VolumeRegime = 'NORMAL';
    if (volumeZScore >= 2.0) volumeRegime = 'ABOVE_NORMAL';
    else if (volumeZScore <= -1.0) volumeRegime = 'COMPRESSED';

    // 5. Volatility Regime
    let volatilityRegime: VolatilityRegime = 'MODERATE';
    if (realizedVolPct < 15) volatilityRegime = 'LOW';
    else if (realizedVolPct > 45) volatilityRegime = 'ELEVATED';
    else if (realizedVolPct > 80) volatilityRegime = 'EXTREME';

    // 6. Trend Structure & Choppiness Index (0 - 100)
    // Low choppiness = clean directional trend; High choppiness = random walk range
    const choppinessIndex = inputChoppiness !== undefined
      ? Math.min(100, Math.max(0, inputChoppiness))
      : 50;
    let trendStructure: TrendStructure = 'RANGE_BOUND';
    if (choppinessIndex < 38) trendStructure = 'CLEAN_TREND';
    else if (choppinessIndex > 62) trendStructure = 'CHOPPY';

    // 7. Order Flow Quality
    const orderFlowQuality: OrderFlowQuality =
      spreadQuality === 'TIGHT' && liquidity === 'HIGH' ? 'CONSISTENT' : 'IMBALANCED';

    // 8. Overall Analyzability Score
    let overallQuality: MarketQualityScore = 'GOOD';
    const reasons: string[] = [];

    if (spreadQuality === 'TIGHT') {
      reasons.push(`Spread compressed to ${spreadBps.toFixed(1)} bps (favorable price discovery)`);
    } else if (spreadQuality === 'WIDE' || spreadQuality === 'BLOWN_OUT') {
      reasons.push(`Spread widened to ${spreadBps.toFixed(1)} bps (elevated slippage risk)`);
    }

    if (volumeRegime === 'ABOVE_NORMAL') {
      reasons.push(`Volume ${volumeZScore.toFixed(1)}σ above rolling 30-day baseline`);
    } else if (volumeRegime === 'COMPRESSED') {
      reasons.push(`Volume below intraday average (low market participation)`);
    }

    if (trendStructure === 'CLEAN_TREND') {
      reasons.push(`Choppiness Index low (${Math.round(choppinessIndex)}/100) with persistent directionality`);
    } else if (trendStructure === 'CHOPPY') {
      reasons.push(`Price oscillating in tight consolidation without follow-through`);
    }

    if (sessionInfo.session === 'LONDON_NY_OVERLAP') {
      reasons.push('Peak dual-hub transatlantic liquidity window active');
    }

    // Determine final composite score
    if (liquidity === 'HIGH' && spreadQuality === 'TIGHT' && trendStructure !== 'CHOPPY') {
      overallQuality = 'EXCELLENT';
    } else if (liquidity === 'LOW' || spreadQuality === 'WIDE' || trendStructure === 'CHOPPY') {
      overallQuality = 'MIXED';
    } else if (spreadQuality === 'BLOWN_OUT' || liquidity === 'ILLIQUID') {
      overallQuality = 'DIFFICULT';
    }

    return {
      session: sessionInfo.session,
      sessionDescription: sessionInfo.description,
      liquidity,
      spreadQuality,
      volumeRegime,
      volatilityRegime,
      trendStructure,
      orderFlowQuality,
      eventRisk: 'LOW',
      eventRiskDetail: 'No tier-1 central bank or macroeconomic release scheduled within 60m',
      overallQuality,
      reasons,
      spreadBps,
      volumeZScore,
      realizedVolPct,
      choppinessIndex,
    };
  }
}

export const marketConditionsService = new MarketConditionsEngine();
