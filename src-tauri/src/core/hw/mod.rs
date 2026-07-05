use crate::models::hardware::{GpuInfo, HardwareProfile, ModelTier};
use sysinfo::System;

/// Detect RAM, CPU, GPUs and Vulkan availability, and derive the model tier.
pub fn detect() -> HardwareProfile {
    let mut sys = System::new();
    sys.refresh_memory();
    let total_ram_mb = sys.total_memory() / (1024 * 1024);

    let cpu_cores = std::thread::available_parallelism()
        .map(|n| n.get() as u32)
        .unwrap_or(1);

    let gpus = detect_gpus();
    let vulkan_available = vulkan_available();

    let max_vram_mb = gpus
        .iter()
        .filter(|g| !g.is_software)
        .map(|g| g.dedicated_vram_mb)
        .max()
        .unwrap_or(0);
    // A GPU only helps if llama.cpp can actually drive it through Vulkan
    let effective_vram_mb = if vulkan_available { max_vram_mb } else { 0 };

    HardwareProfile {
        total_ram_mb,
        cpu_cores,
        gpus,
        vulkan_available,
        tier: select_model_tier(total_ram_mb, effective_vram_mb),
    }
}

/// Pure tier decision, unit-testable. Thresholds sit slightly below the
/// nominal sizes because installed RAM never fully reports (e.g. 16 GB
/// machines report ~15.9 GB).
pub fn select_model_tier(total_ram_mb: u64, max_vram_mb: u64) -> ModelTier {
    if total_ram_mb < 7_000 {
        return ModelTier::BelowMin;
    }
    if total_ram_mb >= 30_000 || max_vram_mb >= 7_500 {
        return ModelTier::Tier3;
    }
    if total_ram_mb >= 15_000 || max_vram_mb >= 3_800 {
        return ModelTier::Tier2;
    }
    ModelTier::Tier1
}

/// Enumerate GPUs with dedicated VRAM via DXGI (the only reliable VRAM
/// source on Windows).
#[cfg(windows)]
fn detect_gpus() -> Vec<GpuInfo> {
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE,
    };

    let mut gpus = Vec::new();
    unsafe {
        let Ok(factory) = CreateDXGIFactory1::<IDXGIFactory1>() else {
            return gpus;
        };
        let mut index = 0u32;
        while let Ok(adapter) = factory.EnumAdapters1(index) {
            if let Ok(desc) = adapter.GetDesc1() {
                let name = String::from_utf16_lossy(&desc.Description)
                    .trim_end_matches('\0')
                    .to_string();
                gpus.push(GpuInfo {
                    name,
                    vendor_id: desc.VendorId,
                    dedicated_vram_mb: (desc.DedicatedVideoMemory / (1024 * 1024)) as u64,
                    is_software: (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32) != 0,
                });
            }
            index += 1;
        }
    }
    gpus
}

#[cfg(not(windows))]
fn detect_gpus() -> Vec<GpuInfo> {
    Vec::new()
}

/// True when a Vulkan loader + at least one physical device is present.
/// Fails gracefully on machines without GPU drivers.
fn vulkan_available() -> bool {
    use ash::vk;

    let Ok(entry) = (unsafe { ash::Entry::load() }) else {
        return false;
    };
    let app_info = vk::ApplicationInfo::default().api_version(vk::make_api_version(0, 1, 1, 0));
    let create_info = vk::InstanceCreateInfo::default().application_info(&app_info);

    unsafe {
        match entry.create_instance(&create_info, None) {
            Ok(instance) => {
                let has_device = instance
                    .enumerate_physical_devices()
                    .map(|devices| !devices.is_empty())
                    .unwrap_or(false);
                instance.destroy_instance(None);
                has_device
            }
            Err(_) => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_selection_covers_the_matrix() {
        // Below minimum
        assert_eq!(select_model_tier(4_000, 0), ModelTier::BelowMin);
        assert_eq!(select_model_tier(6_500, 12_000), ModelTier::BelowMin);
        // 8 GB laptop, integrated graphics
        assert_eq!(select_model_tier(7_900, 0), ModelTier::Tier1);
        // 16 GB machine
        assert_eq!(select_model_tier(15_900, 0), ModelTier::Tier2);
        // 8 GB RAM but a real 4 GB dGPU
        assert_eq!(select_model_tier(7_900, 4_000), ModelTier::Tier2);
        // 32 GB workstation
        assert_eq!(select_model_tier(31_800, 0), ModelTier::Tier3);
        // 16 GB RAM with an 8 GB dGPU
        assert_eq!(select_model_tier(15_900, 8_000), ModelTier::Tier3);
    }
}
