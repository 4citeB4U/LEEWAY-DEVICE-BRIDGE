use leeway_core::{
    ContinuumMemoryCache, ContinuumPointer, ContinuumPointerState, HardwareSnapshot,
    ReversibleBlockStream, SandboxFabric, SovereignRouter, SovereignVault, TensorProjection16, TransportProfile,
    UniversalMeshRegistry,
};
use serde::Deserialize;
use serde_json::json;
use std::io::{self, Read, Write};
use std::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

const MAX_PROJECTION_INPUT_BYTES: u64 = 8 * 1024 * 1024;
const MAX_CODEC_JSON_BYTES: u64 = 64 * 1024 * 1024;

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
    let command = std::env::args().nth(1).unwrap_or_else(|| "daemon".into());
    if command == "registry-list" {
        let registry = UniversalMeshRegistry::load(registry_path())?;
        let mut devices = registry.admitted_nodes().cloned().collect::<Vec<_>>();
        devices.sort_by(|left, right| left.device_id.cmp(&right.device_id));
        println!("{}", serde_json::to_string(&json!({"devices": devices}))?);
        return Ok(());
    }
    if command == "continuum-project" {
        let mut input = Vec::new();
        io::stdin()
            .take(MAX_PROJECTION_INPUT_BYTES + 1)
            .read_to_end(&mut input)?;
        if input.len() as u64 > MAX_PROJECTION_INPUT_BYTES {
            return Err("CONTINUUM_PROJECTION_INPUT_LIMIT_EXCEEDED".into());
        }
        println!("{}", serde_json::to_string(&TensorProjection16::project(&input))?);
        return Ok(());
    }
    if command == "continuum-block-encode" {
        let mut input = Vec::new();
        io::stdin()
            .take(MAX_PROJECTION_INPUT_BYTES + 1)
            .read_to_end(&mut input)?;
        if input.len() as u64 > MAX_PROJECTION_INPUT_BYTES {
            return Err("CONTINUUM_CODEC_INPUT_LIMIT_EXCEEDED".into());
        }
        println!("{}", serde_json::to_string(&ReversibleBlockStream::encode(&input))?);
        return Ok(());
    }
    if command == "continuum-block-decode" {
        let mut input = Vec::new();
        io::stdin()
            .take(MAX_CODEC_JSON_BYTES + 1)
            .read_to_end(&mut input)?;
        if input.len() as u64 > MAX_CODEC_JSON_BYTES {
            return Err("CONTINUUM_CODEC_DOCUMENT_LIMIT_EXCEEDED".into());
        }
        let encoded: ReversibleBlockStream = serde_json::from_slice(&input)?;
        let decoded = encoded.decode(MAX_PROJECTION_INPUT_BYTES)?;
        io::stdout().write_all(&decoded)?;
        return Ok(());
    }
    if command == "authorize-command" {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase", deny_unknown_fields)]
        struct CommandInput {
            target_device_id: String,
            #[serde(default)]
            source_device_id: Option<String>,
            payload: String,
            mesh_token: String,
        }
        let mut input = String::new();
        io::stdin().take(8 * 1024 * 1024 + 4096).read_to_string(&mut input)?;
        let request: CommandInput = serde_json::from_str(&input)?;
        let registry = Arc::new(RwLock::new(UniversalMeshRegistry::load(registry_path())?));
        let router = SovereignRouter::new(registry);
        if let Some(source_device_id) = request.source_device_id.as_deref() {
            router.authorize_transfer(source_device_id, &request.target_device_id, request.payload.as_bytes(), &request.mesh_token).await?;
        } else {
            router.authorize_target(&request.target_device_id, request.payload.as_bytes(), &request.mesh_token).await?;
        }
        println!("{}", serde_json::to_string(&json!({"authorized": true, "targetDeviceId": request.target_device_id, "sourceDeviceId": request.source_device_id}))?);
        return Ok(());
    }
    if command == "registry-verify" {
        let device_id = argument("--device").ok_or("--device is required")?;
        let registry = UniversalMeshRegistry::load(registry_path())?;
        println!("{}", serde_json::to_string(&json!({"deviceId": device_id, "admitted": registry.verify_node(&device_id)}))?);
        return Ok(());
    }
    if command == "registry-key-verify" {
        let device_id = argument("--device").ok_or("--device is required")?;
        let public_path = PathBuf::from(argument("--public").ok_or("--public is required")?);
        let observed_public_key = fs::read_to_string(public_path)?;
        let registry = UniversalMeshRegistry::load(registry_path())?;
        let key_matches = registry.node(&device_id)
            .and_then(|node| node.public_key.as_deref())
            .is_some_and(|registered| registered.trim() == observed_public_key.trim());
        println!("{}", serde_json::to_string(&json!({"deviceId": device_id, "keyMatches": key_matches}))?);
        if !key_matches { std::process::exit(3); }
        return Ok(());
    }

    let root = std::env::var_os("LEEWAY_SOVEREIGN_ROOT").map(PathBuf::from)
        .or_else(|| std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
            .map(|home| PathBuf::from(home).join("LeeWay").join("SovereignNode")))
        .ok_or("LEEWAY_SOVEREIGN_ROOT or a user home directory is required")?;
    let vault = SovereignVault::new(&root)?;
    let registry = Arc::new(RwLock::new(UniversalMeshRegistry::load(registry_path())?));
    let device_id = std::env::var("LEEWAY_DEVICE_ID").map_err(|_| "LEEWAY_DEVICE_ID is required")?;
    if !registry.read().await.verify_node(&device_id) {
        return Err("LEEWAY_DEVICE_ID is not admitted by the trusted registry".into());
    }
    let _router = SovereignRouter::new(registry);
    let cache_capacity = std::env::var("LEEWAY_CONTINUUM_RAM_CACHE_BYTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(8 * 1024 * 1024);
    let maximum_entry_bytes = std::env::var("LEEWAY_CONTINUUM_RAM_ENTRY_BYTES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(1024 * 1024);
    let continuum_memory = Arc::new(RwLock::new(ContinuumMemoryCache::new(
        cache_capacity,
        maximum_entry_bytes,
    )?));
    let transport_profile = TransportProfile::detect();
    let port = std::env::var("LEEWAY_CORE_PORT").ok()
        .and_then(|value| value.parse::<u16>().ok()).unwrap_or(4310);
    let listener = TcpListener::bind(("127.0.0.1", port)).await?;
    let observed_address = listener.local_addr()?;
    let probe = TcpStream::connect(observed_address).await?;
    drop(probe);
    let sandbox = SandboxFabric::new(&vault)?;
    let initialization_details = "Sovereign Rust core initialized, Continuum RAM cache bound, and transport profile classified without physical hardware authority";
    let (initialization_event, initialization_capsule) = sandbox.record(
        &device_id,
        "daemon-initialization",
        "PASS",
        initialization_details,
        HardwareSnapshot::observe(format!("PROBED_TCP_CONNECT:{}", observed_address)),
    )?;
    continuum_memory.write().await.stage(
        serde_json::to_vec(&initialization_event)?,
        ContinuumPointer {
            capsule_id: initialization_capsule.capsule_id,
            capsule_sha256: initialization_capsule.sha256,
            state: ContinuumPointerState::Persisted,
        },
    )?;
    println!("LEEWAY_SOVEREIGN_CORE_READY");
    loop {
        let (mut socket, _) = listener.accept().await?;
        let device_id = device_id.clone();
        let continuum_memory = continuum_memory.clone();
        let transport_profile = transport_profile.clone();
        tokio::spawn(async move {
            let mut request = [0_u8; 2048];
            let read = socket.read(&mut request).await.unwrap_or(0);
            let request_line = String::from_utf8_lossy(&request[..read]);
            let (status, body) = if request_line.starts_with("GET /health ") {
                let cache = continuum_memory.read().await;
                ("200 OK", serde_json::to_string(&json!({
                    "ok": true,
                    "service": "leeway-core",
                    "deviceId": device_id,
                    "partitions": ["Workspace","Sandbox","Continuum","DigitalBrain","Diagnostics","Ledger","Receipts"],
                    "hardwareBus": "MEASURED_HOST_AND_PROBED_LOOPBACK",
                    "continuumMemory": {
                        "projection": "DETERMINISTIC_16X16_BYTE_DENSITY_V1",
                        "sourceRetention": "BOUNDED_RAM_ORIGINAL_BYTES",
                        "diskIoInStagePath": false,
                        "stats": cache.stats()
                    },
                    "transportProfile": transport_profile
                })).unwrap_or_else(|_| "{\"ok\":false}".into()))
            } else {
                ("404 Not Found", "{\"ok\":false,\"error\":\"NOT_FOUND\"}".into())
            };
            let response = format!("HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
            let _ = socket.write_all(response.as_bytes()).await;
        });
    }
}

