import { useState, useEffect } from 'react';
import type { MacroEvent } from '../types';
import PanelHeader from './PanelHeader';
import { Calendar, Clock, AlertCircle, ExternalLink, Search } from 'lucide-react';

// ---------------------------------------------------------------------------
// Reference point: 2026-09-23 14:40 UTC (today, Tuesday)
// All timestamps are offsets from this anchor so the calendar stays coherent.
// ---------------------------------------------------------------------------
const REF = new Date('2026-09-23T14:40:00Z').getTime();

// Helper: ms from REF
const h = (hours: number) => REF + hours * 3_600_000;

const MACRO_EVENTS: MacroEvent[] = [
  // ---- Past 48 h (already released) ----------------------------------------

  {
    id: 'm-001',
    country: 'USA',
    indicator: 'Initial Jobless Claims',
    timestamp: h(-46),
    period: 'Week Sep 14',
    actual: 219000,
    consensus: 225000,
    previous: 228000,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'SPX', 'BONDS'],
    sourceUrl: 'https://www.dol.gov/ui/data.pdf',
    sourceName: 'DOL (Jobless Claims)',
  },
  {
    id: 'm-002',
    country: 'EUR',
    indicator: 'HCOB Composite PMI',
    timestamp: h(-44),
    period: 'Sep Flash',
    actual: 48.9,
    consensus: 49.1,
    previous: 51.0,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['EURUSD', 'EuroStoxx', 'BUND'],
    sourceUrl: 'https://www.hcob-pmi.com/',
    sourceName: 'HCOB / S&P Global',
  },
  {
    id: 'm-003',
    country: 'GBP',
    indicator: 'UK CPI (YoY)',
    timestamp: h(-42),
    period: 'Aug',
    actual: 2.2,
    consensus: 2.1,
    previous: 2.2,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['GBPUSD', 'FTSE', 'GILTS'],
    sourceUrl: 'https://www.ons.gov.uk/economy/inflationandpriceindices',
    sourceName: 'ONS UK Inflation',
  },
  {
    id: 'm-004',
    country: 'JPY',
    indicator: 'BOJ Rate Decision',
    timestamp: h(-24),
    period: 'Sep 2026',
    actual: 0.25,
    consensus: 0.25,
    previous: 0.1,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USDJPY', 'Nikkei', 'JGB'],
    sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
    sourceName: 'Bank of Japan',
  },
  {
    id: 'm-005',
    country: 'CNY',
    indicator: 'Caixin Manufacturing PMI',
    timestamp: h(-22),
    period: 'Sep Flash',
    actual: 49.3,
    consensus: 50.1,
    previous: 50.4,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['USDCNH', 'CSI300', 'Commodities'],
    sourceUrl: 'https://www.pmi.spglobal.com/',
    sourceName: 'Caixin / S&P Global',
  },
  {
    id: 'm-006',
    country: 'EUR',
    indicator: 'IFO Business Climate',
    timestamp: h(-20),
    period: 'Sep',
    actual: 84.4,
    consensus: 85.8,
    previous: 86.6,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['EURUSD', 'DAX'],
    sourceUrl: 'https://www.ifo.de/en/survey/ifo-business-climate-index',
    sourceName: 'IFO Institute',
  },
  {
    id: 'm-007',
    country: 'USA',
    indicator: 'Durable Goods Orders (MoM)',
    timestamp: h(-5),
    period: 'Aug',
    actual: -0.3,
    consensus: 0.1,
    previous: 9.9,
    unit: '%',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'SPX', 'Industrials'],
    sourceUrl: 'https://www.census.gov/manufacturing/m3/index.html',
    sourceName: 'US Census Bureau',
  },

  // ---- Today (Sept 23, after REF) -------------------------------------------

  {
    id: 'm-008',
    country: 'USA',
    indicator: 'Michigan Consumer Sentiment',
    timestamp: h(1.5),
    period: 'Sep Final',
    consensus: 69.0,
    previous: 67.9,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'SPX', 'Retail'],
    sourceUrl: 'https://data.sca.isr.umich.edu/',
    sourceName: 'Univ of Michigan',
  },
  {
    id: 'm-009',
    country: 'EUR',
    indicator: 'ECB Rate Decision',
    timestamp: h(3),
    period: 'Sep 2026',
    consensus: 3.5,
    previous: 3.65,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['EURUSD', 'EURGBP', 'EuroStoxx', 'BUND'],
    sourceUrl: 'https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html',
    sourceName: 'European Central Bank',
  },
  {
    id: 'm-010',
    country: 'EUR',
    indicator: 'HICP (YoY)',
    timestamp: h(5),
    period: 'Aug Final',
    consensus: 2.2,
    previous: 2.6,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['EURUSD', 'BUND'],
    sourceUrl: 'https://ec.europa.eu/eurostat/web/hicp',
    sourceName: 'Eurostat HICP',
  },
  {
    id: 'm-011',
    country: 'GBP',
    indicator: 'BOE Rate Decision',
    timestamp: h(7),
    period: 'Sep 2026',
    consensus: 5.0,
    previous: 5.0,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['GBPUSD', 'FTSE', 'GILTS'],
    sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate',
    sourceName: 'Bank of England',
  },

  // ---- Tomorrow (Sept 24) ---------------------------------------------------

  {
    id: 'm-012',
    country: 'USA',
    indicator: 'Core CPI (YoY)',
    timestamp: h(26),
    period: 'Sep',
    consensus: 3.1,
    previous: 3.2,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'GOLD', 'BTC'],
    sourceUrl: 'https://www.bls.gov/cpi/',
    sourceName: 'BLS (Core CPI)',
  },
  {
    id: 'm-013',
    country: 'USA',
    indicator: 'PPI (MoM)',
    timestamp: h(27),
    period: 'Sep',
    consensus: 0.1,
    previous: 0.2,
    unit: '%',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'BONDS'],
    sourceUrl: 'https://www.bls.gov/ppi/',
    sourceName: 'BLS (PPI)',
  },
  {
    id: 'm-014',
    country: 'EUR',
    indicator: 'ZEW Economic Sentiment',
    timestamp: h(28),
    period: 'Sep',
    consensus: -15.0,
    previous: -19.2,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['EURUSD', 'DAX'],
    sourceUrl: 'https://www.zew.de/en/publications/zew-indicator-of-economic-sentiment/',
    sourceName: 'ZEW Germany',
  },
  {
    id: 'm-015',
    country: 'JPY',
    indicator: 'Japan CPI (YoY)',
    timestamp: h(29),
    period: 'Aug',
    consensus: 2.5,
    previous: 2.7,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USDJPY', 'Nikkei', 'JGB'],
    sourceUrl: 'https://www.stat.go.jp/english/data/cpi/index.html',
    sourceName: 'Japan Statistics Bureau',
  },

  // ---- Sept 25 (Thu) -------------------------------------------------------

  {
    id: 'm-016',
    country: 'USA',
    indicator: 'Non-Farm Payrolls',
    timestamp: h(50),
    period: 'Sep',
    consensus: 160000,
    previous: 142000,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'GOLD', 'BTC', 'BONDS'],
    sourceUrl: 'https://www.bls.gov/news-release/empsit.htm',
    sourceName: 'BLS (Jobs Report)',
  },
  {
    id: 'm-017',
    country: 'USA',
    indicator: 'PCE Price Index (YoY)',
    timestamp: h(51),
    period: 'Aug',
    consensus: 2.3,
    previous: 2.5,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USD', 'BONDS', 'GOLD'],
    sourceUrl: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index',
    sourceName: 'BEA (Core PCE)',
  },
  {
    id: 'm-018',
    country: 'USA',
    indicator: 'Initial Jobless Claims',
    timestamp: h(52),
    period: 'Week Sep 21',
    consensus: 224000,
    previous: 219000,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'SPX'],
    sourceUrl: 'https://www.dol.gov/ui/data.pdf',
    sourceName: 'DOL (Jobless Claims)',
  },

  // ---- Sept 26 (Fri) -------------------------------------------------------

  {
    id: 'm-019',
    country: 'USA',
    indicator: 'FOMC Rate Decision',
    timestamp: h(74),
    period: 'Sep 2026',
    consensus: 5.25,
    previous: 5.5,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'GOLD', 'BTC', 'BONDS', 'EURUSD'],
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    sourceName: 'Federal Reserve FOMC',
  },
  {
    id: 'm-020',
    country: 'USA',
    indicator: 'ISM Manufacturing PMI',
    timestamp: h(75),
    period: 'Sep',
    consensus: 47.5,
    previous: 47.2,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'Industrials'],
    sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/pmi/',
    sourceName: 'ISM Report on Business',
  },
  {
    id: 'm-021',
    country: 'CNY',
    indicator: 'China GDP (YoY)',
    timestamp: h(76),
    period: 'Q3 2026',
    consensus: 4.6,
    previous: 4.7,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USDCNH', 'CSI300', 'Commodities', 'AUD'],
    sourceUrl: 'http://www.stats.gov.cn/english/',
    sourceName: 'NBS China',
  },

  // ---- Sept 29 (Mon) -------------------------------------------------------

  {
    id: 'm-022',
    country: 'USA',
    indicator: 'ISM Services PMI',
    timestamp: h(122),
    period: 'Sep',
    consensus: 51.5,
    previous: 51.5,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'Services'],
    sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/services/',
    sourceName: 'ISM Services',
  },
  {
    id: 'm-023',
    country: 'USA',
    indicator: 'Retail Sales (MoM)',
    timestamp: h(123),
    period: 'Sep',
    consensus: 0.3,
    previous: 0.1,
    unit: '%',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'SPX', 'Consumer'],
    sourceUrl: 'https://www.census.gov/retail/index.html',
    sourceName: 'US Census Bureau',
  },
  {
    id: 'm-024',
    country: 'USA',
    indicator: 'Fed Minutes',
    timestamp: h(124),
    period: 'Sep FOMC',
    consensus: undefined,
    previous: undefined,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['USD', 'BONDS', 'SPX'],
    sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    sourceName: 'Federal Reserve FOMC',
  },
  {
    id: 'm-025',
    country: 'USA',
    indicator: 'GDP (QoQ Annualized)',
    timestamp: h(125),
    period: 'Q2 2026 Final',
    consensus: 3.0,
    previous: 1.4,
    unit: '%',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'BONDS'],
    sourceUrl: 'https://www.bea.gov/data/gdp/gross-domestic-product',
    sourceName: 'BEA GDP',
  },
  {
    id: 'm-026',
    country: 'EUR',
    indicator: 'HCOB Services PMI',
    timestamp: h(126),
    period: 'Sep Final',
    consensus: 52.1,
    previous: 52.9,
    unit: '',
    importance: 'MEDIUM',
    affectedAssets: ['EURUSD', 'EuroStoxx'],
    sourceUrl: 'https://www.hcob-pmi.com/',
    sourceName: 'HCOB / S&P Global',
  },
  {
    id: 'm-027',
    country: 'USA',
    indicator: 'JOLTS Job Openings',
    timestamp: h(130),
    period: 'Aug',
    consensus: 7650000,
    previous: 7670000,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'BONDS'],
    sourceUrl: 'https://www.bls.gov/jlt/',
    sourceName: 'BLS (JOLTS)',
  },
  {
    id: 'm-028',
    country: 'USA',
    indicator: 'EIA Crude Oil Stocks',
    timestamp: h(132),
    period: 'Week',
    consensus: -1.2,
    previous: -4.5,
    unit: 'M',
    importance: 'MEDIUM',
    affectedAssets: ['USO', 'SPX'],
    sourceUrl: 'https://www.eia.gov/petroleum/supply/weekly/',
    sourceName: 'EIA Petroleum Weekly',
  },
  {
    id: 'm-029',
    country: 'USA',
    indicator: 'CB Consumer Confidence',
    timestamp: h(140),
    period: 'Sep',
    consensus: 103.5,
    previous: 103.3,
    unit: '',
    importance: 'HIGH',
    affectedAssets: ['USD', 'SPX', 'Retail'],
    sourceUrl: 'https://www.conference-board.org/topics/consumer-confidence',
    sourceName: 'The Conference Board',
  },
  {
    id: 'm-030',
    country: 'USA',
    indicator: 'Existing Home Sales',
    timestamp: h(142),
    period: 'Aug',
    consensus: 3.90,
    previous: 3.95,
    unit: 'M',
    importance: 'MEDIUM',
    affectedAssets: ['USD', 'RealEstate'],
    sourceUrl: 'https://www.nar.realtor/research-and-statistics/housing-statistics/existing-home-sales',
    sourceName: 'NAR (Home Sales)',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COUNTRY_FLAGS: Record<string, string> = {
  USA: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CNY: '🇨🇳',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
};

const IMPORTANCE_COLORS: Record<string, string> = {
  HIGH: 'text-down bg-down/10 border border-down/20',
  MEDIUM: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
  LOW: 'text-muted bg-white/5 border border-border/30',
};

function formatCountdown(targetTs: number, now: number): string {
  const diff = targetTs - now;
  if (diff <= 0) return 'RELEASED';
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `IN ${hours}H ${mins}M`;
  return `IN ${mins}M`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }) + ' UTC';
}

function getDayLabel(ts: number, now: number): string {
  const tsDay = Math.floor(ts / 86_400_000);
  const nowDay = Math.floor(now / 86_400_000);
  const diff = tsDay - nowDay;
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).toUpperCase();
}

function getPastLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).toUpperCase();
}

type ImportanceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
type CountryFilter = 'ALL' | 'USA' | 'EUR' | 'GBP' | 'JPY' | 'CNY';
type StatusFilter = 'ALL' | 'UPCOMING' | 'RELEASED';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MacroCalendarPanel() {
  const [now, setNow] = useState(Date.now());
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>('ALL');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showReleased, setShowReleased] = useState<boolean>(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  // Filter events by country, importance, and search query
  const filtered = MACRO_EVENTS.filter((ev) => {
    if (importanceFilter !== 'ALL' && ev.importance !== importanceFilter) return false;
    if (countryFilter !== 'ALL' && ev.country !== countryFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match =
        ev.indicator.toLowerCase().includes(q) ||
        ev.country.toLowerCase().includes(q) ||
        (ev.sourceName && ev.sourceName.toLowerCase().includes(q)) ||
        ev.affectedAssets.some((a) => a.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // 1. UPCOMING / UNRELEASED EVENTS (Prioritized at the TOP)
  // Sorted chronologically ascending: soonest release comes first
  const upcomingList = filtered
    .filter((ev) => ev.timestamp >= now && ev.actual === undefined)
    .sort((a, b) => a.timestamp - b.timestamp);

  // 2. RELEASED EVENTS (Placed at the BOTTOM)
  // Sorted reverse-chronologically: freshest release comes first in the released block
  const releasedList = filtered
    .filter((ev) => ev.timestamp < now || ev.actual !== undefined)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Group upcoming events by day
  const upcomingGroups: { dayKey: string; label: string; events: MacroEvent[] }[] = [];
  for (const ev of upcomingList) {
    const dayKey = new Date(ev.timestamp).toISOString().slice(0, 10);
    const last = upcomingGroups[upcomingGroups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.events.push(ev);
    } else {
      const label = getDayLabel(ev.timestamp, now);
      upcomingGroups.push({ dayKey, label, events: [ev] });
    }
  }

  // Group released events by day
  const releasedGroups: { dayKey: string; label: string; events: MacroEvent[] }[] = [];
  for (const ev of releasedList) {
    const dayKey = new Date(ev.timestamp).toISOString().slice(0, 10);
    const last = releasedGroups[releasedGroups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.events.push(ev);
    } else {
      const label = getPastLabel(ev.timestamp);
      releasedGroups.push({ dayKey, label, events: [ev] });
    }
  }

  const impOptions: ImportanceFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
  const ctryOptions: CountryFilter[] = ['ALL', 'USA', 'EUR', 'GBP', 'JPY', 'CNY'];

  const filterBase =
    'px-2 py-0.5 rounded text-[10px] font-bold tracking-wide transition-colors cursor-pointer border';
  const filterActive = 'bg-accent/20 text-accent border-accent/40';
  const filterInactive = 'bg-transparent text-muted border-border/40 hover:text-text hover:border-border';

  const renderEventCard = (ev: MacroEvent) => {
    const isReleased = ev.timestamp < now || ev.actual !== undefined;
    const hasActual = ev.actual !== undefined;
    const countdown = formatCountdown(ev.timestamp, now);
    const flag = COUNTRY_FLAGS[ev.country] ?? '';
    const isImminent = !isReleased && Math.abs(ev.timestamp - now) <= 12 * 3_600_000;

    // Color actual vs consensus
    const actualColor =
      hasActual && ev.consensus !== undefined
        ? ev.actual! >= ev.consensus
          ? 'text-up font-bold'
          : 'text-down font-bold'
        : 'text-up font-bold';

    return (
      <div
        key={ev.id}
        className={`bg-[#12151b] border p-2.5 rounded space-y-1.5 transition-all ${
          isReleased
            ? 'border-border/40 opacity-75 hover:opacity-100 hover:border-border/70'
            : isImminent
            ? 'border-accent/60 bg-[#141822] shadow-sm shadow-accent/15'
            : 'border-border/70 hover:border-border'
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-[13px] leading-none">{flag}</span>
            <span className="font-bold text-text bg-white/10 px-1 rounded text-[10px] shrink-0">
              {ev.country}
            </span>

            {/* Clickable indicator title -> direct to official source */}
            {ev.sourceUrl ? (
              <a
                href={ev.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-text text-[11px] hover:text-accent hover:underline cursor-pointer flex items-center gap-1 group/title transition-colors"
                title={`Open official release page: ${ev.sourceUrl}`}
              >
                <span>{ev.indicator}</span>
                <ExternalLink className="w-3 h-3 text-muted/70 group-hover/title:text-accent shrink-0" />
              </a>
            ) : (
              <span className="font-semibold text-text text-[11px] truncate">
                {ev.indicator}
              </span>
            )}

            {/* Official Source Verified Release Button */}
            {ev.sourceUrl && (
              <a
                href={ev.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all shrink-0 ${
                  isImminent
                    ? 'bg-accent text-white shadow-sm shadow-accent/40 animate-pulse'
                    : 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent hover:text-white'
                }`}
                title={`Open official release: ${ev.sourceUrl}`}
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span>{ev.sourceName ? `${ev.sourceName} ↗` : 'LIVE RELEASE ↗'}</span>
              </a>
            )}

            <span className="text-muted text-[10px] shrink-0">({ev.period})</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-muted" />
            <span
              className={`text-[10px] font-bold ${
                isReleased
                  ? 'text-muted'
                  : isImminent
                  ? 'text-accent animate-pulse'
                  : 'text-accent'
              }`}
            >
              {countdown}
            </span>
          </div>
        </div>

        {/* Time */}
        <div className="text-[9px] text-muted/60">{formatTime(ev.timestamp)}</div>

        {/* Data grid */}
        <div className="grid grid-cols-3 bg-black/40 p-1.5 rounded text-[10px] border border-border/30">
          <div>
            ACTUAL:{' '}
            {hasActual ? (
              <span className={actualColor}>
                {ev.actual}
                {ev.unit}
              </span>
            ) : (
              <span className="text-muted font-normal">PENDING</span>
            )}
          </div>
          <div className="text-center">
            CONS:{' '}
            <span className="text-text font-medium">
              {ev.consensus !== undefined ? `${ev.consensus}${ev.unit}` : 'N/A'}
            </span>
          </div>
          <div className="text-right">
            PREV:{' '}
            <span className="text-muted">
              {ev.previous !== undefined ? `${ev.previous}${ev.unit}` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Footer: affected assets + importance */}
        <div className="flex items-center justify-between text-[9px] text-muted pt-0.5 gap-2">
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <AlertCircle className="w-2.5 h-2.5 text-accent shrink-0" />
            <span className="shrink-0">ASSETS:</span>
            {ev.affectedAssets.map((asset) => (
              <span key={asset} className="bg-white/5 text-text px-1 rounded shrink-0">
                {asset}
              </span>
            ))}
          </div>
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[9px] shrink-0 ${IMPORTANCE_COLORS[ev.importance]}`}
          >
            {ev.importance}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title="GLOBAL MACROECONOMIC CALENDAR"
        actions={
          <div className="flex items-center space-x-1 text-[10px] text-muted">
            <Calendar className="w-3 h-3 text-accent" />
            <span>UTC TIME</span>
          </div>
        }
      />

      {/* Quick Search Bar */}
      <div className="h-7 bg-[#111317] border-b border-border/40 px-2 flex items-center space-x-2 shrink-0">
        <Search size={11} className="text-muted" />
        <input
          type="text"
          placeholder="Filter indicator (e.g. Core CPI, NFP, PMI, FOMC, GDP, BLS)..."
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

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-1.5 px-2 pt-2 pb-1.5 border-b border-border/40">
        {/* Status Switcher: ALL, UPCOMING (Prioritized), RELEASED */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`${filterBase} ${statusFilter === 'ALL' ? filterActive : filterInactive}`}
              onClick={() => setStatusFilter('ALL')}
            >
              ALL ({filtered.length})
            </button>
            <button
              type="button"
              className={`${filterBase} ${statusFilter === 'UPCOMING' ? filterActive : filterInactive}`}
              onClick={() => setStatusFilter('UPCOMING')}
            >
              ⚡ UPCOMING ({upcomingList.length})
            </button>
            <button
              type="button"
              className={`${filterBase} ${statusFilter === 'RELEASED' ? filterActive : filterInactive}`}
              onClick={() => setStatusFilter('RELEASED')}
            >
              ✓ RELEASED ({releasedList.length})
            </button>
          </div>

          {/* Importance filters */}
          <div className="flex items-center gap-1">
            {impOptions.map((opt) => (
              <button
                key={opt}
                className={`${filterBase} ${importanceFilter === opt ? filterActive : filterInactive}`}
                onClick={() => setImportanceFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Country filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {ctryOptions.map((opt) => (
            <button
              key={opt}
              className={`${filterBase} ${countryFilter === opt ? filterActive : filterInactive}`}
              onClick={() => setCountryFilter(opt)}
            >
              {opt === 'ALL' ? 'ALL COUNTRIES' : `${COUNTRY_FLAGS[opt] ?? ''} ${opt}`}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="flex-grow overflow-auto p-2 space-y-4">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted text-[11px]">
            <AlertCircle className="w-5 h-5 mb-2 opacity-40" />
            <span>No events match the current filters.</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* 1. UPCOMING EVENTS (PRIORITIZED AT TOP)                          */}
        {/* ================================================================= */}
        {statusFilter !== 'RELEASED' && upcomingGroups.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-accent tracking-wider uppercase pb-0.5 border-b border-accent/20">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span>UPCOMING & IMMINENT RELEASES ({upcomingList.length})</span>
              </span>
              <span className="text-muted text-[9px] font-normal">Prioritized by Next Scheduled Time</span>
            </div>

            {upcomingGroups.map((group) => (
              <div key={group.dayKey} className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-widest text-accent">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-accent/20" />
                </div>

                <div className="space-y-2">
                  {group.events.map((ev) => renderEventCard(ev))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty upcoming state when in upcoming-only tab */}
        {statusFilter === 'UPCOMING' && upcomingGroups.length === 0 && filtered.length > 0 && (
          <div className="flex flex-col items-center justify-center h-28 text-muted text-[11px]">
            <span>No upcoming unreleased events under current filters.</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. RELEASED EVENTS (PLACED AT BOTTOM)                            */}
        {/* ================================================================= */}
        {statusFilter !== 'UPCOMING' && releasedGroups.length > 0 && (
          <div className="space-y-3 pt-2">
            {/* Section Divider Header */}
            <div className="flex items-center justify-between text-[10px] font-bold text-muted tracking-wider uppercase pb-0.5 border-b border-border/40">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted/60" />
                <span>RECENTLY RELEASED ({releasedList.length})</span>
              </span>
              {statusFilter === 'ALL' && (
                <button
                  type="button"
                  onClick={() => setShowReleased(!showReleased)}
                  className="text-[9px] text-muted hover:text-text font-normal px-1 py-0.5 rounded bg-white/5 border border-border/30"
                >
                  {showReleased ? 'Collapse Released ▲' : 'Expand Released ▼'}
                </button>
              )}
            </div>

            {showReleased &&
              releasedGroups.map((group) => (
                <div key={group.dayKey} className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-widest text-muted/70">
                      {group.label} (PAST)
                    </span>
                    <div className="flex-1 h-px bg-border/20" />
                  </div>

                  <div className="space-y-2">
                    {group.events.map((ev) => renderEventCard(ev))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
