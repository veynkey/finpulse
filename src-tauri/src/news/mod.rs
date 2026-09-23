use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Sentiment {
    Bullish,
    Bearish,
    Neutral,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedNews {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub source: String,
    pub headline: String,
    pub summary: String,
    pub sentiment: Sentiment,
    pub impact_score: u8, // 1 to 5
    pub linked_symbols: Vec<String>,
    pub tags: Vec<String>,
}

pub struct NewsIntelligenceEngine;

impl NewsIntelligenceEngine {
    pub fn extract_entities(headline: &str) -> Vec<String> {
        let mut symbols = Vec::new();
        let upper = headline.to_uppercase();

        if upper.contains("BITCOIN") || upper.contains("BTC") {
            symbols.push("BTC-USDT:BINANCE".to_string());
        }
        if upper.contains("ETHEREUM") || upper.contains("ETH") {
            symbols.push("ETH-USDT:BINANCE".to_string());
        }
        if upper.contains("NVIDIA") || upper.contains("NVDA") {
            symbols.push("NVDA:NASDAQ".to_string());
        }
        if upper.contains("FED") || upper.contains("RATES") || upper.contains("INFLATION") {
            symbols.push("EURUSD:FX".to_string());
            symbols.push("SPY:ARCA".to_string());
        }

        symbols
    }
}
