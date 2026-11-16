use crate::SovereignError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceNode {
    #[serde(alias = "id")]
    pub device_id: String,
    pub platform: String,
    #[serde(default)]
    pub public_key: Option<String>,
    #[serde(default)]
    pub mesh_token_sha256: Option<String>,
    #[serde(default)]
    pub passport_sha256: Option<String>,
    #[serde(default)]
    pub admitted: Option<bool>,
    #[serde(default)]
    pub identity_verified: Option<bool>,
    #[serde(default)]
    pub registration_state: Option<String>,
    #[serde(default)]
    pub registration_authority: Option<String>,
    #[serde(default)]
    pub owner_subject: Option<String>,
}

impl DeviceNode {
    pub fn has_valid_id(&self) -> bool {
        let mut chars = self.device_id.chars();
        matches!(chars.next(), Some(first) if first.is_ascii_alphanumeric()) &&
            self.device_id.len() <= 128 &&
            chars.all(|value| value.is_ascii_alphanumeric() || matches!(value, '.' | '_' | ':' | '-'))
    }

    pub fn has_cryptographic_identity(&self) -> bool {
        self.public_key.as_ref().is_some_and(|value| {
            let value = value.trim();
            let ed25519_hex = value.strip_prefix("ed25519:")
                .is_some_and(|key| key.len() == 64 && key.bytes().all(|byte| byte.is_ascii_hexdigit()));
            let pem = value.starts_with("-----BEGIN PUBLIC KEY-----") &&
                value.ends_with("-----END PUBLIC KEY-----");
            let der_base64 = (40..=512).contains(&value.len()) &&
                value.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/' | b'='));
            ed25519_hex || pem || der_base64
        })
    }

    pub fn is_admitted(&self) -> bool {
        let explicit = self.admitted == Some(true);
        let canonical = self.identity_verified == Some(true) &&
            self.registration_state.as_deref() == Some("TRUSTED_REGISTRY_READ") &&
            self.registration_authority.as_deref() == Some("TRUSTED_RUNTIME_DEVICE_REGISTRY");
        let token_bound = self.mesh_token_sha256.as_ref()
            .is_some_and(|value| value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit()));
        self.has_valid_id() && self.has_cryptographic_identity() && token_bound && (explicit || canonical)
    }
}

#[derive(Debug)]
pub struct UniversalMeshRegistry {
    registry_path: PathBuf,
    admitted_devices: HashMap<String, DeviceNode>,
}

impl UniversalMeshRegistry {
    pub fn load(registry_path: PathBuf) -> Result<Self, SovereignError> {
        let mut registry = Self { registry_path, admitted_devices: HashMap::new() };
        registry.reload()?;
        Ok(registry)
    }

    pub fn reload(&mut self) -> Result<(), SovereignError> {
        let content = fs::read_to_string(&self.registry_path)
            .map_err(|error| SovereignError::Registry(error.to_string()))?;
        let value: Value = serde_json::from_str(&content)
            .map_err(|error| SovereignError::Registry(error.to_string()))?;
        let records: Vec<Value> = if let Some(devices) = value.get("devices").and_then(Value::as_array) {
            devices.clone()
        } else if let Some(devices) = value.as_array() {
            devices.to_vec()
        } else if value.is_object() {
            vec![value]
        } else {
            Vec::new()
        };
        let mut admitted_devices = HashMap::new();
        for record in records {
            let node: DeviceNode = serde_json::from_value(record)
                .map_err(|error| SovereignError::Registry(error.to_string()))?;
            if node.is_admitted() {
                admitted_devices.insert(node.device_id.clone(), node);
            }
        }
        self.admitted_devices = admitted_devices;
        Ok(())
    }

    pub fn verify_node(&self, device_id: &str) -> bool {
        self.admitted_devices.contains_key(device_id)
    }

    pub fn node(&self, device_id: &str) -> Option<&DeviceNode> {
        self.admitted_devices.get(device_id)
    }

    pub fn verify_pair(&self, source_id: &str, target_id: &str) -> Result<(), SovereignError> {
        if source_id == target_id {
            return Err(SovereignError::Registry("source and target must differ".into()));
        }
        if !self.verify_node(source_id) {
            return Err(SovereignError::Registry(format!("unauthorized source node: {source_id}")));
        }
        if !self.verify_node(target_id) {
            return Err(SovereignError::Registry(format!("target node not admitted: {target_id}")));
        }
        Ok(())
    }

    pub fn admitted_nodes(&self) -> impl Iterator<Item = &DeviceNode> {
        self.admitted_devices.values()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_windows_android_apple_virtual_and_future_nodes_without_name_enums() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("trusted-device-registry.json");
        let devices = ["windows-lab-7", "galaxy-fold6", "iphone-metal-16", "agent-virtual-tablet", "future-node-2040"]
            .into_iter().map(|device_id| serde_json::json!({
                "deviceId": device_id,
                "platform": "portable",
                "publicKey": format!("ed25519:{}", "a".repeat(64)),
                "meshTokenSha256": "b".repeat(64),
                "admitted": true
            })).collect::<Vec<_>>();
        fs::write(&path, serde_json::to_vec(&serde_json::json!({"devices": devices})).expect("json")).expect("write");
        let registry = UniversalMeshRegistry::load(path).expect("registry");
        assert_eq!(registry.admitted_nodes().count(), 5);
        assert!(registry.verify_pair("galaxy-fold6", "future-node-2040").is_ok());
        assert!(registry.verify_pair("galaxy-fold6", "not-enrolled").is_err());
    }

    #[test]
    fn rejects_passport_only_record_without_bound_device_key_and_token() {
        let root = tempfile::tempdir().expect("tempdir");
        let path = root.path().join("trusted-device-registry.json");
        fs::write(&path, serde_json::to_vec(&serde_json::json!({
            "deviceId": "portable-workstation",
            "platform": "windows",
            "passportSha256": "a".repeat(64),
            "identityVerified": true,
            "registrationState": "TRUSTED_REGISTRY_READ",
            "registrationAuthority": "TRUSTED_RUNTIME_DEVICE_REGISTRY"
        })).expect("json")).expect("write");
        let registry = UniversalMeshRegistry::load(path).expect("registry");
        assert!(!registry.verify_node("portable-workstation"));
    }
}

