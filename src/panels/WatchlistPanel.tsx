import { useState, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { CANONICAL_INSTRUMENTS, canonicalizeInstrumentId } from '../services/instruments';
import { marketData } from '../services/marketData';
import type { LinkGroup, Instrument } from '../types';
import PanelHeader from './PanelHeader';
import { Search } from 'lucide-react';

interface PriceItem {
  price: number;
  change: number;
  flash?: 'up' | 'down';
}

const INITIAL_BENCHMARK_PRICES: Record<string, { price: number; change: number }> = {
  // Top Crypto
  'BTC-USDT:BINANCE': { price: 84320.0, change: 3.12 },
  'ETH-USDT:BINANCE': { price: 2650.4, change: 1.84 },
  'SOL-USDT:BINANCE': { price: 148.2, change: -0.65 },
  'BNB-USDT:BINANCE': { price: 592.0, change: 0.42 },
  'XRP-USDT:BINANCE': { price: 0.5842, change: -1.2 },
  'DOGE-USDT:BINANCE': { price: 0.1245, change: 2.1 },
  'ADA-USDT:BINANCE': { price: 0.382, change: 1.05 },
  'AVAX-USDT:BINANCE': { price: 28.45, change: -0.45 },
  'LINK-USDT:BINANCE': { price: 12.18, change: 0.85 },
  'SUI-USDT:BINANCE': { price: 1.745, change: 4.25 },
  'NEAR-USDT:BINANCE': { price: 4.92, change: 1.65 },
  'PEPE-USDT:BINANCE': { price: 0.0000095, change: 3.4 },
  'WIF-USDT:BINANCE': { price: 2.125, change: -1.15 },
  'SHIB-USDT:BINANCE': { price: 0.0000185, change: 0.9 },
  'DOT-USDT:BINANCE': { price: 4.65, change: 0.35 },
  'LTC-USDT:BINANCE': { price: 68.4, change: 1.12 },

  // US Equities
  'NVDA:NASDAQ': { price: 118.4, change: 2.15 },
  'AAPL:NASDAQ': { price: 224.8, change: 0.35 },
  'MSFT:NASDAQ': { price: 428.5, change: 0.82 },
  'GOOGL:NASDAQ': { price: 164.2, change: -0.45 },
  'AMZN:NASDAQ': { price: 189.5, change: 1.12 },
  'META:NASDAQ': { price: 562.4, change: 1.78 },
  'TSLA:NASDAQ': { price: 248.6, change: -1.25 },
  'SPY:ARCA': { price: 568.2, change: 0.45 },
  'QQQ:NASDAQ': { price: 488.6, change: 0.68 },

  // Forex
  'EURUSD:FX': { price: 1.0845, change: -0.08 },
  'GBPUSD:FX': { price: 1.2985, change: 0.15 },
  'USDJPY:FX': { price: 152.4, change: 0.22 },
  'AUDUSD:FX': { price: 0.665, change: -0.18 },

  // Commodities
  'XAUUSD:COMMODITY': { price: 2654.8, change: 0.72 },
  'XAGUSD:COMMODITY': { price: 31.65, change: 1.15 },
  'BRENT:COMMODITY': { price: 74.8, change: -0.55 },
  'WTI:COMMODITY': { price: 70.9, change: -0.62 },
};

// Populate map with both canonical ID and raw id keys
function buildInitialPrices(): Record<string, PriceItem> {
  const map: Record<string, PriceItem> = {};
  for (const [key, val] of Object.entries(INITIAL_BENCHMARK_PRICES)) {
    const canonical = canonicalizeInstrumentId(key);
    map[key] = { price: val.price, change: val.change };
    map[canonical] = { price: val.price, change: val.change };
  }
  return map;
}

export default function WatchlistPanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { linkedSymbols, setLinkedSymbol } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const [filter, setFilter] = useState('');
  const [prices, setPrices] = useState<Record<string, PriceItem>>(buildInitialPrices);

  const activeId = linkedSymbols[linkGroup];

  useEffect(() => {
    // 1. Initial live 24h ticker fetch from official Binance REST endpoint
    marketData.fetchWatchlistTickers().then((tickers) => {
      setPrices((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(tickers)) {
          next[key] = { price: val.price, change: val.change };
        }
        return next;
      });
    });

    // 2. Refresh 24h tickers periodically as reliable backup
    const refreshTimer = setInterval(() => {
      marketData.fetchWatchlistTickers().then((tickers) => {
        setPrices((prev) => {
          const next = { ...prev };
          for (const [key, val] of Object.entries(tickers)) {
            next[key] = { price: val.price, change: val.change };
          }
          return next;
        });
      });
    }, 15000);

    // 3. Realtime Quote subscriber (fed by WebSocket aggTrade, bookTicker, miniTicker and non-crypto ticks)
    const unsub = marketData.subscribeQuotes((quote) => {
      const canonicalKey = canonicalizeInstrumentId(quote.instrumentId);

      setPrices((prev) => {
        const current = prev[canonicalKey] || prev[quote.instrumentId];
        const newPrice = quote.ask;
        let flash: 'up' | 'down' | undefined = undefined;
        if (current && current.price !== newPrice) {
          flash = newPrice > current.price ? 'up' : 'down';
        }

        const newChange = quote.change24h !== undefined ? quote.change24h : current ? current.change : 0;
        const entry: PriceItem = {
          price: newPrice,
          change: newChange,
          flash,
        };

        return {
          ...prev,
          [canonicalKey]: entry,
          [quote.instrumentId]: entry,
        };
      });

      // Clear flash after 400ms
      setTimeout(() => {
        setPrices((prev) => {
          if (!prev[canonicalKey]?.flash && !prev[quote.instrumentId]?.flash) return prev;
          return {
            ...prev,
            [canonicalKey]: {
              ...prev[canonicalKey],
              flash: undefined,
            },
            [quote.instrumentId]: {
              ...prev[quote.instrumentId],
              flash: undefined,
            },
          };
        });
      }, 400);
    });

    return () => {
      clearInterval(refreshTimer);
      unsub();
    };
  }, []);

  const filtered = CANONICAL_INSTRUMENTS.filter((inst) => {
    if (!filter) return true;
    const q = filter.toUpperCase();
    return (
      inst.symbol.includes(q) ||
      inst.displaySymbol.toUpperCase().includes(q) ||
      inst.name.toUpperCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#0d0f12] text-xs font-mono select-none">
      <PanelHeader
        title="WATCHLIST"
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-muted absolute left-1" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="bg-black/40 border border-border/80 rounded px-1.5 py-0.5 pl-5 text-[11px] w-24 text-text outline-none focus:border-accent"
            />
          </div>
        }
      />

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#14161a] sticky top-0 text-[10px] uppercase text-muted tracking-wider border-b border-border/80">
            <tr>
              <th className="py-1 px-2 font-normal">Symbol</th>
              <th className="py-1 px-2 font-normal text-right">Last</th>
              <th className="py-1 px-2 font-normal text-right">Chg%</th>
              <th className="py-1 px-2 font-normal text-center">Class</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filtered.map((inst: Instrument) => {
              const canonicalKey = canonicalizeInstrumentId(inst.id);
              const data = prices[canonicalKey] || prices[inst.id] || prices[inst.symbol];
              const isSelected = inst.id === activeId || canonicalKey === canonicalizeInstrumentId(activeId);
              const isCrypto = inst.assetClass === 'Crypto';

              return (
                <tr
                  key={inst.id}
                  onClick={() => setLinkedSymbol(linkGroup, inst.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#0070f3]/20 border-l-2 border-l-[#0070f3]' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="py-1 px-2">
                    <div className="font-semibold text-text">{inst.displaySymbol}</div>
                    <div className="text-[10px] text-muted truncate max-w-[90px]">{inst.name}</div>
                  </td>
                  <td
                    className={`py-1 px-2 text-right transition-colors ${
                      data?.flash === 'up'
                        ? 'bg-up/30 text-up font-bold'
                        : data?.flash === 'down'
                        ? 'bg-down/30 text-down font-bold'
                        : 'text-text'
                    }`}
                  >
                    {data ? data.price.toFixed(inst.priceDecimals) : '---'}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {data ? (
                      <span className={data.change >= 0 ? 'text-up' : 'text-down'}>
                        {data.change >= 0 ? '+' : ''}
                        {data.change.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-muted text-[10px]">---</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-center">
                    <span
                      className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                        isCrypto ? 'bg-accent/20 text-accent' : 'bg-white/10 text-muted'
                      }`}
                      title={isCrypto ? 'Live WebSocket Connected' : 'Institutional Benchmark Feed'}
                    >
                      {inst.assetClass.toUpperCase().slice(0, 4)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
