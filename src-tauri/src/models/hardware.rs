use serde::{Deserialize, Serialize};

/// Which local model size class this machine can run.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelTier {
    /// Under 8 GB RAM: local AI disabled, cloud or rules only.
    BelowMin,
    /// ~8 GB RAM, no usable GPU: ~1-2B parameter models.
    Tier1,
    /// ~16 GB RAM or 4 GB VRAM: ~4B parameter models.
    Tier2,
    /// 32 GB+ RAM or 8 GB+ VRAM: ~8B parameter models.
    Tier3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub vendor_id: u32,
    pub dedicated_vram_mb: u64,
    /// Software adapters (e.g. Microsoft Basic Render Driver) don't count.
    pub is_software: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub total_ram_mb: u64,
    pub cpu_cores: u32,
    pub gpus: Vec<GpuInfo>,
    pub vulkan_available: bool,
    pub tier: ModelTier,
}
