use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PerformanceTier {
    Eco,
    Standard,
    Pro,
    Ultra,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub cpu_cores: usize,
    pub total_ram_mb: u64,
    pub available_ram_mb: u64,
    pub gpu_backend: String,
    pub vram_mb: Option<u64>,
    pub tier: PerformanceTier,
}

pub fn detect_hardware() -> HardwareProfile {
    let cpu_cores = std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(4);

    // Fallback baseline RAM estimation (e.g. 16GB standard)
    let total_ram_mb = 16384;
    let available_ram_mb = 11200;

    let (tier, gpu_backend, vram_mb) = if total_ram_mb >= 64000 {
        (PerformanceTier::Ultra, "CUDA / Vulkan High-Perf".to_string(), Some(16384))
    } else if total_ram_mb >= 32000 {
        (PerformanceTier::Pro, "CUDA / Vulkan Dedicated".to_string(), Some(8192))
    } else if total_ram_mb >= 16000 {
        (PerformanceTier::Standard, "DirectX / Metal / Vulkan".to_string(), Some(4096))
    } else {
        (PerformanceTier::Eco, "CPU Fallback / iGPU".to_string(), Some(1024))
    };

    HardwareProfile {
        cpu_cores,
        total_ram_mb,
        available_ram_mb,
        gpu_backend,
        vram_mb,
        tier,
    }
}
