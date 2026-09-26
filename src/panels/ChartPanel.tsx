import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  PriceScaleMode,
  CrosshairMode,
} from 'lightweight-charts';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  Minus,
  Activity,
  Layers,
  Crosshair,
  Magnet,
  Sliders,
  DollarSign,
  Trash2,
  Info,
  Link2,
  Unlink,
} from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import { marketMirror } from '../services/marketMirror';
import { marketConditionsService } from '../services/marketConditions';
import { chartSyncService } from '../services/chartSyncService';
import { canonicalizeInstrumentId } from '../services/instruments';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateRSI,
  calculateHeikinAshi,
} from '../utils/indicators';
import type {
  LinkGroup,
  ChartType,
  ScaleMode,
  DrawingTool,
  DrawingItem,
  PositionToolConfig,
  MarketConditionState,
} from '../types';
import PanelHeader from './PanelHeader';

interface ChartPanelProps {
  defaultGroup?: LinkGroup;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

export default function ChartPanel({
  defaultGroup = 'BLUE',
  onMaximize,
  isMaximized = false,
}: ChartPanelProps) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('15m');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('AUTO');
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Cross-chart & multi-monitor synchronization state
  const panelInstanceId = useRef('chart_' + Math.random().toString(36).slice(2, 8)).current;
  const isSyncingRangeRef = useRef(false);
  const [mirroredCrosshairX, setMirroredCrosshairX] = useState<number | null>(null);
  const [mirroredTime, setMirroredTime] = useState<number | null>(null);

  // Sync mode toggle: Synchronized with Main Chart vs Independent Decoupled
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`finpulse_chart_sync_${defaultGroup}`);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });
  const isSyncEnabledRef = useRef(isSyncEnabled);
  useEffect(() => {
    isSyncEnabledRef.current = isSyncEnabled;
    try {
      localStorage.setItem(`finpulse_chart_sync_${defaultGroup}`, JSON.stringify(isSyncEnabled));
    } catch {}
  }, [isSyncEnabled, defaultGroup]);

  // Indicators toggle state
  const [enabledIndicators, setEnabledIndicators] = useState<{
    sma20: boolean;
    sma50: boolean;
    ema9: boolean;
    ema21: boolean;
    bollinger: boolean;
    vwap: boolean;
    rsi: boolean;
  }>({
    sma20: false,
    sma50: false,
    ema9: true,
    ema21: false,
    bollinger: false,
    vwap: true,
    rsi: false,
  });

  // UI dropdown toggles
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showScaleMenu, setShowScaleMenu] = useState(false);
  const [showConditionDetail, setShowConditionDetail] = useState(false);

  // Drawings state
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<{ x: number; y: number }[]>([]);

  // Position Risk/Reward tool state
  const [positionConfig, setPositionConfig] = useState<PositionToolConfig | null>(null);
  const [positionType, setPositionType] = useState<'LONG' | 'SHORT' | null>(null);

  // Crosshair Mode: Normal (free-floating / leluasa) vs Magnet (snaps to candle)
  const [crosshairMode, setCrosshairMode] = useState<CrosshairMode>(() => {
    try {
      const saved = localStorage.getItem('finpulse_crosshair_mode');
      return saved === 'MAGNET' ? CrosshairMode.Magnet : CrosshairMode.Normal;
    } catch {
      return CrosshairMode.Normal;
    }
  });

  const toggleCrosshairMode = () => {
    setCrosshairMode((prev) => {
      const next = prev === CrosshairMode.Normal ? CrosshairMode.Magnet : CrosshairMode.Normal;
      try {
        localStorage.setItem('finpulse_crosshair_mode', next === CrosshairMode.Magnet ? 'MAGNET' : 'NORMAL');
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Refs
  const crosshairModeRef = useRef<CrosshairMode>(crosshairMode);
  useEffect(() => {
    crosshairModeRef.current = crosshairMode;
  }, [crosshairMode]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const subscriptionGenerationRef = useRef<number>(0);

  const activeInstrument = getSymbolForGroup(linkGroup);

  // Live bar stats
  const [lastStats, setLastStats] = useState<{
    high: number;
    low: number;
    vol: number;
    close: number;
    open: number;
  }>({
    high: 0,
    low: 0,
    vol: 0,
    close: 0,
    open: 0,
  });

  // Market condition state
  const [condition, setCondition] = useState<MarketConditionState | null>(null);

  // Load saved drawings on instrument switch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`finpulse_drawings_${activeInstrument.id}`);
      if (saved) {
        setDrawings(JSON.parse(saved));
      } else {
        setDrawings([]);
      }
    } catch {
      setDrawings([]);
    }
  }, [activeInstrument.id]);

  // Persist drawings
  const persistDrawings = (items: DrawingItem[]) => {
    setDrawings(items);
    try {
      localStorage.setItem(`finpulse_drawings_${activeInstrument.id}`, JSON.stringify(items));
    } catch {
      // Storage safe
    }
  };

  // Build chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // Safe ignore
      }
      chartRef.current = null;
    }

    try {
      const width = chartContainerRef.current.clientWidth || 400;
      const height = chartContainerRef.current.clientHeight || 280;

      // Price scale mode
      let lcScaleMode = PriceScaleMode.Normal;
      if (scaleMode === 'LOG') lcScaleMode = PriceScaleMode.Logarithmic;
      if (scaleMode === 'PERCENTAGE') lcScaleMode = PriceScaleMode.Percentage;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#090a0d' },
          textColor: '#888888',
          fontSize: 10,
          fontFamily: 'monospace',
        },
        grid: {
          vertLines: { color: '#14171d' },
          horzLines: { color: '#14171d' },
        },
        crosshair: {
          mode: crosshairModeRef.current,
          vertLine: { color: '#0070f3', width: 1, style: 2 },
          horzLine: { color: '#0070f3', width: 1, style: 2 },
        },
        timeScale: {
          borderColor: '#1e222a',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#1e222a',
          mode: lcScaleMode,
          minimumWidth: 80,
          scaleMargins: {
            top: 0.08,
            bottom: 0.22,
          },
        },
        width,
        height,
      });

      chartRef.current = chart;
      indicatorSeriesRef.current.clear();

      // Continuous Logical Range 60fps pan/zoom sync
      const onSyncLogicalRangeChange = (logicalRange: any) => {
        if (!isSyncEnabledRef.current) return;
        if (!logicalRange || isSyncingRangeRef.current) return;
        if (typeof logicalRange.from === 'number' && typeof logicalRange.to === 'number') {
          chartSyncService.broadcastLogicalRange(panelInstanceId, {
            from: logicalRange.from,
            to: logicalRange.to,
          });
        }
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(onSyncLogicalRangeChange);

      const unsubLogicalSync = chartSyncService.subscribeLogicalRange(panelInstanceId, (range) => {
        if (!isSyncEnabledRef.current) return;
        if (!chartRef.current) return;
        isSyncingRangeRef.current = true;
        try {
          chartRef.current.timeScale().setVisibleLogicalRange(range);
        } catch {
          // Ignore if out of bounds
        }
        requestAnimationFrame(() => {
          isSyncingRangeRef.current = false;
        });
      });

      // Synchronize visible Time Range (Fallback across intervals / symbols)
      const onSyncTimeRangeChange = (timeRange: any) => {
        if (!isSyncEnabledRef.current) return;
        if (!timeRange || isSyncingRangeRef.current) return;
        if (typeof timeRange.from === 'number' && typeof timeRange.to === 'number') {
          chartSyncService.broadcastTimeRange(panelInstanceId, {
            from: timeRange.from,
            to: timeRange.to,
          });
        }
      };
      chart.timeScale().subscribeVisibleTimeRangeChange(onSyncTimeRangeChange);

      // Listen for incoming time range changes
      const unsubTimeRangeSync = chartSyncService.subscribeTimeRange(panelInstanceId, (timeRange) => {
        if (!isSyncEnabledRef.current) return;
        if (!chartRef.current) return;
        isSyncingRangeRef.current = true;
        try {
          chartRef.current.timeScale().setVisibleRange(timeRange as any);
        } catch {
          // Ignore if out of bounds
        }
        requestAnimationFrame(() => {
          isSyncingRangeRef.current = false;
        });
      });

      // Synchronize Crosshair move
      chart.subscribeCrosshairMove((param) => {
        if (!isSyncEnabledRef.current) {
          chartSyncService.clearCrosshair(panelInstanceId);
          return;
        }
        if (!param.point || !param.time) {
          chartSyncService.clearCrosshair(panelInstanceId);
          return;
        }
        chartSyncService.broadcastCrosshair(panelInstanceId, {
          time: param.time as number,
        });
      });

      // Listen for incoming mirrored crosshair moves
      const unsubCrosshairSync = chartSyncService.subscribeCrosshair(panelInstanceId, (point) => {
        if (!isSyncEnabledRef.current) {
          setMirroredCrosshairX(null);
          setMirroredTime(null);
          return;
        }
        if (!chartRef.current || !chartContainerRef.current) return;
        if (chartContainerRef.current.clientWidth === 0 || chartContainerRef.current.clientHeight === 0) {
          return;
        }
        if (point.time === null) {
          setMirroredCrosshairX(null);
          setMirroredTime(null);
          return;
        }
        try {
          const x = chartRef.current.timeScale().timeToCoordinate(point.time as any);
          if (x !== null && x >= 0 && x <= chartContainerRef.current.clientWidth) {
            setMirroredCrosshairX(x);
            setMirroredTime(point.time);
          } else {
            setMirroredCrosshairX(null);
            setMirroredTime(null);
          }
        } catch {
          setMirroredCrosshairX(null);
          setMirroredTime(null);
        }
      });

      // Retrieve initial cached candles immediately (Stale-While-Revalidate)
      const rawCandles = marketData.getHistoricalCandles(activeInstrument.id, timeframe);
      const candles = chartType === 'heikin_ashi' ? calculateHeikinAshi(rawCandles) : rawCandles;

      // Evaluate initial condition
      const evaluatedCond = marketConditionsService.evaluateMarketCondition(
        activeInstrument.id,
        rawCandles
      );
      setCondition(evaluatedCond);

      // Create primary price series based on chartType
      let primarySeries: any;

      if (chartType === 'candlestick' || chartType === 'heikin_ashi') {
        primarySeries = chart.addSeries(CandlestickSeries, {
          upColor: '#00c853',
          downColor: '#ff3d00',
          borderVisible: false,
          wickUpColor: '#00c853',
          wickDownColor: '#ff3d00',
        });
        primarySeries.setData(candles as any);
      } else if (chartType === 'hollow_candlestick') {
        primarySeries = chart.addSeries(CandlestickSeries, {
          upColor: 'transparent',
          downColor: '#ff3d00',
          borderUpColor: '#00c853',
          borderDownColor: '#ff3d00',
          wickUpColor: '#00c853',
          wickDownColor: '#ff3d00',
        });
        primarySeries.setData(candles as any);
      } else if (chartType === 'ohlc_bars') {
        primarySeries = chart.addSeries(BarSeries, {
          upColor: '#00c853',
          downColor: '#ff3d00',
        });
        primarySeries.setData(candles as any);
      } else if (chartType === 'line') {
        primarySeries = chart.addSeries(LineSeries, {
          color: '#0070f3',
          lineWidth: 2,
        });
        primarySeries.setData(candles.map((c) => ({ time: c.time, value: c.close })) as any);
      } else if (chartType === 'area') {
        primarySeries = chart.addSeries(AreaSeries, {
          topColor: 'rgba(0, 112, 243, 0.35)',
          bottomColor: 'rgba(0, 112, 243, 0.02)',
          lineColor: '#0070f3',
          lineWidth: 2,
        });
        primarySeries.setData(candles.map((c) => ({ time: c.time, value: c.close })) as any);
      } else if (chartType === 'baseline') {
        const basePrice = candles.length > 0 ? candles[0].close : 100;
        primarySeries = chart.addSeries(BaselineSeries, {
          baseValue: { type: 'price', price: basePrice },
          topFillColor1: 'rgba(0, 200, 83, 0.25)',
          topFillColor2: 'rgba(0, 200, 83, 0.02)',
          topLineColor: '#00c853',
          bottomFillColor1: 'rgba(255, 61, 0, 0.02)',
          bottomFillColor2: 'rgba(255, 61, 0, 0.25)',
          bottomLineColor: '#ff3d00',
        });
        primarySeries.setData(candles.map((c) => ({ time: c.time, value: c.close })) as any);
      }

      mainSeriesRef.current = primarySeries;

      // Volume series
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volumeData = candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0, 200, 83, 0.35)' : 'rgba(255, 61, 0, 0.35)',
      }));
      volumeSeries.setData(volumeData as any);
      volumeSeriesRef.current = volumeSeries;

      // Render Indicators
      if (enabledIndicators.sma20) {
        const sma20 = chart.addSeries(LineSeries, { color: '#ffeb3b', lineWidth: 1 });
        sma20.setData(calculateSMA(candles, 20) as any);
        indicatorSeriesRef.current.set('sma20', sma20);
      }
      if (enabledIndicators.sma50) {
        const sma50 = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1 });
        sma50.setData(calculateSMA(candles, 50) as any);
        indicatorSeriesRef.current.set('sma50', sma50);
      }
      if (enabledIndicators.ema9) {
        const ema9 = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 1 });
        ema9.setData(calculateEMA(candles, 9) as any);
        indicatorSeriesRef.current.set('ema9', ema9);
      }
      if (enabledIndicators.ema21) {
        const ema21 = chart.addSeries(LineSeries, { color: '#e040fb', lineWidth: 1 });
        ema21.setData(calculateEMA(candles, 21) as any);
        indicatorSeriesRef.current.set('ema21', ema21);
      }
      if (enabledIndicators.bollinger) {
        const bb = calculateBollingerBands(candles, 20, 2);
        const upper = chart.addSeries(LineSeries, { color: 'rgba(38, 166, 154, 0.7)', lineWidth: 1 });
        const mid = chart.addSeries(LineSeries, { color: 'rgba(38, 166, 154, 0.4)', lineWidth: 1, lineStyle: 2 });
        const lower = chart.addSeries(LineSeries, { color: 'rgba(38, 166, 154, 0.7)', lineWidth: 1 });
        upper.setData(bb.upper as any);
        mid.setData(bb.middle as any);
        lower.setData(bb.lower as any);
        indicatorSeriesRef.current.set('bb_upper', upper);
        indicatorSeriesRef.current.set('bb_mid', mid);
        indicatorSeriesRef.current.set('bb_lower', lower);
      }
      if (enabledIndicators.vwap) {
        const vwapSeries = chart.addSeries(LineSeries, { color: '#d500f9', lineWidth: 1 });
        vwapSeries.setData(calculateVWAP(candles) as any);
        indicatorSeriesRef.current.set('vwap', vwapSeries);
      }
      if (enabledIndicators.rsi) {
        const rsiData = calculateRSI(candles, 14);
        const rsiSeries = chart.addSeries(LineSeries, {
          color: '#9c27b0',
          lineWidth: 1,
          priceScaleId: 'rsi_scale',
        });
        rsiSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.75, bottom: 0.05 },
        });
        rsiSeries.setData(rsiData as any);
        indicatorSeriesRef.current.set('rsi', rsiSeries);
      }

      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        setLastStats({
          high: last.high,
          low: last.low,
          vol: last.volume,
          close: last.close,
          open: last.open,
        });

        // Initialize default position tool prices
        setPositionConfig((prev) => {
          if (prev) return prev;
          const spreadOffset = last.close * 0.015;
          return {
            entryPrice: last.close,
            stopLossPrice: parseFloat((last.close - spreadOffset).toFixed(2)),
            targetPrice: parseFloat((last.close + spreadOffset * 2).toFixed(2)),
            accountSize: 10000,
            riskPercent: 1.0,
          };
        });
      }

      const canonicalActiveId = canonicalizeInstrumentId(activeInstrument.id);
      const currentGen = ++subscriptionGenerationRef.current;
      setIsLoadingHistory(candles.length === 0);

      // Listen for background REST updates via Stale-While-Revalidate mirror cache
      const unsubMirror = marketMirror.subscribeCandles((instId, tf, freshCandles) => {
        if (canonicalizeInstrumentId(instId) === canonicalActiveId && tf === timeframe && primarySeries) {
          setIsLoadingHistory(false);
          const displayCandles = chartType === 'heikin_ashi' ? calculateHeikinAshi(freshCandles) : freshCandles;
          const currentVisibleRange = chartRef.current?.timeScale().getVisibleRange();
          if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
            primarySeries.setData(displayCandles.map((c) => ({ time: c.time, value: c.close })) as any);
          } else {
            primarySeries.setData(displayCandles as any);
          }
          volumeSeries.setData(
            displayCandles.map((c) => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(0, 200, 83, 0.35)' : 'rgba(255, 61, 0, 0.35)',
            })) as any
          );

          if (currentVisibleRange && chartRef.current) {
            try {
              chartRef.current.timeScale().setVisibleRange(currentVisibleRange);
            } catch {}
          }

          // Update active indicators with full fresh dataset
          if (enabledIndicators.sma20) indicatorSeriesRef.current.get('sma20')?.setData(calculateSMA(freshCandles, 20) as any);
          if (enabledIndicators.sma50) indicatorSeriesRef.current.get('sma50')?.setData(calculateSMA(freshCandles, 50) as any);
          if (enabledIndicators.ema9) indicatorSeriesRef.current.get('ema9')?.setData(calculateEMA(freshCandles, 9) as any);
          if (enabledIndicators.ema21) indicatorSeriesRef.current.get('ema21')?.setData(calculateEMA(freshCandles, 21) as any);
          if (enabledIndicators.bollinger) {
            const bb = calculateBollingerBands(freshCandles, 20, 2);
            indicatorSeriesRef.current.get('bb_upper')?.setData(bb.upper as any);
            indicatorSeriesRef.current.get('bb_mid')?.setData(bb.middle as any);
            indicatorSeriesRef.current.get('bb_lower')?.setData(bb.lower as any);
          }
          if (enabledIndicators.vwap) indicatorSeriesRef.current.get('vwap')?.setData(calculateVWAP(freshCandles) as any);
          if (enabledIndicators.rsi) indicatorSeriesRef.current.get('rsi')?.setData(calculateRSI(freshCandles, 14) as any);

          if (displayCandles.length > 0) {
            const last = displayCandles[displayCandles.length - 1];
            setLastStats({
              open: last.open,
              high: last.high,
              low: last.low,
              vol: Math.round(last.volume),
              close: last.close,
            });
          }
        }
      });

      // Infinite backward historical scroll backfill
      let isFetchingEarlier = false;
      const onRangeChange = async (logicalRange: any) => {
        if (!logicalRange || isFetchingEarlier || isSyncingRangeRef.current) return;
        if (logicalRange.from < 25) {
          isFetchingEarlier = true;
          try {
            await marketData.fetchEarlierHistory(canonicalActiveId, timeframe);
          } finally {
            setTimeout(() => {
              isFetchingEarlier = false;
            }, 800);
          }
        }
      };

      chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

      // Authoritative realtime kline subscriber from official Binance exchange stream
      const unsubCandles = marketData.subscribeAuthoritativeCandles(
        canonicalActiveId,
        timeframe,
        currentGen,
        (authoritativeCandle, _isClosed, token) => {
          if (token?.generation !== currentGen || token?.instrumentId !== canonicalActiveId) return;
          setIsLoadingHistory(false);

          try {
            if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
              primarySeries.update({ time: authoritativeCandle.time, value: authoritativeCandle.close });
            } else {
              primarySeries.update(authoritativeCandle as any);
            }

            volumeSeries.update({
              time: authoritativeCandle.time,
              value: authoritativeCandle.volume,
              color:
                authoritativeCandle.close >= authoritativeCandle.open
                  ? 'rgba(0, 200, 83, 0.4)'
                  : 'rgba(255, 61, 0, 0.4)',
            } as any);

            setLastStats({
              open: authoritativeCandle.open,
              high: authoritativeCandle.high,
              low: authoritativeCandle.low,
              vol: Math.round(authoritativeCandle.volume),
              close: authoritativeCandle.close,
            });
          } catch {
            // Ignore transient race
          }
        }
      );

      // Realtime trade tick subscriber with session token to prevent late packets from corrupting series
      const unsubTrades = marketData.subscribeTrades(
        canonicalActiveId,
        currentGen,
        (_trade, token) => {
          if (token?.generation !== currentGen || token?.instrumentId !== canonicalActiveId) return;
          // Trades update tape & CVD, while candle series is driven authoritatively by klines
        }
      );

      // Resize observer
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0 && chartRef.current) {
            chartRef.current.applyOptions({
              width: Math.floor(entry.contentRect.width),
              height: Math.floor(entry.contentRect.height),
            });
          }
        }
      });
      ro.observe(chartContainerRef.current);

      return () => {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onSyncLogicalRangeChange);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(onSyncTimeRangeChange);
        unsubLogicalSync();
        unsubTimeRangeSync();
        unsubCrosshairSync();
        chartSyncService.clearCrosshair(panelInstanceId);
        unsubTrades();
        unsubCandles();
        unsubMirror();
        ro.disconnect();
        try {
          chart.remove();
        } catch {
          // Safe ignore
        }
        chartRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize chart in ChartPanel:', err);
    }
  }, [activeInstrument.id, timeframe, chartType, scaleMode, enabledIndicators]);

  // Dynamically update crosshair mode without re-creating the entire chart
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.applyOptions({
        crosshair: {
          mode: crosshairMode,
        },
      });
    } catch {
      // safe ignore
    }
  }, [crosshairMode]);

  // Listen for timeframe changes triggered from the Fullscreen Hotbar
  useEffect(() => {
    const handleHotbarTf = (e: any) => {
      if (e?.detail) setTimeframe(e.detail);
    };
    window.addEventListener('finpulse-hotbar-timeframe', handleHotbarTf);
    return () => window.removeEventListener('finpulse-hotbar-timeframe', handleHotbarTf);
  }, []);

  // Risk / Reward computations
  const rrCalculation = useMemo(() => {
    if (!positionConfig) return null;
    const { entryPrice, stopLossPrice, targetPrice, accountSize, riskPercent } = positionConfig;

    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    const rewardPerShare = Math.abs(targetPrice - entryPrice);

    if (riskPerShare <= 0) return null;

    const rrRatio = rewardPerShare / riskPerShare;
    const dollarRisk = (accountSize * riskPercent) / 100;
    const sharesToTrade = dollarRisk / riskPerShare;
    const dollarReward = sharesToTrade * rewardPerShare;
    const riskPctOfPrice = (riskPerShare / entryPrice) * 100;
    const rewardPctOfPrice = (rewardPerShare / entryPrice) * 100;

    return {
      rrRatio: rrRatio.toFixed(2),
      dollarRisk: Math.round(dollarRisk),
      dollarReward: Math.round(dollarReward),
      sharesToTrade: sharesToTrade.toFixed(4),
      riskPct: riskPctOfPrice.toFixed(2),
      rewardPct: rewardPctOfPrice.toFixed(2),
    };
  }, [positionConfig]);

  // SVG Drawing click handler
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'horizontal_line') {
      const newItem: DrawingItem = {
        id: `draw_${Date.now()}`,
        tool: 'horizontal_line',
        symbol: activeInstrument.id,
        points: [{ time: Date.now(), price: lastStats.close }],
        settings: { y },
        color: '#ffeb3b',
      };
      persistDrawings([...drawings, newItem]);
      setActiveTool('cursor');
    } else if (activeTool === 'trendline' || activeTool === 'fib_retracement' || activeTool === 'rectangle') {
      if (currentDrawingPoints.length === 0) {
        setCurrentDrawingPoints([{ x, y }]);
      } else {
        const newItem: DrawingItem = {
          id: `draw_${Date.now()}`,
          tool: activeTool,
          symbol: activeInstrument.id,
          points: [{ time: Date.now(), price: lastStats.close }],
          settings: {
            p1: currentDrawingPoints[0],
            p2: { x, y },
          },
          color: activeTool === 'fib_retracement' ? '#00e5ff' : '#0070f3',
        };
        persistDrawings([...drawings, newItem]);
        setCurrentDrawingPoints([]);
        setActiveTool('cursor');
      }
    } else if (activeTool === 'text') {
      const textVal = window.prompt('Enter annotation text:', 'Key Level');
      if (textVal) {
        const newItem: DrawingItem = {
          id: `draw_${Date.now()}`,
          tool: 'text',
          symbol: activeInstrument.id,
          points: [{ time: Date.now(), price: lastStats.close }],
          text: textVal,
          settings: { x, y },
          color: '#ffffff',
        };
        persistDrawings([...drawings, newItem]);
      }
      setActiveTool('cursor');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090a0d] text-xs font-mono select-none relative">
      {/* Top Header */}
      <PanelHeader
        title={`CHART [${activeInstrument.displaySymbol}]`}
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-1">
            {/* Timeframe switch */}
            {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  timeframe === tf ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text'
                }`}
              >
                {tf}
              </button>
            ))}

            <div className="w-[1px] h-3 bg-border/40 mx-1" />

            {/* Maximize Toggle */}
            {onMaximize && (
              <button
                type="button"
                onClick={onMaximize}
                className="p-1 text-muted hover:text-text hover:bg-surface rounded transition-colors"
                title={isMaximized ? 'Restore Layout' : 'Maximize Chart'}
              >
                {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            )}
          </div>
        }
      />

      {/* Sub-toolbar: Indicators, Chart Type, Scale, Market Condition */}
      <div className="h-7 bg-[#111317] border-b border-border/40 px-2 flex items-center justify-between text-[11px] text-muted shrink-0 z-20">
        <div className="flex items-center space-x-2">
          {/* Chart Type Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-surface hover:bg-surface-hover text-text border border-border/50 text-[10px]"
            >
              <TrendingUp size={11} className="text-accent" />
              <span className="capitalize">{chartType.replace('_', ' ')}</span>
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-[#161920] border border-border/80 rounded shadow-2xl py-1 z-50 flex flex-col text-[10px]">
                {(
                  [
                    'candlestick',
                    'hollow_candlestick',
                    'ohlc_bars',
                    'line',
                    'area',
                    'baseline',
                    'heikin_ashi',
                  ] as ChartType[]
                ).map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => {
                      setChartType(ct);
                      setShowTypeMenu(false);
                    }}
                    className={`px-2.5 py-1 text-left capitalize hover:bg-accent/20 ${
                      chartType === ct ? 'text-accent font-bold' : 'text-text'
                    }`}
                  >
                    {ct.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indicators Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndicatorsMenu(!showIndicatorsMenu)}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-surface hover:bg-surface-hover text-text border border-border/50 text-[10px]"
            >
              <Activity size={11} className="text-warning" />
              <span>Indicators</span>
            </button>
            {showIndicatorsMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-[#161920] border border-border/80 rounded shadow-2xl py-1 z-50 flex flex-col text-[10px]">
                <div className="px-2 py-0.5 text-[9px] text-muted uppercase font-bold tracking-wider border-b border-border/30">
                  Moving Averages
                </div>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.sma20}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, sma20: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>SMA 20 (Yellow)</span>
                </label>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.sma50}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, sma50: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>SMA 50 (Orange)</span>
                </label>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.ema9}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, ema9: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>EMA 9 (Cyan)</span>
                </label>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.ema21}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, ema21: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>EMA 21 (Magenta)</span>
                </label>

                <div className="px-2 py-0.5 text-[9px] text-muted uppercase font-bold tracking-wider border-t border-b border-border/30 mt-1">
                  Volatility & Flow
                </div>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.bollinger}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, bollinger: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>Bollinger Bands (20, 2)</span>
                </label>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.vwap}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, vwap: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>VWAP Session</span>
                </label>
                <label className="flex items-center space-x-2 px-2.5 py-1 hover:bg-surface cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={enabledIndicators.rsi}
                    onChange={(e) => setEnabledIndicators((p) => ({ ...p, rsi: e.target.checked }))}
                    className="accent-accent"
                  />
                  <span>RSI (14)</span>
                </label>
              </div>
            )}
          </div>

          {/* Scale Mode Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowScaleMenu(!showScaleMenu)}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-surface hover:bg-surface-hover text-text border border-border/50 text-[10px]"
            >
              <Sliders size={11} className="text-muted" />
              <span>{scaleMode}</span>
            </button>
            {showScaleMenu && (
              <div className="absolute top-full left-0 mt-1 w-28 bg-[#161920] border border-border/80 rounded shadow-2xl py-1 z-50 flex flex-col text-[10px]">
                {(['AUTO', 'LOG', 'PERCENTAGE'] as ScaleMode[]).map((sm) => (
                  <button
                    key={sm}
                    type="button"
                    onClick={() => {
                      setScaleMode(sm);
                      setShowScaleMenu(false);
                    }}
                    className={`px-2 py-1 text-left hover:bg-accent/20 ${
                      scaleMode === sm ? 'text-accent font-bold' : 'text-text'
                    }`}
                  >
                    {sm}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Crosshair Mode: Free (Leluasa) vs Magnet (Snap ke Candle) */}
          <button
            type="button"
            onClick={toggleCrosshairMode}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1.5 ${
              crosshairMode === CrosshairMode.Magnet
                ? 'bg-accent/20 text-accent border-accent/50 hover:bg-accent/30'
                : 'bg-surface hover:bg-surface-hover text-text border-border/50 hover:border-accent/40'
            }`}
            title={
              crosshairMode === CrosshairMode.Magnet
                ? 'Mode Crosshair: SNAP KE CANDLE (Magnet) [Klik untuk mode Leluasa]'
                : 'Mode Crosshair: LELUASA (Free Floating) [Klik untuk Snap ke Candle]'
            }
          >
            {crosshairMode === CrosshairMode.Magnet ? (
              <>
                <Magnet size={11} className="text-accent" />
                <span>SNAP</span>
              </>
            ) : (
              <>
                <Crosshair size={11} className="text-muted" />
                <span>LELUASA</span>
              </>
            )}
          </button>

          {/* Sync Mode Toggle: SYNC ON vs INDEPENDENT */}
          <button
            type="button"
            onClick={() => setIsSyncEnabled((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
              isSyncEnabled
                ? 'bg-[#00c087]/15 text-[#00c087] border-[#00c087]/40 hover:bg-[#00c087]/25'
                : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/25'
            }`}
            title={
              isSyncEnabled
                ? 'Chart tersinkronisasi dengan Main Chart / Desk lain (Pan & Zoom sinkron). Klik untuk beralih ke Mode Bebas / Independent.'
                : 'Chart independen / decoupled. Anda bebas menggeser, zoom, dan melihat riwayat tanpa mempengaruhi atau dipengaruhi chart lain. Klik untuk sinkron kembali.'
            }
          >
            {isSyncEnabled ? (
              <>
                <Link2 size={11} className="text-[#00c087]" />
                <span>SYNC ON</span>
              </>
            ) : (
              <>
                <Unlink size={11} className="text-yellow-400" />
                <span>INDEPENDENT</span>
              </>
            )}
          </button>
        </div>

        {/* Compact Market Condition Badge */}
        {condition && (
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowConditionDetail(!showConditionDetail)}
              className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#161b24] border border-border/60 hover:border-accent/60 transition-colors text-[10px]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
              <span className="text-text font-bold uppercase">{condition.session.replace('_', ' ')}</span>
              <span className="text-muted">|</span>
              <span
                className={`font-semibold ${
                  condition.overallQuality === 'EXCELLENT' || condition.overallQuality === 'GOOD'
                    ? 'text-up'
                    : condition.overallQuality === 'MIXED'
                    ? 'text-warning'
                    : 'text-down'
                }`}
              >
                {condition.overallQuality}
              </span>
              <span className="text-muted">|</span>
              <span className="text-muted">
                SPD: <span className="text-text font-mono">{condition.spreadBps}bps</span>
              </span>
              <Info size={10} className="text-muted ml-0.5" />
            </button>

            {/* Condition Popover Details */}
            {showConditionDetail && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-[#14171f] border border-border/80 rounded shadow-2xl p-2.5 z-50 text-[10px] space-y-1.5">
                <div className="font-bold text-text flex items-center justify-between border-b border-border/40 pb-1">
                  <span>MARKET COND & ANALYZABILITY</span>
                  <span className="text-accent">{condition.session}</span>
                </div>
                <div className="text-muted">{condition.sessionDescription}</div>
                <div className="grid grid-cols-2 gap-1 text-[9px] pt-1">
                  <div>
                    LIQUIDITY: <span className="text-text font-bold">{condition.liquidity}</span>
                  </div>
                  <div>
                    TREND: <span className="text-text font-bold">{condition.trendStructure}</span>
                  </div>
                  <div>
                    VOLATILITY: <span className="text-text font-bold">{condition.volatilityRegime}</span>
                  </div>
                  <div>
                    CHOP INDEX: <span className="text-text font-bold">{condition.choppinessIndex}/100</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-border/40">
                  <div className="text-muted text-[9px] uppercase font-semibold mb-0.5">Execution Notes:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-text text-[9px]">
                    {condition.reasons.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace Area (Left Drawing Toolbar + Center Chart Container + Overlay) */}
      <div className="flex-grow flex relative min-h-0 overflow-hidden">
        {/* Left Vertical Drawing Toolbar */}
        <div className="w-8 bg-[#111317] border-r border-border/40 flex flex-col items-center py-2 space-y-2 shrink-0 z-10 text-muted">
          <button
            type="button"
            onClick={() => {
              setActiveTool('cursor');
              setPositionType(null);
            }}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'cursor' ? 'bg-accent text-white' : 'hover:bg-surface hover:text-text'
            }`}
            title="Cursor / Pan (Escape)"
          >
            <Crosshair size={13} />
          </button>

          {/* Magnet / Snap to Candle Button */}
          <button
            type="button"
            onClick={toggleCrosshairMode}
            className={`p-1.5 rounded transition-all relative ${
              crosshairMode === CrosshairMode.Magnet
                ? 'bg-accent text-white shadow-sm shadow-accent/50'
                : 'hover:bg-surface hover:text-text'
            }`}
            title={
              crosshairMode === CrosshairMode.Magnet
                ? 'Crosshair: Snap ke Candle (Magnet Aktif) [Klik untuk mode Leluasa]'
                : 'Crosshair: Leluasa (Free Cursor) [Klik untuk Snap ke Candle]'
            }
          >
            <Magnet size={13} />
            {crosshairMode === CrosshairMode.Magnet && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-up rounded-full ring-1 ring-black" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('trendline')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'trendline' ? 'bg-accent text-white' : 'hover:bg-surface hover:text-text'
            }`}
            title="Trendline (Click 2 points)"
          >
            <TrendingUp size={13} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('horizontal_line')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'horizontal_line' ? 'bg-accent text-white' : 'hover:bg-surface hover:text-text'
            }`}
            title="Horizontal Level"
          >
            <Minus size={13} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('fib_retracement')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'fib_retracement' ? 'bg-accent text-white' : 'hover:bg-surface hover:text-text'
            }`}
            title="Fibonacci Retracement"
          >
            <Layers size={13} />
          </button>

          <button
            type="button"
            onClick={() => {
              setPositionType(positionType === 'LONG' ? null : 'LONG');
            }}
            className={`p-1.5 rounded transition-colors ${
              positionType === 'LONG' ? 'bg-up text-black font-bold' : 'hover:bg-surface hover:text-up'
            }`}
            title="Long Position Risk/Reward Calculator"
          >
            <DollarSign size={13} />
          </button>

          <button
            type="button"
            onClick={() => {
              setPositionType(positionType === 'SHORT' ? null : 'SHORT');
            }}
            className={`p-1.5 rounded transition-colors ${
              positionType === 'SHORT' ? 'bg-down text-white font-bold' : 'hover:bg-surface hover:text-down'
            }`}
            title="Short Position Risk/Reward Calculator"
          >
            <DollarSign size={13} />
          </button>

          {drawings.length > 0 && (
            <button
              type="button"
              onClick={() => persistDrawings([])}
              className="p-1.5 rounded hover:bg-down/20 text-muted hover:text-down transition-colors mt-auto"
              title="Clear All Drawings"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Chart Viewport */}
        <div className="flex-grow relative h-full w-full overflow-hidden">
          {/* Lightweight Charts Canvas Host */}
          <div
            className="w-full h-full"
            ref={chartContainerRef}
            onMouseLeave={() => chartSyncService.clearCrosshair(panelInstanceId)}
          />

          {/* Mirrored Crosshair from CVD / Secondary Monitor */}
          {mirroredCrosshairX !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col justify-between"
              style={{ left: `${mirroredCrosshairX}px` }}
            >
              <div className="w-[1px] h-full border-l border-dashed border-[#00d2ff]" />
              {mirroredTime && (
                <div className="absolute bottom-6 -translate-x-1/2 bg-[#00d2ff] text-black text-[9px] font-bold px-1 rounded shadow pointer-events-none">
                  {new Date(mirroredTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}

          {/* Loading Authoritative Data Indicator */}
          {isLoadingHistory && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
              <div className="flex items-center space-x-2 text-accent text-xs bg-[#12151c] px-3 py-1.5 rounded border border-border/60 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span>Synchronizing authoritative exchange history...</span>
              </div>
            </div>
          )}

          {/* Interactive SVG Drawing Overlay */}
          <svg
            className={`absolute inset-0 w-full h-full ${
              activeTool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'
            }`}
            onClick={handleSvgClick}
          >
            {/* Render saved drawings */}
            {drawings.map((d) => {
              if (d.tool === 'horizontal_line' && d.settings?.y) {
                return (
                  <line
                    key={d.id}
                    x1={0}
                    y1={d.settings.y}
                    x2="100%"
                    y2={d.settings.y}
                    stroke={d.color || '#ffeb3b'}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                );
              }
              if (d.tool === 'trendline' && d.settings?.p1 && d.settings?.p2) {
                return (
                  <line
                    key={d.id}
                    x1={d.settings.p1.x}
                    y1={d.settings.p1.y}
                    x2={d.settings.p2.x}
                    y2={d.settings.p2.y}
                    stroke={d.color || '#0070f3'}
                    strokeWidth={1.5}
                  />
                );
              }
              if (d.tool === 'fib_retracement' && d.settings?.p1 && d.settings?.p2) {
                const y1 = d.settings.p1.y;
                const y2 = d.settings.p2.y;
                const diff = y2 - y1;
                const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
                return (
                  <g key={d.id}>
                    {levels.map((lvl) => {
                      const curY = y1 + diff * lvl;
                      return (
                        <g key={lvl}>
                          <line
                            x1={0}
                            y1={curY}
                            x2="100%"
                            y2={curY}
                            stroke={d.color || '#00e5ff'}
                            strokeWidth={1}
                            strokeOpacity={0.6}
                          />
                          <text
                            x={10}
                            y={curY - 3}
                            fill={d.color || '#00e5ff'}
                            fontSize={9}
                            fontFamily="monospace"
                          >
                            {(lvl * 100).toFixed(1)}%
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              }
              if (d.tool === 'text' && d.settings?.x && d.settings?.y) {
                return (
                  <text
                    key={d.id}
                    x={d.settings.x}
                    y={d.settings.y}
                    fill={d.color || '#ffffff'}
                    fontSize={10}
                    fontFamily="monospace"
                  >
                    {d.text}
                  </text>
                );
              }
              return null;
            })}

            {/* Currently drawing preview */}
            {currentDrawingPoints.length > 0 && (
              <circle
                cx={currentDrawingPoints[0].x}
                cy={currentDrawingPoints[0].y}
                r={4}
                fill="#0070f3"
                className="animate-ping"
              />
            )}
          </svg>

          {/* Long / Short Position Calculator Overlay Card */}
          {positionType && positionConfig && rrCalculation && (
            <div className="absolute top-3 left-4 bg-[#141720]/95 border border-border/80 backdrop-blur-md rounded shadow-2xl p-3 w-72 z-30 space-y-2 text-[11px]">
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <span
                  className={`font-bold flex items-center space-x-1 ${
                    positionType === 'LONG' ? 'text-up' : 'text-down'
                  }`}
                >
                  <DollarSign size={13} />
                  <span>{positionType} POSITION RISK / REWARD</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPositionType(null)}
                  className="text-muted hover:text-text text-xs"
                >
                  x
                </button>
              </div>

              {/* R:R Ratio Highlight */}
              <div className="flex items-center justify-between bg-surface/80 p-2 rounded border border-border/40">
                <div>
                  <div className="text-muted text-[10px]">RISK : REWARD</div>
                  <div className="text-sm font-bold text-accent">1 : {rrCalculation.rrRatio}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted text-[10px]">REWARD / RISK ($)</div>
                  <div className="text-text font-bold">
                    <span className="text-up">+${rrCalculation.dollarReward}</span> /{' '}
                    <span className="text-down">-${rrCalculation.dollarRisk}</span>
                  </div>
                </div>
              </div>

              {/* Price inputs */}
              <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Target (TP):</span>
                  <input
                    type="number"
                    step="any"
                    value={positionConfig.targetPrice}
                    onChange={(e) =>
                      setPositionConfig({ ...positionConfig, targetPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 bg-surface border border-border/60 rounded px-1.5 py-0.5 text-right font-mono text-up focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Entry Price:</span>
                  <input
                    type="number"
                    step="any"
                    value={positionConfig.entryPrice}
                    onChange={(e) =>
                      setPositionConfig({ ...positionConfig, entryPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 bg-surface border border-border/60 rounded px-1.5 py-0.5 text-right font-mono text-text focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Stop Loss (SL):</span>
                  <input
                    type="number"
                    step="any"
                    value={positionConfig.stopLossPrice}
                    onChange={(e) =>
                      setPositionConfig({ ...positionConfig, stopLossPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 bg-surface border border-border/60 rounded px-1.5 py-0.5 text-right font-mono text-down focus:outline-none"
                  />
                </div>
              </div>

              {/* Sizing calculations */}
              <div className="pt-1.5 border-t border-border/40 grid grid-cols-2 gap-1 text-[9px] text-muted">
                <div>
                  SL DISTANCE: <span className="text-down font-bold">{rrCalculation.riskPct}%</span>
                </div>
                <div>
                  TP DISTANCE: <span className="text-up font-bold">+{rrCalculation.rewardPct}%</span>
                </div>
                <div>
                  REC. SHARES: <span className="text-text font-bold">{rrCalculation.sharesToTrade}</span>
                </div>
                <div>
                  PORTFOLIO RISK: <span className="text-text font-bold">{positionConfig.riskPercent}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Ticker Stats Bottom Bar */}
      <div className="h-6 bg-[#111317] border-t border-border/40 px-3 flex items-center justify-between text-[10px] text-muted shrink-0">
        <div className="flex items-center space-x-4">
          <div>
            VENUE: <span className="text-text font-bold">{activeInstrument.venue}</span>
          </div>
          <div>
            OPEN: <span className="text-text">{lastStats.open.toFixed(activeInstrument.priceDecimals)}</span>
          </div>
          <div>
            HIGH: <span className="text-up font-bold">{lastStats.high.toFixed(activeInstrument.priceDecimals)}</span>
          </div>
          <div>
            LOW: <span className="text-down font-bold">{lastStats.low.toFixed(activeInstrument.priceDecimals)}</span>
          </div>
          <div>
            LAST: <span className="text-text font-bold">{lastStats.close.toFixed(activeInstrument.priceDecimals)}</span>
          </div>
          <div>
            VOL: <span className="text-text">{lastStats.vol.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[9px]">
          <span className="text-muted">CACHE:</span>
          <span className="text-up font-bold">HOT (SWR ACTIVE)</span>
        </div>
      </div>
    </div>
  );
}
