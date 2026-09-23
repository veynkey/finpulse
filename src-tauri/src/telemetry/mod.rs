use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubsystemHealth {
    pub name: String,
    pub status: String,
    pub latency_ms: f64,
    pub throughput_eps: u64,
}

pub struct TelemetryCollector;

impl TelemetryCollector {
    pub fn get_subsystem_health() -> Vec<SubsystemHealth> {
        vec![
            SubsystemHealth {
                name: "Binance WS Feed".to_string(),
                status: "Healthy".to_string(),
                latency_ms: 14.2,
                throughput_eps: 18450,
            },
            SubsystemHealth {
                name: "DuckDB Persistence".to_string(),
                status: "Healthy".to_string(),
                latency_ms: 2.1,
                throughput_eps: 850,
            },
            SubsystemHealth {
                name: "Market Radar Engine".to_string(),
                status: "Active".to_string(),
                latency_ms: 0.4,
                throughput_eps: 18450,
            },
        ]
    }
}
