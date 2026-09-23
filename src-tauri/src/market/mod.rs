use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub mod connectors;
pub mod event_bus;
pub mod normalize;
pub mod state;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AssetClass {
    Crypto,
    Equity,
    Forex,
    Index,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instrument {
    pub id: String, // e.g., "BTC-USDT:BINANCE"
    pub symbol: String,
    pub display_symbol: String,
    pub name: String,
    pub asset_class: AssetClass,
    pub venue: String,
    pub base_currency: Option<String>,
    pub quote_currency: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MarketEvent {
    Trade(TradeEvent),
    Quote(QuoteEvent),
    Candle(CandleEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeEvent {
    pub instrument_id: String,
    pub price: f64,
    pub quantity: f64,
    pub side: TradeSide,
    pub timestamp: DateTime<Utc>,
    pub exchange_timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TradeSide {
    Buy,
    Sell,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteEvent {
    pub instrument_id: String,
    pub bid: f64,
    pub bid_size: f64,
    pub ask: f64,
    pub ask_size: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandleEvent {
    pub instrument_id: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub interval: String, // e.g., "1m"
}

// Arc is used to avoid excessive cloning of the event internally
pub type SharedMarketEvent = Arc<MarketEvent>;
