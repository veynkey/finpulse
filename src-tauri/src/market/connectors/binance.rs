use super::MarketDataProvider;
use crate::market::{
    event_bus::EventBus, Instrument, MarketEvent, QuoteEvent, TradeEvent, TradeSide,
};
use async_trait::async_trait;
use chrono::TimeZone;
use futures::{SinkExt, StreamExt};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

pub struct BinanceConnector {
    event_bus: Arc<EventBus>,
    ws_stream: Option<
        Arc<
            tokio::sync::Mutex<
                tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
            >,
        >,
    >,
}

impl BinanceConnector {
    pub fn new(event_bus: Arc<EventBus>) -> Self {
        Self {
            event_bus,
            ws_stream: None,
        }
    }

    fn parse_trade(payload: &Value) -> Option<MarketEvent> {
        if let (Some(sym), Some(price_str), Some(qty_str), Some(ts), Some(is_maker)) = (
            payload["s"].as_str(),
            payload["p"].as_str(),
            payload["q"].as_str(),
            payload["T"].as_i64(),
            payload["m"].as_bool(),
        ) {
            let price = price_str.parse().ok()?;
            let quantity = qty_str.parse().ok()?;
            let timestamp = chrono::Utc.timestamp_millis_opt(ts).single()?;

            Some(MarketEvent::Trade(TradeEvent {
                instrument_id: format!("{}:BINANCE", sym),
                price,
                quantity,
                // In Binance, if maker is true, the buyer was the maker, so trade was initiated by a seller.
                side: if is_maker { TradeSide::Sell } else { TradeSide::Buy },
                timestamp,
                exchange_timestamp: Some(timestamp),
            }))
        } else {
            None
        }
    }
}

#[async_trait]
impl MarketDataProvider for BinanceConnector {
    fn name(&self) -> &'static str {
        "Binance"
    }

    async fn connect(&mut self) -> anyhow::Result<()> {
        let url = "wss://stream.binance.com:9443/ws";
        let (ws_stream, _) = connect_async(url).await?;
        let shared_stream = Arc::new(Mutex::new(ws_stream));
        self.ws_stream = Some(shared_stream.clone());

        let event_bus = self.event_bus.clone();

        tokio::spawn(async move {
            run_binance_listener(shared_stream, event_bus).await;
        });

        Ok(())
    }

    async fn subscribe(&mut self, instruments: Vec<Instrument>) -> anyhow::Result<()> {
        if let Some(ref ws) = self.ws_stream {
            let params: Vec<String> = instruments
                .iter()
                .flat_map(|inst| {
                    let s = inst.symbol.to_lowercase();
                    vec![format!("{}@aggTrade", s), format!("{}@bookTicker", s)]
                })
                .collect();

            let payload = serde_json::json!({
                "method": "SUBSCRIBE",
                "params": params,
                "id": 1
            });

            let mut stream = ws.lock().await;
            stream.send(Message::Text(payload.to_string())).await?;
        }
        Ok(())
    }

    async fn unsubscribe(&mut self, _instruments: Vec<Instrument>) -> anyhow::Result<()> {
        Ok(())
    }
}

pub async fn run_binance_listener(
    connector_stream: Arc<tokio::sync::Mutex<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>>,
    event_bus: Arc<EventBus>,
) {
    let mut stream = connector_stream.lock().await;
    while let Some(msg) = stream.next().await {
        if let Ok(Message::Text(text)) = msg {
            if let Ok(value) = serde_json::from_str::<Value>(&text) {
                if let Some(e) = value.get("e").and_then(|v| v.as_str()) {
                    if e == "aggTrade" {
                        if let Some(event) = BinanceConnector::parse_trade(&value) {
                            event_bus.publish(Arc::new(event));
                        }
                    }
                } else if value.get("u").is_some() && value.get("b").is_some() && value.get("a").is_some() {
                    // bookTicker
                    if let (Some(sym), Some(b_str), Some(a_str), Some(B_str), Some(A_str)) = (
                        value["s"].as_str(),
                        value["b"].as_str(),
                        value["a"].as_str(),
                        value["B"].as_str(),
                        value["A"].as_str(),
                    ) {
                        if let (Ok(bid), Ok(ask), Ok(bid_size), Ok(ask_size)) = (
                            b_str.parse(),
                            a_str.parse(),
                            B_str.parse(),
                            A_str.parse(),
                        ) {
                            let event = MarketEvent::Quote(QuoteEvent {
                                instrument_id: format!("{}:BINANCE", sym),
                                bid,
                                ask,
                                bid_size,
                                ask_size,
                                timestamp: chrono::Utc::now(), // BookTicker doesn't have exchange time
                            });
                            event_bus.publish(Arc::new(event));
                        }
                    }
                }
            }
        }
    }
}
