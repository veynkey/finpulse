pub mod market;
pub mod storage;
pub mod radar;
pub mod ai;
pub mod portfolio;
pub mod risk;
pub mod research;
pub mod replay;
pub mod news;
pub mod alerts;
pub mod hardware;
pub mod security;
pub mod telemetry;
pub mod ipc;

use std::sync::Arc;
use storage::duckdb::DuckDbStore;
use market::event_bus::EventBus;
use market::state::MarketStateEngine;

pub struct AppState {
    pub event_bus: Arc<EventBus>,
    pub market_state: Arc<MarketStateEngine>,
    pub db: Arc<DuckDbStore>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("Initializing FinPulse Wave MAX Core Engine");

    // 1. Hardware Detection
    let hw = hardware::detect_hardware();
    tracing::info!("Hardware auto-discovered: {:?}, Tier: {:?}", hw.gpu_backend, hw.tier);

    // 2. Initialize Event Bus
    let event_bus = Arc::new(EventBus::new());

    // 3. Initialize DuckDB Storage
    let db_path = "finpulse.db";
    let db = Arc::new(DuckDbStore::new(db_path).expect("Failed to init DuckDB"));

    // 4. Initialize Market State Engine
    let market_state = Arc::new(MarketStateEngine::new());
    
    // Spawn state engine
    let state_engine_clone = market_state.clone();
    let rx = event_bus.subscribe();
    tokio::spawn(async move {
        market::state::run_state_engine(state_engine_clone, rx).await;
    });
    
    // Subscribe DuckDB to Event Bus
    let db_clone = db.clone();
    let mut db_rx = event_bus.subscribe();
    tokio::spawn(async move {
        while let Ok(event) = db_rx.recv().await {
            db_clone.insert_event(event).await;
        }
    });

    let app_state = AppState {
        event_bus: event_bus.clone(),
        market_state: market_state.clone(),
        db: db.clone(),
    };

    // 5. Start Tauri App
    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ipc::get_market_state,
            ipc::connect_binance,
            ipc::get_hardware_profile,
            ipc::get_telemetry,
            ipc::get_risk_metrics,
            ipc::save_api_credential
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
