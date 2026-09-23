use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayController {
    pub is_active: bool,
    pub is_playing: bool,
    pub speed: f64,
    pub current_timestamp: DateTime<Utc>,
    pub start_timestamp: DateTime<Utc>,
    pub end_timestamp: DateTime<Utc>,
}

impl ReplayController {
    pub fn new(start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        Self {
            is_active: false,
            is_playing: false,
            speed: 1.0,
            current_timestamp: start,
            start_timestamp: start,
            end_timestamp: end,
        }
    }

    pub fn play(&mut self) {
        self.is_active = true;
        self.is_playing = true;
    }

    pub fn pause(&mut self) {
        self.is_playing = false;
    }

    pub fn set_speed(&mut self, speed: f64) {
        self.speed = speed;
    }

    pub fn advance_step(&mut self, elapsed_real_ms: i64) {
        if self.is_playing {
            let sim_advance_ms = (elapsed_real_ms as f64 * self.speed) as i64;
            self.current_timestamp = self.current_timestamp + chrono::Duration::milliseconds(sim_advance_ms);
            if self.current_timestamp > self.end_timestamp {
                self.current_timestamp = self.end_timestamp;
                self.is_playing = false;
            }
        }
    }
}
