# FinPulse Wave MAX - Architecture Specification

## 1. Executive Summary

FinPulse Wave MAX is an institutional-grade, local-first market intelligence workstation built for desktop environments. Operating on a zero-remote-AI and embedded database philosophy, all computation—including quantitative risk calculations, order flow metrics, deterministic anomaly radar, and AI inference—runs locally on the user's workstation.

```
                    EXTERNAL FEEDS
            (Binance WSS, Public REST APIs)
                           │
                           ▼
  ┌─────────────────────────────────────────────────┐
  │              RUST FAST-PATH DATA PLANE          │
  │  - Connector Mesh (tokio-tungstenite)           │
  │  - Canonical Normalizer (Instrument/Event)      │
  │  - High-Speed Tokio Broadcast Bus (100k cap)    │
  │  - Hot RAM Market State Engine                  │
  └────────────────┬───────────────────┬────────────┘
                   │                   │
                   ▼                   ▼
        ┌─────────────────────┐   ┌───────────────────────────┐
        │   SLOW-PATH ENGINE  │   │     TAURI IPC BRIDGE      │
        │ - Dedicated Worker  │   │ - Bounded RingBuffer      │
        │ - DuckDB Persistence│   │ - Throttled Channels      │
        │ - Parquet Archival  │   │ - Narrow Validated APIs   │
        └─────────────────────┘   └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │    REACT + TS FRONTEND    │
                                  │ - Bloomberg Link Groups   │
                                  │ - Lightweight-Charts L2   │
                                  │ - Order Flow & Tape       │
                                  │ - Evidence-first AI UI    │
                                  │ - FinQL Scanner & Screener│
                                  └───────────────────────────┘
```

## 2. Fast Path vs Slow Path Architecture

### Fast Path (Sub-millisecond latency)
1. **Network Layer:** `tokio-tungstenite` ingests exchange frames via asynchronous stream.
2. **Parser & Normalizer:** Converts raw JSON/Binary to canonical `MarketEvent` (Trade, Quote, Candle).
3. **Internal Event Bus:** Dispatches `SharedMarketEvent` via bounded `tokio::sync::broadcast` channel.
4. **Hot RAM State Engine:** Atomically updates in-memory Level 2 order book and Cumulative Volume Delta (CVD).
5. **Throttled Frontend Stream:** Batches visual updates to 30-60 Hz using Tauri channels to prevent UI thread lock.

### Slow Path (Asynchronous analytics & persistence)
1. **DuckDB Worker:** Dedicated OS thread consuming an `mpsc` queue for micro-batch inserts. Never locks Tokio's asynchronous runtime.
2. **Deterministic Radar Engine:** Evaluates rolling Z-scores for volume spikes, volatility expansion, and CVD divergence.
3. **Local AI Stack:** In-process GGUF LLM execution (via llama.cpp/ort) triggered on-demand with structured evidence gathering.
4. **Cold Tier Parquet:** Partitioned daily columnar files (`data/<asset>/<venue>/<symbol>/trades/<year>/<month>/<day>.parquet`).

## 3. Linked-Context Workspace

Panels belong to color-coded Link Groups (`BLUE`, `GREEN`, `ORANGE`, `PURPLE`). Selecting an asset in the Watchlist automatically coordinates:
- Candlestick and volume chart focus
- Level 2 Order Book depth ladder
- Time & Sales tape and CVD delta
- News Intelligence entity filtering
- Evidence-first AI Analyst prompt context
