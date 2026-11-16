//! LeeWay sovereign core: portable vault, Continuum, registry, and routing authority.

pub mod continuum;
pub mod registry;
pub mod router;
pub mod vault;

pub use continuum::{ContinuumCapsule, ContinuumJournal};
pub use registry::{DeviceNode, UniversalMeshRegistry};
pub use router::SovereignRouter;
pub use vault::{SovereignPartition, SovereignVault};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum SovereignError {
    #[error("vault error: {0}")]
    Vault(String),
    #[error("continuum error: {0}")]
    Continuum(String),
    #[error("registry error: {0}")]
    Registry(String),
    #[error("routing error: {0}")]
    Routing(String),
}

