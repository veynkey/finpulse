use crate::market::{SharedMarketEvent, MarketEvent, QuoteEvent, TradeEvent};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Debug, Clone)]
pub struct InstrumentState {
    pub last_trade: Option<TradeEvent>,
    pub best_quote: Option<QuoteEvent>,
    // In a full implementation, we'd have a rolling window or OHLCV cache here
}

impl Default for InstrumentState {
    fn default() -> Self {
        Self {
            last_trade: None,
            best_quote: None,
        }
    }
}

pub struct MarketStateEngine {
    pub states: RwLock<HashMap<String, InstrumentState>>,
}

impl MarketStateEngine {
    pub fn new() -> Self {
        Self {
            states: RwLock::new(HashMap::new()),
        }
    }

    pub fn process_event(&self, event: &SharedMarketEvent) {
        let mut states = self.states.write();
        
        match event.as_ref() {
            MarketEvent::Trade(trade) => {
                let entry = states.entry(trade.instrument_id.clone()).or_default();
                entry.last_trade = Some(trade.clone());
            }
            MarketEvent::Quote(quote) => {
                let entry = states.entry(quote.instrument_id.clone()).or_default();
                entry.best_quote = Some(quote.clone());
            }
            _ => {}
        }
    }
    
    pub fn get_state(&self, instrument_id: &str) -> Option<InstrumentState> {
        self.states.read().get(instrument_id).cloned()
    }
}

pub async fn run_state_engine(
    state_engine: Arc<MarketStateEngine>,
    mut rx: broadcast::Receiver<SharedMarketEvent>,
) {
    loop {
        match rx.recv().await {
            Ok(event) => {
                state_engine.process_event(&event);
            }
            Err(broadcast::error::RecvError::Lagged(missed)) => {
                tracing::warn!("State engine lagged, missed {} events", missed);
            }
            Err(broadcast::error::RecvError::Closed) => {
                tracing::info!("Event bus closed, stopping state engine");
                break;
            }
        }
    }
}
