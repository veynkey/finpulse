# Market Data Providers & Capabilities

## 1. Explicit Data Rights & Capability Tagging

FinPulse Wave MAX enforces a strict **No-Fabrication** policy. Provider capabilities are declared explicitly:

| Provider | Asset Class | Status | Free / Paid | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Binance** | Crypto Spot & Perp | Implemented & Live | Free Public | L2 Order Book, AggTrades, Tickers |
| **Coinbase** | Crypto Spot | Adapter Ready | Free Public | Quotes, Trades, Order Book |
| **Kraken** | Crypto Spot | Adapter Ready | Free Public | Quotes, Trades |
| **NASDAQ / NYSE** | Equities | Integration Ready | Licensed Required | Trades, Quotes, Tape A/B/C |
| **CBOE / OPRA** | Options & Indices | Integration Ready | Licensed Required | Greeks, IV Surface, Option Chain |
| **FX Spot** | Forex | Integration Ready | Public / Freemium | Top of book rates |

When accessing an unlicensed feed or provider, the interface explicitly presents `DATA PROVIDER REQUIRED` rather than generating simulated or deceptive data.
