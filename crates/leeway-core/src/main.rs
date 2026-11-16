use leeway_core::{HardwareSnapshot, SandboxFabric, SovereignRouter, SovereignVault, UniversalMeshRegistry};
use serde::Deserialize;
use serde_json::json;
use std::io::{self, Read};
use std::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
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
    let command = std::env::args().nth(1).unwrap_or_else(|| "daemon".into());
    if command == "registry-list" {
        let registry = UniversalMeshRegistry::load(registry_path())?;
        let mut devices = registry.admitted_nodes().cloned().collect::<Vec<_>>();
        devices.sort_by(|left, right| left.device_id.cmp(&right.device_id));
        println!("{}", serde_json::to_string(&json!({"devices": devices}))?);
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
    let port = std::env::var("LEEWAY_CORE_PORT").ok()
        .and_then(|value| value.parse::<u16>().ok()).unwrap_or(4310);
    let listener = TcpListener::bind(("127.0.0.1", port)).await?;
    let observed_address = listener.local_addr()?;
    let probe = TcpStream::connect(observed_address).await?;
    drop(probe);
    let sandbox = SandboxFabric::new(&vault)?;
    sandbox.record(
        &device_id,
        "daemon-initialization",
        "PASS",
        "Sovereign Rust core initialized and partition fabric bound",
        HardwareSnapshot::observe(format!("PROBED_TCP_CONNECT:{}", observed_address)),
    )?;
    println!("LEEWAY_SOVEREIGN_CORE_READY");
    loop {
        let (mut socket, _) = listener.accept().await?;
        let device_id = device_id.clone();
        tokio::spawn(async move {
            let mut request = [0_u8; 2048];
            let read = socket.read(&mut request).await.unwrap_or(0);
            let request_line = String::from_utf8_lossy(&request[..read]);
            let (status, body) = if request_line.starts_with("GET /health ") {
                ("200 OK", serde_json::to_string(&json!({
                    "ok": true,
                    "service": "leeway-core",
                    "deviceId": device_id,
                    "partitions": ["Workspace","Sandbox","Continuum","DigitalBrain","Diagnostics","Ledger","Receipts"],
                    "hardwareBus": "MEASURED_HOST_AND_PROBED_LOOPBACK"
                })).unwrap_or_else(|_| "{\"ok\":false}".into()))
            } else {
                ("404 Not Found", "{\"ok\":false,\"error\":\"NOT_FOUND\"}".into())
            };
            let response = format!("HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
            let _ = socket.write_all(response.as_bytes()).await;
        });
    }
}

