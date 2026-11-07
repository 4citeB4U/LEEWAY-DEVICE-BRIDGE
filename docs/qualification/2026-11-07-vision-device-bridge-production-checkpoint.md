# Vision through LeeWay Device Bridge — production checkpoint

**Checkpoint time:** 2026-11-07 10:30:45 America/Chicago (2026-11-07 16:30:45 UTC)
**Agent identity:** Codex operating under Creator-authorized task instructions.
**Repositories:** `4citeB4U/Leeway-Agent-Lee-Vision` and `4citeB4U/LEEWAY-DEVICE-BRIDGE`.
**Scope:** Bind real Windows camera frames to the governed Vision connector and Device Bridge MCP image result.

## Gate result

The Windows physical-camera path is executed and verified through the live Device Bridge session. The complete cross-platform, active-MCP, Formula/Veritas, and autonomous-any-LLM production gate remains **NOT FULLY QUALIFIED** because those independent gates were not executed by this checkpoint.

## Accepted decisions

- Keep `VisionBridgeConnector` as the portable authority for source ownership, per-camera grants, session ownership, frame cursors, image validation, provenance, and physical STOP.
- Add the Windows DirectShow adapter as a platform producer behind that connector; it uses owner-controlled FFmpeg and never manufactures telemetry or frame bytes.
- Emit a verified Vision image as one native MCP image content block. Keep base64 out of text while retaining safe metadata and the existing receipt hash over the complete adapter result.
- Treat a live Windows frame as evidence for Windows only. Android and Apple adapters require their own executed producer, advancing frame, physical STOP, and independent verification.
- Preserve the existing Device Bridge admission, receipt, compliance-card, and trusted runtime-composition boundaries. Configuration and source tests do not substitute for an active runtime readback.

## Rejected claims

- No claim that every LLM, device, operating system, or active MCP server is production-ready from this evidence.
- No claim that USB/WPD or ADB enumeration alone proves a mobile camera stream.
- No claim of Formula evaluation, independent Veritas decision, Continuum admission, or Learning Ledger entry; the live Bridge receipts below are `CONTROLLER_OBSERVATION` with `formula: NOT_EVALUATED`.
- No claim that the currently connected external MCP surface has reloaded the trusted Vision provider composition; its live capability inventory was not refreshed to expose `vision.*` in this checkpoint.

## Implemented source

- Vision `main` commit: `59693f117a77061a237c940ced61dc661619ff21` (`feat(vision): bind verified Windows frames to Device Bridge`).
- Device Bridge source commit: `eb62f5c` (`feat(vision): expose verified images through MCP`) on top of `d2482fbeab5b37e24761c504e17f7f07225739cd`.
- Vision files: `service/directshow-frame-producer.mjs`, `service/vision-bridge-connector.mjs`, `scripts/qualify-directshow-live.mjs`, and `docs/DEVICE-BRIDGE-RUNTIME-BINDING.md`.
- Device Bridge files: `apps/desktop/mcp-server.mjs` and `tests/mcp/vision-image-content.test.mjs`.

## Executed evidence

### Source gates

- Vision: `node --test tests/*.test.cjs tests/*.test.mjs` — **20 passed, 0 failed**.
- Device Bridge: `npm run test:mcp` — **145 passed, 0 failed**.
- The native MCP test confirms one image block, no duplicated base64 in text, receipt result-hash preservation, and fail-closed rejection of a mismatched SHA-256.

### Live Device Bridge physical gate

The canonical live device was `pc-primary`. A relative Bridge workspace path was required; the first absolute-path attempt was rejected with `PATH_OUTSIDE_WORKSPACE` and was not treated as camera evidence.

The accepted session executed `node scripts/qualify-directshow-live.mjs` through `device.session.start` using the physical Windows camera `HD Webcam eMeet C960`:

- Session-start receipt: `385c6dce-2712-4308-b284-a3e9715e42cb`.
- Session ID: `0dd0c15b-68cd-476c-8150-bfaa21260e53`.
- Session-read receipt: `e4c05d9f-0281-473c-822d-56e5aba949a8`.
- Session-stop receipt: `733caafa-d0d2-4f2d-b5e2-9d304dd903d9`.
- Process exit: code `0`; stderr empty.
- First real frame: frame `1`, SHA-256 `08b278f9a56acbc6bbf47797ab2dfcfe4c9581b3aadd50e682a4e5126129745f`.
- Observed advancing frame: frame `2`, 1920×1080 JPEG, 279538 bytes, SHA-256 `4a168cd581cb5449866899a842d7845a60c5e6bd7f1beb9d3add67b8132d8110`.
- Connector state: `VERIFIED`.
- Physical stop: `stopped: true`, `producerStopped: true`.

The host also exposed an Android/Samsung ADB device and Apple USB/WPD entries during prior read-only enumeration, but this checkpoint did not convert either observation into a mobile Vision frame qualification.

## Capability and evidence state

| Boundary | Configured | Running | Executed | Verified | Production-ready |
|---|---:|---:|---:|---:|---:|
| Vision connector image contract | yes | yes in tests | yes | yes | source-qualified |
| Windows DirectShow producer | yes | yes in live session | yes | yes for eMeet on `pc-primary` | platform-scoped |
| Device Bridge native MCP image result | yes | yes in source tests | yes | yes in source tests | active-server reload not verified |
| Android camera adapter | observed/configured | no | no | no | no |
| Apple camera adapter | observed/configured | no | no | no | no |
| Any-LLM autonomous cross-platform route | design exists | no active readback | no | no | no |

## Next executable action

Bind the Vision provider into the intended active Device Bridge runtime composition, positively identify that running MCP server, and execute a real `vision.frames.observe` call that returns the native image block with a fresh receipt chain. Then qualify Android and Apple producers independently. Keep this checkpoint and its source/physical evidence; do not repeat passing tests without a source or runtime change.

