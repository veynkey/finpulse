use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RadarEventType {
    VolumeSpike,
    VolatilityExpansion,
    SpreadAnomaly,
    OiSurge,
    CvdDivergence,
    PriceAcceleration,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Severity {
    Info,
    Elevated,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadarEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub instrument_id: String,
    pub symbol: String,
    pub event_type: RadarEventType,
    pub severity: Severity,
    pub confidence: f64,
    pub headline: String,
    pub metric: String,
    pub baseline: String,
    pub deviation: String,
    pub related_assets: Vec<String>,
}

pub struct RadarEngine {
    // Rolling statistics parameters
    volume_window_size: usize,
}

impl RadarEngine {
    pub fn new() -> Self {
        Self {
            volume_window_size: 100,
        }
    }

    /// Evaluates whether a trade or tick constitutes an anomaly deterministically
    pub fn evaluate_volume_anomaly(
        &self,
        instrument_id: &str,
        symbol: &str,
        current_volume: f64,
        historical_mean: f64,
        historical_std_dev: f64,
    ) -> Option<RadarEvent> {
        if historical_std_dev <= 0.0 {
            return None;
        }

        let z_score = (current_volume - historical_mean) / historical_std_dev;

        if z_score >= 2.5 {
            let severity = if z_score >= 4.0 {
                Severity::Critical
            } else if z_score >= 3.0 {
                Severity::High
            } else {
                Severity::Elevated
            };

            let deviation_pct = ((current_volume - historical_mean) / historical_mean) * 100.0;

            Some(RadarEvent {
                id: format!("radar-vol-{}", Utc::now().timestamp_millis()),
                timestamp: Utc::now(),
                instrument_id: instrument_id.to_string(),
                symbol: symbol.to_string(),
                event_type: RadarEventType::VolumeSpike,
                severity,
                confidence: 0.92,
                headline: format!("Abnormal volume surge of {:.1}% detected", deviation_pct),
                metric: format!("Z-Score: {:.2}σ", z_score),
                baseline: format!("{:.1} baseline", historical_mean),
                deviation: format!("+{:.1}%", deviation_pct),
                related_assets: vec![],
            })
        } else {
            None
        }
    }
}
