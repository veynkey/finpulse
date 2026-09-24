import type { NewsItem } from '../types';

const STORAGE_KEY = 'finpulse_live_news_v2';
const LAST_FETCH_KEY = 'finpulse_news_last_fetch_ts';

type NewsListener = (news: NewsItem[], isRefreshing: boolean) => void;

class NewsService {
  private news: NewsItem[] = [];
  private listeners: Set<NewsListener> = new Set();
  private isRefreshing = false;
  private pollInterval: any = null;
  private lastFetchTime = 0;

  constructor() {
    this.loadFromCache();
    this.setupAutoRefresh();
  }

  public getNews(): NewsItem[] {
    return this.news;
  }

  public getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  public getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  public destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public subscribe(listener: NewsListener): () => void {
    this.listeners.add(listener);
    listener(this.news, this.isRefreshing);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.news, this.isRefreshing);
      } catch (err) {
        console.error('Error in news listener:', err);
      }
    });
  }

  private loadFromCache() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedTs = localStorage.getItem(LAST_FETCH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.news = parsed;
        }
      }
      if (storedTs) {
        this.lastFetchTime = parseInt(storedTs, 10) || 0;
      }
    } catch {
      // Safe fallback
    }
  }

  private saveToCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.news.slice(0, 120)));
      localStorage.setItem(LAST_FETCH_KEY, String(this.lastFetchTime));
    } catch {
      // Safe fallback
    }
  }

  private setupAutoRefresh() {
    // Initial fetch on launch
    setTimeout(() => {
      this.refreshNews();
    }, 200);

    // Refresh when user returns to the app / window regains focus
    if (typeof window !== 'undefined') {
      const checkAndRefresh = () => {
        const elapsed = Date.now() - this.lastFetchTime;
        // If more than 2 minutes since last fetch, refresh immediately
        if (elapsed > 2 * 60 * 1000) {
          this.refreshNews();
        }
      };

      window.addEventListener('focus', checkAndRefresh);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkAndRefresh();
        }
      });
    }

    // Background interval: poll every 3 minutes
    this.pollInterval = setInterval(() => {
      this.refreshNews();
    }, 3 * 60 * 1000);
  }

  public async refreshNews(): Promise<NewsItem[]> {
    if (this.isRefreshing) return this.news;
    this.isRefreshing = true;
    this.notify();

    try {
      const results = await Promise.allSettled([
        this.fetchCointelegraph(),
        this.fetchCoinDesk(),
        this.fetchDecrypt(),
        this.fetchMarketWatch(),
        this.fetchWSJ(),
        this.fetchYahooFinance(),
        this.fetchBinanceAnnouncements(),
      ]);


      const freshItems: NewsItem[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          freshItems.push(...res.value);
        }
      });

      if (freshItems.length > 0) {
        // Merge with existing items, deduping by headline/url
        const existingMap = new Map<string, NewsItem>();
        freshItems.forEach((item) => {
          const key = (item.headline || '').trim().toLowerCase();
          if (key && !existingMap.has(key)) {
            existingMap.set(key, item);
          }
        });

        this.news.forEach((item) => {
          const key = (item.headline || '').trim().toLowerCase();
          if (key && !existingMap.has(key)) {
            existingMap.set(key, item);
          }
        });

        // Sort descending by timestamp
        const merged = Array.from(existingMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        this.news = merged.slice(0, 150);
        this.lastFetchTime = Date.now();
        this.saveToCache();
      }
    } catch (err) {
      console.warn('[NewsService] Refresh error:', err);
    } finally {
      this.isRefreshing = false;
      this.notify();
    }

    return this.news;
  }

  // --- RSS / API FETCHERS ---

  private async fetchCointelegraph(): Promise<NewsItem[]> {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any, idx: number) => {
      const pubDate = new Date(item.pubDate || Date.now()).getTime();
      const rawDesc = item.description || '';
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').trim();
      
      // Extract img from description if thumbnail is empty
      let img = item.thumbnail || '';
      if (!img && rawDesc.includes('<img')) {
        const match = rawDesc.match(/src=["'](.*?)["']/);
        if (match && match[1]) img = match[1];
      }

      return this.enrichNewsItem({
        id: `ct-${item.guid || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'COINTELEGRAPH',
        headline: item.title || '',
        summary: cleanDesc.slice(0, 300) || item.title || '',
        sourceUrl: item.link || 'https://cointelegraph.com',
        imageUrl: img,
        clusteredCount: 5 + (idx % 7),
      }, ['CRYPTO']);
    });
  }

  private async fetchCoinDesk(): Promise<NewsItem[]> {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/arc/outboundfeeds/rss/');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any, idx: number) => {
      const pubDate = new Date(item.pubDate || Date.now()).getTime();
      const cleanDesc = (item.description || '').replace(/<[^>]+>/g, '').trim();
      let img = item.thumbnail || '';
      if (!img && item.enclosure?.link) img = item.enclosure.link;

      return this.enrichNewsItem({
        id: `cd-${item.guid || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'COINDESK',
        headline: item.title || '',
        summary: cleanDesc.slice(0, 300) || item.title || '',
        sourceUrl: item.link || 'https://www.coindesk.com',
        imageUrl: img,
        clusteredCount: 6 + (idx % 8),
      }, ['CRYPTO']);
    });
  }

  private async fetchDecrypt(): Promise<NewsItem[]> {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any, idx: number) => {
      const pubDate = new Date(item.pubDate || Date.now()).getTime();
      const cleanDesc = (item.description || '').replace(/<[^>]+>/g, '').trim();
      let img = item.thumbnail || '';
      if (!img && item.enclosure?.link) img = item.enclosure.link;

      return this.enrichNewsItem({
        id: `dc-${item.guid || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'DECRYPT',
        headline: item.title || '',
        summary: cleanDesc.slice(0, 300) || item.title || '',
        sourceUrl: item.link || 'https://decrypt.co',
        imageUrl: img,
        clusteredCount: 5 + (idx % 6),
      }, ['CRYPTO']);
    });
  }

  private async fetchMarketWatch(): Promise<NewsItem[]> {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.content.dowjones.io/public/rss/mw_topstories');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any, idx: number) => {
      const pubDate = new Date(item.pubDate || Date.now()).getTime();
      const cleanDesc = (item.description || '').replace(/<[^>]+>/g, '').trim();

      return this.enrichNewsItem({
        id: `mw-${item.guid || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'MARKETWATCH',
        headline: item.title || '',
        summary: cleanDesc.slice(0, 300) || item.title || '',
        sourceUrl: item.link || 'https://www.marketwatch.com',
        clusteredCount: 8 + (idx % 9),
      }, ['EQUITIES', 'MACRO']);
    });
  }

  private async fetchWSJ(): Promise<NewsItem[]> {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.a.dj.com/rss/RSSMarketsMain.xml');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any, idx: number) => {
      const pubDate = new Date(item.pubDate || Date.now()).getTime();
      const cleanDesc = (item.description || '').replace(/<[^>]+>/g, '').trim();

      return this.enrichNewsItem({
        id: `wsj-${item.guid || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'WSJ MARKETS',
        headline: item.title || '',
        summary: cleanDesc.slice(0, 300) || item.title || '',
        sourceUrl: item.link || 'https://www.wsj.com',
        clusteredCount: 10 + (idx % 7),
      }, ['EQUITIES', 'MACRO']);
    });
  }

  private async fetchYahooFinance(): Promise<NewsItem[]> {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://finance.yahoo.com/news/rssindex');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any, idx: number) => {
      const pubDate = new Date(item.pubDate || Date.now()).getTime();
      const cleanDesc = (item.description || '').replace(/<[^>]+>/g, '').trim();

      return this.enrichNewsItem({
        id: `yf-${item.guid || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'YAHOO FINANCE',
        headline: item.title || '',
        summary: cleanDesc.slice(0, 300) || item.title || '',
        sourceUrl: item.link || 'https://finance.yahoo.com',
        clusteredCount: 4 + (idx % 6),
      }, ['EQUITIES']);
    });
  }

  private async fetchBinanceAnnouncements(): Promise<NewsItem[]> {
    const res = await fetch('https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&pageSize=15&pageNo=1');
    if (!res.ok) return [];
    const json = await res.json();
    const articles = json?.data?.catalogs?.[0]?.articles || [];
    if (!Array.isArray(articles)) return [];

    return articles.map((art: any, idx: number) => {
      const pubDate = art.releaseDate ? parseInt(art.releaseDate, 10) : Date.now();
      const code = art.code || art.id;

      return this.enrichNewsItem({
        id: `bn-${art.id || idx}-${pubDate}`,
        timestamp: isNaN(pubDate) ? Date.now() : pubDate,
        source: 'BINANCE NEWS',
        headline: art.title || '',
        summary: `Official exchange announcement: ${art.title}. Direct listing and trading operations details available on Binance.`,
        sourceUrl: `https://www.binance.com/en/support/announcement/${code}`,
        clusteredCount: 12 + (idx % 10),
      }, ['CRYPTO', 'REGULATORY']);
    });
  }

  // --- ENTITY LINKING, SENTIMENT & TAGGING ENGINE ---

  private enrichNewsItem(base: Partial<NewsItem>, defaultTags: string[]): NewsItem {
    const text = `${base.headline || ''} ${base.summary || ''}`.toLowerCase();

    // 1. Sentiment Detection
    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    const bullishKeywords = ['surge', 'rally', 'gain', 'jump', 'all-time high', 'ath', 'inflow', 'record', 'soar', 'approve', 'bullish', 'breakout', 'expand', 'boost', 'upgrade', 'climb'];
    const bearishKeywords = ['plunge', 'crash', 'drop', 'fall', 'sink', 'outflow', 'down', 'bearish', 'selloff', 'ban', 'lawsuit', 'hack', 'drain', 'liquidat', 'slump', 'decline', 'tumble'];

    const bullScore = bullishKeywords.filter((k) => text.includes(k)).length;
    const bearScore = bearishKeywords.filter((k) => text.includes(k)).length;

    if (bullScore > bearScore) sentiment = 'BULLISH';
    else if (bearScore > bullScore) sentiment = 'BEARISH';

    // 2. Impact Score (1-5)
    let impactScore = 2;
    if (text.includes('fed') || text.includes('sec') || text.includes('etf') || text.includes('interest rate') || text.includes('cpi') || text.includes('inflation')) impactScore = 4;
    if (text.includes('all-time high') || text.includes('emergency') || text.includes('war') || text.includes('crisis') || text.includes('trillion')) impactScore = 5;
    if (text.includes('binance will list') || text.includes('acquisition') || text.includes('billion')) impactScore = Math.max(impactScore, 3);

    // 3. Entity Linking
    const linkedSymbols: string[] = [];
    if (text.includes('bitcoin') || text.includes('btc')) linkedSymbols.push('BTC-USDT:BINANCE');
    if (text.includes('ethereum') || text.includes('eth')) linkedSymbols.push('ETH-USDT:BINANCE');
    if (text.includes('solana') || text.includes('sol')) linkedSymbols.push('SOL-USDT:BINANCE');
    if (text.includes('xrp') || text.includes('ripple')) linkedSymbols.push('XRP-USDT:BINANCE');
    if (text.includes('doge')) linkedSymbols.push('DOGE-USDT:BINANCE');
    if (text.includes('sui')) linkedSymbols.push('SUI-USDT:BINANCE');
    if (text.includes('pepe')) linkedSymbols.push('PEPE-USDT:BINANCE');
    if (text.includes('nvidia') || text.includes('nvda')) linkedSymbols.push('NVDA:NASDAQ');
    if (text.includes('apple') || text.includes('aapl')) linkedSymbols.push('AAPL:NASDAQ');
    if (text.includes('s&p') || text.includes('sp500') || text.includes('wall st') || text.includes('stock')) linkedSymbols.push('SPY:ARCA');
    if (text.includes('gold') || text.includes('bullion')) linkedSymbols.push('GLD:ARCA');
    if (text.includes('oil') || text.includes('crude') || text.includes('petroleum')) linkedSymbols.push('USO:ARCA');
    if (text.includes('dollar') || text.includes('yield') || text.includes('treasury') || text.includes('euro')) linkedSymbols.push('EURUSD:FX');

    // 4. Tags
    const tags = new Set<string>(defaultTags);
    if (text.includes('etf')) tags.add('ETF');
    if (text.includes('defi') || text.includes('dex') || text.includes('staking')) tags.add('DEFI');
    if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('chip') || text.includes('semiconductor')) tags.add('AI');
    if (text.includes('sec') || text.includes('cftc') || text.includes('law') || text.includes('regulat') || text.includes('court')) tags.add('REGULATORY');
    if (text.includes('rate') || text.includes('fed') || text.includes('yield') || text.includes('bond') || text.includes('treasury')) tags.add('RATES');
    if (text.includes('gold') || text.includes('oil') || text.includes('metal') || text.includes('commodity')) tags.add('COMMODITIES');
    if (text.includes('inflation') || text.includes('cpi') || text.includes('gdp') || text.includes('central bank') || text.includes('macro')) tags.add('MACRO');
    if (text.includes('crypto') || text.includes('bitcoin') || text.includes('token') || text.includes('blockchain')) tags.add('CRYPTO');
    if (text.includes('equity') || text.includes('shares') || text.includes('nasdaq') || text.includes('s&p') || text.includes('earnings')) tags.add('EQUITIES');

    return {
      id: base.id || `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: base.timestamp || Date.now(),
      source: base.source || 'GLOBAL WIRE',
      headline: base.headline || '',
      summary: base.summary || '',
      sentiment,
      impactScore,
      linkedSymbols: Array.from(new Set(linkedSymbols)),
      tags: Array.from(tags),
      sourceUrl: base.sourceUrl,
      imageUrl: base.imageUrl,
      clusteredCount: base.clusteredCount || 3,
    };
  }
}

export const newsService = new NewsService();
