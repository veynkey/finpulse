import type { Instrument } from '../types';

const STORAGE_KEY = 'finpulse_canonical_asset_registry';

// Core pre-cached universe across Crypto, Equities, Forex, Indices, and Commodities
export const BASE_INSTRUMENTS: Instrument[] = [
  // Top Tier Crypto
  {
    id: 'BTC-USDT:BINANCE',
    symbol: 'BTCUSDT',
    displaySymbol: 'BTC/USDT',
    name: 'Bitcoin / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'BTC',
    quoteCurrency: 'USDT',
    priceDecimals: 2,
    quantityDecimals: 4,
    minOrderSize: 0.0001,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'ETH-USDT:BINANCE',
    symbol: 'ETHUSDT',
    displaySymbol: 'ETH/USDT',
    name: 'Ethereum / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'ETH',
    quoteCurrency: 'USDT',
    priceDecimals: 2,
    quantityDecimals: 3,
    minOrderSize: 0.001,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'SOL-USDT:BINANCE',
    symbol: 'SOLUSDT',
    displaySymbol: 'SOL/USDT',
    name: 'Solana / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'SOL',
    quoteCurrency: 'USDT',
    priceDecimals: 2,
    quantityDecimals: 2,
    minOrderSize: 0.01,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'BNB-USDT:BINANCE',
    symbol: 'BNBUSDT',
    displaySymbol: 'BNB/USDT',
    name: 'BNB / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'BNB',
    quoteCurrency: 'USDT',
    priceDecimals: 2,
    quantityDecimals: 2,
    minOrderSize: 0.01,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'XRP-USDT:BINANCE',
    symbol: 'XRPUSDT',
    displaySymbol: 'XRP/USDT',
    name: 'Ripple / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'XRP',
    quoteCurrency: 'USDT',
    priceDecimals: 4,
    quantityDecimals: 1,
    minOrderSize: 1,
    tickSize: 0.0001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'DOGE-USDT:BINANCE',
    symbol: 'DOGEUSDT',
    displaySymbol: 'DOGE/USDT',
    name: 'Dogecoin / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'DOGE',
    quoteCurrency: 'USDT',
    priceDecimals: 5,
    quantityDecimals: 0,
    minOrderSize: 1,
    tickSize: 0.00001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'ADA-USDT:BINANCE',
    symbol: 'ADAUSDT',
    displaySymbol: 'ADA/USDT',
    name: 'Cardano / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'ADA',
    quoteCurrency: 'USDT',
    priceDecimals: 4,
    quantityDecimals: 1,
    minOrderSize: 1,
    tickSize: 0.0001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'AVAX-USDT:BINANCE',
    symbol: 'AVAXUSDT',
    displaySymbol: 'AVAX/USDT',
    name: 'Avalanche / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'AVAX',
    quoteCurrency: 'USDT',
    priceDecimals: 2,
    quantityDecimals: 2,
    minOrderSize: 0.01,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'LINK-USDT:BINANCE',
    symbol: 'LINKUSDT',
    displaySymbol: 'LINK/USDT',
    name: 'Chainlink / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'LINK',
    quoteCurrency: 'USDT',
    priceDecimals: 3,
    quantityDecimals: 2,
    minOrderSize: 0.01,
    tickSize: 0.001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'SUI-USDT:BINANCE',
    symbol: 'SUIUSDT',
    displaySymbol: 'SUI/USDT',
    name: 'Sui Network / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'SUI',
    quoteCurrency: 'USDT',
    priceDecimals: 4,
    quantityDecimals: 1,
    minOrderSize: 1,
    tickSize: 0.0001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'NEAR-USDT:BINANCE',
    symbol: 'NEARUSDT',
    displaySymbol: 'NEAR/USDT',
    name: 'NEAR Protocol / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'NEAR',
    quoteCurrency: 'USDT',
    priceDecimals: 3,
    quantityDecimals: 1,
    minOrderSize: 0.1,
    tickSize: 0.001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'PEPE-USDT:BINANCE',
    symbol: 'PEPEUSDT',
    displaySymbol: 'PEPE/USDT',
    name: 'Pepe / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'PEPE',
    quoteCurrency: 'USDT',
    priceDecimals: 8,
    quantityDecimals: 0,
    minOrderSize: 1000,
    tickSize: 0.00000001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'WIF-USDT:BINANCE',
    symbol: 'WIFUSDT',
    displaySymbol: 'WIF/USDT',
    name: 'dogwifhat / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'WIF',
    quoteCurrency: 'USDT',
    priceDecimals: 4,
    quantityDecimals: 1,
    minOrderSize: 0.1,
    tickSize: 0.0001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'SHIB-USDT:BINANCE',
    symbol: 'SHIBUSDT',
    displaySymbol: 'SHIB/USDT',
    name: 'Shiba Inu / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'SHIB',
    quoteCurrency: 'USDT',
    priceDecimals: 8,
    quantityDecimals: 0,
    minOrderSize: 1000,
    tickSize: 0.00000001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'DOT-USDT:BINANCE',
    symbol: 'DOTUSDT',
    displaySymbol: 'DOT/USDT',
    name: 'Polkadot / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'DOT',
    quoteCurrency: 'USDT',
    priceDecimals: 3,
    quantityDecimals: 2,
    minOrderSize: 0.01,
    tickSize: 0.001,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },
  {
    id: 'LTC-USDT:BINANCE',
    symbol: 'LTCUSDT',
    displaySymbol: 'LTC/USDT',
    name: 'Litecoin / Tether USD',
    assetClass: 'Crypto',
    venue: 'BINANCE',
    baseCurrency: 'LTC',
    quoteCurrency: 'USDT',
    priceDecimals: 2,
    quantityDecimals: 3,
    minOrderSize: 0.001,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
  },

  // US Equities (Institutional Tagging)
  {
    id: 'NVDA:NASDAQ',
    symbol: 'NVDA',
    displaySymbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetClass: 'Equity',
    venue: 'NASDAQ',
    baseCurrency: 'NVDA',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
  {
    id: 'AAPL:NASDAQ',
    symbol: 'AAPL',
    displaySymbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: 'Equity',
    venue: 'NASDAQ',
    baseCurrency: 'AAPL',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
  {
    id: 'MSFT:NASDAQ',
    symbol: 'MSFT',
    displaySymbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetClass: 'Equity',
    venue: 'NASDAQ',
    baseCurrency: 'MSFT',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
  {
    id: 'TSLA:NASDAQ',
    symbol: 'TSLA',
    displaySymbol: 'TSLA',
    name: 'Tesla Inc.',
    assetClass: 'Equity',
    venue: 'NASDAQ',
    baseCurrency: 'TSLA',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
  {
    id: 'AMD:NASDAQ',
    symbol: 'AMD',
    displaySymbol: 'AMD',
    name: 'Advanced Micro Devices Inc.',
    assetClass: 'Equity',
    venue: 'NASDAQ',
    baseCurrency: 'AMD',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
  {
    id: 'SPY:ARCA',
    symbol: 'SPY',
    displaySymbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetClass: 'Equity',
    venue: 'ARCA',
    baseCurrency: 'SPY',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
  {
    id: 'QQQ:NASDAQ',
    symbol: 'QQQ',
    displaySymbol: 'QQQ',
    name: 'Invesco QQQ Trust Series 1',
    assetClass: 'Equity',
    venue: 'NASDAQ',
    baseCurrency: 'QQQ',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },

  // Foreign Exchange (FX Spot)
  {
    id: 'EURUSD:FX',
    symbol: 'EURUSD',
    displaySymbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    assetClass: 'Forex',
    venue: 'FX_SPOT',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    priceDecimals: 5,
    quantityDecimals: 0,
    tickSize: 0.00001,
    status: 'TRADING',
    providerCapabilities: ['freemium_delayed_feed'],
  },
  {
    id: 'GBPUSD:FX',
    symbol: 'GBPUSD',
    displaySymbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    assetClass: 'Forex',
    venue: 'FX_SPOT',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    priceDecimals: 5,
    quantityDecimals: 0,
    tickSize: 0.00001,
    status: 'TRADING',
    providerCapabilities: ['freemium_delayed_feed'],
  },
  {
    id: 'USDJPY:FX',
    symbol: 'USDJPY',
    displaySymbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    assetClass: 'Forex',
    venue: 'FX_SPOT',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    priceDecimals: 3,
    quantityDecimals: 0,
    tickSize: 0.001,
    status: 'TRADING',
    providerCapabilities: ['freemium_delayed_feed'],
  },

  // Commodities & Indices
  {
    id: 'XAUUSD:COMMODITY',
    symbol: 'XAUUSD',
    displaySymbol: 'Gold/USD',
    name: 'Spot Gold / US Dollar',
    assetClass: 'Commodity',
    venue: 'METALS',
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    priceDecimals: 2,
    quantityDecimals: 1,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['freemium_delayed_feed'],
  },
  {
    id: 'SPX:INDEX',
    symbol: 'SPX',
    displaySymbol: 'S&P 500',
    name: 'S&P 500 Index',
    assetClass: 'Index',
    venue: 'CBOE',
    priceDecimals: 2,
    quantityDecimals: 0,
    tickSize: 0.01,
    status: 'TRADING',
    providerCapabilities: ['licensed_market_data_required'],
  },
];

export function canonicalizeInstrumentId(rawOrId: string): string {
  if (!rawOrId) return 'CRYPTO:BINANCE:BTCUSDT';
  const clean = rawOrId.trim();

  // If already canonical format: e.g. CRYPTO:BINANCE:BTCUSDT
  if (
    clean.includes(':') &&
    (clean.startsWith('CRYPTO:') ||
      clean.startsWith('EQUITY:') ||
      clean.startsWith('FOREX:') ||
      clean.startsWith('COMMODITY:'))
  ) {
    return clean.toUpperCase();
  }

  // Handle Binance formats like BTC-USDT:BINANCE or BTCUSDT:BINANCE
  if (clean.toUpperCase().includes('BINANCE')) {
    const sym = clean.split(':')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `CRYPTO:BINANCE:${sym}`;
  }

  if (clean.includes(':NASDAQ') || clean.includes(':NYSE') || clean.includes(':ARCA')) {
    const parts = clean.split(':');
    return `EQUITY:${parts[1].toUpperCase()}:${parts[0].toUpperCase()}`;
  }

  if (clean.includes(':FX') || clean.includes(':OANDA')) {
    const sym = clean.split(':')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `FOREX:OANDA:${sym}`;
  }

  // Raw symbols
  const upper = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper.endsWith('USDT') || upper.endsWith('USDC') || upper.endsWith('BTC')) {
    return `CRYPTO:BINANCE:${upper}`;
  }

  if (['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'SPY', 'QQQ'].includes(upper)) {
    return `EQUITY:NASDAQ:${upper}`;
  }

  if (['EURUSD', 'USDJPY', 'GBPUSD'].includes(upper)) {
    return `FOREX:OANDA:${upper}`;
  }

  if (['XAUUSD', 'USO'].includes(upper)) {
    return `COMMODITY:COMEX:${upper}`;
  }

  return `CRYPTO:BINANCE:${upper}`;
}

class AssetRegistryService {
  private registry: Map<string, Instrument> = new Map();
  private isDiscovered = false;

  constructor() {
    this.loadFromStorage();
    this.triggerDynamicDiscovery();
  }

  private registerInstrument(inst: Instrument) {
    this.registry.set(inst.id, inst);
    this.registry.set(inst.id.toUpperCase(), inst);
    this.registry.set(inst.symbol, inst);
    this.registry.set(inst.symbol.toUpperCase(), inst);
    const canonical = canonicalizeInstrumentId(inst.id);
    this.registry.set(canonical, inst);
    this.registry.set(inst.id.replace('-', ''), inst);
    const rawSym = inst.symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    this.registry.set(rawSym, inst);
  }

  private loadFromStorage() {
    // 1. Seed base instruments
    for (const inst of BASE_INSTRUMENTS) {
      this.registerInstrument(inst);
    }

    // 2. Load stored discovered instruments from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Instrument[] = JSON.parse(stored);
        for (const inst of parsed) {
          this.registerInstrument(inst);
        }
      }
    } catch {
      // Ignore parse failure
    }
  }

  private async triggerDynamicDiscovery() {
    if (this.isDiscovered) return;
    try {
      const res = await fetch('https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT');
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.symbols || !Array.isArray(data.symbols)) return;

      const discovered: Instrument[] = [];
      for (const item of data.symbols) {
        if (item.status === 'TRADING' && item.quoteAsset === 'USDT') {
          // Find price filter for tickSize & priceDecimals
          let tickSize = 0.01;
          let priceDecimals = 2;
          const priceFilter = item.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');
          if (priceFilter?.tickSize) {
            tickSize = parseFloat(priceFilter.tickSize);
            const decStr = priceFilter.tickSize.split('.')[1] || '';
            const match = decStr.indexOf('1');
            priceDecimals = match >= 0 ? match + 1 : 2;
          }

          const inst: Instrument = {
            id: `${item.symbol}:BINANCE`,
            symbol: item.symbol,
            displaySymbol: `${item.baseAsset}/${item.quoteAsset}`,
            name: `${item.baseAsset} / ${item.quoteAsset} Spot`,
            assetClass: 'Crypto',
            venue: 'BINANCE',
            baseCurrency: item.baseAsset,
            quoteCurrency: item.quoteAsset,
            priceDecimals: Math.min(8, Math.max(1, priceDecimals)),
            quantityDecimals: 2,
            tickSize,
            status: 'TRADING',
            lastUpdated: Date.now(),
            providerCapabilities: ['trades', 'candles', 'orderbook', 'ticker'],
          };

          this.registerInstrument(inst);
          discovered.push(inst);
        }
      }

      this.isDiscovered = true;
      // Persist top 200 discovered to avoid overflowing localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(discovered.slice(0, 200)));
      } catch {
        // Safe quota check
      }
    } catch {
      // Dynamic discovery silently fails if offline, leaving base instruments active
    }
  }

  public getAll(): Instrument[] {
    const unique = new Map<string, Instrument>();
    this.registry.forEach((v) => unique.set(v.id, v));
    return Array.from(unique.values());
  }

  public getById(id: string): Instrument | undefined {
    if (!id) return undefined;
    const canonical = canonicalizeInstrumentId(id);
    return (
      this.registry.get(id) ||
      this.registry.get(id.toUpperCase()) ||
      this.registry.get(canonical) ||
      this.registry.get(id.replace('-', '')) ||
      this.registry.get(id.split(':')[0]) ||
      this.registry.get(id.split(':')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase())
    );
  }

  public search(query: string): Instrument[] {
    const q = query.trim().toUpperCase();
    const all = this.getAll();
    if (!q) return all;

    return all
      .filter(
        (inst) =>
          inst.symbol.includes(q) ||
          inst.displaySymbol.toUpperCase().includes(q) ||
          inst.name.toUpperCase().includes(q) ||
          inst.baseCurrency?.toUpperCase().includes(q) ||
          inst.venue.includes(q)
      )
      .sort((a, b) => {
        // Prioritize exact match or symbol start
        const aExact = a.symbol === q || a.baseCurrency === q;
        const bExact = b.symbol === q || b.baseCurrency === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = a.symbol.startsWith(q);
        const bStarts = b.symbol.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });
  }
}

export const assetRegistry = new AssetRegistryService();

export function getInstrumentById(id: string): Instrument | undefined {
  return assetRegistry.getById(id) || BASE_INSTRUMENTS[0];
}

export function searchInstruments(query: string): Instrument[] {
  return assetRegistry.search(query);
}

export const CANONICAL_INSTRUMENTS = BASE_INSTRUMENTS;
