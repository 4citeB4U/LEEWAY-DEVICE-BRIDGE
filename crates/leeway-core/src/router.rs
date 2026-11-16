use crate::{SovereignError, UniversalMeshRegistry};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug)]
pub struct SovereignRouter {
    registry: Arc<RwLock<UniversalMeshRegistry>>,
    mesh_token_sha256: [u8; 32],
}

impl SovereignRouter {
    pub fn new(registry: Arc<RwLock<UniversalMeshRegistry>>, mesh_token: &str) -> Result<Self, SovereignError> {
        if mesh_token.len() < 16 {
            return Err(SovereignError::Routing("mesh token is required".into()));
        }
        Ok(Self { registry, mesh_token_sha256: Sha256::digest(mesh_token.as_bytes()).into() })
    }

    pub async fn dispatch(&self, source_id: &str, target_id: &str, payload: &[u8], mesh_token: &str) -> Result<(), SovereignError> {
        let presented: [u8; 32] = Sha256::digest(mesh_token.as_bytes()).into();
        let token_mismatch = presented.iter().zip(self.mesh_token_sha256.iter())
            .fold(0_u8, |difference, (left, right)| difference | (left ^ right));
        if token_mismatch != 0 {
            return Err(SovereignError::Routing("mesh token rejected".into()));
        }
        if payload.is_empty() || payload.len() > 8 * 1024 * 1024 {
            return Err(SovereignError::Routing("payload size rejected".into()));
        }
        self.registry.read().await.verify_pair(source_id, target_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn routes_only_between_admitted_nodes_with_the_mesh_token() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("registry.json");
        fs::write(&path, format!(r#"{{"devices":[{{"deviceId":"a-node","platform":"future","publicKey":"ed25519:{}","admitted":true}},{{"deviceId":"b-node","platform":"future","publicKey":"ed25519:{}","admitted":true}}]}}"#, "a".repeat(64), "b".repeat(64))).expect("write");
        let registry = Arc::new(RwLock::new(UniversalMeshRegistry::load(path).expect("registry")));
        let router = SovereignRouter::new(registry, "mesh-token-0123456789").expect("router");
        assert!(router.dispatch("a-node", "b-node", b"payload", "mesh-token-0123456789").await.is_ok());
        assert!(router.dispatch("a-node", "b-node", b"payload", "wrong-token-0000").await.is_err());
        assert!(router.dispatch("a-node", "missing", b"payload", "mesh-token-0123456789").await.is_err());
    }
}

