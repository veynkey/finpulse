use crate::market::SharedMarketEvent;
use tokio::sync::broadcast;

const EVENT_BUS_CAPACITY: usize = 100_000;

#[derive(Clone)]
pub struct EventBus {
    pub tx: broadcast::Sender<SharedMarketEvent>,
}

impl EventBus {
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel(EVENT_BUS_CAPACITY);
        Self { tx }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<SharedMarketEvent> {
        self.tx.subscribe()
    }

    pub fn publish(&self, event: SharedMarketEvent) {
        // We ignore the error when there are no receivers
        let _ = self.tx.send(event);
    }
}
