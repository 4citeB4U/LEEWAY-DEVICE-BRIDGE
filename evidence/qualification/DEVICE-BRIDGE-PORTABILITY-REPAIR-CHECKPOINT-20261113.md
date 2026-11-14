# Device Bridge portability repair checkpoint

- Time: 2026-11-13T20:41:30-06:00
- Project: `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- Branch: `repair/production-zitadel-portable-integration-20261113`
- Gate: source repair and regression evidence complete; live multi-device production qualification remains open.

## Accepted source changes

- The public relay no longer assigns roles, aliases Android rooms, or selects a default target from historical test-device IDs. It requires an explicit target ID and derives descriptive role only from injected device-registry metadata.
- Windows passport verification now admits any syntactically valid, signed Windows device ID bound to its passport and fresh hardware observation. The prior filename remains as a compatibility path, not a device predicate.
- Windows workstation, Apple supervisor, and HP standalone agents require enrollment-injected device ID and mesh token. The HP agent is workspace-bounded and no longer uses a `C:\` directory default.
- Runtime admission no longer grants authority to named model vendors. An enrolled runtime must inject a verified principal/scope registry.
- The catalog test now truthfully recognizes the held unsigned Apple package rather than demanding a nonexistent public download.

## Verification evidence

- `node --test --test-concurrency=1 <all tests>`: 452 passed, 0 failed, 1 declared skip.
- `node scripts/pin-zitadel-host-sources.mjs --root <repository>`: 10/10 ZITADEL host pins verified.
- `git diff --check`: passed.
- Focused relay, Windows passport, and Runtime-admission tests: 22 passed, 0 failed.

## Live boundary and blocker

- Read-only Device Bridge call `device.info` for `pc-hp-secondary` at 2026-11-14T02:33:26.341Z returned `ADAPTER_OR_VALIDATION_FAILURE`, `operationMayHaveExecuted: false`, receipt `3f4647a0-6555-4a73-84d2-ab3d2290deb7`.
- The exposed Bridge response does not disclose the underlying adapter configuration or provide a permitted remote repair capability. Therefore the live HP agent has not been repaired or restarted by this change.
- Earlier read-only observation also showed one Android USB serial represented by both `phone-fold6` and `LDB-04ff1b33-8a70-434c-9aba-8752a30789ee`; the relay source now refuses that aliasing pattern, but the live registry needs a separate signed de-duplication admission before production qualification.
- Formula and independent Veritas are still `NOT_EVALUATED` / controller-observation state for live discovery. Source tests do not elevate those states.

## Next executable action

Deploy this committed artifact through the canonical host installer with an enrollment-issued device ID, token, workspace root, signed passport/registry record, Formula evaluator, Veritas pre-gate, and Receipt Authority binding. Then run real device-specific health/info and owner-authorized read/write/UI acceptance tests on each enrolled device.

## HP onboarding follow-up

- Time: 2026-11-13T20:46:35-06:00
- New portable launcher: `scripts/start-enrolled-workstation-relay.ps1`.
- New handoff: `docs/ENROLLED-WINDOWS-WORKSTATION-ONBOARDING.md`.
- The launcher requires the enrollment-issued ID, protected token, relay URL, and owner-approved workspace at invocation. It persists none of them.
- The HP relay now accepts its workspace root and no longer emits an unverified hardcoded HP hardware model.
- Syntax checks passed for the Node agent and PowerShell launcher; focused regression: 14 passed, 0 failed.
- Fresh live observation: `bridge_capabilities(pc-hp-secondary)` returned `DISCOVERY_FAILED`; `device.health` returned `ADAPTER_OR_VALIDATION_FAILURE`, `operationMayHaveExecuted=false`, receipt `d8d2975f-7da7-4a11-b389-0faa8772a69a`. No live HP mutation or restart was performed from this host.

## Dynamic enrollment and execution-path repair

- Time: 2026-11-13T21:18:00-06:00
- Added `operator/dynamic-enrollment.mjs`: provider-bound portable lifecycle requiring a device-held key, Runtime challenge, explicit owner approval, key proof, exact completed device record, local custody, measured capabilities, and runtime start.
- Changed `operator/installation-adapter.mjs`: package planning remains fail-closed, while a `DRY_RUN_READY` plan can now execute only through an injected native execution provider; success remains pending independent verification.
- Added `tests/dynamic-enrollment.test.mjs`; targeted enrollment/install/C3 tests: 5 passed, 0 failed. Full serial suite: 454 passed, 0 failed, 1 declared skip.
- Live product boundary remains open: the currently connected Device Bridge exposes no deployed Runtime enrollment authority or authenticated execution interface. The dynamic coordinator cannot manufacture those external authority decisions.
