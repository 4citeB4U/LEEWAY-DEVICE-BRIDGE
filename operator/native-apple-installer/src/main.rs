/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.NATIVE_APPLE_INSTALLER
TAG: LEEWAY.APPLE.NATIVE_INSTALL_WORKER
5WH:
WHAT = Explicitly authorized native installer for the existing LeeWay Device Bridge.
WHY = Put signing, USB device selection and post-install verification in the Bridge's host tier, never a web view.
WHO = LeeWay Device Bridge contributors under Creator and LeeWay Standards.
WHERE = operator/native-apple-installer/src/main.rs.
WHEN = 2026-11-07.
HOW = Local owner-held request and MFA, exact device identity, hashed IPA, isideload sign/install, native readback.
LICENSE = MIT; the upstream isideload and idevice libraries retain their original attribution and licenses.
*/
use std::{
    fs::{self, File},
    io::{self, IsTerminal, Read, Write},
    path::Path,
    sync::{OnceLock, atomic::{AtomicBool, Ordering}},
    time::Duration,
};

use idevice::{
    IdeviceService,
    installation_proxy::InstallationProxyClient,
    usbmuxd::{UsbmuxdAddr, UsbmuxdConnection},
};
use isideload::{
    anisette::remote_v3::RemoteV3AnisetteProvider,
    auth::apple_account::{AppleAccount, TwoFactorCallbackParams, TwoFactorCallbackResponse},
    dev::{developer_session::DeveloperSession, teams::{DeveloperTeam, TeamsApi}},
    sideload::{
        SideloaderBuilder, TeamSelection,
        builder::{ExtensionsBehavior, ExtensionsBehaviorSelection, MaxCertsBehavior},
    },
    util::{callbacks::{ExtensionsBehaviorCallbackBox, MaxCertsCallbackBox}, keyring_storage::KeyringStorage},
};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};

mod interactive;
static INTERACTIVE_MODE: AtomicBool = AtomicBool::new(false);

const BUNDLE_ID: &str = "industries.leeway.devicebridge";
const MAX_IPA_SIZE: u64 = 104_857_600;
const REQUEST_LIMIT: usize = 32_768;
static TEAM_ID: OnceLock<String> = OnceLock::new();

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    action: String,
    apple_id: String,
    apple_password: String,
    #[serde(default)]
    developer_team_id: Option<String>,
    device_udid: String,
    ipa_path: String,
    expected_sha256: String,
    #[serde(default)]
    anisette_url: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SecondFactor {
    action: String,
    code: Option<String>,
    number_id: Option<u32>,
}

fn event(stage: &str, state: &str) {
    println!("{}", json!({"type":"leeway.apple.installer","stage":stage,"state":state}));
    let _ = io::stdout().flush();
}

fn bounded_line(size_limit: usize) -> Option<String> {
    // Read exactly one newline-delimited IPC message. read_to_string waited for EOF,
    // preventing two-factor callbacks while the Bridge kept stdin open.
    let stdin = io::stdin();
    let mut handle = stdin.lock();
    let mut bytes = Vec::with_capacity(size_limit.min(4096));
    for _ in 0..=size_limit {
        let mut one = [0u8; 1];
        if handle.read(&mut one).ok()? != 1 { return None; }
        if one[0] == b'\n' {
            return String::from_utf8(bytes).ok();
        }
        bytes.push(one[0]);
    }
    None
}

fn validate_request(req: &Request) -> Result<(), &'static str> {
    if req.action != "install-official-leeway-ipa" { return Err("OPERATION_NOT_SUPPORTED"); }
    if req.apple_id.len() < 3 || req.apple_id.len() > 255 || !req.apple_id.contains('@')
        || req.apple_password.is_empty() || req.apple_password.len() > 4_096 {
        return Err("APPLE_ACCOUNT_INPUT_INVALID");
    }
    // The normal free Apple Account path does NOT require a supplied team ID.
    // If multiple teams exist, an exact explicit choice is required.
    if let Some(team) = &req.developer_team_id {
        if team.len() != 10 || !team.bytes().all(|c| c.is_ascii_alphanumeric()) {
            return Err("DEVELOPER_TEAM_ID_INVALID");
        }
    }
    if req.device_udid.len() < 16 || req.device_udid.len() > 64 ||
       !req.device_udid.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-') {
        return Err("APPLE_DEVICE_ID_INVALID");
    }
    // Use the upstream isideload HTTPS default unless the trusted host selects
    // an authorized alternative. No manual Anisette URL is needed for customers.
    if let Some(value) = &req.anisette_url {
        let u = url::Url::parse(value).map_err(|_| "ANISETTE_URL_INVALID")?;
        if u.scheme() != "https" || u.host_str().is_none() || u.username() != "" ||
           u.password().is_some() || u.fragment().is_some() || u.query().is_some() {
            return Err("ANISETTE_URL_UNTRUSTED");
        }
    }
    if req.ipa_path.len() < 4 || req.ipa_path.len() > 1_024 ||
       !Path::new(&req.ipa_path).is_absolute() {
        return Err("IPA_PATH_INVALID");
    }
    if req.expected_sha256.len() != 64 ||
       !req.expected_sha256.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err("IPA_HASH_FORMAT_INVALID");
    }
    Ok(())
}

fn check_file_sha256(filename: &str, expected: &str) -> Result<(), &'static str> {
    let metadata = fs::symlink_metadata(filename).map_err(|_| "IPA_NOT_FOUND")?;
    if !metadata.is_file() || metadata.file_type().is_symlink() ||
       metadata.len() == 0 || metadata.len() > MAX_IPA_SIZE {
        return Err("IPA_FILE_UNTRUSTED");
    }
    let mut handle = File::open(filename).map_err(|_| "IPA_NOT_READABLE")?;
    let mut hasher = Sha256::new();
    let mut chunk = [0u8; 65_536];
    loop {
        let size = handle.read(&mut chunk).map_err(|_| "IPA_READ_FAILED")?;
        if size == 0 { break; }
        hasher.update(&chunk[..size]);
    }
    if hex::encode(hasher.finalize()) != expected.to_ascii_lowercase() {
        return Err("IPA_HASH_MISMATCH");
    }
    Ok(())
}

fn selected_team(teams: &Vec<DeveloperTeam>) -> Option<String> {
    let selected = TEAM_ID.get()?;
    teams.iter().find(|team| &team.team_id == selected).map(|team| team.team_id.clone())
}

async fn challenge(params: TwoFactorCallbackParams) -> Result<TwoFactorCallbackResponse, rootcause::Report> {
    if INTERACTIVE_MODE.load(Ordering::Relaxed) {
        eprintln!("Apple verification is required. Enter the code shown on your trusted device.");
        let reply = tokio::task::spawn_blocking(|| {
            rpassword::prompt_password("Apple verification code (hidden): ")
        }).await.ok().and_then(|v| v.ok()).unwrap_or_default();
        return Ok(if (4..=12).contains(&reply.len()) &&
            reply.bytes().all(|c| c.is_ascii_alphanumeric()) {
            TwoFactorCallbackResponse::SubmitCode(reply)
        } else {
            TwoFactorCallbackResponse::Abort
        });
    }
    println!("{}", json!({
        "type": "leeway.apple.two_factor",
        "stage":"OWNER_APPROVAL",
        "sms": params.sms,
        "unknown": params.unknown,
        "availableNumberIds": params.numbers.iter().map(|number| number.id).collect::<Vec<_>>()
    }));
    let _ = io::stdout().flush();
    let reply = tokio::time::timeout(
        Duration::from_secs(120),
        tokio::task::spawn_blocking(|| bounded_line(2_048)),
    ).await.ok().and_then(|r| r.ok()).flatten()
        .and_then(|line| serde_json::from_str::<SecondFactor>(&line).ok());
    Ok(match reply {
        Some(answer) if answer.action == "submit" =>
            match answer.code {
                Some(code) if (4..=12).contains(&code.len()) &&
                    code.bytes().all(|c| c.is_ascii_alphanumeric()) =>
                    TwoFactorCallbackResponse::SubmitCode(code),
                _ => TwoFactorCallbackResponse::Abort
            },
        Some(answer) if answer.action == "send-to-devices" =>
            TwoFactorCallbackResponse::SendToDevices,
        Some(answer) if answer.action == "send-sms" =>
            answer.number_id.map(TwoFactorCallbackResponse::SendSms)
                .unwrap_or(TwoFactorCallbackResponse::Abort),
        Some(answer) if answer.action == "resend" =>
            TwoFactorCallbackResponse::ResendCode,
        _ => TwoFactorCallbackResponse::Abort,
    })
}

async fn perform(req: Request) -> Result<(), &'static str> {
    validate_request(&req)?;
    check_file_sha256(&req.ipa_path, &req.expected_sha256)?;
    // Only the invoking user's local keyring is used. No Apple secrets leave through stdout or logs.
    event("PACKAGE", "SHA256_MATCH");

    rustls::crypto::ring::default_provider()
        .install_default().map_err(|_| "TLS_PROVIDER_NOT_READY")?;
    isideload::init().map_err(|_| "ISIDELOAD_INIT_FAILED")?;

    let mut connection = UsbmuxdConnection::default().await.map_err(|_| "USBMUXD_UNAVAILABLE")?;
    let devices = connection.get_devices().await.map_err(|_| "APPLE_DEVICE_DISCOVERY_FAILED")?;
    let exact = devices.iter().filter(|dev| dev.udid == req.device_udid).collect::<Vec<_>>();
    if exact.len() != 1 { return Err("EXACT_APPLE_DEVICE_NOT_CONNECTED"); }
    let provider = exact[0].to_provider(
        UsbmuxdAddr::from_env_var().map_err(|_| "USBMUXD_ADDRESS_INVALID")?,
        "leeway-device-bridge"
    );
    event("DEVICE", "EXACT_DEVICE_SELECTED");

    let anisette = RemoteV3AnisetteProvider::default()
        .map_err(|_| "ANISETTE_INIT_FAILED")?
        .set_serial_number("leeway".to_string())
        .set_storage(Box::new(KeyringStorage::new("leeway-device-bridge".to_string())));
    let anisette = match &req.anisette_url {
        Some(endpoint) => anisette.set_url(endpoint),
        None => anisette,
    };
    let mut account = AppleAccount::builder(&req.apple_id.to_lowercase())
        .anisette_provider(anisette)
        .login(&req.apple_password, challenge)
        .await.map_err(|_| "APPLE_AUTHORIZATION_FAILED")?;
    event("ACCOUNT", "APPLE_AUTHENTICATED");

    let mut session = DeveloperSession::from_account(&mut account)
        .await.map_err(|_| "APPLE_DEVELOPER_SESSION_UNAVAILABLE")?;
    let teams = session.list_teams().await.map_err(|_| "APPLE_TEAMS_NOT_OBSERVED")?;
    let current_team_id = if let Some(requested) = &req.developer_team_id {
        if !teams.iter().any(|team| &team.team_id == requested) {
            return Err("REQUESTED_APPLE_TEAM_NOT_AUTHORIZED");
        }
        requested.clone()
    } else if teams.len() == 1 {
        // isideload's own listTeams response includes the free Personal Team.
        teams[0].team_id.clone()
    } else if teams.is_empty() {
        return Err("APPLE_ACCOUNT_HAS_NO_SIGNING_TEAM");
    } else {
        return Err("MULTIPLE_APPLE_TEAMS_NEED_OWNER_SELECTION");
    };
    TEAM_ID.set(current_team_id.clone()).map_err(|_| "TEAM_ALREADY_SELECTED")?;
    event("SIGNING", "TEAM_OBSERVED");

    // Never silently revoke certificates, delete profiles, reset device trust, or erase app data.
    let mut signer = SideloaderBuilder::<MaxCertsCallbackBox, ExtensionsBehaviorCallbackBox>::new(session, req.apple_id.to_lowercase())
        .team_selection(TeamSelection::PromptOnce(selected_team))
        .max_certs_behavior(MaxCertsBehavior::Error)
        .extensions_behavior(ExtensionsBehaviorSelection::Fixed(ExtensionsBehavior::ReuseMain))
        .machine_name("leeway-device-bridge".to_string())
        .storage(Box::new(KeyringStorage::new("leeway-device-bridge".to_string())))
        .build();
    // Bound owner request, trusted host entry, signing provider, and exact physical device are prerequisites.
    let _result = signer.install_app(
        &provider, Path::new(&req.ipa_path).to_path_buf(), false,
        None::<fn(f32) -> std::future::Ready<()>>, None
    ).await.map_err(|_| "APPLE_SIGN_OR_INSTALL_FAILED")?;
    event("INSTALL", "NATIVE_INSTALLER_ACKNOWLEDGED");

    let mut proxy = InstallationProxyClient::connect(&provider)
        .await.map_err(|_| "POST_INSTALL_PROXY_UNAVAILABLE")?;
    let packages = proxy.get_apps(Some("User"), None)
        .await.map_err(|_| "POST_INSTALL_READBACK_FAILED")?;
    let expected_signed_id = format!("{}.{}", BUNDLE_ID, current_team_id);
    if !packages.contains_key(&expected_signed_id) {
        return Err("LEEWAY_SIGNED_BUNDLE_NOT_FOUND");
    }
    println!("{}", json!({"type":"leeway.apple.installer","stage":"POST_INSTALL","state":"LEEWAY_BUNDLE_PRESENT","signedBundleId":expected_signed_id}));
    let _ = io::stdout().flush();
    // This is a host observation, not proof of launch, Metal operation, Formula or Veritas acceptance.
    Ok(())
}

#[tokio::main]
async fn main() {
    let mut arguments = std::env::args().skip(1);
    if let Some(command) = arguments.next() {
        if command == "--help" || command == "-h" {
            println!("LeeWay Device Bridge Apple native installer");
            println!("  --install-leeway           Use a personal Apple Account and an authorized iPhone/iPad");
            println!("  --install-leeway --team ID  Select an existing team only if necessary");
            println!("  --help                     Print available commands");
            println!("No argument: private Device Bridge newline-delimited JSON worker.");
            return;
        }
        if command == "--install-leeway" {
            let selected_team_id = match (arguments.next(), arguments.next(), arguments.next()) {
                (None, None, None) => None,
                (Some(flag), Some(team), None) if flag == "--team" && team.len() == 10 &&
                  team.bytes().all(|c| c.is_ascii_alphanumeric()) => Some(team),
                _ => {
                    eprintln!("INVALID_INSTALL_OPTIONS");
                    std::process::exit(2);
                }
            };
            match interactive::run(selected_team_id).await {
                Ok(()) => eprintln!("Native signed bundle found. The next gate is live launch and Metal proof."),
                Err(code) => {
                    eprintln!("LeeWay installer stopped: {code}");
                    std::process::exit(1);
                }
            }
            return;
        }
        eprintln!("UNKNOWN_NATIVE_INSTALLER_COMMAND");
        std::process::exit(2);
    }
    // A customer opening the executable in an actual terminal gets the local
    // LeeWay installer. A Bridge-spawned process with piped stdin stays in the
    // existing private structured IPC lane.
    if io::stdin().is_terminal() && io::stderr().is_terminal() {
        match interactive::run(None).await {
            Ok(()) => eprintln!("LeeWay signed app observed on the selected phone; physical launch remains a separate gate."),
            Err(code) => {
                eprintln!("LeeWay installer stopped: {code}");
                std::process::exit(1);
            }
        }
        return;
    }
    let outcome = match bounded_line(REQUEST_LIMIT) {
        None => Err("INSTALL_REQUEST_MISSING_OR_OVERSIZED"),
        Some(line) => match serde_json::from_str::<Request>(&line) {
            Ok(request) => perform(request).await,
            Err(_) => Err("INSTALL_REQUEST_INVALID"),
        }
    };
    match outcome {
        Ok(()) => {
            event("FINAL", "HOST_INSTALL_OBSERVED_NOT_INDEPENDENTLY_VERIFIED");
        }
        Err(code) => {
            // Error codes are fixed strings, never raw Apple response text, paths, passwords, or 2FA.
            event("FINAL", code);
            std::process::exit(1);
        }
    }
}
