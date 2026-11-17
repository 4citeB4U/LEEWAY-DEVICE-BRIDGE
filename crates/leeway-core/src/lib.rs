//! LeeWay sovereign core: portable vault, Continuum, registry, and routing authority.

pub mod continuum;
pub mod continuum_memory;
pub mod registry;
pub mod router;
pub mod sandbox;
pub mod transport;
pub mod vault;

pub use continuum::{ContinuumCapsule, ContinuumJournal};
pub use continuum_memory::{
    Block256, CacheStageResult, ContinuumMemoryCache, ContinuumMemoryStats, ContinuumPointer,
    ContinuumPointerState, ReconstructionManifest, ReversibleBlockStream, TensorProjection16,
    BLOCK_BYTES, MATRIX_CELLS, MATRIX_EDGE,
};
pub use registry::{DeviceNode, UniversalMeshRegistry};
pub use router::SovereignRouter;
pub use sandbox::{HardwareSnapshot, SandboxEvent, SandboxFabric};
pub use transport::{
    AllocationTable, PlatformFamily, SafetyDecision, TransportBackend, TransportProfile,
    TransportTelemetry,
};
pub use vault::{SovereignPartition, SovereignVault};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum SovereignError {
    #[error("vault error: {0}")]
    Vault(String),
    #[error("continuum error: {0}")]
    Continuum(String),
    #[error("continuum memory error: {0}")]
    ContinuumMemory(String),
    #[error("registry error: {0}")]
    Registry(String),
    #[error("routing error: {0}")]
    Routing(String),
    #[error("sandbox error: {0}")]
    Sandbox(String),
    #[error("transport error: {0}")]
    Transport(String),
}

