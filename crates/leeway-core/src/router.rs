use crate::{SovereignError, UniversalMeshRegistry};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug)]
pub struct SovereignRouter {
    registry: Arc<RwLock<UniversalMeshRegistry>>,
}

impl SovereignRouter {
    pub fn new(registry: Arc<RwLock<UniversalMeshRegistry>>) -> Self {
        Self { registry }
    }

    fn authorize_payload(payload: &[u8]) -> Result<(), SovereignError> {
        if payload.is_empty() || payload.len() > 8 * 1024 * 1024 {
            return Err(SovereignError::Routing("payload size rejected".into()));
        }
        Ok(())
    }

    fn token_matches(expected_hex: &str, mesh_token: &str) -> bool {
        let presented: [u8; 32] = Sha256::digest(mesh_token.as_bytes()).into();
        let Ok(expected) = hex::decode(expected_hex) else { return false; };
        let token_mismatch = presented.iter().zip(expected.iter())
            .fold(0_u8, |difference, (left, right)| difference | (left ^ right));
        expected.len() == 32 && token_mismatch == 0
    }

    pub async fn authorize_target(&self, target_id: &str, payload: &[u8], mesh_token: &str) -> Result<(), SovereignError> {
        Self::authorize_payload(payload)?;
        let registry = self.registry.read().await;
        let Some(target) = registry.node(target_id) else {
            return Err(SovereignError::Routing(format!("target node not admitted: {target_id}")));
        };
        if !target.mesh_token_sha256.as_deref().is_some_and(|expected| Self::token_matches(expected, mesh_token)) {
            return Err(SovereignError::Routing("device credential rejected".into()));
        }
        Ok(())
    }

    pub async fn authorize_transfer(&self, source_id: &str, target_id: &str, payload: &[u8], mesh_token: &str) -> Result<(), SovereignError> {
        Self::authorize_payload(payload)?;
        let registry = self.registry.read().await;
        registry.verify_pair(source_id, target_id)?;
        let target = registry.node(target_id).ok_or_else(|| SovereignError::Routing("target node not admitted".into()))?;
        if !target.mesh_token_sha256.as_deref().is_some_and(|expected| Self::token_matches(expected, mesh_token)) {
            return Err(SovereignError::Routing("device credential rejected".into()));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn authorizes_only_admitted_nodes_with_the_mesh_token() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("registry.json");
        let token = "mesh-token-0123456789";
        let digest = hex::encode(Sha256::digest(token.as_bytes()));
        fs::write(&path, format!(r#"{{"devices":[{{"deviceId":"a-node","platform":"future","publicKey":"ed25519:{}","meshTokenSha256":"{digest}","admitted":true}},{{"deviceId":"b-node","platform":"future","publicKey":"ed25519:{}","meshTokenSha256":"{digest}","admitted":true}}]}}"#, "a".repeat(64), "b".repeat(64))).expect("write");
        let registry = Arc::new(RwLock::new(UniversalMeshRegistry::load(path).expect("registry")));
        let router = SovereignRouter::new(registry);
        assert!(router.authorize_transfer("a-node", "b-node", b"payload", token).await.is_ok());
        assert!(router.authorize_target("b-node", b"payload", token).await.is_ok());
        assert!(router.authorize_transfer("a-node", "b-node", b"payload", "wrong-token-0000").await.is_err());
        assert!(router.authorize_transfer("a-node", "missing", b"payload", "mesh-token-0123456789").await.is_err());
    }
}

