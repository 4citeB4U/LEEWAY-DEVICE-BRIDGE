/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.SOVEREIGN.CORE.TRANSPORT
TAG: LEEWAY.TRANSPORT.PROFILE.SAFETY.V1
WHO: LeeWay Industries; WHAT: portable user-space transport profile and allocation-bound safety arbiter.
WHEN: 2026-11-16; WHERE: crates/leeway-core/src/transport.rs.
WHY: Select an honest platform route without claiming direct PCIe, MMIO, DMA, zero-copy, or Metal execution before an adapter proves it.
HOW: Platform classification, opaque allocation ranges, checked arithmetic, telemetry-driven raw fallback, and explicit implementation state.
AUTHORITY: Contract and safety primitive only; no physical hardware commands are issued here.
LICENSE: MIT
*/
use crate::SovereignError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PlatformFamily {
    Windows,
    Linux,
    Android,
    MacOs,
    Ios,
    Other,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TransportBackend {
    D3d12UserSpace,
    VulkanUserSpace,
    MetalUserSpace,
    SecureMeshUserSpace,
    CpuFallback,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TransportProfile {
    pub platform: PlatformFamily,
    pub preferred_backend: TransportBackend,
    pub adapter_state: String,
    pub direct_pcie_configuration: bool,
    pub direct_mmio: bool,
    pub physical_dma: bool,
    pub zero_copy_verified: bool,
    pub kernel_intrusion: bool,
}

impl TransportProfile {
    pub fn detect() -> Self {
        Self::for_platform(std::env::consts::OS)
    }

    pub fn for_platform(platform: &str) -> Self {
        let normalized = platform.trim().to_ascii_lowercase();
        let (family, backend) = match normalized.as_str() {
            "windows" | "win32" => (PlatformFamily::Windows, TransportBackend::D3d12UserSpace),
            "linux" => (PlatformFamily::Linux, TransportBackend::VulkanUserSpace),
            "android" => (PlatformFamily::Android, TransportBackend::VulkanUserSpace),
            "macos" | "darwin" => (PlatformFamily::MacOs, TransportBackend::MetalUserSpace),
            "ios" | "iphone" | "ipados" => (PlatformFamily::Ios, TransportBackend::MetalUserSpace),
            "mesh" => (PlatformFamily::Other, TransportBackend::SecureMeshUserSpace),
            _ => (PlatformFamily::Other, TransportBackend::CpuFallback),
        };
        Self {
            platform: family,
            preferred_backend: backend,
            adapter_state: "CONTRACT_ONLY_NOT_BOUND".into(),
            direct_pcie_configuration: false,
            direct_mmio: false,
            physical_dma: false,
            zero_copy_verified: false,
            kernel_intrusion: false,
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TransportTelemetry {
    pub parity_errors: u64,
    pub dropped_credits: u64,
    pub timeouts: u64,
    pub policy_denials: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SafetyDecision {
    pub authorized: bool,
    pub mode: String,
    pub reason: String,
}

#[derive(Debug, Default)]
pub struct AllocationTable {
    allocations: HashMap<String, usize>,
}

impl AllocationTable {
    pub fn register(&mut self, allocation_id: &str, length: usize) -> Result<(), SovereignError> {
        let id_valid = !allocation_id.is_empty()
            && allocation_id.len() <= 128
            && allocation_id.bytes().all(|byte| {
                byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':')
            });
        if !id_valid || length == 0 || self.allocations.contains_key(allocation_id) {
            return Err(SovereignError::Transport(
                "ALLOCATION_REGISTRATION_INVALID".into(),
            ));
        }
        self.allocations.insert(allocation_id.to_owned(), length);
        Ok(())
    }

    pub fn remove(&mut self, allocation_id: &str) -> bool {
        self.allocations.remove(allocation_id).is_some()
    }

    pub fn authorize(
        &self,
        allocation_id: &str,
        offset: usize,
        length: usize,
        telemetry: TransportTelemetry,
    ) -> SafetyDecision {
        let Some(allocation_length) = self.allocations.get(allocation_id) else {
            return SafetyDecision {
                authorized: false,
                mode: "DENY".into(),
                reason: "ALLOCATION_NOT_REGISTERED".into(),
            };
        };
        if length == 0
            || offset
                .checked_add(length)
                .is_none_or(|end| end > *allocation_length)
        {
            return SafetyDecision {
                authorized: false,
                mode: "DENY".into(),
                reason: "ALLOCATION_RANGE_OUT_OF_BOUNDS".into(),
            };
        }
        if telemetry.parity_errors > 0
            || telemetry.dropped_credits > 0
            || telemetry.timeouts > 0
            || telemetry.policy_denials > 0
        {
            return SafetyDecision {
                authorized: true,
                mode: "RAW_FALLBACK".into(),
                reason: "TELEMETRY_DEGRADATION_OBSERVED".into(),
            };
        }
        SafetyDecision {
            authorized: true,
            mode: "STRUCTURED_16X16".into(),
            reason: "REGISTERED_RANGE_AND_CLEAN_TELEMETRY".into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn apple_profiles_never_claim_pcie_mmio_dma_or_verified_zero_copy() {
        for platform in ["macos", "ios", "iphone", "ipados"] {
            let profile = TransportProfile::for_platform(platform);
            assert_eq!(profile.preferred_backend, TransportBackend::MetalUserSpace);
            assert!(!profile.direct_pcie_configuration);
            assert!(!profile.direct_mmio);
            assert!(!profile.physical_dma);
            assert!(!profile.zero_copy_verified);
            assert!(!profile.kernel_intrusion);
        }
    }

    #[test]
    fn every_profile_remains_contract_only_until_adapter_binding() {
        for platform in ["windows", "linux", "android", "macos", "ios", "unknown"] {
            let profile = TransportProfile::for_platform(platform);
            assert_eq!(profile.adapter_state, "CONTRACT_ONLY_NOT_BOUND");
            assert!(!profile.kernel_intrusion);
        }
    }

    #[test]
    fn allocation_fuzz_never_authorizes_an_out_of_range_transfer() {
        let mut table = AllocationTable::default();
        table.register("buffer-1", 4096).expect("register");
        let mut state = 0x4c45_4557_4159_u64;
        for _ in 0..50_000 {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let offset = (state as usize) & 8191;
            let length = ((state >> 16) as usize) & 8191;
            let decision =
                table.authorize("buffer-1", offset, length, TransportTelemetry::default());
            let mathematically_valid =
                length > 0 && offset.checked_add(length).is_some_and(|end| end <= 4096);
            assert_eq!(decision.authorized, mathematically_valid);
        }
    }

    #[test]
    fn degraded_telemetry_selects_raw_fallback_inside_a_valid_range() {
        let mut table = AllocationTable::default();
        table.register("buffer-1", 1024).expect("register");
        let decision = table.authorize(
            "buffer-1",
            0,
            256,
            TransportTelemetry {
                parity_errors: 1,
                ..TransportTelemetry::default()
            },
        );
        assert!(decision.authorized);
        assert_eq!(decision.mode, "RAW_FALLBACK");
    }
}
