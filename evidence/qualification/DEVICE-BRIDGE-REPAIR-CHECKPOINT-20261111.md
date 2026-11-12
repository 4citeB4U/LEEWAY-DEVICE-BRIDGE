# Device Bridge repair checkpoint — 2026-11-11

## Landing

The source repair gate is green. The live production gate is not green. The distinction is explicit: code and local tests pass; the physical Fold transport dropped after the relay restart, the iPhone has no physical probe, the HP has relay-room identity only, and independent Veritas production roots are unavailable.

## Changes executed

- Android adapter: bounded app-container file read/write, atomic write/readback, SHA-256 binding, launcher fallback, and governed app/screen capabilities.
- Android app: bounded `bridge-files` broker, remote router dispatch, local broker dispatch, and pairing-token masking until explicit owner reveal.
- Relay: pairing tokens retained only as digests in room state and omitted from health responses and logs.
- Qualification: measured matrix and Formula input are derived from observed booleans; no direct Receipt, Veritas, or Learning writes are performed by the gauntlet.
- Receipt Authority: unsigned/plain callback admission is rejected; signed Ed25519 verification metadata is required; legacy delivered outbox material is quarantined when verification is absent.

## Evidence

- Controller focused source tests: exit 0 (relay secrecy, Android broker, token redaction).
- Controller MCP suite: exit 0.
- Integrated source MCP suite: exit 0.
- Receipt Authority unit suite: 10 tests, exit 0.
- Android build: Gradle 8.9 `testDebugUnitTest` and `assembleDebug`, BUILD SUCCESSFUL.
- Patched relay health: HTTP 200, four active rooms, no `token` field.
- Formula packet `mesh-qualification-1794442664320.json`: Formula HTTP 200, 16 rows, production HOLD; Fold physical probe failed because ADB reported `device ... not found`.
- Remote packet `remote-file-d45d3d29-e384-4146-a9fc-f191de18efb8.json`: `PAIRING_REQUIRED`, verified false, production HOLD.
- Earlier pre-restart packet `mesh-qualification-1794437236690.json` recorded a real Fold USB write/read/rewrite/read, app launch, and PNG capture. That result remains historical evidence for the earlier transport state; it does not prove the current post-restart state.

## Exact boundary

`pc-primary`: local presence and Win32 identity observed; current bridge file/UI/screen operations were not probed.

`phone-fold6`: relay room observed, but current ADB is absent and remote app-container qualification is `PAIRING_REQUIRED`.

`phone-apple-iphone`: relay room only; physical Apple device unavailable.

`pc-hp-secondary`: relay-room identity observed as `pc-hp-secondary`; file/UI/screen operations remain unprobed.

Receipt Authority local legacy rows are not promoted as canonical signed admissions. Independent Veritas decision is not issued. Learning admission is not canonical. Production remains HOLD.

## Next executable action

Reconnect/authorize the Fold so `adb devices -l` shows its serial, then rerun the remote file qualification and the physical gauntlet. Attach the physical iPhone and start/bind the HP local daemon before claiming those lanes. Enroll independent Veritas production roots before promotion.
