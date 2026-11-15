# Phase 4.2A HP Remote Adapter Checkpoint — 2026-11-15

**Timestamp:** 2026-11-15T16:00:38.3298462-06:00  
**Project:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Branch:** `feature/device-bridge-g3-g4-spine-20261115`  
**Baseline commit:** `6365c6a501bd604b713d3433ff8b3c3411a04c33`  
**Mission:** Bind an enrolled remote Windows workstation to the existing relay adapter without treating its workspace as local or embedding a provider endpoint.

## SOURCE_FIRST_ACK

- `MISSION_ID`: `PHASE-4.2A-HP-REMOTE-ADAPTER`
- `WORK_ID`: `HP-BINDING-001`
- `AGENT_ID`: `F1_CODEX_LEAD`
- `SOURCES_READ`: repository `AGENTS.md`; current MCP composition, relay client/server, workstation daemon, dynamic enrollment and enrollment relay-binding authority at baseline HEAD; persistent-relay and enrollment-binding checkpoints dated 2026-11-14; active Codex and LeeWay engineering-loop skills.
- `SOURCE_NOT_READ`: external canonical repositories named by the source-first reference were not independently fetched during this bounded source repair. No production or independent-Veritas claim relies on them.
- `REUSABLE_ACCEPTED_WORK`: dynamic enrollment and enrollment relay-binding authority were preserved; no parallel relay or enrollment authority was created.
- `ACTIVE_GATE`: Level A source/static/unit qualification of the HP remote adapter seam.
- `FIRST_UNFINISHED_ASSERTION`: run the enrolled daemon on the physical HP with its verified relay binding and execute capability discovery plus observable poststate through Device Bridge.

## Diagnosis

The live-qualification source represented `pc-hp-secondary` as a local `desktop` with a nonexistent local workspace, while the existing `RelayAdapter` and `WorkstationRelayAgent` were not joined through the configured Bridge path. The workstation daemon also lacked `device.capabilities`, so relay discovery could not measure its local adapter surface. Its source carried a fixed public fallback endpoint.

Defect class: `INTEGRATION_MISSING` with a portability contradiction.

## Implemented repair

1. `apps/desktop/mcp-server.mjs`
   - Remote `relay` entries now require `url` and `tokenEnv` and reject a local `workspace`.
   - Local `desktop` entries now require `workspace` and reject relay identity fields.
2. `operator/workstation-relay-agent.mjs`
   - Added measured `device.capabilities` through the workstation's own `DesktopAdapter.discover()`.
   - Removed the source-defined Vercel fallback. An optional fallback must be supplied through `LEEWAY_RELAY_FALLBACK_URL` or constructor injection.
   - Added TLS/loopback and credential-free URL validation for primary and optional fallback bindings.
   - The fallback connection is opened only when explicitly configured and distinct from the primary binding.
3. `tests/mcp/remote-workstation-adapter.test.mjs`
   - Added coverage for measured remote capabilities, provider-agnostic fallback behavior, and relay-versus-local configuration boundaries.

Rollback is the focused diff to those two source files plus removal of the new test. No host configuration, runtime process, device registry, secret, or physical device was modified.

## Test and validation evidence

### PASS — focused HP/config/CLI regression

Command:

```text
node --test tests/mcp/remote-workstation-adapter.test.mjs tests/cli/cli.test.mjs tests/hp-secondary-legacy-retirement.test.mjs tests/remote-relay-source.test.mjs
```

Result: `12 passed, 0 failed, 0 skipped`, exit `0`.

### PASS — enrollment and physical-composition regression

Command:

```text
node --test tests/dynamic-enrollment.test.mjs tests/enrollment-relay-binding-authority.test.mjs tests/mcp/physical-usb-composition.test.mjs
```

Result: `12 passed, 0 failed, 0 skipped`, exit `0`.

### PASS — diff hygiene

Command: `git diff --check`  
Result: exit `0`, no output.

### CONTRARY EVIDENCE — existing mock relay fixture

Command: `node --test tests/mcp/bridge.test.mjs`  
Result: `10 passed, 3 failed`, exit `1`.

The three failures are the pre-existing mock WebSocket relay cases at lines 205, 219 and 265. Their loopback client receives `RELAY_CONNECTION_FAILED`; the failure reproduces when that unchanged test file runs alone. This checkpoint does not relabel or repair that separate test/runtime boundary and does not claim the complete MCP suite is green.

### RETEST — restricted-network cause isolated

The preceding failures were reproduced only inside the restricted execution sandbox, which denied the localhost WebSocket connection before any command envelope was exchanged. No strict cryptographic relay envelope was added by this repair, and the failed mocks did not reach protocol validation.

Commands rerun with localhost networking permitted:

```text
node --test tests/mcp/bridge.test.mjs tests/device-relay-server.test.mjs
npm run test:mcp
```

Results:

- Relay-focused retest: `16 passed, 0 failed`, exit `0`.
- Full MCP suite: `218 executed, 215 passed, 0 failed, 3 environment-skipped`, exit `0`.

No test harness source was modified to obtain these results. The earlier three failures remain preserved as scoped sandbox-environment evidence and are superseded only for the unrestricted localhost test environment.

### PHYSICAL HP PROBE

The live Device Bridge listed `pc-hp-secondary` from `TRUSTED_RUNTIME_DEVICE_REGISTRY` with global reachability `NOT_PROBED`. Fresh calls then returned:

- `bridge_capabilities`: `DISCOVERY_FAILED`.
- `device.info`: blocked before execution, controller receipt `6eb266da-fcff-4f04-9ac8-de71b9e156b7`.
- `device.health`: blocked before execution, controller receipt `b779a094-5929-4f1c-b55b-7280bb1f384f`.

Both receipts report `operationMayHaveExecuted=false`, valid Runtime compliance cards, controller-observation authority, and `formula=NOT_EVALUATED`.

The active Codex Device Bridge composition was inspected read-only. It loads a separate dirty checkout and still configures the HP as a local `desktop` rooted at `C:\\Users\\LEO`; it has no remote relay binding. That dirty checkout was preserved. Continuum records `pc-hp-secondary` as `OFFLINE`. Hostname `LEO` resolved to `192.168.1.218`, but read-only WinRM (`5985`) and SMB (`445`) probes failed. Desktop Commander was not exposed as a callable plugin to this chat.

## Evidence state and boundary

- `SOURCE_IMPLEMENTED`: yes.
- `FOCUSED_TESTED`: yes, 24 scoped passes.
- `FULL_MCP_SUITE_PASS`: yes in the localhost-enabled environment; 215 passed, 0 failed, 3 skipped.
- `HP_DAEMON_DEPLOYED`: blocked; no live Device Bridge, WinRM, SMB, or callable Desktop Commander route reaches the HP.
- `HP_REMOTE_CAPABILITY_DISCOVERY`: not executed against physical HP.
- `HP_NOTEPAD_POSTSTATE`: not executed.
- `FORMULA/VERITAS/RECEIPT/LEDGER`: not executed for this change.
- `PRODUCTION_READY`: not claimed.

## Next executable gate

The mock relay fixture has been independently classified as a restricted-sandbox network effect and passes unchanged when localhost networking is permitted. Launch the updated enrolled workstation daemon on the HP using its verified relay binding. From Device Bridge, call `device.capabilities`, `device.info`, and `device.health`; then perform the owner-approved Notepad poststate test. Preserve remote result correlation and send the resulting operation evidence through the qualified G3→G4 provider chain before claiming physical acceptance.

## Published source and final continuation — 2026-11-15 16:08 CST

The sandbox classification was completed: the full MCP suite passed with localhost networking permitted, so no harness repair is required. The source repair and this checkpoint were committed as `cb69684482dfd56d23a724359ca3086061d574eb` and pushed to `feature/device-bridge-g3-g4-spine-20261115`.

GitHub Actions run `43767657588` (`Portable protocol and MCP`) passed the exact published commit on Windows, Ubuntu, and macOS. Android, Apple, and provider-spine workflows were still running at this readback and are not claimed complete here.

The physical HP operation remains `BLOCKED_BEFORE_EXECUTION`: the HP is offline to the active Device Bridge adapter, WinRM, SMB, and the callable plugin surface available to this chat. No Notepad command was dispatched, no physical poststate was observed, and no `ra-...` or `ll-...` identifier exists for an HP operation. The next executable action is for the HP to restore one enrolled bootstrap lane and pull commit `cb69684`; Device Bridge discovery and the bounded Notepad/G4 sequence can then resume without redesigning the source.
