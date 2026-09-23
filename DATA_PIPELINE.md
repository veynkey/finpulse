# Data Pipeline & Normalization

## 1. Connector Mesh

All market data connectors implement the asynchronous `MarketDataProvider` trait:

```rust
#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn connect(&mut self) -> anyhow::Result<()>;
    async fn subscribe(&mut self, instruments: Vec<Instrument>) -> anyhow::Result<()>;
    async fn unsubscribe(&mut self, instruments: Vec<Instrument>) -> anyhow::Result<()>;
}
```

## 2. Canonical Instrument Identifier

All subsystems reference securities via the standard identifier:
`<SYMBOL>-<QUOTE>:<VENUE>`

Examples:
- `BTC-USDT:BINANCE`
- `ETH-USDT:BINANCE`
- `NVDA:NASDAQ`
- `EURUSD:FX`
- `SPY:ARCA`

## 3. High-Speed Internal Event Bus

The internal event bus uses a bounded Tokio broadcast channel (`100,000` message ring capacity). Backpressure guarantees that lagged or slow consumers drop old visual frames without blocking live order book state updates or corrupting sequence integrity.
