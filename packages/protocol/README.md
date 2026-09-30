# Portable device contract and MCP foundation

This is an additive monorepo foundation. `apps/android` remains the existing Android implementation. No package migration or competing relay is required.

| Path | Implemented responsibility |
| --- | --- |
| `packages/protocol` | Common capability argument schemas, admission boundary, per-device grants, evidence hashes |
| `packages/agent-relay` | Client for the existing production WebSocket relay protocol |
| `apps/android` | Existing Device Bridge app; unchanged by this foundation |
| `apps/desktop` | Node stdio MCP host and bounded local workspace file/status adapter |
| `apps/web` | Browser capability boundary documentation; no browser-control adapter yet |

## Run

Install Node 22 or newer, then run `npm ci --ignore-scripts`. Make an owner-controlled configuration file outside the repository (example below). Create the workspace directory. Start with `node apps/desktop/mcp-server.mjs /absolute/path/to/config.json`, or configure an MCP host to launch that command. Standard output is reserved for MCP JSON-RPC; errors go to standard error.

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
  ],
  "receipts": "evidence/controller-receipts.jsonl"
}
```

Relative paths resolve against the configuration directory. Set the existing owner-room token through the MCP process environment; never copy it into a repository, command line, prompt, or receipt. Omit the relay entry when using only the desktop adapter. No grants are enabled implicitly. Adding a grant does not implement an unavailable capability or override Android permission and device admission checks.

`tools/list` advertises a common typed API. `bridge_devices` enumerates configuration; `bridge_capabilities` queries one device now. Invoke `device_files_read`, for example, with `{"deviceId":"local-workstation","arguments":{"path":"proof.txt"}}`. Tool names map dots to underscores; all schemas live in `index.mjs`. The registry includes Android screen, UI, app, model and voice operations, but the desktop adapter reports only its actual file/status capabilities. Call results return `isError: true` on failure.

Successful `device_screen_capture` calls return native MCP ImageContent (JPEG or PNG) and a separate text metadata/receipt block. The formatter checks bounded canonical base64, allowed MIME type, image signature and positive bounded dimensions; it does not duplicate image data in text. Malformed image output returns `INVALID_SCREEN_IMAGE` with no image payload. The preserved receipt hash binds the complete original adapter result; its execution outcome records the adapter result, not proof that the image was rendered or interpreted. Other tools never promote arbitrary returned data to ImageContent. The formatter does not fully decode the image or independently verify declared dimensions.

## Authority and evidence

Admission requires a known device, known capability, strict bounded arguments, an explicit configuration grant, a positive admission callback, and fresh adapter discovery. The relay remains the device's owner authentication and execution gate. Its `remoteQualified` list is a supported route list, **not** proof of OS permission, verified behavior, or Formula approval. A successful discovery is never labeled verified.

The library defaults to denial without an admission callback and a receipt sink. The runnable host uses the operator-owned configuration as a narrow local policy adapter. It does **not** execute canonical Formula, consume Veritas attestations, or invent `qA`. Canonical task admission can be connected through the async `admission` callback; it must return literal `true`. The application's existing Android Formula implementation is unchanged and is not endorsed by this host.

Every dispatched operation must first persist an ADMITTED receipt. Completion persists PASS only after a successful adapter response. Receipt storage failure prevents initial execution; failure after dispatch returns uncertainty (`operationMayHaveExecuted`). Do not blindly retry a failed mutation. Receipts record controller observations with argument/result SHA-256 digests and pre/post hash linkage; they omit raw prompts, file contents, and credentials. These hashes provide content binding, **not** device signatures, authenticated Veritas receipts, or tamper-proof durable storage. Preserve receipts using the deployment's access controls. SDK-rejected malformed requests never reach execution and do not create domain receipts.

## Limits and tested platforms

The local adapter is a bounded, create-only UTF-8 file and status adapter, not a native UI daemon. It denies absolute/traversal paths, symlinks, hardlinks, reserved device paths, existing-file replacement and files above 64 KiB. Parent directories must already exist. It is intended for a dedicated owner-controlled workspace. Path checks are not an OS sandbox: do not let hostile local processes concurrently modify workspace directories (filesystem race isolation is not implemented).

No desktop screen capture, mouse/keyboard control, web browser control, mobile permission bypass, background daemon installation, automatic pairing, WebRTC, or universal platform support is implemented here. Windows Node 24 is the only platform tested for this change; macOS/Linux portability is a design goal pending platform testing. Android relay compatibility is tested against a local mock of the source-observed production wire contract, not a live Fold or production relay.

Run `npm run test:mcp` for a real official SDK stdio roundtrip, file read/write, capability denial, missing admission, failed receipt persistence, changed capabilities, traversal/link/file-size defenses, relay authentication, nested execution errors, timeout and malformed response checks. Run `npm audit` for dependency findings.

Official MCP SDK guidance used: [server](https://ts.sdk.modelcontextprotocol.io/server). This implementation pins the supported v1 package API in its lockfile; the common contract is JSON-RPC through MCP, not a proprietary replacement.
