# LeeWay Universal Persistent Relay — Engineering Checkpoint

**Timestamp:** 2026-11-16T01:01:25.902-06:00 (America/Chicago)  
**Identity / authority:** Codex engineering worker under Leonard Jerome Lee's approved universal-relay directive  
**Project:** 4citeB4U/LEEWAY-DEVICE-BRIDGE  
**Base:** `f334980a4a3c05378eefd2060900d8c6f2c20f43`  
**Gate:** Source implementation and local process qualification complete; production host cutover not yet complete.

## INVESTIGATE → DIAGNOSE

- The production relay route used an in-memory WebSocket room map inside a Vercel Function.
- Relay admission encoded `pc-primary` and `pc-hp-secondary`.
- Continuum schemas encoded those same two device IDs.
- The canonical registry shape is not one fixed format; the replacement accepts a canonical single record, an array, or `{ devices: [] }`.

## PLAN → IMPLEMENT

- Replace device-name admission with registry or owner-OIDC-plus-mesh-token admission.
- Add a process-persistent relay entrypoint.
- Bind relay registry admission to the Rust `leeway-core`.
- Add portable Rust modules: `vault`, `continuum`, `registry`, `router`, and CLI/daemon entrypoint.
- Replace fixed Continuum device enums with bounded portable identifiers.

## TEST → VALIDATE → REPAIR → RETEST

- `npm run test:mcp`: **181 passed, 0 failed**.
- Persistent relay / universal registry focused suite: **7 passed, 0 failed**.
- Rust `cargo test --workspace`: **5 passed, 0 failed**.
- Rust `cargo clippy --workspace --all-targets -- -D warnings`: **passed**.
- Rust release build: **passed**.
- Deployable-process test launched the actual relay child process, loaded an arbitrary future device from the Rust registry, observed persistent health metadata, joined target/client WebSockets, and completed a command/result round trip.
- Rust formatting executable was blocked by Windows Application Control; no formatting-pass claim is made.

## VERIFY → EVIDENCE

- Independent code review: pending at checkpoint write time.
- Task-specific Formula evaluation: **NOT EXECUTED**. Formula service health/self-test was observed separately and is not task evidence.
- Independent Veritas verdict: **NOT EXECUTED**.
- Canonical Receipt Authority receipt: **NOT MINTED**.
- Live physical-device execution through the new persistent production route: **NOT YET OBSERVED**.

## CHECKPOINT → CONTINUE

Accepted architecture: any cryptographically admitted device identifier may join; no hardware name is a universal prerequisite. Serverless WebSocket room state is not accepted as durable routing.

Exact next action: establish the host-held mesh credential through a narrowly scoped custody path, start the persistent relay behind the existing Tailscale Funnel `/api/device-relay` route, change Runtime Fabric production from the Vercel relay URL to that durable endpoint, deploy both repositories, then execute live MCP health/write/process calls and read back their receipts.
