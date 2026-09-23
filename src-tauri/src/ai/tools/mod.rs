use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSnapshotToolResult {
    pub symbol: String,
    pub last_price: f64,
    pub price_change_24h_pct: f64,
    pub volume_zscore: f64,
    pub cvd_delta: f64,
    pub funding_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAuditToolResult {
    pub total_equity: f64,
    pub var_95: f64,
    pub max_drawdown: f64,
    pub beta: f64,
}

pub struct SafeAiTools;

impl SafeAiTools {
    pub fn get_market_snapshot(symbol: &str) -> MarketSnapshotToolResult {
        MarketSnapshotToolResult {
            symbol: symbol.to_string(),
            last_price: 64520.1,
            price_change_24h_pct: 3.12,
            volume_zscore: 3.42,
            cvd_delta: 420.5,
            funding_rate: 0.0084,
        }
    }

    pub fn get_risk_audit() -> RiskAuditToolResult {
        RiskAuditToolResult {
            total_equity: 247890.5,
            var_95: 14250.0,
            max_drawdown: 11.4,
            beta: 1.18,
        }
    }
}
