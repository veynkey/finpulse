import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import {
  RefreshCw,
  Zap,
  CandlestickChart,
  LineChart as LineChartIcon,
  ChevronDown,
  Maximize2,
  Minimize2,
  Activity,
  Link2,
  Unlink,
} from 'lucide-react';
import { useTerminal } from '../context/TerminalContext';
import { chartSyncService } from '../services/chartSyncService';
import type { LinkGroup } from '../types';
import PanelHeader from './PanelHeader';

export type CvdMarketMode = 'SPOT' | 'FUTURES' | 'DUAL';
export type CvdTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
export type CvdChartStyle = 'CANDLES' | 'LINE';

interface CandleCvdData {
  time: number; // in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVol: number;
  sellVol: number;
  delta: number;
  cvdOpen: number;
  cvdHigh: number;
  cvdLow: number;
  cvdClose: number;
}

const TIMEFRAMES: CvdTimeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

// Comprehensive classified list of major cryptocurrency trading pairs
const COIN_CATEGORIES: Record<string, string[]> = {
  'MAJORS': ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA'],
  'L1 & L2': ['SUI', 'AVAX', 'NEAR', 'LINK', 'DOT', 'APT', 'TIA', 'ARB', 'OP', 'POL', 'SEI'],
  'MEMES': ['PEPE', 'WIF', 'BONK', 'SHIB', 'FLOKI', 'POPCAT', 'NEIRO'],
  'AI & DEFI': ['TAO', 'RENDER', 'FET', 'INJ', 'AAVE', 'UNI', 'PENDLE', 'RUNE', 'LDO'],
};

const ALL_COINS = Object.values(COIN_CATEGORIES).flat();

export default function CVDPanel({
  defaultGroup = 'BLUE',
  onMaximize,
  isMaximized = false,
}: {
  defaultGroup?: LinkGroup;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(linkGroup);

  // Symbol & Market state
  const [useLinkedSymbol, setUseLinkedSymbol] = useState(true);
  const [manualSymbol, setManualSymbol] = useState('BTCUSDT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MAJORS' | 'L1 & L2' | 'MEMES' | 'AI & DEFI'>('MAJORS');
  const [isCoinPickerOpen, setIsCoinPickerOpen] = useState(false);

  const activeSymbol = useMemo(() => {
    if (useLinkedSymbol && activeInstrument) {
      const raw = activeInstrument.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return raw.endsWith('USDT') ? raw : `${raw}USDT`;
    }
    return manualSymbol.toUpperCase();
  }, [useLinkedSymbol, activeInstrument, manualSymbol]);

  // Market Mode, Chart Style & Timeframe
  const [marketMode, setMarketMode] = useState<CvdMarketMode>('DUAL');
  const [chartStyle, setChartStyle] = useState<CvdChartStyle>('CANDLES');
  const [timeframe, setTimeframe] = useState<CvdTimeframe>('15m');
  const [isLoading, setIsLoading] = useState(false);

  // Initial fit tracker ref
  const hasInitialFitRef = useRef(false);
  useEffect(() => {
    hasInitialFitRef.current = false;
  }, [activeSymbol, timeframe]);

  // Listen for timeframe changes triggered from the Fullscreen Hotbar
  useEffect(() => {
    const handleHotbarTf = (e: any) => {
      if (e?.detail) setTimeframe(e.detail as CvdTimeframe);
    };
    window.addEventListener('finpulse-hotbar-timeframe', handleHotbarTf);
    return () => window.removeEventListener('finpulse-hotbar-timeframe', handleHotbarTf);
  }, []);

  // Real-time metric summaries
  const [spotCvdSummary, setSpotCvdSummary] = useState({ cvd: 0, netDelta: 0, buyRatio: 50, divergence: 'NEUTRAL' });
  const [futCvdSummary, setFutCvdSummary] = useState({ cvd: 0, netDelta: 0, buyRatio: 50, divergence: 'NEUTRAL' });

  // Chart DOM refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Cross-chart & multi-monitor synchronization state
  const panelInstanceId = useRef('cvd_' + Math.random().toString(36).slice(2, 8)).current;
  const isSyncingRangeRef = useRef(false);
  const [mirroredCrosshairX, setMirroredCrosshairX] = useState<number | null>(null);
  const [mirroredTime, setMirroredTime] = useState<number | null>(null);

  // Sync mode toggle: Synchronized with Main Chart vs Independent Decoupled
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`finpulse_cvd_sync_${defaultGroup}`);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });
  const isSyncEnabledRef = useRef(isSyncEnabled);
  useEffect(() => {
    isSyncEnabledRef.current = isSyncEnabled;
    try {
      localStorage.setItem(`finpulse_cvd_sync_${defaultGroup}`, JSON.stringify(isSyncEnabled));
    } catch {}
  }, [isSyncEnabled, defaultGroup]);

  // Series refs
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const spotLineSeriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Line'> | null>(null);
  const futLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const deltaHistogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Latest candle data ref for WebSocket intra-bar candle update
  const latestCandleRef = useRef<{
    time: number;
    cvdOpen: number;
    cvdHigh: number;
    cvdLow: number;
    cvdClose: number;
  } | null>(null);

  // WebSocket connections ref
  const wsSpotRef = useRef<WebSocket | null>(null);
  const wsFutRef = useRef<WebSocket | null>(null);

  // Process Kline data into CVD Candlestick format
  const processKlines = (rawKlines: any[]): CandleCvdData[] => {
    let runningCvd = 0;
    return rawKlines.map((k: any) => {
      const time = Math.floor(k[0] / 1000);
      const open = parseFloat(k[1]);
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);
      const volume = parseFloat(k[5]);
      const buyVol = parseFloat(k[9]); // taker buy base asset volume
      const sellVol = Math.max(0, volume - buyVol);
      const delta = buyVol - sellVol;

      const cvdOpen = runningCvd;
      const cvdClose = runningCvd + delta;
      
      // Calculate realistic CVD candle wick bounds
      const wickPadding = Math.abs(delta) * 0.12;
      const cvdHigh = Math.max(cvdOpen, cvdClose) + wickPadding;
      const cvdLow = Math.min(cvdOpen, cvdClose) - wickPadding;
      runningCvd = cvdClose;

      return {
        time,
        open,
        high,
        low,
        close,
        volume,
        buyVol,
        sellVol,
        delta,
        cvdOpen,
        cvdHigh,
        cvdLow,
        cvdClose,
      };
    });
  };

  // Evaluate orderflow divergence between Price and CVD
  const evaluateDivergence = (data: CandleCvdData[]) => {
    if (data.length < 15) return 'NEUTRAL';
    const start = data[data.length - 15];
    const end = data[data.length - 1];
    const priceChange = ((end.close - start.close) / start.close) * 100;
    const cvdChange = end.cvdClose - start.cvdClose;

    if (priceChange > 0.6 && cvdChange < 0) {
      return 'BEARISH ABSORPTION (Sellers absorbing buyers)';
    }
    if (priceChange < -0.6 && cvdChange > 0) {
      return 'BULLISH ABSORPTION (Buyers absorbing sellers)';
    }
    if (priceChange > 1.0 && cvdChange > 0) {
      return 'BULLISH EXPANSION (Aggressive buyers leading)';
    }
    if (priceChange < -1.0 && cvdChange < 0) {
      return 'BEARISH EXPANSION (Aggressive sellers leading)';
    }
    return 'BALANCED ORDER FLOW';
  };

  // Fetch Kline history and calculate Cumulative Volume Delta
  const loadCvdData = useCallback(async () => {
    setIsLoading(true);
    const symbol = activeSymbol;
    const tf = timeframe;

    try {
      const spotUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=1000`;
      const futUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${tf}&limit=1000`;

      const [spotRes, futRes] = await Promise.allSettled([
        fetch(spotUrl).then((r) => (r.ok ? r.json() : [])),
        fetch(futUrl).then((r) => (r.ok ? r.json() : [])),
      ]);

      const rawSpot = spotRes.status === 'fulfilled' && Array.isArray(spotRes.value) ? spotRes.value : [];
      const rawFut = futRes.status === 'fulfilled' && Array.isArray(futRes.value) ? futRes.value : [];

      const spotData = processKlines(rawSpot);
      const futData = processKlines(rawFut);

      const totalSpotVol = spotData.reduce((acc, d) => acc + d.volume, 0);
      const totalSpotBuy = spotData.reduce((acc, d) => acc + d.buyVol, 0);
      const totalFutVol = futData.reduce((acc, d) => acc + d.volume, 0);
      const totalFutBuy = futData.reduce((acc, d) => acc + d.buyVol, 0);

      const spotRatio = totalSpotVol > 0 ? Math.round((totalSpotBuy / totalSpotVol) * 100) : 50;
      const futRatio = totalFutVol > 0 ? Math.round((totalFutBuy / totalFutVol) * 100) : 50;

      const lastSpot = spotData[spotData.length - 1];
      const lastFut = futData[futData.length - 1];

      setSpotCvdSummary({
        cvd: lastSpot ? lastSpot.cvdClose : 0,
        netDelta: lastSpot ? lastSpot.delta : 0,
        buyRatio: spotRatio,
        divergence: evaluateDivergence(spotData),
      });

      setFutCvdSummary({
        cvd: lastFut ? lastFut.cvdClose : 0,
        netDelta: lastFut ? lastFut.delta : 0,
        buyRatio: futRatio,
        divergence: evaluateDivergence(futData),
      });

      // Track latest candle for real-time intra-bar WebSocket updates
      const activeSourceData = marketMode === 'FUTURES' ? futData : spotData;
      if (activeSourceData.length > 0) {
        const latest = activeSourceData[activeSourceData.length - 1];
        latestCandleRef.current = {
          time: latest.time,
          cvdOpen: latest.cvdOpen,
          cvdHigh: latest.cvdHigh,
          cvdLow: latest.cvdLow,
          cvdClose: latest.cvdClose,
        };
      }

      // Update Chart Series
      if (chartRef.current) {
        const prevRange = chartRef.current.timeScale().getVisibleRange();

        if (chartStyle === 'CANDLES') {
          // Render as true CVD Candlesticks!
          const primaryData = marketMode === 'FUTURES' ? futData : spotData;
          const candlePoints = primaryData.map((d) => ({
            time: d.time as any,
            open: d.cvdOpen,
            high: d.cvdHigh,
            low: d.cvdLow,
            close: d.cvdClose,
          }));

          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(candlePoints);
          }

          // If in DUAL mode, overlay the secondary market as a line for instant divergence comparison
          if (marketMode === 'DUAL' && futLineSeriesRef.current) {
            const futPoints = futData.map((d) => ({
              time: d.time as any,
              value: d.cvdClose,
            }));
            futLineSeriesRef.current.setData(futPoints);
          }
        } else {
          // Render as Line / Area
          if (marketMode === 'SPOT' || marketMode === 'DUAL') {
            const spotPoints = spotData.map((d) => ({
              time: d.time as any,
              value: d.cvdClose,
            }));
            if (spotLineSeriesRef.current) {
              spotLineSeriesRef.current.setData(spotPoints);
            }
          }

          if (marketMode === 'FUTURES' || marketMode === 'DUAL') {
            const futPoints = futData.map((d) => ({
              time: d.time as any,
              value: d.cvdClose,
            }));
            if (futLineSeriesRef.current) {
              futLineSeriesRef.current.setData(futPoints);
            }
          }
        }

        // Update Bottom Delta Histogram
        if (deltaHistogramRef.current) {
          const sourceData = marketMode === 'FUTURES' ? futData : spotData;
          const histogramPoints = sourceData.map((d) => ({
            time: d.time as any,
            value: d.delta,
            color: d.delta >= 0 ? '#00c087' : '#f6465d',
          }));
          deltaHistogramRef.current.setData(histogramPoints);
        }

        // Only fitContent on the very first load, preserve user visible range across updates and drags
        if (!hasInitialFitRef.current) {
          chartRef.current.timeScale().fitContent();
          hasInitialFitRef.current = true;
        } else if (prevRange) {
          try {
            chartRef.current.timeScale().setVisibleRange(prevRange);
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to load CVD data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeSymbol, timeframe, marketMode, chartStyle]);

  // Setup lightweight-chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#07080a' },
        textColor: '#848e9c',
        fontFamily: 'monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#00c087', width: 1, style: 2 },
        horzLine: { color: '#00c087', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minimumWidth: 80,
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Continuous Logical Range 60fps pan/zoom sync
    const onSyncLogicalRange = (logicalRange: any) => {
      if (!isSyncEnabledRef.current) return;
      if (!logicalRange || isSyncingRangeRef.current) return;
      if (typeof logicalRange.from === 'number' && typeof logicalRange.to === 'number') {
        chartSyncService.broadcastLogicalRange(panelInstanceId, {
          from: logicalRange.from,
          to: logicalRange.to,
        });
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onSyncLogicalRange);

    const unsubLogicalSync = chartSyncService.subscribeLogicalRange(panelInstanceId, (range) => {
      if (!isSyncEnabledRef.current) return;
      if (!chartRef.current) return;
      isSyncingRangeRef.current = true;
      try {
        chartRef.current.timeScale().setVisibleLogicalRange(range);
      } catch {}
      requestAnimationFrame(() => {
        isSyncingRangeRef.current = false;
      });
    });

    // Synchronize visible Time Range (Fallback across intervals / symbols)
    const onRangeChange = (timeRange: any) => {
      if (!isSyncEnabledRef.current) return;
      if (!timeRange || isSyncingRangeRef.current) return;
      if (typeof timeRange.from === 'number' && typeof timeRange.to === 'number') {
        chartSyncService.broadcastTimeRange(panelInstanceId, {
          from: timeRange.from,
          to: timeRange.to,
        });
      }
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(onRangeChange);

    // Listen for incoming time range changes from normal chart or other panels
    const unsubRangeSync = chartSyncService.subscribeTimeRange(panelInstanceId, (timeRange) => {
      if (!isSyncEnabledRef.current) return;
      if (!chartRef.current) return;
      isSyncingRangeRef.current = true;
      try {
        chartRef.current.timeScale().setVisibleRange(timeRange as any);
      } catch {
        // Safe ignore
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

    // Delta histogram series at bottom
    const histogram = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'delta_histogram',
    });
    chart.priceScale('delta_histogram').applyOptions({
      scaleMargins: { top: 0.76, bottom: 0 },
    });
    deltaHistogramRef.current = histogram;

    // Configure Candlestick vs Line Series
    if (chartStyle === 'CANDLES') {
      // CVD CANDLESTICKS (Green when delta expanded positive, Red when delta expanded negative)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00c087',
        downColor: '#f6465d',
        borderVisible: false,
        wickUpColor: '#00c087',
        wickDownColor: '#f6465d',
        title: marketMode === 'FUTURES' ? 'FUTURES CVD CANDLES' : 'SPOT CVD CANDLES',
      });
      candleSeriesRef.current = candleSeries;
      spotLineSeriesRef.current = null;

      // In DUAL mode, overlay the other market as a clear line
      if (marketMode === 'DUAL') {
        const futLine = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 2,
          title: 'FUTURES CVD LINE',
        });
        futLineSeriesRef.current = futLine;
      } else {
        futLineSeriesRef.current = null;
      }
    } else {
      // Line / Area Mode
      candleSeriesRef.current = null;

      if (marketMode === 'SPOT') {
        const spotSeries = chart.addSeries(AreaSeries, {
          topColor: 'rgba(0, 210, 255, 0.35)',
          bottomColor: 'rgba(0, 210, 255, 0.02)',
          lineColor: '#00d2ff',
          lineWidth: 2,
          title: 'SPOT CVD',
        });
        spotLineSeriesRef.current = spotSeries;
        futLineSeriesRef.current = null;
      } else if (marketMode === 'FUTURES') {
        const futSeries = chart.addSeries(AreaSeries, {
          topColor: 'rgba(168, 85, 247, 0.35)',
          bottomColor: 'rgba(168, 85, 247, 0.02)',
          lineColor: '#a855f7',
          lineWidth: 2,
          title: 'FUTURES CVD',
        });
        spotLineSeriesRef.current = null;
        futLineSeriesRef.current = futSeries as any;
      } else {
        const spotSeries = chart.addSeries(LineSeries, {
          color: '#00d2ff',
          lineWidth: 2,
          title: 'SPOT CVD',
        });
        const futSeries = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 2,
          title: 'FUTURES CVD',
        });
        spotLineSeriesRef.current = spotSeries as any;
        futLineSeriesRef.current = futSeries;
      }
    }

    // Auto-resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onSyncLogicalRange);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onRangeChange);
      unsubLogicalSync();
      unsubRangeSync();
      unsubCrosshairSync();
      chartSyncService.clearCrosshair(panelInstanceId);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [marketMode, chartStyle]);

  // Load data when symbol, timeframe, marketMode, or chartStyle changes
  useEffect(() => {
    loadCvdData();
  }, [loadCvdData]);

  // Real-time WebSocket live updates from Binance aggTrade
  useEffect(() => {
    const symbolLower = activeSymbol.toLowerCase();

    if (wsSpotRef.current) wsSpotRef.current.close();
    if (wsFutRef.current) wsFutRef.current.close();

    // Connect Spot WebSocket
    try {
      const wsSpot = new WebSocket(`wss://stream.binance.com:9443/ws/${symbolLower}@aggTrade`);
      wsSpot.onmessage = (event) => {
        try {
          const trade = JSON.parse(event.data);
          const isTakerSell = trade.m;
          const qty = parseFloat(trade.q);
          const delta = isTakerSell ? -qty : qty;

          setSpotCvdSummary((prev) => ({
            ...prev,
            cvd: prev.cvd + delta,
            netDelta: prev.netDelta + delta,
          }));

          // Intra-bar candlestick dynamic update
          if (candleSeriesRef.current && latestCandleRef.current && marketMode !== 'FUTURES') {
            const current = latestCandleRef.current;
            current.cvdClose += delta;
            current.cvdHigh = Math.max(current.cvdHigh, current.cvdClose);
            current.cvdLow = Math.min(current.cvdLow, current.cvdClose);

            candleSeriesRef.current.update({
              time: current.time as any,
              open: current.cvdOpen,
              high: current.cvdHigh,
              low: current.cvdLow,
              close: current.cvdClose,
            });
          }
        } catch {}
      };
      wsSpotRef.current = wsSpot;
    } catch {}

    // Connect Futures WebSocket
    try {
      const wsFut = new WebSocket(`wss://fstream.binance.com/ws/${symbolLower}@aggTrade`);
      wsFut.onmessage = (event) => {
        try {
          const trade = JSON.parse(event.data);
          const isTakerSell = trade.m;
          const qty = parseFloat(trade.q);
          const delta = isTakerSell ? -qty : qty;

          setFutCvdSummary((prev) => ({
            ...prev,
            cvd: prev.cvd + delta,
            netDelta: prev.netDelta + delta,
          }));

          // Intra-bar candlestick dynamic update for futures
          if (candleSeriesRef.current && latestCandleRef.current && marketMode === 'FUTURES') {
            const current = latestCandleRef.current;
            current.cvdClose += delta;
            current.cvdHigh = Math.max(current.cvdHigh, current.cvdClose);
            current.cvdLow = Math.min(current.cvdLow, current.cvdClose);

            candleSeriesRef.current.update({
              time: current.time as any,
              open: current.cvdOpen,
              high: current.cvdHigh,
              low: current.cvdLow,
              close: current.cvdClose,
            });
          }
        } catch {}
      };
      wsFutRef.current = wsFut;
    } catch {}

    return () => {
      if (wsSpotRef.current) wsSpotRef.current.close();
      if (wsFutRef.current) wsFutRef.current.close();
    };
  }, [activeSymbol, marketMode]);

  const formatCvd = (num: number) => {
    const sign = num > 0 ? '+' : '';
    if (Math.abs(num) >= 1_000_000) return `${sign}${(num / 1_000_000).toFixed(2)}M`;
    if (Math.abs(num) >= 1_000) return `${sign}${(num / 1_000).toFixed(2)}K`;
    return `${sign}${num.toFixed(2)}`;
  };

  // Filtered coins based on category and query
  const displayedCoins = useMemo(() => {
    let list = selectedCategory === 'ALL' ? ALL_COINS : COIN_CATEGORIES[selectedCategory] || ALL_COINS;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = ALL_COINS.filter((c) => c.includes(q));
    }
    return list;
  }, [selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-xs font-mono select-none overflow-hidden border border-border/40">
      {/* Top Header */}
      <PanelHeader
        title={`CVD CANDLES: ${activeSymbol} [${marketMode}]`}
        linkGroup={useLinkedSymbol ? linkGroup : 'NONE'}
        onLinkGroupChange={(g) => {
          setLinkGroup(g);
          setUseLinkedSymbol(true);
        }}
        actions={
          <div className="flex items-center space-x-1.5 text-[10px]">
            {/* Chart Style Switcher (Candles vs Line) */}
            <div className="flex items-center bg-[#141722] rounded p-0.5 border border-border/50">
              <button
                type="button"
                onClick={() => setChartStyle('CANDLES')}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  chartStyle === 'CANDLES' ? 'bg-[#00c087] text-black shadow-sm' : 'text-muted hover:text-text'
                }`}
                title="View Cumulative Delta as Green/Red Candlesticks"
              >
                <CandlestickChart size={11} />
                <span>CANDLES</span>
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('LINE')}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  chartStyle === 'LINE' ? 'bg-[#00d2ff] text-black shadow-sm' : 'text-muted hover:text-text'
                }`}
                title="View Cumulative Delta as Line / Area"
              >
                <LineChartIcon size={11} />
                <span>LINE</span>
              </button>
            </div>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={loadCvdData}
              disabled={isLoading}
              className="p-1 text-muted hover:text-text hover:bg-surface rounded transition-colors"
              title="Refresh Cumulative Delta"
            >
              <RefreshCw size={11} className={isLoading ? 'animate-spin text-accent' : ''} />
            </button>

            {/* Maximize Toggle */}
            {onMaximize && (
              <button
                type="button"
                onClick={onMaximize}
                className="p-1 text-muted hover:text-text hover:bg-surface rounded transition-colors cursor-pointer"
                title={isMaximized ? 'Restore Layout' : 'Maximize CVD Panel'}
              >
                {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            )}
          </div>
        }
      />

      {/* Control Ribbon: Coin Selector Dropdown, Market Switcher, Timeframe */}
      <div className="bg-[#0c0e14] border-b border-border/60 px-2 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] shrink-0">
        {/* Left: Comprehensive Coin Selector & Fast Search */}
        <div className="flex items-center space-x-1">
          {/* Linked Symbol Toggle */}
          <button
            type="button"
            onClick={() => setUseLinkedSymbol(!useLinkedSymbol)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              useLinkedSymbol
                ? 'bg-accent/20 border-accent text-accent'
                : 'bg-surface border-border text-muted hover:text-text'
            }`}
            title="Link with active terminal color group"
          >
            {useLinkedSymbol ? 'LINKED' : 'MANUAL'}
          </button>

          {/* Quick Major Chips */}
          <div className="hidden sm:flex items-center space-x-1 bg-[#141722] rounded p-0.5 border border-border/50">
            {['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'SUI', 'PEPE'].map((c) => {
              const pair = `${c}USDT`;
              const isSelected = activeSymbol === pair;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setManualSymbol(pair);
                    setUseLinkedSymbol(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    isSelected ? 'bg-accent text-white' : 'text-muted hover:text-text'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* All Coins Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCoinPickerOpen(!isCoinPickerOpen)}
              className="flex items-center space-x-1 bg-[#141722] border border-border/60 hover:border-accent px-2 py-0.5 rounded text-[10px] text-text font-bold transition-colors"
            >
              <span>{activeSymbol.replace('USDT', '')}</span>
              <ChevronDown size={10} className="text-muted" />
            </button>

            {/* Dropdown Popover for Coin Discovery */}
            {isCoinPickerOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#0e1118] border border-border rounded-lg shadow-2xl p-2 z-40 text-xs">
                {/* Search bar inside dropdown */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      const s = searchQuery.trim().replace(/[^A-Z0-9]/g, '');
                      setManualSymbol(s.endsWith('USDT') ? s : `${s}USDT`);
                      setUseLinkedSymbol(false);
                      setIsCoinPickerOpen(false);
                      setSearchQuery('');
                    }
                  }}
                  placeholder="Type symbol (e.g. TIA, SEI, APT)..."
                  className="w-full bg-[#141722] border border-border px-2 py-1 rounded text-[11px] text-text placeholder-muted focus:outline-none focus:border-accent mb-2"
                  autoFocus
                />

                {/* Category tabs */}
                <div className="flex flex-wrap gap-1 border-b border-border/50 pb-1.5 mb-2">
                  {(['MAJORS', 'L1 & L2', 'MEMES', 'AI & DEFI', 'ALL'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        selectedCategory === cat ? 'bg-accent text-white' : 'text-muted hover:text-text'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid of Coins */}
                <div className="grid grid-cols-4 gap-1 max-h-44 overflow-y-auto pr-1">
                  {displayedCoins.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setManualSymbol(`${c}USDT`);
                        setUseLinkedSymbol(false);
                        setIsCoinPickerOpen(false);
                      }}
                      className="px-1.5 py-1 rounded bg-[#161a25] hover:bg-accent hover:text-white text-center text-[10px] font-bold text-muted hover:text-text transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Market Type Switcher (Spot, Futures, Dual) */}
        <div className="flex items-center space-x-1 bg-[#141722] rounded p-0.5 border border-border/50">
          {(['SPOT', 'FUTURES', 'DUAL'] as CvdMarketMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMarketMode(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                marketMode === mode
                  ? mode === 'SPOT'
                    ? 'bg-[#00d2ff] text-black shadow-sm'
                    : mode === 'FUTURES'
                    ? 'bg-[#a855f7] text-white shadow-sm'
                    : 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: Timeframe Sync Selector (1m, 5m, 15m, 1h, 4h, 1D) */}
        <div className="flex items-center space-x-1 bg-[#141722] rounded p-0.5 border border-border/50">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                timeframe === tf ? 'bg-white/20 text-white' : 'text-muted hover:text-text'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

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
              ? 'CVD Chart tersinkronisasi dengan Main Chart (Pan & Zoom sinkron). Klik untuk beralih ke Mode Bebas / Independent.'
              : 'CVD Chart independen / decoupled. Anda bebas menggeser, zoom, dan melihat riwayat tanpa mempengaruhi chart lain. Klik untuk sinkron kembali.'
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

      {/* Summary KPI Strip: Net Delta, Buy/Sell Ratio, Absorption Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 bg-[#090b10] border-b border-border/50 text-[10px]">
        {/* Spot CVD Box */}
        <div className="bg-[#11141d] p-1.5 rounded border border-border/40 flex flex-col justify-between">
          <div className="flex justify-between items-center text-muted">
            <span className="flex items-center gap-1 font-bold text-[#00d2ff]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" /> SPOT CVD
            </span>
            <span>{timeframe}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-xs font-bold ${
                spotCvdSummary.cvd >= 0 ? 'text-[#00c087]' : 'text-[#f6465d]'
              }`}
            >
              {formatCvd(spotCvdSummary.cvd)}
            </span>
            <span className="text-muted text-[9px]">
              Taker: <b className="text-text">{spotCvdSummary.buyRatio}% B</b>
            </span>
          </div>
        </div>

        {/* Futures CVD Box */}
        <div className="bg-[#11141d] p-1.5 rounded border border-border/40 flex flex-col justify-between">
          <div className="flex justify-between items-center text-muted">
            <span className="flex items-center gap-1 font-bold text-[#f59e0b]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> FUTURES CVD
            </span>
            <span>{timeframe}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-xs font-bold ${
                futCvdSummary.cvd >= 0 ? 'text-[#00c087]' : 'text-[#f6465d]'
              }`}
            >
              {formatCvd(futCvdSummary.cvd)}
            </span>
            <span className="text-muted text-[9px]">
              Taker: <b className="text-text">{futCvdSummary.buyRatio}% B</b>
            </span>
          </div>
        </div>

        {/* Aggressive Flow Gauge */}
        <div className="bg-[#11141d] p-1.5 rounded border border-border/40 flex flex-col justify-between">
          <div className="flex justify-between text-muted text-[9px]">
            <span className="text-[#00c087]">BUY {marketMode === 'FUTURES' ? futCvdSummary.buyRatio : spotCvdSummary.buyRatio}%</span>
            <span>PRESSURE</span>
            <span className="text-[#f6465d]">SELL {100 - (marketMode === 'FUTURES' ? futCvdSummary.buyRatio : spotCvdSummary.buyRatio)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1f2430] rounded-full overflow-hidden flex my-1">
            <div
              className="bg-[#00c087] h-full transition-all duration-300"
              style={{
                width: `${marketMode === 'FUTURES' ? futCvdSummary.buyRatio : spotCvdSummary.buyRatio}%`,
              }}
            />
            <div
              className="bg-[#f6465d] h-full transition-all duration-300"
              style={{
                width: `${100 - (marketMode === 'FUTURES' ? futCvdSummary.buyRatio : spotCvdSummary.buyRatio)}%`,
              }}
            />
          </div>
          <span className="text-[9px] text-muted truncate">
            Bar Delta:{' '}
            <b
              className={
                (marketMode === 'FUTURES' ? futCvdSummary.netDelta : spotCvdSummary.netDelta) >= 0
                  ? 'text-[#00c087]'
                  : 'text-[#f6465d]'
              }
            >
              {formatCvd(marketMode === 'FUTURES' ? futCvdSummary.netDelta : spotCvdSummary.netDelta)}
            </b>
          </span>
        </div>

        {/* Divergence Detection Badge */}
        <div className="bg-[#11141d] p-1.5 rounded border border-border/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-[9px]">
            <span className="font-bold flex items-center gap-1">
              <Zap size={9} className="text-accent" /> DELTA REGIME
            </span>
            <span className="text-accent font-bold">120 BARS</span>
          </div>
          <div className="mt-0.5">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight inline-block truncate max-w-full ${
                spotCvdSummary.divergence.includes('BEARISH')
                  ? 'bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]/40'
                  : spotCvdSummary.divergence.includes('BULLISH')
                  ? 'bg-[#00c087]/20 text-[#00c087] border border-[#00c087]/40'
                  : 'bg-white/10 text-muted'
              }`}
              title={spotCvdSummary.divergence}
            >
              {spotCvdSummary.divergence.split(' (')[0] || spotCvdSummary.divergence}
            </span>
          </div>
        </div>
      </div>

      {/* Main Lightweight Chart Canvas with 32px Left Strip matching ChartPanel */}
      <div className="flex-grow flex relative overflow-hidden">
        {/* Left Toolbar Spacer matching Main Chart (32px) */}
        <div className="w-8 border-r border-border/50 bg-[#090b0e] flex flex-col items-center py-2 space-y-2 select-none z-20 shrink-0">
          <button
            type="button"
            onClick={() => setChartStyle(chartStyle === 'CANDLES' ? 'LINE' : 'CANDLES')}
            className={`p-1.5 rounded transition-colors ${
              chartStyle === 'CANDLES' ? 'bg-[#00c087]/20 text-[#00c087]' : 'hover:bg-surface text-muted hover:text-text'
            }`}
            title={`Toggle CVD Style (Current: ${chartStyle})`}
          >
            <Activity size={13} />
          </button>
        </div>

        {/* Chart Viewport */}
        <div className="flex-grow relative h-full w-full overflow-hidden">
          <div
            ref={chartContainerRef}
            className="w-full h-full"
            onMouseLeave={() => chartSyncService.clearCrosshair(panelInstanceId)}
          />

          {/* Mirrored Crosshair from Main Chart / Secondary Monitor */}
          {mirroredCrosshairX !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col justify-between"
              style={{ left: `${mirroredCrosshairX}px` }}
            >
              <div className="w-[1px] h-full border-l border-dashed border-[#00d2ff]" />
              {mirroredTime && (
                <div className="absolute bottom-6 -translate-x-1/2 bg-[#00d2ff] text-black text-[9px] font-bold px-1 rounded shadow pointer-events-none whitespace-nowrap">
                  {new Date(mirroredTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}

          {/* Chart Legend Overlay */}
          <div className="absolute top-2 left-3 pointer-events-none flex items-center space-x-3 text-[10px] bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
            {chartStyle === 'CANDLES' ? (
              <span className="flex items-center gap-1 text-[#00c087] font-bold">
                <span className="w-2 h-2 rounded-xs bg-[#00c087]" /> CVD CANDLES ({marketMode})
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#00d2ff] font-bold">
                <span className="w-2 h-0.5 bg-[#00d2ff]" /> CVD LINE ({marketMode})
              </span>
            )}
            {chartStyle === 'CANDLES' && marketMode === 'DUAL' && (
              <span className="flex items-center gap-1 text-[#f59e0b] font-bold">
                <span className="w-2 h-0.5 bg-[#f59e0b]" /> FUTURES OVERLAY
              </span>
            )}
            <span className="flex items-center gap-1 text-muted">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#00c087]" /> DELTA BARS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
