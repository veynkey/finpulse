use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: String,
    pub instrument_id: String,
    pub metric_name: String,
    pub threshold: f64,
    pub condition: String, // ">" or "<"
    pub cooldown_seconds: i64,
}

pub struct AlertEngine {
    rules: Vec<AlertRule>,
    last_triggered: HashMap<String, DateTime<Utc>>,
}

impl AlertEngine {
    pub fn new() -> Self {
        Self {
            rules: Vec::new(),
            last_triggered: HashMap::new(),
        }
    }

    pub fn add_rule(&mut self, rule: AlertRule) {
        self.rules.push(rule);
    }

    /// Evaluates value and returns true only if condition is met AND cooldown has expired
    pub fn evaluate(&mut self, instrument_id: &str, metric: &str, current_value: f64) -> bool {
        let now = Utc::now();

        for rule in &self.rules {
            if rule.instrument_id == instrument_id && rule.metric_name == metric {
                let is_condition_met = match rule.condition.as_str() {
                    ">" => current_value > rule.threshold,
                    "<" => current_value < rule.threshold,
                    _ => false,
                };

                if is_condition_met {
                    if let Some(last_time) = self.last_triggered.get(&rule.id) {
                        if now - *last_time < Duration::seconds(rule.cooldown_seconds) {
                            return false; // Still in cooldown
                        }
                    }

                    self.last_triggered.insert(rule.id.clone(), now);
                    return true;
                }
            }
        }
        false
    }
}
