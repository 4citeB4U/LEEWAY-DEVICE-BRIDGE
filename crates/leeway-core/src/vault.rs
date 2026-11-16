use crate::SovereignError;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SovereignPartition {
    Workspace,
    Continuum,
    DigitalBrain,
    Diagnostics,
    Ledger,
    Receipts,
}

impl SovereignPartition {
    pub const ALL: [Self; 6] = [
        Self::Workspace,
        Self::Continuum,
        Self::DigitalBrain,
        Self::Diagnostics,
        Self::Ledger,
        Self::Receipts,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Workspace => "Workspace",
            Self::Continuum => "Continuum",
            Self::DigitalBrain => "DigitalBrain",
            Self::Diagnostics => "Diagnostics",
            Self::Ledger => "Ledger",
            Self::Receipts => "Receipts",
        }
    }
}

#[derive(Debug)]
pub struct SovereignVault {
    root_path: PathBuf,
}

impl SovereignVault {
    pub fn new(base_path: impl AsRef<Path>) -> Result<Self, SovereignError> {
        let root_path = base_path.as_ref().to_path_buf();
        fs::create_dir_all(&root_path).map_err(|error| SovereignError::Vault(error.to_string()))?;
        for partition in SovereignPartition::ALL {
            fs::create_dir_all(root_path.join(partition.as_str()))
                .map_err(|error| SovereignError::Vault(error.to_string()))?;
        }
        Ok(Self { root_path })
    }

    pub fn partition_path(&self, partition: SovereignPartition) -> PathBuf {
        self.root_path.join(partition.as_str())
    }

    pub fn root_path(&self) -> &Path {
        &self.root_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_exact_six_partitions() {
        let root = tempfile::tempdir().expect("tempdir");
        let vault = SovereignVault::new(root.path()).expect("vault");
        for partition in SovereignPartition::ALL {
            assert!(vault.partition_path(partition).is_dir());
        }
    }
}

