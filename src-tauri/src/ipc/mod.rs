use crate::AppState;
use tauri::State;
use serde::Serialize;
use crate::market::state::InstrumentState;
use crate::market::connectors::{MarketDataProvider, binance::BinanceConnector};
use crate::market::{Instrument, AssetClass};
use crate::hardware::{detect_hardware, HardwareProfile};
use crate::risk::{RiskEngine, RiskMetrics};
use crate::telemetry::{TelemetryCollector, SubsystemHealth};
use secrecy::SecretString;

#[derive(Serialize)]
pub struct MarketStateResponse {
    pub instrument: String,
    pub state: Option<InstrumentState>,
}

#[tauri::command]
pub async fn get_market_state(
    instrument: String,
    state: State<'_, AppState>,
) -> Result<MarketStateResponse, String> {
    let inst_state = state.market_state.get_state(&instrument);
    Ok(MarketStateResponse {
        instrument,
        state: inst_state,
    })
}

#[tauri::command]
pub async fn connect_binance(
    symbols: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut connector = BinanceConnector::new(state.event_bus.clone());
    
    let instruments: Vec<Instrument> = symbols.into_iter().map(|s| Instrument {
        id: format!("{}:BINANCE", s),
        symbol: s.clone(),
        display_symbol: s.clone(),
        name: s.clone(),
        asset_class: AssetClass::Crypto,
        venue: "BINANCE".to_string(),
        base_currency: None,
        quote_currency: None,
        metadata: None,
    }).collect();

    connector.connect().await.map_err(|e| e.to_string())?;
    connector.subscribe(instruments).await.map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn get_hardware_profile() -> HardwareProfile {
    detect_hardware()
}

#[tauri::command]
pub fn get_telemetry() -> Vec<SubsystemHealth> {
    TelemetryCollector::get_subsystem_health()
}

#[tauri::command]
pub fn get_risk_metrics() -> RiskMetrics {
    let total_equity = 247890.5;
    let var_95 = RiskEngine::calculate_parametric_var(total_equity, 0.035);
    RiskMetrics {
        total_equity,
        var_95_daily: var_95,
        var_99_daily: var_95 * 1.41,
        max_drawdown_pct: 11.4,
        portfolio_beta: 1.18,
        annualized_sharpe: 1.94,
    }
}

#[tauri::command]
pub fn save_api_credential(service: String, account: String, secret: String) -> Result<(), String> {
    let mgr = crate::security::SecretManager::new(&service);
    mgr.save_secret(&account, SecretString::new(secret))
}
