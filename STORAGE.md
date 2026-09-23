# Multi-Tier Storage Architecture

## 1. Storage Tiers

1. **Hot Tier (In-Memory RAM):**
   - Level 2 Order Book state (top 50 bid/ask levels)
   - Recent 500 tick executions per instrument
   - Current candle state and Cumulative Volume Delta (CVD)
   - Active radar alerts

2. **Warm Tier (Embedded DuckDB):**
   - Embedded in-process DuckDB instance (`finpulse.db`).
   - Isolated in a dedicated blocking OS thread with Tokio `mpsc` queue to prevent blocking the async runtime.
   - Stores 1m/5m/15m/1h/1d candles, normalized historical trades, and radar anomaly logs.

3. **Cold Tier (Partitioned Parquet):**
   - Partitioned columnar files by date and asset:
     `data/<asset_class>/<venue>/<symbol>/trades/<year>/<month>/<day>.parquet`
   - Compacted periodically to prevent file fragmentation.

## 2. Auto-Pruning & Retention

Configurable retention policy:
- Raw tick data: 7 days retention
- Aggregated candle data: 365 days retention
- Radar events: 90 days retention
- Hard disk budget cap (default: 50 GB) with disk health monitoring.
