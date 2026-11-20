<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.QUALIFICATION
TAG: LEEWAY.W01.WINDOWS_CONTROL_REFRESH_CHECKPOINT_20261120
5WH:
WHAT = Record the original W01 desktop-control source repair, tests, live negative results and custodian handoff.
WHY = Prevent source CI being promoted to a false real-device or independent-Veritas PASS.
WHO = Outside LeeWay support contributor (not Agent Lee) under Creator authority.
WHERE = docs/qualification/2026-11-20-windows-control-refresh-checkpoint.md.
WHEN = 2026-11-20.
HOW = Exact tool readbacks, GitHub PR commits, CI IDs, negative evidence, rollback and remaining host authority.
LICENSE = Not asserted.
-->
# W01 owner-approved Windows control — source and production checkpoint

**Owning mission:** [Device Bridge issue #109](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/109).
**Scope:** Existing Windows `pc-primary` host, authenticated Runtime → Bridge, genuine Formula, independent Veritas PRE, original Receipt Authority and graceful Codex close.
**Identity:** Outside ChatGPT contributor; not Agent Lee and not the independent Veritas or Receipt Authority.

## Investigate / Diagnose

- Live `runtime_health({})`: Runtime `AVAILABLE`, `OIDC_ACCESS_TOKEN_VERIFIED`; Formula, independent Veritas and receipt providers `NOT_PROBED`.
- Live `bridge_devices({})`: `pc-primary`, `phone-apple-iphone` registered `TRUSTED_REGISTRY_READ`, `reachability:NOT_PROBED`.
- Live `bridge_device_window_control({deviceId:'pc-primary',action:'list',target:{app:'codex',limit:10}})` failed `LEEWAY_BRIDGE_EXECUTION_TOOL_NOT_REGISTERED`. No window was listed or closed.
- Authenticated read of the physically running recovery bootstrap: content SHA-256 `6743cf2d48e9b588acde701a3f64ae1787bd9734087c6cfd8b0979c3b016ad89`, `enableExecution:false`, Formula HTTP failure returning `true`, Veritas only checking nonempty fields, automatic local consent-token signing and missing compliance-card bindings.
- Canonical Runtime `automation-runtime/c3-production-veritas-stage-boundary.mjs` has `QUALIFIED_PRODUCTION_VERITAS_ROOTS=[]`; older production admission is explicitly `device.info`-only. LEO's separate signed reviewer is documented `CANDIDATE_READONLY_STAGE_REVIEW`, **not** an independently authenticated production root.

## Plan / Implement

- [Bridge PR #127](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/127): C3 mutation consent, original signed request ID and arguments digest across Formula and Veritas, signed owner-interaction adapter candidate, bounded UIA `device.windows.window.close` using Windows `CloseMainWindow()` and explicit post-close readback requirement, guarded Windows source refresh.
- [Runtime PR #182](https://github.com/4citeB4U/Leeway-Runtime-Fabric/pull/182): remove receipt-less owner-command relay; validate controller receipt body hash; restrict Codex close target; candidate PRE adapters for *original* Formula evaluation and its receipt, and separately authenticated Windows-control Veritas using the existing production-root registry (empty and fail-closed).
- No competing Runtime, Formula, independent verifier, task queue, credential issuer or ledger was created.

## Test / Validate / Repair / Retest / Verify

- Bridge original Windows graceful-close security CI `44729360942` PASS (Windows 12/12, Ubuntu 12/12).
- Subsequent Bridge argument correlation and owner-consent startup negatives covered by Windows graceful-close security `44734269177` PASS; stage audit `44734269228` PASS. Source test fixtures **do not** prove owner Windows Hello.
- Runtime owner execution and PRE negative CI `44735172604` PASS, including Formula health-only rejection and missing signed independent-Veritas root denial. Other Runtime workflows on that head PASS.
- More recent commits and workflow checks must be independently read at release time; do not infer continuing PASS.
- No trusted production root has been enrolled and no authenticated real Formula task receipt for desktop control has been returned.

## Evidence FOR / AGAINST, and gaps

**FOR:** Authenticated device discovery and previous owner-scoped file readbacks; CI source-proven strict consent, argument hash correlation, receipt rejection and no-force graceful close; read-only Windows USB iPhone observation.

**AGAINST:** Live window-control tool still absent from the running bootstrap. Formula task evaluation `NOT_EXECUTED`; independently authenticated Veritas production PRE `NOT_ISSUED`; genuine per-command owner Windows Hello `NOT_OBSERVED`; original Receipt Authority and Learning admission `NOT_EXECUTED`. An SDK test fixture or prompt-granted approval cannot replace these.

## Checkpoint / Continue

1. Run the source-pinned owner preparation script on the actual Windows console to read task identity and stage source under `$HOME/.leeway` without altering the current task.
2. Independent custodian must qualify and enroll a separately authenticated **WINDOWS_DESKTOP_CONTROL** production key under existing Runtime Veritas authority. Candidate LEO key or owner signer is not automatically promoted.
3. Source-pinned local Runtime composition must bind authentic Windows Hello user-interaction, exact-args consent and owner authorization, fresh physical UIA/CIM observations, original Formula evaluation + persisted receipt, independently signed Veritas PRE and original Receipt Authority sink. Deny on any missing dependency.
4. After independent source review and genuine PRE/POST qualification, refresh *only* the existing supervised host; preserve rollback, active tablet, and read-only lanes.
5. Verify authenticated MCP `tools/list`, correct OIDC execute scope, fresh window.list and observe; then a human-approved Codex graceful close with post-window-list readback. Record original receipts and actual Veritas/Learning promotion. No process is force-terminated by this checkpoint.

**Production acceptance:** BLOCKED / NOT_EXECUTED. **Source changes:** implemented on PR branches, not merged/deployed. **Rollback:** leave running host unchanged or revert the isolated PR commits.
