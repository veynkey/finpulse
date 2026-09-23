use crate::market::{SharedMarketEvent, Instrument};
use async_trait::async_trait;

#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn connect(&mut self) -> anyhow::Result<()>;
    async fn subscribe(&mut self, instruments: Vec<Instrument>) -> anyhow::Result<()>;
    async fn unsubscribe(&mut self, instruments: Vec<Instrument>) -> anyhow::Result<()>;
    // The provider will push normalized events to the EventBus directly after connecting
}

pub mod binance;
