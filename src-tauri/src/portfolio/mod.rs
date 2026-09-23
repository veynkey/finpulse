use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PositionSide {
    Long,
    Short,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub instrument_id: String,
    pub symbol: String,
    pub side: PositionSide,
    pub quantity: f64,
    pub entry_price: f64,
    pub mark_price: f64,
    pub unrealized_pnl: f64,
    pub unrealized_pnl_percent: f64,
    pub realized_pnl: f64,
}

impl Position {
    pub fn update_mark(&mut self, mark_price: f64) {
        self.mark_price = mark_price;
        let diff = match self.side {
            PositionSide::Long => self.mark_price - self.entry_price,
            PositionSide::Short => self.entry_price - self.mark_price,
        };
        self.unrealized_pnl = diff * self.quantity;
        if self.entry_price > 0.0 {
            self.unrealized_pnl_percent = (diff / self.entry_price) * 100.0;
        }
    }
}

pub struct PortfolioManager {
    positions: HashMap<String, Position>,
    realized_cash_balance: f64,
}

impl PortfolioManager {
    pub fn new(initial_cash: f64) -> Self {
        Self {
            positions: HashMap::new(),
            realized_cash_balance: initial_cash,
        }
    }

    pub fn upsert_position(&mut self, pos: Position) {
        self.positions.insert(pos.instrument_id.clone(), pos);
    }

    pub fn get_positions(&self) -> Vec<Position> {
        self.positions.values().cloned().collect()
    }

    pub fn total_equity(&self) -> f64 {
        let mut equity = self.realized_cash_balance;
        for pos in self.positions.values() {
            equity += pos.unrealized_pnl;
        }
        equity
    }
}
