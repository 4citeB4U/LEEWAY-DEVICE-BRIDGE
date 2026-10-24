# Portable device contract and MCP foundation

This is an additive monorepo foundation. `apps/android` remains the existing Android implementation. No package migration or competing relay is required.

| Path | Implemented responsibility |
| --- | --- |
| `packages/protocol` | Common capability argument schemas, admission boundary, per-device grants, evidence hashes |
| `packages/agent-relay` | Client for the existing production WebSocket relay protocol |
| `apps/android` | Existing Device Bridge app; unchanged by this foundation |
| `apps/desktop` | Node stdio MCP host, bounded local workspace file operations and interactive process pipes |
| `apps/web` | Browser capability boundary documentation; no browser-control adapter yet |

## Run

Install Node 22 or newer, then run `npm ci --ignore-scripts`. Make an owner-controlled device configuration and workspace. The MCP server is started by a trusted LeeWay Runtime composition that injects canonical `admission` and `receiptSink` providers. Direct CLI startup without both providers fails closed; configuration grants alone do not authorize operations. Standard output is reserved for MCP JSON-RPC; startup errors go to standard error.

```json
{
  "devices": [
    {
      "id": "local-workstation",
      "type": "desktop",
      "workspace": "workspace",
      "grants": ["device.health", "device.info", "device.files.read", "device.files.write"]
    },
    {
      "id": "REPLACE_WITH_PAIRED_DEVICE_ID",
      "type": "relay",
      "tokenEnv": "LEEWAY_PAIRING_TOKEN",
      "url": "wss://agent-lee-x.vercel.app/api/device-relay",
      "grants": ["device.health", "model.status"]
    }
  ]
}
```

The trusted startup calls `start(configPath, { admission, receiptSink })` using the existing Runtime owner adapters. Neither callback is accepted from request JSON or the device config. There is no local always-allow fallback.

Relative paths resolve against the configuration directory. Set the existing owner-room token through the MCP process environment; never copy it into a repository, command line, prompt, or receipt. Omit the relay entry when using only the desktop adapter. No grants are enabled implicitly. Adding a grant does not implement an unavailable capability or override Android permission and device admission checks.

`tools/list` advertises a common typed API. `bridge_devices` enumerates configuration; `bridge_capabilities` queries one device now. Invoke `device_files_read`, for example, with `{"deviceId":"local-workstation","arguments":{"path":"proof.txt"}}`. Tool names map dots to underscores; all schemas live in `index.mjs`. The registry includes Android screen, UI, app, model and voice operations, but the desktop adapter reports only its actual file/status capabilities. Call results return `isError: true` on failure.

Successful `device_screen_capture` calls return native MCP ImageContent (JPEG or PNG) and a separate text metadata/receipt block. The formatter checks bounded canonical base64, allowed MIME type, image signature and positive bounded dimensions; it does not duplicate image data in text. Malformed image output returns `INVALID_SCREEN_IMAGE` with no image payload. The preserved receipt hash binds the complete original adapter result; its execution outcome records the adapter result, not proof that the image was rendered or interpreted. Other tools never promote arbitrary returned data to ImageContent. The formatter does not fully decode the image or independently verify declared dimensions.

## Authority and evidence

Admission requires a known device, known capability, strict bounded arguments, an explicit configuration grant, a positive admission callback, and fresh adapter discovery. The relay remains the device's owner authentication and execution gate. Its `remoteQualified` list is a supported route list, **not** proof of OS permission, verified behavior, or Formula approval. A successful discovery is never labeled verified.

The library and MCP startup both fail closed without an admission callback and a durable evidence sink. These callbacks are necessary startup bindings, not production certification: Bridge receipts remain hash-only controller observations with `formula: NOT_EVALUATED`. Trusted Runtime composition must execute the exact applicable Formula and Veritas gates and persist their canonical evidence before reporting production acceptance. This package creates no alternate Formula, Veritas, or ledger authority. The application's existing Android Formula implementation is unchanged and is not endorsed by this host.

Every dispatched operation must first persist an ADMITTED receipt. Completion persists PASS only after a successful adapter response. Receipt storage failure prevents initial execution; failure after dispatch returns uncertainty (`operationMayHaveExecuted`). Do not blindly retry a failed mutation. Receipts record controller observations with argument/result SHA-256 digests and pre/post hash linkage; they omit raw prompts, file contents, and credentials. These hashes provide content binding, **not** device signatures, authenticated Veritas receipts, or tamper-proof durable storage. Preserve receipts using the deployment's access controls. SDK-rejected malformed requests never reach execution and do not create domain receipts.

## Limits and tested platforms

The desktop adapter supports bounded UTF-8 create/read, compare-and-swap file replacement, hash-checked moves, and interactive stdin/stdout pipes for allowlisted long-running processes. Text file writes are limited to 64 KiB. A file replacement requires the SHA-256 read from the current version; it prefers same-directory rename and uses an in-place recovery path when the OS denies that rename. A move requires the expected source SHA and refuses an existing destination; it copies to an exclusively created destination, verifies source and destination bytes, then removes the source. An interrupted move may leave both paths, so inspect state after an uncertain result before retrying. Interactive jobs are pipes, not pseudo-terminals, so full-screen terminal programs and terminal resize/key semantics are not provided. These controls remain bounded to the configured workspace and explicit process allowlist.

The desktop adapter still has no native screen capture, mouse/keyboard control or browser control. Android screen/UI operations require the owner-enabled Accessibility service; the relay only advertises capabilities the phone reports. This change does not implement file operations through Android's authorized storage tree, mobile permission bypass, background daemon installation, automatic pairing, WebRTC or universal platform support. Windows Node 24 is the only platform tested for these changes; macOS/Linux portability is a design goal pending platform testing. Android relay compatibility is tested against a local mock of the source-observed production wire contract, not a live Fold or production relay.

Run `npm run test:mcp` for a real official SDK stdio roundtrip, file read/write, capability denial, missing admission, failed receipt persistence, changed capabilities, traversal/link/file-size defenses, relay authentication, nested execution errors, timeout and malformed response checks. Run `npm audit` for dependency findings.

The hardlink fixture test is separate from file-size/path defenses. Android/Termux may deny creation of any hardlink with `EACCES`/`EPERM`; in that case only the hardlink test reports an explicit skip and that defense is unverified on that host. The adapter's hardlink rejection policy is unchanged. Do not report a skipped platform test as a passed defense.

Official MCP SDK guidance used: [server](https://ts.sdk.modelcontextprotocol.io/server). This implementation pins the supported v1 package API in its lockfile; the common contract is JSON-RPC through MCP, not a proprietary replacement.
