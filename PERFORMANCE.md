# Performance Benchmarks & Targets

## 1. Fast-Path Internal Ingestion

The Rust backend internal data plane is architected for:
- Message Ingestion: Up to 50,000+ normalized ticks/second on standard 8-core CPU.
- Internal Bus Latency: Sub-100 microseconds via lock-efficient `tokio::sync::broadcast`.
- DuckDB Micro-batch Flush: 100-event batch inserts with sub-3ms transaction overhead.

## 2. UI Refresh Throttling

To preserve frame rates and prevent React state explosion:
- Exchange updates: Ingested at full stream velocity in Rust.
- Frontend IPC Channel: Throttled to 30-60 Hz display refresh rates.
- Chart Updates: Imperative `series.update()` on visible panels only.
