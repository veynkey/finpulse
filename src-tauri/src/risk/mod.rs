use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskMetrics {
    pub total_equity: f64,
    pub var_95_daily: f64,
    pub var_99_daily: f64,
    pub max_drawdown_pct: f64,
    pub portfolio_beta: f64,
    pub annualized_sharpe: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressScenarioResult {
    pub scenario_name: String,
    pub estimated_impact_usd: f64,
    pub estimated_impact_pct: f64,
    pub assumptions: String,
}

pub struct RiskEngine;

impl RiskEngine {
    /// Calculate parametric 1-day Value at Risk (95% confidence interval: z = 1.645)
    pub fn calculate_parametric_var(total_equity: f64, daily_volatility: f64) -> f64 {
        const Z_95: f64 = 1.645;
        total_equity * daily_volatility * Z_95
    }

    /// Simulate portfolio stress shocks
    pub fn simulate_scenario(
        total_equity: f64,
        crypto_exposure_pct: f64,
        scenario: &str,
    ) -> StressScenarioResult {
        match scenario {
            "BTC_CRASH_30" => {
                let shock = -0.30;
                let impact_pct = shock * crypto_exposure_pct;
                let impact_usd = total_equity * impact_pct;
                StressScenarioResult {
                    scenario_name: "BTC -30% Severe Deleveraging".to_string(),
                    estimated_impact_usd: impact_usd,
                    estimated_impact_pct: impact_pct * 100.0,
                    assumptions: "High altcoin beta correlation (0.85)".to_string(),
                }
            }
            "NASDAQ_CORRECTION_15" => {
                let shock = -0.15;
                let tech_exposure = 1.0 - crypto_exposure_pct;
                let impact_pct = shock * tech_exposure * 1.15;
                let impact_usd = total_equity * impact_pct;
                StressScenarioResult {
                    scenario_name: "NASDAQ -15% Technology Selloff".to_string(),
                    estimated_impact_usd: impact_usd,
                    estimated_impact_pct: impact_pct * 100.0,
                    assumptions: "Beta 1.15 to S&P 500 benchmark".to_string(),
                }
            }
            _ => StressScenarioResult {
                scenario_name: "Generic Shock".to_string(),
                estimated_impact_usd: -total_equity * 0.05,
                estimated_impact_pct: -5.0,
                assumptions: "Baseline 5% cross-asset drawdown".to_string(),
            },
        }
    }
}
