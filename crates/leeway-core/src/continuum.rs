use crate::SovereignError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub struct ContinuumCapsule {
    pub capsule_id: String,
    pub timestamp: String,
    pub author: String,
    pub intent: String,
    pub payload: String,
    pub sha256: String,
}

#[derive(Debug)]
pub struct ContinuumJournal {
    continuum_dir: PathBuf,
}

impl ContinuumJournal {
    pub fn new(continuum_dir: PathBuf) -> Result<Self, SovereignError> {
        fs::create_dir_all(&continuum_dir)
            .map_err(|error| SovereignError::Continuum(error.to_string()))?;
        Ok(Self { continuum_dir })
    }

    pub fn build(author: &str, intent: &str, payload: &str) -> Result<ContinuumCapsule, SovereignError> {
        if author.trim().is_empty() || intent.trim().is_empty() {
            return Err(SovereignError::Continuum("author and intent are required".into()));
        }
        let timestamp = Utc::now().to_rfc3339();
        let mut hasher = Sha256::new();
        hasher.update(author.as_bytes());
        hasher.update([0]);
        hasher.update(timestamp.as_bytes());
        hasher.update([0]);
        hasher.update(intent.as_bytes());
        hasher.update([0]);
        hasher.update(payload.as_bytes());
        let sha256 = hex::encode(hasher.finalize());
        let capsule = ContinuumCapsule {
            capsule_id: format!("cap-{}", &sha256[..16]),
            timestamp,
            author: author.to_owned(),
            intent: intent.to_owned(),
            payload: payload.to_owned(),
            sha256,
        };
        Ok(capsule)
    }

    pub fn record(&self, author: &str, intent: &str, payload: &str) -> Result<ContinuumCapsule, SovereignError> {
        let capsule = Self::build(author, intent, payload)?;
        let serialized = serde_json::to_vec_pretty(&capsule)
            .map_err(|error| SovereignError::Continuum(error.to_string()))?;
        let target = self.continuum_dir.join(format!("{}.json", capsule.capsule_id));
        let temporary = target.with_extension("json.tmp");
        fs::write(&temporary, serialized).map_err(|error| SovereignError::Continuum(error.to_string()))?;
        fs::rename(temporary, target).map_err(|error| SovereignError::Continuum(error.to_string()))?;
        Ok(capsule)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_hash_bound_capsule() {
        let root = tempfile::tempdir().expect("tempdir");
        let journal = ContinuumJournal::new(root.path().to_path_buf()).expect("journal");
        let capsule = journal.record("owner", "test", "payload").expect("capsule");
        assert_eq!(capsule.sha256.len(), 64);
        assert!(root.path().join(format!("{}.json", capsule.capsule_id)).is_file());
    }
}

