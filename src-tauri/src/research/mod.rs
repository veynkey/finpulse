pub struct QuantResearch;

impl QuantResearch {
    /// Computes Pearson correlation coefficient between two equal-length return series
    pub fn correlation(x: &[f64], y: &[f64]) -> Option<f64> {
        if x.len() != y.len() || x.is_empty() {
            return None;
        }

        let n = x.len() as f64;
        let mean_x = x.iter().sum::<f64>() / n;
        let mean_y = y.iter().sum::<f64>() / n;

        let mut cov = 0.0;
        let mut var_x = 0.0;
        let mut var_y = 0.0;

        for (xi, yi) in x.iter().zip(y.iter()) {
            let dx = xi - mean_x;
            let dy = yi - mean_y;
            cov += dx * dy;
            var_x += dx * dx;
            var_y += dy * dy;
        }

        if var_x <= 0.0 || var_y <= 0.0 {
            return None;
        }

        Some(cov / (var_x.sqrt() * var_y.sqrt()))
    }

    /// Computes annualized realized volatility
    pub fn realized_volatility(returns: &[f64], periods_per_year: f64) -> f64 {
        if returns.len() < 2 {
            return 0.0;
        }
        let mean = returns.iter().sum::<f64>() / returns.len() as f64;
        let variance = returns
            .iter()
            .map(|r| (r - mean).powi(2))
            .sum::<f64>()
            / (returns.len() - 1) as f64;

        (variance * periods_per_year).sqrt()
    }
}
