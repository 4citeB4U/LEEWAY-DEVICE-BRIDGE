use leeway_core::{ContinuumJournal, SovereignPartition, SovereignRouter, SovereignVault, UniversalMeshRegistry};
use serde_json::json;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

fn argument(name: &str) -> Option<String> {
    let mut args = std::env::args();
    while let Some(value) = args.next() {
        if value == name { return args.next(); }
    }
    None
}

fn registry_path() -> PathBuf {
    argument("--registry").map(PathBuf::from)
        .or_else(|| std::env::var_os("LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH").map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("registry/trusted-device-registry.json"))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    let command = std::env::args().nth(1).unwrap_or_else(|| "daemon".into());
    if command == "registry-list" {
        let registry = UniversalMeshRegistry::load(registry_path())?;
        let mut devices = registry.admitted_nodes().map(|node| node.device_id.clone()).collect::<Vec<_>>();
        devices.sort();
        println!("{}", serde_json::to_string(&json!({"devices": devices}))?);
        return Ok(());
    }
    if command == "registry-verify" {
        let device_id = argument("--device").ok_or("--device is required")?;
        let registry = UniversalMeshRegistry::load(registry_path())?;
        println!("{}", serde_json::to_string(&json!({"deviceId": device_id, "admitted": registry.verify_node(&device_id)}))?);
        return Ok(());
    }

    let root = std::env::var_os("LEEWAY_SOVEREIGN_ROOT").map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("LeeWay/SovereignNode"));
    let vault = SovereignVault::new(&root)?;
    let continuum = ContinuumJournal::new(vault.partition_path(SovereignPartition::Continuum))?;
    let registry = Arc::new(RwLock::new(UniversalMeshRegistry::load(registry_path())?));
    let mesh_token = std::env::var("LEEWAY_MESH_TOKEN").map_err(|_| "LEEWAY_MESH_TOKEN is required")?;
    let _router = SovereignRouter::new(registry, &mesh_token)?;
    continuum.record("System", "DaemonInitialization", "Sovereign Rust core initialized")?;
    println!("LEEWAY_SOVEREIGN_CORE_READY");
    Ok(())
}

