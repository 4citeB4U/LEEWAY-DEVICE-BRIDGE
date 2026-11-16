use crate::{ContinuumCapsule, ContinuumJournal, SovereignError, SovereignPartition, SovereignVault};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use ed25519_dalek::{pkcs8::DecodePrivateKey, Signer, SigningKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HardwareSnapshot {
    pub operating_system: String,
    pub architecture: String,
    pub cpu_count: usize,
    pub total_memory_bytes: u64,
    pub available_memory_bytes: u64,
    pub total_storage_bytes: u64,
    pub available_storage_bytes: u64,
    pub network_interface_count: usize,
    pub socket_health: String,
    pub observed_utc: String,
}

impl HardwareSnapshot {
    pub fn observe(socket_health: impl Into<String>) -> Self {
        let (total_memory_bytes, available_memory_bytes, total_storage_bytes, available_storage_bytes, network_interface_count) = measured_host_resources();
        Self {
            operating_system: std::env::consts::OS.to_owned(),
            architecture: std::env::consts::ARCH.to_owned(),
            cpu_count: std::thread::available_parallelism().map(usize::from).unwrap_or(1),
            total_memory_bytes, available_memory_bytes, total_storage_bytes, available_storage_bytes, network_interface_count,
            socket_health: socket_health.into(),
            observed_utc: Utc::now().to_rfc3339(),
        }
    }
}

fn measured_host_resources() -> (u64, u64, u64, u64, usize) {
    if cfg!(windows) {
        let script = "$o=Get-CimInstance Win32_OperatingSystem;$d=Get-PSDrive -PSProvider FileSystem|Where-Object {$_.Used -ne $null};$n=Get-NetAdapter -ErrorAction SilentlyContinue;Write-Output \"$([uint64]$o.TotalVisibleMemorySize*1024)|$([uint64]$o.FreePhysicalMemory*1024)|$([uint64](($d|Measure-Object -Property Used -Sum).Sum+($d|Measure-Object -Property Free -Sum).Sum))|$([uint64]($d|Measure-Object -Property Free -Sum).Sum)|$(@($n).Count)\"";
        if let Ok(output) = Command::new("powershell.exe").args(["-NoProfile", "-NonInteractive", "-Command", script]).output() {
            let values = String::from_utf8_lossy(&output.stdout).trim().split('|').map(str::parse::<u64>).collect::<Result<Vec<_>, _>>();
            if let Ok(values) = values { if values.len() == 5 { return (values[0], values[1], values[2], values[3], values[4] as usize); } }
        }
    } else {
        let memory = fs::read_to_string("/proc/meminfo").unwrap_or_default();
        let value = |name: &str| memory.lines().find(|line| line.starts_with(name)).and_then(|line| line.split_whitespace().nth(1)).and_then(|value| value.parse::<u64>().ok()).unwrap_or(0) * 1024;
        let (mut total_storage, mut available_storage) = (0, 0);
        if let Ok(output) = Command::new("df").args(["-Pk", "."]).output() {
            if let Some(line) = String::from_utf8_lossy(&output.stdout).lines().last() {
                let columns = line.split_whitespace().collect::<Vec<_>>();
                if columns.len() >= 4 { total_storage = columns[1].parse::<u64>().unwrap_or(0) * 1024; available_storage = columns[3].parse::<u64>().unwrap_or(0) * 1024; }
            }
        }
        let network_count = fs::read_dir("/sys/class/net").map(|entries| entries.count()).unwrap_or_else(|_| {
            Command::new("ifconfig").arg("-l").output().ok().map(|output| String::from_utf8_lossy(&output.stdout).split_whitespace().count()).unwrap_or(0)
        });
        return (value("MemTotal:"), value("MemAvailable:"), total_storage, available_storage, network_count);
    }
    (0, 0, 0, 0, 0)
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SandboxEvent {
    pub event_id: String,
    pub device_id: String,
    pub operation: String,
    pub outcome: String,
    pub details: String,
    pub hardware: HardwareSnapshot,
    pub event_sha256: String,
    pub sync_state: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReceiptBody<'a> {
    event_id: &'a str,
    device_id: &'a str,
    event_sha256: &'a str,
    capsule_sha256: &'a str,
    previous_receipt_sha256: &'a str,
    issued_utc: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SignedReceipt<'a> {
    body: ReceiptBody<'a>,
    receipt_sha256: String,
    signature_ed25519_base64: String,
    public_key_der_base64: String,
}

#[derive(Debug)]
pub struct SandboxFabric {
    sandbox_dir: PathBuf,
    diagnostics_dir: PathBuf,
    digital_brain_dir: PathBuf,
    ledger_dir: PathBuf,
    receipts_dir: PathBuf,
    continuum_dir: PathBuf,
    signing_key: SigningKey,
}

impl SandboxFabric {
    pub fn new(vault: &SovereignVault) -> Result<Self, SovereignError> {
        let key_path = std::env::var_os("LEEWAY_DEVICE_PRIVATE_KEY_PATH")
            .map(PathBuf::from).ok_or_else(|| SovereignError::Sandbox("LEEWAY_DEVICE_PRIVATE_KEY_PATH is required".into()))?;
        Self::new_with_signing_key(vault, key_path)
    }

    pub fn new_with_signing_key(vault: &SovereignVault, key_path: PathBuf) -> Result<Self, SovereignError> {
        let pem = fs::read_to_string(key_path).map_err(map_error)?;
        let signing_key = SigningKey::from_pkcs8_pem(&pem).map_err(map_error)?;
        Ok(Self {
            sandbox_dir: vault.partition_path(SovereignPartition::Sandbox),
            diagnostics_dir: vault.partition_path(SovereignPartition::Diagnostics),
            digital_brain_dir: vault.partition_path(SovereignPartition::DigitalBrain),
            ledger_dir: vault.partition_path(SovereignPartition::Ledger),
            receipts_dir: vault.partition_path(SovereignPartition::Receipts),
            continuum_dir: vault.partition_path(SovereignPartition::Continuum),
            signing_key,
        })
    }

    pub fn record(&self, device_id: &str, operation: &str, outcome: &str, details: &str, hardware: HardwareSnapshot)
        -> Result<(SandboxEvent, ContinuumCapsule), SovereignError> {
        if device_id.trim().is_empty() || operation.trim().is_empty() || outcome.trim().is_empty() {
            return Err(SovereignError::Sandbox("device, operation and outcome are required".into()));
        }
        let core = serde_json::json!({"deviceId":device_id,"operation":operation,"outcome":outcome,"details":details,"hardware":hardware});
        let event_sha256 = hex::encode(Sha256::digest(serde_json::to_vec(&core).map_err(map_error)?));
        let event = SandboxEvent {
            event_id: format!("sbx-{}", &event_sha256[..20]), device_id: device_id.into(), operation: operation.into(),
            outcome: outcome.into(), details: details.into(), hardware: serde_json::from_value(core["hardware"].clone()).map_err(map_error)?,
            event_sha256, sync_state: "PENDING_MESH_REPLICATION".into(),
        };
        let event_bytes = serde_json::to_vec_pretty(&event).map_err(map_error)?;
        let capsule = ContinuumJournal::build(device_id, "SandboxFieldEvidence", &String::from_utf8_lossy(&event_bytes))?;
        let capsule_bytes = serde_json::to_vec_pretty(&capsule).map_err(map_error)?;

        let _lock = ReceiptLock::acquire(self.receipts_dir.join(".receipt-chain.lock"))?;
        let previous = latest_receipt_hash(&self.receipts_dir)?;
        let body = ReceiptBody { event_id:&event.event_id, device_id, event_sha256:&event.event_sha256,
            capsule_sha256:&capsule.sha256, previous_receipt_sha256:&previous, issued_utc:Utc::now().to_rfc3339() };
        let body_bytes = serde_json::to_vec(&body).map_err(map_error)?;
        let receipt_sha256 = hex::encode(Sha256::digest(&body_bytes));
        let signature = self.signing_key.sign(&body_bytes);
        use ed25519_dalek::pkcs8::EncodePublicKey;
        let public_der = self.signing_key.verifying_key().to_public_key_der().map_err(map_error)?;
        let receipt = SignedReceipt { body, receipt_sha256:receipt_sha256.clone(),
            signature_ed25519_base64:BASE64.encode(signature.to_bytes()), public_key_der_base64:BASE64.encode(public_der.as_bytes()) };
        let receipt_bytes = serde_json::to_vec_pretty(&receipt).map_err(map_error)?;

        let tx = self.sandbox_dir.join(".transactions").join(&event.event_id);
        fs::create_dir_all(&tx).map_err(map_error)?;
        let outputs = [
            ("sandbox.json", self.sandbox_dir.join(format!("{}.json", event.event_id)), event_bytes.clone()),
            ("diagnostics.json", self.diagnostics_dir.join(format!("{}.json", event.event_id)), serde_json::to_vec_pretty(&event.hardware).map_err(map_error)?),
            ("brain.json", self.digital_brain_dir.join(format!("{}.json", event.event_id)), event_bytes.clone()),
            ("ledger.json", self.ledger_dir.join(format!("{}.json", event.event_id)), event_bytes.clone()),
            ("capsule.json", self.continuum_dir.join(format!("{}.json", capsule.capsule_id)), capsule_bytes),
            ("outbox.json", self.continuum_dir.join("mesh-outbox").join(format!("{}.json", event.event_id)), receipt_bytes),
            ("receipt.json", self.receipts_dir.join(format!("{}.json", event.event_id)), serde_json::to_vec_pretty(&receipt).map_err(map_error)?),
        ];
        fs::write(tx.join("RECOVERY_REQUIRED"), b"staged").map_err(map_error)?;
        for (name, _, bytes) in &outputs { write_new_or_verify(tx.join(name), bytes)?; }
        for (name, target, bytes) in &outputs {
            if let Some(parent) = target.parent() { fs::create_dir_all(parent).map_err(map_error)?; }
            commit_file(&tx.join(name), target, bytes)?;
        }
        fs::write(tx.join("COMMITTED"), b"complete").map_err(map_error)?;
        let _ = fs::remove_file(tx.join("RECOVERY_REQUIRED"));
        Ok((event, capsule))
    }
}

struct ReceiptLock(PathBuf);
impl ReceiptLock {
    fn acquire(path: PathBuf) -> Result<Self, SovereignError> {
        if let Ok(metadata) = fs::metadata(&path) {
            let stale = metadata.modified().ok().and_then(|value| value.elapsed().ok()).is_some_and(|age| age.as_secs() > 300);
            if stale { fs::remove_file(&path).map_err(map_error)?; }
        }
        let mut file = OpenOptions::new().write(true).create_new(true).open(&path).map_err(map_error)?;
        write!(file, "pid={} utc={}", std::process::id(), Utc::now().to_rfc3339()).map_err(map_error)?;
        Ok(Self(path))
    }
}
impl Drop for ReceiptLock { fn drop(&mut self) { let _ = fs::remove_file(&self.0); } }

fn map_error(error: impl std::fmt::Display) -> SovereignError { SovereignError::Sandbox(error.to_string()) }
fn write_new_or_verify(path: PathBuf, bytes: &[u8]) -> Result<(), SovereignError> {
    match OpenOptions::new().write(true).create_new(true).open(&path) {
        Ok(mut file) => file.write_all(bytes).map_err(map_error),
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            if fs::read(path).map_err(map_error)? == bytes { Ok(()) } else { Err(map_error("transaction staging conflict")) }
        }
        Err(error) => Err(map_error(error)),
    }
}
fn commit_file(staged: &Path, target: &Path, bytes: &[u8]) -> Result<(), SovereignError> {
    if target.exists() {
        return if fs::read(target).map_err(map_error)? == bytes { Ok(()) } else { Err(map_error("immutable evidence conflict")) };
    }
    fs::rename(staged, target).map_err(map_error)
}
fn latest_receipt_hash(directory: &Path) -> Result<String, SovereignError> {
    let mut latest: Option<(String, String)> = None;
    for entry in fs::read_dir(directory).map_err(map_error)? {
        let path = entry.map_err(map_error)?.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") { continue; }
        let Ok(value) = fs::read(&path).map_err(map_error).and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).map_err(map_error)) else { continue; };
        let Some(issued) = value.pointer("/body/issuedUtc").and_then(|value| value.as_str()) else { continue; };
        let Some(hash) = value.get("receiptSha256").and_then(|value| value.as_str()) else { continue; };
        if latest.as_ref().is_none_or(|(prior, _)| issued > prior.as_str()) { latest = Some((issued.to_owned(), hash.to_owned())); }
    }
    Ok(latest.map(|(_, hash)| hash).unwrap_or_else(|| "GENESIS".into()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::pkcs8::EncodePrivateKey;

    #[test]
    fn sandbox_event_transactionally_wires_signed_receipt_and_outbox() {
        let root = tempfile::tempdir().expect("tempdir");
        let key = SigningKey::from_bytes(&[7_u8; 32]);
        let key_path = root.path().join("device.pem");
        fs::write(&key_path, key.to_pkcs8_pem(Default::default()).expect("pem").as_bytes()).expect("write key");
        let vault = SovereignVault::new(root.path().join("vault")).expect("vault");
        let fabric = SandboxFabric::new_with_signing_key(&vault, key_path).expect("fabric");
        let (event, capsule) = fabric.record("future-field-node", "cargo-test", "PASS", "verified",
            HardwareSnapshot::observe("PROBED_LOOPBACK_ACCEPT")).expect("record");
        assert_eq!(event.event_sha256.len(), 64);
        assert_eq!(capsule.sha256.len(), 64);
        let receipt: serde_json::Value = serde_json::from_slice(&fs::read(vault.partition_path(SovereignPartition::Receipts)
            .join(format!("{}.json", event.event_id))).expect("receipt")).expect("json");
        assert!(receipt["signatureEd25519Base64"].as_str().is_some_and(|value| !value.is_empty()));
        assert_eq!(receipt["body"]["previousReceiptSha256"], "GENESIS");
        assert!(vault.partition_path(SovereignPartition::Continuum).join("mesh-outbox").join(format!("{}.json", event.event_id)).is_file());
    }
}
