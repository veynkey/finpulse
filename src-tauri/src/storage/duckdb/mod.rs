use duckdb::{params, Connection};
use std::sync::Arc;
use tokio::sync::mpsc;
use crate::market::{SharedMarketEvent, MarketEvent};

pub struct DuckDbStore {
    // We do not store the Connection in the async struct to avoid unsafe sharing.
    // Instead, we use a channel to communicate with a dedicated blocking worker thread.
    tx: mpsc::Sender<SharedMarketEvent>,
}

impl DuckDbStore {
    pub fn new(db_path: &str) -> anyhow::Result<Self> {
        let (tx, mut rx) = mpsc::channel::<SharedMarketEvent>(10_000);
        let path = db_path.to_string();

        // Spawn a dedicated blocking thread for DuckDB operations
        std::thread::spawn(move || {
            let conn = Connection::open(&path).expect("Failed to open DuckDB");
            
            // Initialize schema
            conn.execute(
                "CREATE TABLE IF NOT EXISTS trades (
                    instrument_id VARCHAR,
                    price DOUBLE,
                    quantity DOUBLE,
                    side VARCHAR,
                    timestamp TIMESTAMP
                )",
                [],
            ).expect("Failed to create trades table");

            let mut batch = Vec::new();
            
            // Simple batching logic
            while let Some(event) = rx.blocking_recv() {
                batch.push(event);
                
                if batch.len() >= 100 {
                    let mut appender = conn.appender("trades").expect("Failed to create appender");
                    for ev in batch.drain(..) {
                        if let MarketEvent::Trade(t) = ev.as_ref() {
                            let side_str = format!("{:?}", t.side);
                            // Timestamp formatting for duckdb
                            let _ = appender.append_row(params![
                                t.instrument_id.clone(),
                                t.price,
                                t.quantity,
                                side_str,
                                t.timestamp.naive_utc()
                            ]);
                        }
                    }
                }
            }
        });

        Ok(Self { tx })
    }

    pub async fn insert_event(&self, event: SharedMarketEvent) {
        let _ = self.tx.send(event).await;
    }
}
