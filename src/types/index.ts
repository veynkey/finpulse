export type LinkGroup = 'BLUE' | 'GREEN' | 'ORANGE' | 'PURPLE' | 'NONE';

export type AssetClass = 'Crypto' | 'Equity' | 'Forex' | 'Index' | 'Commodity';

export interface Instrument {
  id: string; // e.g., "BTC-USDT:BINANCE"
  symbol: string; // e.g., "BTCUSDT"
  displaySymbol: string; // e.g., "BTC/USDT"
  name: string;
  assetClass: AssetClass;
  venue: string;
  baseCurrency?: string;
  quoteCurrency?: string;
  priceDecimals: number;
  quantityDecimals: number;
  minOrderSize?: number;
  tickSize: number;
  status?: 'TRADING' | 'HALTED' | 'CLOSED';
  lastUpdated?: number;
  providerCapabilities?: string[];
}

export type TradeSide = 'BUY' | 'SELL' | 'UNKNOWN';

export interface Trade {
  id: string;
  instrumentId: string;
  price: number;
  quantity: number;
  side: TradeSide;
  timestamp: number; // UTC ms
}

export interface Quote {
  instrumentId: string;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  timestamp: number;
  change24h?: number;
}

export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVolume?: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  instrumentId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadBps: number;
  midPrice: number;
  lastUpdated: number;
}

export interface RadarEvent {
  id: string;
  timestamp: number;
  instrumentId: string;
  symbol: string;
  eventType:
    | 'VOLUME_SPIKE'
    | 'VOLATILITY_EXPANSION'
    | 'SPREAD_ANOMALY'
    | 'OI_SURGE'
    | 'CVD_DIVERGENCE'
    | 'PRICE_ACCELERATION'
    | 'REGIME_CHANGE';
  severity: 'INFO' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0.0 - 1.0
  headline: string;
  metric: string;
  baseline: string;
  deviation: string;
  relatedAssets: string[];
}

export interface NewsItem {
  id: string;
  timestamp: number;
  source: string;
  headline: string;
  summary: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactScore: number; // 1 - 5
  linkedSymbols: string[];
  tags: string[];
  sourceUrl?: string;
  imageUrl?: string;
  clusteredCount?: number;
}

export interface Position {
  instrumentId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  marginUsed: number;
  weight: number; // % of portfolio
}

export interface PortfolioRiskMetrics {
  totalEquity: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  unrealizedPnl: number;
  realizedPnl: number;
  var95: number;
  var99: number;
  maxDrawdown: number;
  portfolioBeta: number;
  sharpeRatio: number;
  leverage: number;
}

export interface MacroEvent {
  id: string;
  country: string;
  indicator: string;
  timestamp: number;
  period: string;
  actual?: number;
  consensus?: number;
  previous?: number;
  unit: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedAssets: string[];
  sourceUrl?: string;
  sourceName?: string;
}

export interface TelemetryData {
  wsStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  wsLatencyMs: number;
  messagesPerSecond: number;
  dbQueueDepth: number;
  dbLatencyMs: number;
  cpuPercent: number;
  memoryMb: number;
  gpuPercent: number;
  vramMb: number;
  aiStatus: 'READY' | 'IDLE' | 'INFERRING' | 'UNLOADED';
  activeSubscriptions: number;
  cacheHitRate?: number;
}

export interface ReplayState {
  isActive: boolean;
  isPlaying: boolean;
  speed: number;
  currentTimestamp: number;
  startTimestamp: number;
  endTimestamp: number;
}

// Market Conditions & Analyzability
export type MarketSession = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP' | 'OFF_HOURS';
export type LiquidityRegime = 'HIGH' | 'MODERATE' | 'LOW' | 'ILLIQUID';
export type SpreadQuality = 'TIGHT' | 'NORMAL' | 'WIDE' | 'BLOWN_OUT';
export type VolumeRegime = 'ABOVE_NORMAL' | 'NORMAL' | 'COMPRESSED';
export type VolatilityRegime = 'LOW' | 'MODERATE' | 'ELEVATED' | 'EXTREME';
export type TrendStructure = 'CLEAN_TREND' | 'RANGE_BOUND' | 'CHOPPY' | 'RANDOM_WALK';
export type OrderFlowQuality = 'CONSISTENT' | 'IMBALANCED' | 'DIVERGENT';
export type MarketQualityScore = 'EXCELLENT' | 'GOOD' | 'MIXED' | 'DIFFICULT' | 'DISORDERLY';

export interface MarketConditionState {
  session: MarketSession;
  sessionDescription: string;
  liquidity: LiquidityRegime;
  spreadQuality: SpreadQuality;
  volumeRegime: VolumeRegime;
  volatilityRegime: VolatilityRegime;
  trendStructure: TrendStructure;
  orderFlowQuality: OrderFlowQuality;
  eventRisk: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH_IMMINENT';
  eventRiskDetail?: string;
  overallQuality: MarketQualityScore;
  reasons: string[];
  spreadBps: number;
  volumeZScore: number;
  realizedVolPct: number;
  choppinessIndex: number; // 0 - 100
}

// Charting & Technical Tools
export type ChartType =
  | 'candlestick'
  | 'hollow_candlestick'
  | 'ohlc_bars'
  | 'line'
  | 'area'
  | 'baseline'
  | 'heikin_ashi';

export type ScaleMode = 'AUTO' | 'FIT_DATA' | 'LOCK_SCALE' | 'PERCENTAGE' | 'LOG';

export type DrawingTool =
  | 'cursor'
  | 'crosshair'
  | 'trendline'
  | 'horizontal_line'
  | 'vertical_line'
  | 'ray'
  | 'parallel_channel'
  | 'fib_retracement'
  | 'rectangle'
  | 'text'
  | 'long_position'
  | 'short_position';

export interface DrawingItem {
  id: string;
  tool: DrawingTool;
  symbol: string;
  points: { time: number; price: number }[];
  color?: string;
  text?: string;
  settings?: Record<string, any>;
}

export interface PositionToolConfig {
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  accountSize: number;
  riskPercent: number;
}

export interface IndicatorConfig {
  id: string;
  type: 'SMA' | 'EMA' | 'VWAP' | 'BOLLINGER' | 'RSI' | 'MACD' | 'VOLUME_PROFILE';
  name: string;
  enabled: boolean;
  params: Record<string, any>;
  color: string;
}

// Workspace & Panels
export type PanelCategory =
  | 'MARKET'
  | 'ANALYTICS'
  | 'TRADING'
  | 'NEWS'
  | 'RESEARCH'
  | 'PORTFOLIO'
  | 'AI'
  | 'SYSTEM';

export interface PanelDefinition {
  id: string;
  title: string;
  category: PanelCategory;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  isExpensive?: boolean;
}

export interface WorkspacePreset {
  id: string;
  name: string;
  isCustom?: boolean;
  layout: any[];
}

// AI Diagnostics & Self-Test
export interface AiDiagnostics {
  modelName: string;
  backend: string;
  vramUsedMb: number;
  vramTotalMb: number;
  contextLength: number;
  tokensPerSecond: number;
  embeddingStatus: string;
  ragStatus: string;
  availableTools: string[];
  lastError?: string;
}

export interface AiSelfTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  latencyMs: number;
  details: string;
}
