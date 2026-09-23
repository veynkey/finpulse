use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetentionPolicy {
    pub raw_ticks_retention_days: u32,
    pub candles_retention_days: u32,
    pub radar_events_retention_days: u32,
    pub max_disk_budget_gb: u32,
}

impl Default for RetentionPolicy {
    fn default() -> Self {
        Self {
            raw_ticks_retention_days: 7,
            candles_retention_days: 365,
            radar_events_retention_days: 90,
            max_disk_budget_gb: 50,
        }
    }
}
