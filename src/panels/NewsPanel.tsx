import { useState, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { newsService } from '../services/newsService';
import type { NewsItem, LinkGroup } from '../types';
import PanelHeader from './PanelHeader';
import { Flame, Tag, ExternalLink, Search, Image as ImageIcon, RefreshCw } from 'lucide-react';

const SOURCE_REGISTRY: Record<string, { label: string; url: string; color: string }> = {
  'BINANCE NEWS':    { label: 'Binance',               url: 'https://www.binance.com/en/support/announcement',             color: '#f0b90b' },
  'YAHOO FINANCE':   { label: 'Yahoo Finance',         url: 'https://finance.yahoo.com',                                  color: '#a855f7' },
  'FOMC WIRE':       { label: 'Federal Reserve',      url: 'https://www.federalreserve.gov',                              color: '#22c55e' },
  'COINDESK':        { label: 'CoinDesk',              url: 'https://www.coindesk.com',                                    color: '#f59e0b' },
  'COINTELEGRAPH':   { label: 'CoinTelegraph',         url: 'https://cointelegraph.com',                                   color: '#2563eb' },
  'THE BLOCK':       { label: 'The Block',             url: 'https://www.theblock.co',                                     color: '#7c3aed' },
  'DECRYPT':         { label: 'Decrypt',               url: 'https://decrypt.co',                                          color: '#ec4899' },
  'REUTERS MARKETS': { label: 'Reuters',               url: 'https://www.reuters.com/markets',                             color: '#f97316' },
  'BLOOMBERG':       { label: 'Bloomberg',             url: 'https://www.bloomberg.com/markets',                           color: '#6366f1' },
  'FINANCIAL TIMES': { label: 'Financial Times',       url: 'https://www.ft.com',                                          color: '#f59e0b' },
  'WSJ MARKETS':     { label: 'Wall Street Journal',   url: 'https://www.wsj.com/news/markets',                            color: '#0ea5e9' },
  'SEC EDGAR':       { label: 'SEC EDGAR',             url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent',  color: '#14b8a6' },
  'ECB DISPATCH':    { label: 'European Central Bank', url: 'https://www.ecb.europa.eu/press',                             color: '#3b82f6' },
  'TREASURY WIRE':   { label: 'US Treasury',           url: 'https://home.treasury.gov',                                   color: '#10b981' },
  'BLOCKCHAIN INTEL':{ label: 'Glassnode',             url: 'https://glassnode.com/insights',                              color: '#a855f7' },
  'ENERGY RADAR':    { label: 'EIA',                   url: 'https://www.eia.gov/petroleum',                               color: '#f97316' },
  'MESSARI':         { label: 'Messari',               url: 'https://messari.io',                                          color: '#8b5cf6' },
  'DEFI PULSE':      { label: 'DeFiLlama',             url: 'https://defillama.com',                                       color: '#06b6d4' },
  'CFTC WATCH':      { label: 'CFTC',                  url: 'https://www.cftc.gov/PressRoom',                              color: '#ef4444' },
  'BIS RESEARCH':    { label: 'BIS',                   url: 'https://www.bis.org/publ/work.htm',                           color: '#64748b' },
  'MARKETWATCH':     { label: 'MarketWatch',           url: 'https://www.marketwatch.com',                                 color: '#84cc16' },
  'CNBC MARKETS':    { label: 'CNBC',                  url: 'https://www.cnbc.com/markets',                                color: '#ef4444' },
  'OPEC WIRE':       { label: 'OPEC',                  url: 'https://www.opec.org/opec_web/en/press_room',                 color: '#d97706' },
  'BITCOIN MAGAZINE':{ label: 'Bitcoin Magazine',      url: 'https://bitcoinmagazine.com',                                 color: '#f59e0b' },
  'IMF RESEARCH':    { label: 'IMF',                   url: 'https://www.imf.org/en/Publications',                         color: '#6366f1' },
  'BANK OF ENGLAND': { label: 'Bank of England',       url: 'https://www.bankofengland.co.uk/news',                        color: '#4f46e5' },
  'BANK OF JAPAN':   { label: 'Bank of Japan',         url: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',        color: '#dc2626' },
  'PBOC WIRE':       { label: "People's Bank of China",url: 'http://www.pbc.gov.cn/english/1752/index.html',              color: '#b91c1c' },
  'LME METALS':      { label: 'London Metal Exchange', url: 'https://www.lme.com/en/News-and-events',                      color: '#0284c7' },
  'EARNINGS WHISPERS':{ label: 'Earnings Whispers',    url: 'https://www.earningswhispers.com',                            color: '#059669' },
  '13F INSTITUTIONAL':{ label: 'SEC 13F Monitor',      url: 'https://www.sec.gov/edgar/searchedgar/companysearch',         color: '#7c3aed' },
  'BARRONS':         { label: "Barron's",              url: 'https://www.barrons.com',                                     color: '#ea580c' },
  'KITCO METALS':    { label: 'Kitco Precious Metals', url: 'https://www.kitco.com/news',                                 color: '#ca8a04' },
};

const now = Date.now();
const m  = 60 * 1000;
const h  = 60 * m;
const d  = 24 * h;

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n-01',
    timestamp: now - 2 * h,
    source: 'COINDESK',
    headline: 'BTC spot ETF net inflows hit $420M on Thursday across all 11 funds',
    summary: 'Thursday marked the third-consecutive day of positive net flows into US spot Bitcoin ETFs, with BlackRock IBIT alone accounting for $231M of the total. Exchange reserve balances tightened in response as institutional demand continues to outpace spot supply.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['BTC-USDT:BINANCE'],
    tags: ['CRYPTO', 'ETF'],
    sourceUrl: 'https://www.coindesk.com',
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 9,
  },
  {
    id: 'n-02',
    timestamp: now - 2.5 * h,
    source: 'FOMC WIRE',
    headline: 'FOMC minutes reveal hawkish lean: most members see risks to inflation as tilted to the upside',
    summary: 'Minutes from the September meeting show Federal Reserve officials broadly agree that policy must remain restrictive until inflation data provides sustained confidence. Several members noted readiness to raise rates further if progress stalls.',
    sentiment: 'NEUTRAL',
    impactScore: 5,
    linkedSymbols: ['SPY:ARCA', 'EURUSD:FX'],
    tags: ['MACRO', 'RATES'],
    sourceUrl: 'https://www.federalreserve.gov',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 18,
  },
  {
    id: 'n-03',
    timestamp: now - 3 * h,
    source: 'ECB DISPATCH',
    headline: 'ECB signals potential pause in rate hike cycle as Eurozone growth weakens',
    summary: 'Multiple Governing Council members indicated openness to holding rates at the October meeting, citing deteriorating PMI data across Germany and France. Chief Economist Lane noted that cumulative tightening is now feeding through to credit conditions faster than projected.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['EURUSD:FX'],
    tags: ['MACRO', 'FOREX', 'RATES'],
    sourceUrl: 'https://www.ecb.europa.eu/press',
    clusteredCount: 7,
  },
  {
    id: 'n-04',
    timestamp: now - 4 * h,
    source: 'REUTERS MARKETS',
    headline: 'NVIDIA Q3 earnings preview: sell-side consensus raised 18% in six weeks on data center order surge',
    summary: 'Seventeen of 22 analysts covering NVDA lifted revenue estimates ahead of the November print, pointing to continued hyperscaler spend on H100 and early GB200 delivery timelines. Gross margin expectations have also been revised upward to 74.5%.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['NVDA:NASDAQ', 'SPY:ARCA'],
    tags: ['EQUITIES', 'AI'],
    sourceUrl: 'https://www.reuters.com/markets',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 14,
  },
  {
    id: 'n-05',
    timestamp: now - 5 * h,
    source: 'BLOOMBERG',
    headline: 'China Caixin PMI beats expectations at 51.2 vs 50.4 estimate, strongest since April',
    summary: 'Private-sector manufacturing activity accelerated for the second consecutive month as new export orders improved and output prices stabilised. The beat challenges the recent consensus narrative of sustained Chinese demand weakness.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['SPY:ARCA'],
    tags: ['MACRO'],
    sourceUrl: 'https://www.bloomberg.com/markets',
    clusteredCount: 6,
  },
  {
    id: 'n-06',
    timestamp: now - 6 * h,
    source: 'CFTC WATCH',
    headline: 'SEC issues Wells notice to major crypto exchange over unregistered securities offering',
    summary: 'The exchange has 30 days to respond before the Commission decides whether to file formal charges. Legal analysts note the action targets staking-as-a-service products alongside the listing of tokens the SEC staff classifies as securities.',
    sentiment: 'BEARISH',
    impactScore: 4,
    linkedSymbols: ['BTC-USDT:BINANCE', 'ETH-USDT:BINANCE'],
    tags: ['CRYPTO', 'REGULATORY'],
    sourceUrl: 'https://www.cftc.gov/PressRoom',
    clusteredCount: 11,
  },
  {
    id: 'n-07',
    timestamp: now - 7 * h,
    source: 'TREASURY WIRE',
    headline: 'US 10Y yield touches 4.78% intraday, highest since 2007, on supply concerns',
    summary: 'A $24B 30-year bond auction drew weak demand with a tail of 3.7 basis points, pushing the belly and long end of the curve sharply higher. Real yields also rose, pressuring rate-sensitive equities and gold.',
    sentiment: 'BEARISH',
    impactScore: 4,
    linkedSymbols: ['SPY:ARCA', 'GLD:ARCA'],
    tags: ['MACRO', 'RATES'],
    sourceUrl: 'https://home.treasury.gov',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 16,
  },
  {
    id: 'n-08',
    timestamp: now - 8 * h,
    source: 'THE BLOCK',
    headline: 'Ethereum Layer-2 TVL crosses $45B milestone, Arbitrum and Base lead growth',
    summary: 'On-chain data shows total value locked across L2 networks surpassed the $45B mark for the first time, with Arbitrum One at $18.2B and Base at $9.7B. Transaction throughput on Base surged 34% week-over-week following a large DeFi protocol migration.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['ETH-USDT:BINANCE'],
    tags: ['CRYPTO', 'DEFI'],
    sourceUrl: 'https://www.theblock.co',
    clusteredCount: 5,
  },
  {
    id: 'n-09',
    timestamp: now - 9 * h,
    source: 'WSJ MARKETS',
    headline: 'Apple confirms iPhone 16 demand exceeds supply in first three weeks, lead times stretch to 5 weeks',
    summary: 'Apple supply chain checks show production shortfalls at Foxconn facilities in India and Vietnam with component constraints on the A18 Pro chip. Tim Cook addressed the demand outperformance on an investor call, declining to give unit guidance.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['AAPL:NASDAQ', 'SPY:ARCA'],
    tags: ['EQUITIES'],
    sourceUrl: 'https://www.wsj.com/news/markets',
    imageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 8,
  },
  {
    id: 'n-10',
    timestamp: now - 10 * h,
    source: 'ENERGY RADAR',
    headline: 'Oil extends four-day decline on demand concerns as China industrial data disappoints',
    summary: 'WTI slid 1.8% to $83.40/bbl while Brent fell to $87.10/bbl as Chinese crude imports dropped 6% month-over-month. Refinery throughput data from Shandong province showed independent refiners cutting run rates for the third straight week.',
    sentiment: 'BEARISH',
    impactScore: 3,
    linkedSymbols: ['USO:ARCA'],
    tags: ['COMMODITIES'],
    sourceUrl: 'https://www.eia.gov/petroleum',
    clusteredCount: 9,
  },
  {
    id: 'n-11',
    timestamp: now - 12 * h,
    source: 'FOMC WIRE',
    headline: 'US Core PCE cools to 2.7% YoY in August, Fed\'s preferred inflation gauge nears target',
    summary: 'The Personal Consumption Expenditures price index excluding food and energy printed at 2.7% year-over-year, the lowest reading since March 2021. Month-over-month core PCE rose 0.1%, below the 0.2% consensus, prompting rate cut probability repricing across Fed funds futures.',
    sentiment: 'BULLISH',
    impactScore: 5,
    linkedSymbols: ['SPY:ARCA', 'EURUSD:FX', 'BTC-USDT:BINANCE'],
    tags: ['MACRO', 'RATES'],
    sourceUrl: 'https://www.federalreserve.gov',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 22,
  },
  {
    id: 'n-12',
    timestamp: now - 14 * h,
    source: 'BITCOIN MAGAZINE',
    headline: 'MicroStrategy acquires 5,445 BTC at average $61,750 per coin, brings total to 158,245 BTC',
    summary: 'The latest purchase was funded through a combination of proceeds from 8.5% senior secured notes and at-the-market equity offerings. CEO Michael Saylor noted the acquisition keeps the firm\'s average cost basis at $29,670 per coin.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['BTC-USDT:BINANCE'],
    tags: ['CRYPTO', 'ETF'],
    sourceUrl: 'https://bitcoinmagazine.com',
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 7,
  },
  {
    id: 'n-13',
    timestamp: now - 16 * h,
    source: 'REUTERS MARKETS',
    headline: 'European natural gas storage reaches 95% capacity ahead of winter, easing supply anxiety',
    summary: 'EU storage facilities filled to 95.1% as of October 10, well above the 90% seasonal target and the five-year average of 87%. Mild autumn temperatures and robust LNG terminal utilisation in Spain and the Netherlands contributed to the rapid build.',
    sentiment: 'BULLISH',
    impactScore: 2,
    linkedSymbols: ['EURUSD:FX'],
    tags: ['COMMODITIES'],
    sourceUrl: 'https://www.reuters.com/markets',
    clusteredCount: 4,
  },
  {
    id: 'n-14',
    timestamp: now - 18 * h,
    source: 'BLOOMBERG',
    headline: 'Bank of Japan holds rates at 0.1%, upgrades FY2024 inflation outlook to 2.8%',
    summary: 'The BOJ kept its policy rate unchanged but revised up its inflation projection for fiscal 2024 from 2.5% to 2.8%, citing persistent service-sector price pressures and yen depreciation pass-through. Governor Ueda reiterated conditions for further normalization are approaching.',
    sentiment: 'NEUTRAL',
    impactScore: 4,
    linkedSymbols: ['USDJPY:FX'],
    tags: ['MACRO', 'FOREX', 'RATES'],
    sourceUrl: 'https://www.bloomberg.com/markets',
    clusteredCount: 10,
  },
  {
    id: 'n-15',
    timestamp: now - 20 * h,
    source: 'FINANCIAL TIMES',
    headline: 'US Retail Sales surge 0.7% MoM in September, doubling the 0.3% consensus estimate',
    summary: 'Non-store retailers and food-service establishments led gains, while auto dealer receipts fell. Control group sales, the measure that feeds GDP calculations, climbed 0.6%, pointing to resilient consumer spending heading into Q4.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['SPY:ARCA', 'USD:FX'],
    tags: ['MACRO'],
    sourceUrl: 'https://www.ft.com',
    clusteredCount: 12,
  },
  {
    id: 'n-16',
    timestamp: now - 22 * h,
    source: 'DEFI PULSE',
    headline: 'Curve Finance reports $2.1M in protocol revenue this week, highest since the August 2023 exploit',
    summary: 'Weekly fee revenue across Curve pools reached $2.1M, driven by a surge in stablecoin swap volumes and renewed liquidity mining incentives from partnered protocols. veCRV holders received 50% of collected fees via the distribution mechanism.',
    sentiment: 'BULLISH',
    impactScore: 2,
    linkedSymbols: ['ETH-USDT:BINANCE'],
    tags: ['DEFI', 'CRYPTO'],
    sourceUrl: 'https://defillama.com',
    clusteredCount: 3,
  },
  {
    id: 'n-17',
    timestamp: now - 24 * h,
    source: 'MARKETWATCH',
    headline: 'Gold surges toward $2,050/oz as geopolitical risk and safe-haven demand intensify',
    summary: 'Spot gold climbed 1.4% as investors rotated into defensive positions amid Middle East tensions and rising equity volatility. Central bank buying, which has totalled 800+ tonnes year-to-date per World Gold Council data, continues to provide structural support.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['GLD:ARCA'],
    tags: ['COMMODITIES', 'MACRO'],
    sourceUrl: 'https://www.marketwatch.com',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 8,
  },
  {
    id: 'n-18',
    timestamp: now - 26 * h,
    source: 'WSJ MARKETS',
    headline: 'Tesla Cybertruck production ramp slower than expected, supply chain data shows output at 35% target rate',
    summary: 'Third-party logistics and supplier shipment data indicate Cybertruck weekly build rates are running at approximately 350 units versus a 1,000-unit internal target. Cell supply from the 4680 line remains the binding constraint, per multiple supplier contacts.',
    sentiment: 'BEARISH',
    impactScore: 3,
    linkedSymbols: ['TSLA:NASDAQ', 'SPY:ARCA'],
    tags: ['EQUITIES'],
    sourceUrl: 'https://www.wsj.com/news/markets',
    clusteredCount: 6,
  },
  {
    id: 'n-19',
    timestamp: now - 28 * h,
    source: 'COINDESK',
    headline: 'Bitcoin mining hashrate hits all-time high of 650 EH/s, difficulty adjustment due in 4 days',
    summary: 'The 7-day average network hashrate breached 650 exahashes per second for the first time, driven by deployments of next-generation S21 and Antminer T21 hardware ahead of the April 2024 halving. The upcoming difficulty adjustment is projected at +3.8%.',
    sentiment: 'NEUTRAL',
    impactScore: 2,
    linkedSymbols: ['BTC-USDT:BINANCE'],
    tags: ['CRYPTO'],
    sourceUrl: 'https://www.coindesk.com',
    clusteredCount: 4,
  },
  {
    id: 'n-20',
    timestamp: now - 30 * h,
    source: 'IMF RESEARCH',
    headline: 'IMF cuts global growth forecast to 2.9% for 2024 in World Economic Outlook update',
    summary: 'The Fund cited tighter financial conditions, China property sector weakness, and geopolitical fragmentation as the primary drags. Advanced economy growth was revised down to 1.4%, while emerging market forecasts held at 4.0% on resilient domestic demand in India and Mexico.',
    sentiment: 'BEARISH',
    impactScore: 4,
    linkedSymbols: ['SPY:ARCA', 'EURUSD:FX', 'BTC-USDT:BINANCE'],
    tags: ['MACRO'],
    sourceUrl: 'https://www.imf.org/en/Publications',
    clusteredCount: 14,
  },
  {
    id: 'n-21',
    timestamp: now - 32 * h,
    source: 'OPEC WIRE',
    headline: 'OPEC+ confirms voluntary production cuts extended through Q1 2025 at Vienna meeting',
    summary: 'Saudi Arabia and Russia jointly announced the extension of their combined 1.3 mb/d voluntary cuts to March 2025. The communique noted the group would review the decision monthly and could adjust based on market conditions and compliance data.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['USO:ARCA'],
    tags: ['COMMODITIES', 'ENERGY'],
    sourceUrl: 'https://www.opec.org/opec_web/en/press_room',
    imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 11,
  },
  {
    id: 'n-22',
    timestamp: now - 34 * h,
    source: 'FOMC WIRE',
    headline: 'US Initial Jobless Claims print 217K for the week ending Oct 7, below 225K consensus',
    summary: 'Continuing claims edged down to 1.702M, signalling that laid-off workers are finding re-employment relatively quickly. The four-week moving average fell to 211K, consistent with a still-tight labor market that complicates the Fed\'s path to rate cuts.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['SPY:ARCA', 'USD:FX'],
    tags: ['MACRO', 'RATES'],
    sourceUrl: 'https://www.federalreserve.gov',
    clusteredCount: 7,
  },
  {
    id: 'n-23',
    timestamp: now - 36 * h,
    source: 'COINTELEGRAPH',
    headline: 'Solana validator network upgrade completes, TPS capacity expanded 40% via QUIC and Gulf Stream changes',
    summary: 'The v1.18 network upgrade deployed successfully across 95% of validators, raising sustained throughput capacity and reducing leader slot failures. Developers noted that localised fee markets now activate during congestion rather than blanket base fee hikes.',
    sentiment: 'BULLISH',
    impactScore: 2,
    linkedSymbols: ['SOL-USDT:BINANCE'],
    tags: ['CRYPTO'],
    sourceUrl: 'https://cointelegraph.com',
    clusteredCount: 3,
  },
  {
    id: 'n-24',
    timestamp: now - 38 * h,
    source: 'CNBC MARKETS',
    headline: 'Microsoft Azure AI revenue grows 28% quarter-over-quarter, beats consensus by $420M',
    summary: 'Azure OpenAI Service now has 18,000 customers up from 11,000 in the prior quarter. CFO Amy Hood noted that AI workloads drove three points of Azure\'s overall revenue growth, ahead of internal projections, and that capacity constraints are expected to ease in calendar Q1 2025.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['MSFT:NASDAQ', 'SPY:ARCA'],
    tags: ['EQUITIES', 'AI'],
    sourceUrl: 'https://www.cnbc.com/markets',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 13,
  },
  {
    id: 'n-25',
    timestamp: now - 42 * h,
    source: 'BIS RESEARCH',
    headline: 'BIS quarterly review warns stablecoin fragmentation poses systemic risk to cross-border payments',
    summary: 'The Bank for International Settlements paper documents 37 USD-pegged stablecoins with market caps above $100M, each operating on distinct reserve frameworks. Authors argue interoperability gaps and run-risk correlation could amplify stress events in correspondent banking.',
    sentiment: 'BEARISH',
    impactScore: 3,
    linkedSymbols: ['BTC-USDT:BINANCE', 'ETH-USDT:BINANCE'],
    tags: ['CRYPTO', 'REGULATORY', 'MACRO'],
    sourceUrl: 'https://www.bis.org/publ/work.htm',
    clusteredCount: 5,
  },
  {
    id: 'n-26',
    timestamp: now - 44 * h,
    source: 'REUTERS MARKETS',
    headline: 'German industrial production falls 2.4% MoM in August, weakest reading in three years',
    summary: 'Auto manufacturing and chemicals led the decline, with auto output down 5.1% as model changeover shutdowns coincided with weaker order books. The data reinforces concerns about Germany\'s competitiveness amid high energy costs and sluggish global goods demand.',
    sentiment: 'BEARISH',
    impactScore: 3,
    linkedSymbols: ['EURUSD:FX'],
    tags: ['MACRO', 'FOREX'],
    sourceUrl: 'https://www.reuters.com/markets',
    clusteredCount: 8,
  },
  {
    id: 'n-27',
    timestamp: now - 46 * h,
    source: 'THE BLOCK',
    headline: 'Ethereum spot ETF records first net inflow week since launch, $43M enters on Thursday alone',
    summary: 'After nine consecutive weeks of net redemptions dominated by Grayscale ETHE outflows, the Ethereum ETF complex turned positive. BlackRock ETHA and Fidelity FETH together pulled in $67M while Grayscale outflows slowed to $24M, producing the first positive net week.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['ETH-USDT:BINANCE'],
    tags: ['CRYPTO', 'ETF'],
    sourceUrl: 'https://www.theblock.co',
    clusteredCount: 6,
  },
  {
    id: 'n-28',
    timestamp: now - 48 * h,
    source: 'MARKETWATCH',
    headline: 'US ISM Services PMI beats sharply at 54.9 vs 51.7 estimate, business activity sub-index at 58.8',
    summary: 'The September services survey showed broad-based acceleration in new orders and employment, with only supplier deliveries softening. The print reinforces the narrative of a two-speed US economy where services hold up while manufacturing contracts.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['SPY:ARCA', 'USD:FX'],
    tags: ['MACRO'],
    sourceUrl: 'https://www.marketwatch.com',
    clusteredCount: 9,
  },
  {
    id: 'n-29',
    timestamp: now - 52 * h,
    source: 'SEC EDGAR',
    headline: 'SEC approves options trading on spot Bitcoin ETFs, effective November 19',
    summary: 'The Commission approved options market-making on all 11 approved spot Bitcoin ETF products simultaneously, citing adequate investor protections in the existing rules framework. Listed options will enable institutional hedging strategies and are expected to increase ETF liquidity.',
    sentiment: 'BULLISH',
    impactScore: 5,
    linkedSymbols: ['BTC-USDT:BINANCE'],
    tags: ['CRYPTO', 'ETF', 'REGULATORY'],
    sourceUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent',
    clusteredCount: 19,
  },
  {
    id: 'n-30',
    timestamp: now - 56 * h,
    source: 'FINANCIAL TIMES',
    headline: 'UK CPI falls to 3.1% in September, nearing the Bank of England\'s 2% target faster than forecast',
    summary: 'Core CPI dropped to 3.4% from 3.9%, driven by clothing, furniture, and recreation services. Services inflation, which the MPC has flagged as the key sticking point, eased to 5.2% from 6.1%, opening the door to rate cuts earlier than the market had priced.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['GBPUSD:FX'],
    tags: ['MACRO', 'FOREX'],
    sourceUrl: 'https://www.ft.com',
    clusteredCount: 10,
  },
  {
    id: 'n-31',
    timestamp: now - 60 * h,
    source: 'CNBC MARKETS',
    headline: 'AMD unveils MI350 AI accelerator claiming 40% compute efficiency gain over NVIDIA H100',
    summary: 'The MI350, built on TSMC 3nm and featuring 288GB HBM3e memory, targets large language model training and inference at data centers. AMD provided benchmark data showing 1.4x throughput on Llama 3 70B compared to H100 SXM5, though independent testing has not been published.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['AMD:NASDAQ', 'NVDA:NASDAQ'],
    tags: ['EQUITIES', 'AI'],
    sourceUrl: 'https://www.cnbc.com/markets',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 11,
  },
  {
    id: 'n-32',
    timestamp: now - 64 * h,
    source: 'COINDESK',
    headline: 'Celsius Network begins creditor distributions: $2.5B in claims processed in first batch',
    summary: 'Following the confirmed reorganisation plan, Celsius began distributing a mix of BTC, ETH, and cash to creditors in the first of three tranches. Recovery rates vary by account type, with custody account holders recovering approximately 72 cents on the dollar in crypto terms.',
    sentiment: 'NEUTRAL',
    impactScore: 2,
    linkedSymbols: ['BTC-USDT:BINANCE'],
    tags: ['CRYPTO', 'REGULATORY'],
    sourceUrl: 'https://www.coindesk.com',
    clusteredCount: 5,
  },
  {
    id: 'n-33',
    timestamp: now - 68 * h,
    source: 'FINANCIAL TIMES',
    headline: 'US Housing Starts drop 4.3% MoM in August as 30-year mortgage rates hold near 7.5%',
    summary: 'Single-family starts fell 3.7% while multifamily starts dropped 5.5%, reflecting builder caution amid elevated financing costs. The NAHB housing market index simultaneously fell to 44, with a reading below 50 indicating more builders see conditions as poor than good.',
    sentiment: 'BEARISH',
    impactScore: 2,
    linkedSymbols: ['SPY:ARCA'],
    tags: ['MACRO'],
    sourceUrl: 'https://www.ft.com',
    clusteredCount: 4,
  },
  {
    id: 'n-34',
    timestamp: now - 2.5 * d,
    source: 'MESSARI',
    headline: 'Tether USDT market cap exceeds $120B, setting a new all-time high in fiat-pegged digital dollars',
    summary: 'USDT supply grew by $4.2B over the past 30 days, with the majority minted on Tron (57%) and Ethereum (31%). Tether\'s Q3 attestation showed $72.5B in US Treasury bills as the primary reserve backing, with reported profits exceeding $1B for the quarter.',
    sentiment: 'BULLISH',
    impactScore: 2,
    linkedSymbols: ['BTC-USDT:BINANCE'],
    tags: ['CRYPTO', 'DEFI'],
    sourceUrl: 'https://messari.io',
    clusteredCount: 6,
  },
  {
    id: 'n-35',
    timestamp: now - 3 * d,
    source: 'REUTERS MARKETS',
    headline: 'European Parliament passes final AI Act implementation rules, fines up to 3% of global turnover',
    summary: 'MEPs approved the delegated acts governing high-risk AI system conformity assessments, general-purpose model obligations, and prohibited use cases. Providers of foundation models with compute thresholds above 10^25 FLOPs face the strictest transparency and incident reporting requirements.',
    sentiment: 'NEUTRAL',
    impactScore: 3,
    linkedSymbols: ['EURUSD:FX', 'NVDA:NASDAQ'],
    tags: ['REGULATORY', 'AI'],
    sourceUrl: 'https://www.reuters.com/markets',
    clusteredCount: 8,
  },
  {
    id: 'n-36',
    timestamp: now - 3.2 * d,
    source: 'BANK OF ENGLAND',
    headline: 'Bank of England signals cautious easing path as UK services inflation stays elevated at 5.2%',
    summary: 'Governor Bailey reiterated the Monetary Policy Committee will not rush rate reductions, stressing that persistent wage growth and services pricing require restrictive settings for an extended duration.',
    sentiment: 'NEUTRAL',
    impactScore: 4,
    linkedSymbols: ['GBPUSD:FX', 'SPY:ARCA'],
    tags: ['MACRO', 'FOREX', 'RATES'],
    sourceUrl: 'https://www.bankofengland.co.uk/news',
    clusteredCount: 5,
  },
  {
    id: 'n-37',
    timestamp: now - 3.4 * d,
    source: 'BANK OF JAPAN',
    headline: 'Bank of Japan hints at another rate hike if economic and price trends align with forecasts',
    summary: 'Governor Ueda told parliament that real interest rates remain deeply negative and further policy rate adjustments will be implemented if baseline economic projections continue to materialize as anticipated.',
    sentiment: 'NEUTRAL',
    impactScore: 4,
    linkedSymbols: ['USDJPY:FX'],
    tags: ['MACRO', 'FOREX', 'RATES'],
    sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
    clusteredCount: 9,
  },
  {
    id: 'n-38',
    timestamp: now - 3.5 * d,
    source: 'PBOC WIRE',
    headline: "People's Bank of China cuts Reserve Requirement Ratio (RRR) by 50 bps, releasing 1T Yuan in liquidity",
    summary: 'The PBOC announced broad-based monetary stimulus including mortgage rate reductions and special liquidity facilities to support equity market stabilization and commercial bank lending capacity.',
    sentiment: 'BULLISH',
    impactScore: 5,
    linkedSymbols: ['SPY:ARCA', 'BTC-USDT:BINANCE'],
    tags: ['MACRO', 'RATES'],
    sourceUrl: 'http://www.pbc.gov.cn/english/1752/index.html',
    clusteredCount: 16,
  },
  {
    id: 'n-39',
    timestamp: now - 3.7 * d,
    source: 'LME METALS',
    headline: 'Copper surges to $9,800/ton on London Metal Exchange amid power grid investments and AI center expansion',
    summary: 'Refined copper inventories at LME warehouses fell for a fourth straight week as smelter production cuts and accelerating demand for high-voltage power transmission components tighten global balance sheets.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['SPY:ARCA'],
    tags: ['COMMODITIES'],
    sourceUrl: 'https://www.lme.com/en/News-and-events',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 7,
  },
  {
    id: 'n-40',
    timestamp: now - 4 * d,
    source: 'KITCO METALS',
    headline: 'Gold spot breaks above $2,650/oz to fresh record high as sovereign central banks continue accumulation',
    summary: 'Physical bullion demand remains robust among emerging market central banks seeking diversification away from G7 fiat assets, while gold ETF holdings reversed two years of steady liquidations.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['GLD:ARCA', 'BTC-USDT:BINANCE'],
    tags: ['COMMODITIES', 'MACRO'],
    sourceUrl: 'https://www.kitco.com/news',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&auto=format&fit=crop&q=60',
    clusteredCount: 14,
  },
  {
    id: 'n-41',
    timestamp: now - 4.2 * d,
    source: 'EARNINGS WHISPERS',
    headline: 'Big Tech Q3 capex trajectory projected to top $200B annualized run rate on persistent AI infrastructure demand',
    summary: 'Consensus estimates across hyperscalers indicate aggregate quarterly capital expenditures accelerating into 2026, with server clusters, optical networking, and custom ASIC development commanding the largest share.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['NVDA:NASDAQ', 'MSFT:NASDAQ', 'AAPL:NASDAQ'],
    tags: ['EQUITIES', 'AI'],
    sourceUrl: 'https://www.earningswhispers.com',
    clusteredCount: 11,
  },
  {
    id: 'n-42',
    timestamp: now - 4.5 * d,
    source: '13F INSTITUTIONAL',
    headline: 'SEC 13F filings show hedge fund positioning rotates into defensive utilities and energy dividend cash flows',
    summary: 'Quarterly institutional filings reveal macro funds trimmed high-beta semiconductor holdings following year-to-date outperformance, redeploying capital into regulated electric utilities and pipeline operators.',
    sentiment: 'NEUTRAL',
    impactScore: 3,
    linkedSymbols: ['SPY:ARCA', 'USO:ARCA'],
    tags: ['EQUITIES', 'REGULATORY'],
    sourceUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
    clusteredCount: 6,
  },
  {
    id: 'n-43',
    timestamp: now - 4.8 * d,
    source: 'BARRONS',
    headline: 'Semiconductor capital equipment backlogs expand to record 9 months on high-bandwidth memory (HBM3e) packaging',
    summary: 'Advanced packaging vendors reported 100% capacity utilization through mid-2026 as demand for multi-die packaging in artificial intelligence accelerators creates severe supply-chain bottlenecks.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['NVDA:NASDAQ', 'AMD:NASDAQ'],
    tags: ['EQUITIES', 'AI'],
    sourceUrl: 'https://www.barrons.com',
    clusteredCount: 8,
  },
  {
    id: 'n-44',
    timestamp: now - 5 * d,
    source: 'BLOCKCHAIN INTEL',
    headline: 'Ethereum long-term holder supply hits 74.8% as staking deposits reach 34.5M ETH milestone',
    summary: 'On-chain metrics show coin dormancy metrics at historical highs with exchange balances falling below 10% of circulating supply. Liquid restaking protocols have absorbed 4.8M ETH since inception.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['ETH-USDT:BINANCE'],
    tags: ['CRYPTO', 'DEFI'],
    sourceUrl: 'https://glassnode.com/insights',
    clusteredCount: 5,
  },
  {
    id: 'n-45',
    timestamp: now - 5.2 * d,
    source: 'DEFI PULSE',
    headline: 'Total value locked across decentralized finance protocols climbs above $92B led by liquid restaking growth',
    summary: 'DeFi TVL advanced 14% month-over-month as institutional collateral management platforms and cross-chain liquidity bridges recorded elevated capital deposits across Arbitrum, Base, and Solana ecosystems.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['ETH-USDT:BINANCE', 'SOL-USDT:BINANCE'],
    tags: ['DEFI', 'CRYPTO'],
    sourceUrl: 'https://defillama.com',
    clusteredCount: 6,
  },
  {
    id: 'n-46',
    timestamp: now - 5.5 * d,
    source: 'TREASURY WIRE',
    headline: 'US Treasury 2-year yield slips 6 bps to 3.98% following benign core producer price prints',
    summary: 'Short-duration sovereign paper rallied sharply as swap markets priced in an 82% probability of a 25 basis point policy rate cut at the upcoming Federal Open Market Committee meeting.',
    sentiment: 'BULLISH',
    impactScore: 4,
    linkedSymbols: ['SPY:ARCA', 'EURUSD:FX'],
    tags: ['RATES', 'MACRO'],
    sourceUrl: 'https://home.treasury.gov',
    clusteredCount: 12,
  },
  {
    id: 'n-47',
    timestamp: now - 5.8 * d,
    source: 'CFTC WATCH',
    headline: 'CFTC Commitments of Traders shows asset managers raise aggregate S&P 500 net-long exposure to multi-year high',
    summary: 'The latest regulatory positioning report revealed institutional accounts added 28,400 net long E-mini contracts, while leveraged funds reduced short delta to the lowest level since January.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['SPY:ARCA'],
    tags: ['EQUITIES', 'REGULATORY'],
    sourceUrl: 'https://www.cftc.gov/PressRoom',
    clusteredCount: 4,
  },
  {
    id: 'n-48',
    timestamp: now - 6 * d,
    source: 'ENERGY RADAR',
    headline: 'EIA weekly petroleum status report indicates commercial crude inventory draw of 4.5M barrels vs 1.1M forecast',
    summary: 'US crude stockpiles dropped significantly due to high refinery utilization rates of 93.8% and elevated export volumes through Gulf Coast maritime export terminals.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['USO:ARCA'],
    tags: ['COMMODITIES'],
    sourceUrl: 'https://www.eia.gov/petroleum',
    clusteredCount: 5,
  },
  {
    id: 'n-49',
    timestamp: now - 6.5 * d,
    source: 'COINTELEGRAPH',
    headline: 'Solana decentralized exchange weekly trading volume surpasses $15B, narrowing gap with Ethereum L1',
    summary: 'Automated market maker activity on Solana surged following widespread retail adoption of decentralized order books and micro-fee liquidity pools, with active wallets climbing above 3.8M.',
    sentiment: 'BULLISH',
    impactScore: 3,
    linkedSymbols: ['SOL-USDT:BINANCE', 'ETH-USDT:BINANCE'],
    tags: ['CRYPTO', 'DEFI'],
    sourceUrl: 'https://cointelegraph.com',
    clusteredCount: 7,
  },
  {
    id: 'n-50',
    timestamp: now - 7 * d,
    source: 'BLOOMBERG',
    headline: 'Global currency reserve managers diversify into alternative liquid assets amid changing reserve dynamics',
    summary: 'Sovereign wealth funds and official foreign exchange reserve desks are incrementally allocating toward gold, bilateral trade settlement currencies, and supranational green bonds to mitigate geopolitical concentration risks.',
    sentiment: 'NEUTRAL',
    impactScore: 4,
    linkedSymbols: ['EURUSD:FX', 'GLD:ARCA', 'BTC-USDT:BINANCE'],
    tags: ['FOREX', 'MACRO'],
    sourceUrl: 'https://www.bloomberg.com/markets',
    clusteredCount: 15,
  },
];

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / (60 * 1000));
  const hours   = Math.floor(diff / (60 * 60 * 1000));
  const days    = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (minutes >= 1) return `${minutes}m ago`;
  return 'just now';
}

const TAG_FILTERS = ['ALL', 'MACRO', 'CRYPTO', 'EQUITIES', 'FOREX', 'RATES', 'COMMODITIES', 'ETF', 'REGULATORY', 'DEFI', 'AI'] as const;

export default function NewsPanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { setLinkedSymbol } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const [news, setNews] = useState<NewsItem[]>(() => {
    const cached = newsService.getNews();
    return cached.length > 0 ? cached : INITIAL_NEWS;
  });
  const [isRefreshing, setIsRefreshing] = useState(newsService.getIsRefreshing());
  const [lastFetchTime, setLastFetchTime] = useState(newsService.getLastFetchTime());
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = newsService.subscribe((updatedNews, refreshing) => {
      if (updatedNews && updatedNews.length > 0) {
        setNews(updatedNews);
      }
      setIsRefreshing(refreshing);
      setLastFetchTime(newsService.getLastFetchTime());
    });
    return () => unsub();
  }, []);

  const filtered = news.filter((n) => {
    const matchesTag    = selectedTag === 'ALL' || n.tags.includes(selectedTag);
    const matchesSource = selectedSource === 'ALL' || n.source === selectedSource;
    const matchesSearch =
      searchQuery.trim() === '' ||
      n.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (SOURCE_REGISTRY[n.source]?.label.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTag && matchesSource && matchesSearch;
  });

  const bullishCount  = filtered.filter((n) => n.sentiment === 'BULLISH').length;
  const bearishCount  = filtered.filter((n) => n.sentiment === 'BEARISH').length;
  const neutralCount  = filtered.filter((n) => n.sentiment === 'NEUTRAL').length;
  const total         = filtered.length || 1;

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => new Set(prev).add(id));
  };

  const handleOpenSource = (url?: string) => {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090b0e] text-xs font-mono select-none">
      <PanelHeader
        title="NEWS INTELLIGENCE & ENTITY LINKING"
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          <div className="flex items-center space-x-2 text-[10px]">
            {isRefreshing ? (
              <span className="text-accent text-[9px] font-bold flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" />
                <span className="hidden sm:inline">LIVE REFRESH...</span>
              </span>
            ) : lastFetchTime > 0 ? (
              <span className="text-muted text-[9px] font-mono hidden sm:inline" title={new Date(lastFetchTime).toLocaleTimeString()}>
                Updated {formatRelativeTime(lastFetchTime)}
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => newsService.refreshNews()}
              disabled={isRefreshing}
              className="p-1 rounded text-muted hover:text-text hover:bg-surface transition-colors flex items-center gap-1"
              title="Refresh live financial & crypto feeds now"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-accent' : ''} />
              <span className="hidden md:inline text-[10px]">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Dedicated Tags Ribbon: Horizontal scrollable so CRYPTO, EQUITIES, etc. NEVER get cut off! */}
      <div className="h-7 bg-[#0d1014] border-b border-border/40 px-2 flex items-center space-x-1 overflow-x-auto no-scrollbar shrink-0 text-[10px] select-none">
        <span className="text-muted font-bold text-[9px] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Tag size={10} className="text-accent" /> TAGS:
        </span>
        {TAG_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedTag(t)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 border whitespace-nowrap ${
              selectedTag === t
                ? 'bg-accent/20 text-accent border-accent/50 shadow-sm'
                : 'text-muted hover:text-text bg-white/5 border-border/30 hover:border-border/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="h-7 bg-[#111317] border-b border-border/40 px-2 flex items-center space-x-2 shrink-0">
        <Search size={11} className="text-muted" />
        <input
          type="text"
          placeholder="Filter by headline, source (Bloomberg, Reuters, Fed, SEC...), entity, or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-[11px] text-text placeholder-muted/60 focus:outline-none w-full"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-muted hover:text-text px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sources Filter Strip */}
      <div className="h-7 bg-[#0c0e12] border-b border-border/30 px-2 flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-[10px] shrink-0">
        <span className="text-muted font-bold text-[9px] uppercase tracking-wider shrink-0 mr-0.5">
          SOURCES:
        </span>
        <button
          type="button"
          onClick={() => setSelectedSource('ALL')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 border ${
            selectedSource === 'ALL'
              ? 'bg-accent/20 text-accent border-accent/40'
              : 'text-muted hover:text-text bg-white/5 border-border/30'
          }`}
        >
          ALL ({news.length})
        </button>
        {Object.keys(SOURCE_REGISTRY).map((src) => {
          const reg = SOURCE_REGISTRY[src];
          const count = news.filter((n) => n.source === src).length;
          if (count === 0) return null;
          const isActive = selectedSource === src;
          return (
            <button
              key={src}
              type="button"
              onClick={() => setSelectedSource(isActive ? 'ALL' : src)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all shrink-0 flex items-center space-x-1 border ${
                isActive
                  ? 'bg-accent/20 text-accent font-bold border-accent/60 shadow-sm'
                  : 'text-muted hover:text-text bg-white/5 border-border/30 hover:border-border/60'
              }`}
              title={`Filter by ${reg.label} (${count} stories)`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: reg.color }}
              />
              <span>{reg.label}</span>
              <span className="opacity-60 text-[9px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Sentiment summary bar */}
      <div className="shrink-0 bg-[#0d1014] border-b border-border/30 px-3 py-1.5 flex items-center space-x-4 text-[10px]">
        <span className="text-muted font-semibold uppercase tracking-wider">Sentiment</span>
        <div className="flex items-center space-x-1">
          <span className="text-up font-bold">{bullishCount}</span>
          <span className="text-muted">BULLISH</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-down font-bold">{bearishCount}</span>
          <span className="text-muted">BEARISH</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-muted font-bold">{neutralCount}</span>
          <span className="text-muted">NEUTRAL</span>
        </div>
        {/* Proportional bar */}
        <div className="flex-grow h-1.5 bg-white/5 rounded-full overflow-hidden ml-2 hidden sm:flex">
          {bullishCount > 0 && (
            <div
              className="h-full bg-up/70 rounded-l-full transition-all"
              style={{ width: `${(bullishCount / total) * 100}%` }}
            />
          )}
          {neutralCount > 0 && (
            <div
              className="h-full bg-white/30 transition-all"
              style={{ width: `${(neutralCount / total) * 100}%` }}
            />
          )}
          {bearishCount > 0 && (
            <div
              className="h-full bg-down/70 rounded-r-full transition-all"
              style={{ width: `${(bearishCount / total) * 100}%` }}
            />
          )}
        </div>
        <span className="text-muted ml-auto shrink-0">{filtered.length} items</span>
      </div>

      {/* News feed */}
      <div className="flex-grow overflow-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-xs">
            No matching news events for &quot;{searchQuery || selectedSource}&quot;
          </div>
        ) : (
          filtered.map((item) => {
            const relTime = formatRelativeTime(item.timestamp);
            const sentimentClass =
              item.sentiment === 'BULLISH'
                ? 'text-up bg-up/10'
                : item.sentiment === 'BEARISH'
                ? 'text-down bg-down/10'
                : 'text-muted bg-white/5';

            const hasImage   = !!item.imageUrl && !brokenImages.has(item.id);
            const registry   = SOURCE_REGISTRY[item.source];
            const sourceColor = registry?.color ?? '#6b7280';
            const sourceUrl   = registry?.url ?? item.sourceUrl;

            return (
              <div
                key={item.id}
                className="bg-[#12151b] border border-border/60 hover:border-accent/50 p-2.5 rounded transition-all flex flex-col space-y-2 group"
              >
                <div className="flex items-start space-x-3">
                  {/* Thumbnail with fallback */}
                  <div className="w-16 h-14 bg-surface rounded overflow-hidden shrink-0 border border-border/40 flex items-center justify-center relative">
                    {hasImage ? (
                      <img
                        src={item.imageUrl}
                        alt="News thumbnail"
                        onError={() => handleImageError(item.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon size={18} className="text-muted/40" />
                    )}
                  </div>

                  {/* Headline and metadata */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                      <div className="flex items-center space-x-1.5 truncate min-w-0">
                        {/* Colored source dot */}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sourceColor }}
                          title={registry?.label ?? item.source}
                        />
                        {/* Clickable source name */}
                        <button
                          type="button"
                          onClick={() => handleOpenSource(sourceUrl)}
                          className="font-semibold truncate transition-colors hover:text-text flex items-center space-x-1"
                          style={{ color: sourceColor }}
                          title={`Open ${registry?.label ?? item.source} official site`}
                        >
                          <span>{item.source}</span>
                          <ExternalLink size={9} className="opacity-70" />
                        </button>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0">{relTime}</span>
                        {item.clusteredCount && item.clusteredCount > 1 && (
                          <span className="bg-accent/15 text-accent px-1 rounded text-[9px] shrink-0">
                            +{item.clusteredCount} sources
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${sentimentClass}`}>
                          {item.sentiment}
                        </span>
                        <div
                          className="flex items-center text-accent"
                          title={`Impact: ${item.impactScore}/5`}
                        >
                          {Array.from({ length: item.impactScore }).map((_, i) => (
                            <Flame key={i} className="w-2.5 h-2.5 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Headline as clickable link */}
                    {sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-text text-[11px] leading-snug line-clamp-2 hover:text-accent hover:underline transition-colors block cursor-pointer"
                        title={`Open story at ${registry?.label ?? item.source}`}
                      >
                        {item.headline}
                      </a>
                    ) : (
                      <div className="font-semibold text-text text-[11px] leading-snug line-clamp-2">
                        {item.headline}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div className="text-muted text-[10px] leading-relaxed">
                  {item.summary}
                </div>

                {/* Bottom ribbon */}
                <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-border/30">
                  <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar min-w-0">
                    <Tag className="w-2.5 h-2.5 text-muted shrink-0" />
                    {item.tags.map((t) => (
                      <span key={t} className="bg-white/5 px-1 py-0.5 rounded text-muted shrink-0 whitespace-nowrap">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    {/* Symbol linker buttons */}
                    <div className="flex items-center space-x-1">
                      <span className="text-muted">LINK:</span>
                      {item.linkedSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setLinkedSymbol(linkGroup, sym)}
                          className="bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded hover:bg-accent hover:text-white transition-colors whitespace-nowrap"
                          title={`Switch ${linkGroup} group to ${sym}`}
                        >
                          {sym.split(':')[0]}
                        </button>
                      ))}
                    </div>

                    {/* External source link */}
                    {sourceUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenSource(sourceUrl)}
                        className="flex items-center space-x-1 text-muted hover:text-accent transition-colors border border-border/50 rounded px-1.5 py-0.5"
                        title="Open source"
                      >
                        <ExternalLink size={10} />
                        <span>Source</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
