/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER_NATIVE_HOST
TAG: LEEWAY.BROWSER.NATIVE.HOST.RUST.V1
WHO: LeeWay Industries; WHAT: directly launchable browser Native Messaging host.
WHEN: 2026-11-16; WHERE: crates/leeway-core/src/bin/leeway-browser-native-host.rs.
WHY: Bind an enrolled browser extension to the authenticated loopback gateway without a shell shim.
HOW: Bounded length-prefixed JSON over stdio and a bounded authenticated HTTP request to loopback only.
AUTHORITY: Local transport adapter only; Device Bridge admission remains upstream.
LICENSE: MIT
*/
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::io::{self, Read, Write};
use std::net::{Ipv4Addr, TcpStream};
use std::time::Duration;

const MAX_MESSAGE_BYTES: usize = 64 * 1024;
const MAX_HTTP_BYTES: usize = 128 * 1024;
const DEFAULT_PORT: u16 = 4280;
const DEFAULT_PATH: &str = "/native/session";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SessionRequest {
    #[serde(rename = "type")]
    message_type: String,
    extension_id: String,
}

#[derive(Debug, Serialize)]
struct SessionBody<'a> {
    #[serde(rename = "extensionId")]
    extension_id: &'a str,
}

fn error(code: &str) -> Value {
    json!({"type":"LEEWAY_BROWSER_ERROR","error":code})
}

fn valid_extension_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'@' | b'.' | b'_' | b'-'))
}

fn read_native_message<R: Read>(reader: &mut R) -> io::Result<Option<Vec<u8>>> {
    let mut header = [0_u8; 4];
    match reader.read_exact(&mut header) {
        Ok(()) => {}
        Err(source) if source.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(source) => return Err(source),
    }
    let length = u32::from_le_bytes(header) as usize;
    if !(2..=MAX_MESSAGE_BYTES).contains(&length) {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "NATIVE_MESSAGE_SIZE_INVALID"));
    }
    let mut payload = vec![0_u8; length];
    reader.read_exact(&mut payload)?;
    Ok(Some(payload))
}

fn write_native_message<W: Write>(writer: &mut W, message: &Value) -> io::Result<()> {
    let payload = serde_json::to_vec(message)
        .map_err(|source| io::Error::new(io::ErrorKind::InvalidData, source))?;
    if payload.len() > MAX_MESSAGE_BYTES {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "NATIVE_RESPONSE_TOO_LARGE"));
    }
    writer.write_all(&(payload.len() as u32).to_le_bytes())?;
    writer.write_all(&payload)?;
    writer.flush()
}

fn session_request(extension_id: &str, secret: &str) -> io::Result<Value> {
    let body = serde_json::to_vec(&SessionBody { extension_id })
        .map_err(|source| io::Error::new(io::ErrorKind::InvalidData, source))?;
    let mut socket = TcpStream::connect((Ipv4Addr::LOCALHOST, DEFAULT_PORT))?;
    socket.set_read_timeout(Some(Duration::from_secs(5)))?;
    socket.set_write_timeout(Some(Duration::from_secs(5)))?;
    let request = format!(
        "POST {DEFAULT_PATH} HTTP/1.1\r\nHost: 127.0.0.1:{DEFAULT_PORT}\r\nAuthorization: Bearer {secret}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    socket.write_all(request.as_bytes())?;
    socket.write_all(&body)?;
    socket.flush()?;

    let mut response = Vec::new();
    socket.take((MAX_HTTP_BYTES + 1) as u64).read_to_end(&mut response)?;
    if response.len() > MAX_HTTP_BYTES {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "GATEWAY_RESPONSE_TOO_LARGE"));
    }
    let split = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "GATEWAY_RESPONSE_INVALID"))?;
    let header = std::str::from_utf8(&response[..split])
        .map_err(|source| io::Error::new(io::ErrorKind::InvalidData, source))?;
    let status = header
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "GATEWAY_STATUS_INVALID"))?;
    let value: Value = serde_json::from_slice(&response[split + 4..])
        .map_err(|source| io::Error::new(io::ErrorKind::InvalidData, source))?;
    if !(200..300).contains(&status) {
        return Ok(error(value.get("error").and_then(Value::as_str).unwrap_or("SESSION_BROKER_REJECTED")));
    }
    Ok(value)
}

fn handle(payload: &[u8]) -> Value {
    let request: SessionRequest = match serde_json::from_slice(payload) {
        Ok(value) => value,
        Err(_) => return error("SESSION_REQUEST_INVALID"),
    };
    if request.message_type != "LEEWAY_BROWSER_SESSION_REQUEST" || !valid_extension_id(&request.extension_id) {
        return error("SESSION_REQUEST_INVALID");
    }
    let secret = match env::var("LEEWAY_BROWSER_GATEWAY_SECRET") {
        Ok(value) if value.len() >= 32 && value.len() <= 4096 => value,
        _ => return error("BROWSER_GATEWAY_SECRET_REQUIRED"),
    };
    match session_request(&request.extension_id, &secret) {
        Ok(value) => value,
        Err(_) => error("LOCAL_GATEWAY_OFFLINE"),
    }
}

fn main() -> io::Result<()> {
    let mut input = io::stdin().lock();
    let mut output = io::stdout().lock();
    loop {
        let payload = match read_native_message(&mut input) {
            Ok(Some(value)) => value,
            Ok(None) => return Ok(()),
            Err(_) => {
                write_native_message(&mut output, &error("NATIVE_MESSAGE_INVALID"))?;
                return Ok(());
            }
        };
        write_native_message(&mut output, &handle(&payload))?;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_dynamic_browser_identifiers() {
        assert!(valid_extension_id("abcdefghijklmnopabcdefghijklmnop"));
        assert!(valid_extension_id("bridge@leewayindustries.com"));
        assert!(!valid_extension_id(""));
        assert!(!valid_extension_id("bad/id"));
    }

    #[test]
    fn native_protocol_round_trip_is_length_prefixed() {
        let value = json!({"type":"LEEWAY_BROWSER_ERROR","error":"TEST"});
        let mut bytes = Vec::new();
        write_native_message(&mut bytes, &value).expect("write");
        let mut cursor = io::Cursor::new(bytes);
        let payload = read_native_message(&mut cursor).expect("read").expect("message");
        assert_eq!(serde_json::from_slice::<Value>(&payload).expect("json"), value);
    }

    #[test]
    fn rejects_unbounded_native_messages_before_allocation() {
        let mut bytes = ((MAX_MESSAGE_BYTES as u32) + 1).to_le_bytes().to_vec();
        bytes.extend_from_slice(b"{}");
        assert_eq!(read_native_message(&mut io::Cursor::new(bytes)).unwrap_err().kind(), io::ErrorKind::InvalidData);
    }
}
