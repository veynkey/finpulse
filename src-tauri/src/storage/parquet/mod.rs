use std::path::PathBuf;

pub struct ParquetArchiver {
    base_data_dir: PathBuf,
}

impl ParquetArchiver {
    pub fn new(base_dir: &str) -> Self {
        Self {
            base_data_dir: PathBuf::from(base_dir),
        }
    }

    /// Formats partitioned archival path: data/<asset_class>/<venue>/<symbol>/trades/<year>/<month>/<day>.parquet
    pub fn get_partition_path(
        &self,
        asset_class: &str,
        venue: &str,
        symbol: &str,
        year: i32,
        month: u32,
        day: u32,
    ) -> PathBuf {
        self.base_data_dir
            .join(asset_class.to_lowercase())
            .join(venue.to_lowercase())
            .join(symbol.to_lowercase())
            .join("trades")
            .join(year.to_string())
            .join(format!("{:02}", month))
            .join(format!("{:02}.parquet", day))
    }
}
