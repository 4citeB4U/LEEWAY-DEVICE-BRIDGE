/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.NATIVE_APPLE_INSTALLER.INTERACTIVE
TAG: LEEWAY.APPLE.FREE_ACCOUNT_HOST_INSTALL
5WH:
WHAT = Give customers and owners a direct, native LeeWay sideload installer.
WHY = Replace the external iLoader UI without requiring App Store Connect or a paid publisher membership.
WHO = Authorized users on their own Windows, macOS or Linux host.
WHERE = operator/native-apple-installer/src/interactive.rs.
WHEN = 2026-11-07.
HOW = Discover target USB devices, verify LeeWay IPA provenance, ask for local Apple Account consent, invoke the same native signing worker.
LICENSE = MIT; upstream isideload and idevice retain their licenses.
*/
use std::{
    io::{self, IsTerminal, Write},
};
use idevice::usbmuxd::UsbmuxdConnection;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::{perform, Request, INTERACTIVE_MODE};
use std::sync::atomic::Ordering;

const MANIFEST_URL: &str = "https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/docs/package-manifest.json";
const IPA_URL: &str = "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/LeeWayDeviceBridge-unsigned.ipa";
const MAX_BYTES: u64 = 104_857_600;

fn ask(prompt: &str) -> Result<String, &'static str> {
    print!("{prompt}");
    io::stdout().flush().map_err(|_| "TERMINAL_OUTPUT_FAILED")?;
    let mut line = String::new();
    io::stdin().read_line(&mut line).map_err(|_| "TERMINAL_INPUT_FAILED")?;
    if line.len() > 4096 { return Err("TERMINAL_INPUT_TOO_LARGE"); }
    let result = line.trim().to_string();
    if result.is_empty() { return Err("USER_INPUT_MISSING"); }
    Ok(result)
}

fn official_manifest(value: &Value) -> Result<(&str, u64), &'static str> {
    if value.get("authority").and_then(Value::as_str) != Some("4citeB4U/LEEWAY-DEVICE-BRIDGE") ||
       value.get("distributionRole").and_then(Value::as_str) != Some("GITHUB_PAGES_DISCOVERY_AND_DOWNLOAD") {
        return Err("APPLE_MANIFEST_AUTHORITY_UNVERIFIED");
    }
    let packages = value.get("packages").and_then(Value::as_array)
        .ok_or("APPLE_MANIFEST_PACKAGES_UNAVAILABLE")?;
    let apple = packages.iter().filter(|item|
        item.get("platform").and_then(Value::as_str) == Some("ios") &&
        item.get("id").and_then(Value::as_str) == Some("apple-native")
    ).collect::<Vec<_>>();
    if apple.len() != 1 { return Err("APPLE_MANIFEST_PACKAGE_AMBIGUOUS"); }
    let pkg = apple[0];
    let digest = pkg.get("sha256").and_then(Value::as_str).ok_or("APPLE_MANIFEST_HASH_MISSING")?;
    let size = pkg.get("sizeBytes").and_then(Value::as_u64).ok_or("APPLE_MANIFEST_SIZE_MISSING")?;
    let source = pkg.get("githubActionsQualification").ok_or("APPLE_MANIFEST_CI_UNVERIFIED")?;
    if pkg.get("downloadUrl").and_then(Value::as_str) != Some(IPA_URL) ||
       pkg.get("source").and_then(Value::as_str) != Some("github-release") ||
       pkg.get("status").and_then(Value::as_str) != Some("QUALIFIED_ARTIFACT_OWNER_INSTALL_REQUIRED") ||
       source.get("state").and_then(Value::as_str) != Some("VERIFIED") ||
       source.get("ipaSha256").and_then(Value::as_str) != Some(digest) ||
       source.get("ipaSizeBytes").and_then(Value::as_u64) != Some(size) ||
       digest.len() != 64 || !digest.bytes().all(|x| x.is_ascii_hexdigit()) ||
       size == 0 || size > MAX_BYTES {
        return Err("APPLE_MANIFEST_PROVENANCE_MISMATCH");
    }
    Ok((digest, size))
}

async fn download_official_ipa() -> Result<(tempfile::NamedTempFile, String), &'static str> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build().map_err(|_| "APPLE_DOWNLOAD_CLIENT_UNAVAILABLE")?;
    let metadata = client.get(MANIFEST_URL).send().await
        .map_err(|_| "APPLE_MANIFEST_UNREACHABLE")?
        .error_for_status().map_err(|_| "APPLE_MANIFEST_HTTP_ERROR")?;
    if metadata.content_length().is_some_and(|n| n > 65536) {
        return Err("APPLE_MANIFEST_TOO_LARGE");
    }
    let metadata_bytes = metadata.bytes().await.map_err(|_| "APPLE_MANIFEST_READ_ERROR")?;
    if metadata_bytes.len() > 65536 { return Err("APPLE_MANIFEST_TOO_LARGE"); }
    let parsed: Value = serde_json::from_slice(&metadata_bytes)
        .map_err(|_| "APPLE_MANIFEST_INVALID_JSON")?;
    let (expected_hash, expected_size) = official_manifest(&parsed)?;
    let expected_hash = expected_hash.to_ascii_lowercase();
    eprintln!("Official manifest provenance checked; measuring the LeeWay IPA against its actual SHA-256.");
    let response = client.get(IPA_URL).send().await
        .map_err(|_| "APPLE_IPA_DOWNLOAD_FAILED")?
        .error_for_status().map_err(|_| "APPLE_IPA_HTTP_ERROR")?;
    if response.content_length().is_some_and(|n| n != expected_size) {
        return Err("APPLE_IPA_CONTENT_LENGTH_MISMATCH");
    }
    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;
    let mut file = tempfile::Builder::new()
        .prefix("leeway-apple-")
        .suffix(".ipa")
        .tempfile().map_err(|_| "APPLE_TEMPORARY_FILE_UNAVAILABLE")?;
    let mut bytes: u64 = 0;
    let mut hash = Sha256::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| "APPLE_IPA_STREAM_FAILED")?;
        bytes = bytes.checked_add(chunk.len() as u64).ok_or("APPLE_IPA_TOO_LARGE")?;
        if bytes > MAX_BYTES || bytes > expected_size { return Err("APPLE_IPA_TOO_LARGE"); }
        file.write_all(&chunk).map_err(|_| "APPLE_IPA_WRITE_FAILED")?;
        hash.update(&chunk);
    }
    if bytes != expected_size || hex::encode(hash.finalize()) != expected_hash {
        return Err("APPLE_IPA_HASH_MISMATCH");
    }
    file.flush().map_err(|_| "APPLE_IPA_WRITE_FAILED")?;
    Ok((file, expected_hash))
}

pub async fn run(selected_team_id: Option<String>) -> Result<(), &'static str> {
    if !io::stdin().is_terminal() || !io::stderr().is_terminal() {
        return Err("INTERACTIVE_TERMINAL_REQUIRED");
    }
    INTERACTIVE_MODE.store(true, Ordering::Relaxed);
    eprintln!("\nLeeWay Device Bridge — Apple native installer");
    eprintln!("Installs the official LeeWay IPA using your Apple Account and the connected device.");
    eprintln!("No paid Apple Developer membership or App Store Connect account is required.");
    eprintln!("Free Apple Account signatures are temporary, typically seven days; re-sign before expiry.");
    eprintln!("Your Apple Account password stays in this host process and is never sent to LeeWay servers.");
    let mut mux = UsbmuxdConnection::default().await.map_err(|_| "USBMUXD_UNAVAILABLE")?;
    let devices = mux.get_devices().await.map_err(|_| "APPLE_DEVICE_DISCOVERY_FAILED")?;
    if devices.is_empty() { return Err("NO_APPLE_DEVICE_CONNECTED"); }
    eprintln!("\nConnected iOS devices:");
    for (i, device) in devices.iter().enumerate() {
        eprintln!("  {}. {}", i+1, device.udid);
    }
    let number = ask("Choose your device number: ")?.parse::<usize>()
        .map_err(|_| "DEVICE_SELECTION_INVALID")?;
    if number == 0 || number > devices.len() { return Err("DEVICE_SELECTION_INVALID"); }
    let chosen_udid = devices[number-1].udid.clone();
    eprintln!("Selected exact device. Next: official package hash, Apple login and confirmation.");
    let (ipa, digest) = download_official_ipa().await?;
    let apple_id = ask("Apple Account email: ")?;
    let apple_password = rpassword::prompt_password("Apple Account password (hidden): ")
        .map_err(|_| "APPLE_CREDENTIAL_INPUT_FAILED")?;
    if apple_password.is_empty() { return Err("APPLE_CREDENTIAL_INPUT_FAILED"); }
    let confirm = ask("Sign and install this exact LeeWay IPA on the selected iPhone/iPad? Type INSTALL: ")?;
    if confirm != "INSTALL" { return Err("OWNER_INSTALL_NOT_APPROVED"); }
    let ipa_path = ipa.path().to_str().ok_or("APPLE_TEMPORARY_PATH_UNSUPPORTED")?.to_owned();
    let request = Request {
        action:"install-official-leeway-ipa".to_string(),
        apple_id,apple_password,
        developer_team_id:selected_team_id,
        device_udid:chosen_udid,
        ipa_path,expected_sha256:digest,
        anisette_url:None,
    };
    // NamedTempFile retains the downloaded IPA until native install and readback finish.
    perform(request).await?;
    eprintln!("LeeWay installer saw the signed app on this device. Launch and Metal proof still need a device session.");
    Ok(())
}
