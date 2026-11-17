# LeeWay Universal Persistent Relay — Engineering Checkpoint

**Timestamp:** 2026-11-16T07:37:07-06:00 (America/Chicago)
**Identity / authority:** Codex engineering worker under Leonard Jerome Lee's approved universal-relay and sovereign-package directive
**Project:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Branch / base / current committed head:** `repair/universal-relay-20261116` / `f334980a4a3c05378eefd2060900d8c6f2c20f43` / `dd3aa4d5a24194705effe0d2e2dced2835c86bca`
**Gate:** Source repair and regression qualification in progress. Production deployment, physical-device acceptance, independent Veritas, canonical Receipt Authority custody, and Learning Ledger admission remain open.

## SOURCE_FIRST_ACK

- Standards `2cc84af9b97b337b2492bbec26a07ffd70fc8770`
- Engineering `a57b9e0a41c6f4991a316ebc76226418f7d10fb5`
- Receipt Authority `b5a9e84d151e2dc9dae3487ec5ab96263aef5d07`
- Learning Ledger `73b2e729bd2784e75f89fa71924783ca50853baf`
- Agent Skills `b9f585527397aded67ea008f6fedad9a0faae3f1`
- LEEWAY-VERITAS `0465f0c2627f14c4793a16096403f092c64212c3`
- Production Final Execution Layer `a2f69b625250e23fcb0ea79adcdbb76aacc15fe4`
- Owning `AGENTS.md`, prior checkpoint, branch state, and live Device Bridge operating contract v1.2.0 read. Bridge inventory observed five registered IDs with reachability `NOT_PROBED`; this is not live-device proof.

## INVESTIGATE → DIAGNOSE

- The accepted relay and Rust package work remains present in the existing worktree; it was not restarted or replaced.
- The third review's Continuum replay finding was reproduced in source: proof IDs were process-local and the receiver discarded `sourceProof` after relay validation.
- The partially applied replay repair referenced `path.dirname` without importing `node:path`.
- The requested six-file browser package existed, but no authenticated local gateway or Native Messaging session broker existed.
- A portability scan found executable Windows C3 admission still required the literal `pc-primary`, despite the universal relay contract.

## PLAN → IMPLEMENT

- Added restart-durable, atomic per-proof replay custody; duplicate proof creation fails closed.
- Preserved the verified source proof in the receiving Continuum/Digital Brain record and required proof shape for relay staging.
- Added `operator/browser-local-gateway.mjs`: loopback-only listener, enrolled extension allowlist, bearer-authenticated Native Messaging broker, expiring one-use sessions, bounded messages, and no unauthenticated command surface.
- Added `operator/browser-native-host.mjs` for length-prefixed Native Messaging and authenticated session acquisition.
- Added the canonical six-file `apps/extension/` lane and source tests; CI now includes browser package/gateway tests and artifacts.
- Removed the literal `pc-primary` C3 predicate. Any Windows device bound by the trusted registry key and the required source-observed passport fields can enter the same Formula/Veritas policy path.
- Rollback: revert the uncommitted source diff on this repair branch only. No production deployment or device state was changed by this checkpoint.

## TEST → VALIDATE → REPAIR → RETEST

- Focused relay/Continuum/package/browser suite: **22 executed, 22 passed, 0 failed, 0 skipped**.
- C3/Windows consent and identity suite: **9 executed, 9 passed, 0 failed**. The production owner-host fixture reported its environment-variable integration lane as not configured; no live owner-host claim is made.
- Full MCP regression suite: **181 executed, 181 passed, 0 failed, 0 skipped**.
- JavaScript syntax checks for relay, gateway, native host, and Digital Brain: **passed**.
- `git diff --check`: **passed**, with only Git line-ending warnings on pre-existing modified Rust/checkpoint files.
- Latest exact Rust source test execution: **NOT EXECUTED at this checkpoint**. Earlier 6/6 evidence predates later receipt-chain changes; Windows Application Control blocked the newly rebuilt unsigned test executable. CI must test the exact current Rust bytes.
- Android build evidence remains the earlier scoped **BUILD SUCCESSFUL / 43 tasks** result; no Android source was changed in this checkpoint segment.
- First GitHub Android workflow run `43877919756`: **FAILED** in source qualification because the workflow enumerated the persistent-process integration test before building Rust, producing `spawnSync .../target/release/leeway-core ENOENT`. The test now skips only when neither release nor debug core artifact exists; the portable-package workflow still builds the core before invoking it. Local repair check: **1 skipped, 0 failed** due host Application Control and absent debug artifact. CI retest is pending the repair push.

## VERIFY → EVIDENCE

- Source/runtime seam evidence: **OBSERVED / TESTED** at local Level A/B scope.
- Browser extension installed in Chrome, Edge, Firefox, or Safari: **NOT EXECUTED**.
- Native-host manifest installation and browser-store signing: **NOT IMPLEMENTED / NOT VERIFIED**.
- Physical PC, HP, Android, and iPhone execution through this new branch: **NOT EXECUTED**.
- Task-specific Formula evaluation: **NOT EXECUTED**.
- Independent Veritas verdict: **NOT EXECUTED**.
- Canonical Receipt Authority receipt: **NOT CREATED**.
- Learning Ledger admission: **NOT UPDATED**.
- Production state: **NOT DEPLOYED / NOT QUALIFIED**.

## OPEN BOUNDARIES

1. Make Android owner OIDC enrollment reachable from the user-facing application flow.
2. Bind Runtime command outcomes to a verified target execution receipt instead of returning `receipt: null` under a receipt-bound public claim.
3. Replace the three-process fire-and-forget launch pattern with a health-aware restart supervisor.
4. Require a provisioned replication endpoint and verify signed replication acknowledgements before moving outbox custody.
5. Recover or roll back Sandbox `RECOVERY_REQUIRED` transactions deterministically.
6. Expose fresh Rust diagnostics to the Bridge and implement nonzero macOS memory telemetry.
7. Perform actual Windows signing and signature verification in CI; certificate presence alone is insufficient.
8. Install platform-specific Native Messaging manifests, generate target-specific browser packages, and qualify them in real browsers. A source manifest is not a Safari/Firefox/Chromium execution pass.
9. Reconcile remaining legacy Pocket ID-named source paths with the Creator-approved ZITADEL architecture without deleting historical evidence blindly.

## CHECKPOINT → CONTINUE

**Accepted architecture:** device IDs are registry-bound data, never source-coded fleet identity. Browser capability enters through an authenticated local adapter. Continuum transfer proof is source-signed, replay-consumed, restart-durable, and retained with receiving custody.

**Next executable action:** build the platform browser packaging/native-host installer and bind the browser gateway into the coordinated host supervisor; then run the complete portable CI matrix. In parallel, repair the Android owner-login path and Runtime execution-receipt contract. Only after current-byte CI, live deployment, real-device tests, independent Veritas, canonical receipt readback, and authorized release review may this branch be promoted to `main`.

## STRUCTURED HANDOFF

- **ACCEPTED_WORK:** universal registry admission, source-proof retention and durable replay denial, authenticated local browser gateway, and portable Windows C3 admission are accepted at the source-test scope listed above.
- **CONSTRAINTS:** no hardcoded fleet device identity; no plaintext credentials in source; no public/private receipt mixing; no production claim from source tests.
- **BLOCKERS:** current-byte Rust execution is blocked locally by Windows Application Control; browser installation, production host routing, and physical devices have not yet been exercised.
- **NEXT_ACTION:** package/install Native Messaging manifests and supervise the browser gateway, then run current-byte CI and live-device acceptance.
- **CAPABILITY_STATE:** source adapters implemented; browser package and local gateway tested; platform browser adapters not installed; live Bridge reachability not probed in this checkpoint.
- **EVIDENCE_STATE:** Level A/B local test evidence only; Formula, Veritas, Receipt Authority, Learning Ledger, and production qualification not executed.
- **SOURCE_REFERENCES:** the seven canonical repository SHAs in `SOURCE_FIRST_ACK`, Device Bridge repair commits `6ee932bf…` plus its pending CI-order repair, and this checkpoint SHA-256 readback.
- **INDEPENDENT_VALIDATION:** checkpoint structure and SHA are read back by the read-only engineering-loop checkpoint reader; claim truth is not independently assessed. Independent Veritas remains not executed.

---

## Worker Input Repair Continuation — 2026-11-16T18:20:30-06:00

**Identity / authority:** Codex engineering worker under Leonard Jerome Lee's explicit repair and live-input acceptance order  
**Committed source:** `ae9f5cd4f6cf845ab4e18ae6f8f1b61b062dd8ca` on `repair/universal-relay-20261116`  
**Remote state:** pushed to `origin/repair/universal-relay-20261116`; host checkout fast-forwarded from `0a0be5c7...` to `ae9f5cd4...` with a clean pre-update worktree  
**Gate:** Browser courier source integration passed. Live native-browser enrollment remains incomplete; UIA worker tests are partially passing with exact scoped failures.

### INVESTIGATE → DIAGNOSE

- The extension background worker forwarded host commands into the active tab but discarded the content-script response.
- The local browser gateway had no request/response correlation contract.
- `DesktopAdapter` had no browser-courier provider seam, so browser workers could never enter the canonical Bridge observation/input/read chain.
- `inter-worker-orchestrator.mjs` called `Bridge.call` with the wrong signature and omitted the required device, PID, observation, target, action, and exact-text bindings.
- Windows UI child-process failures were collapsed to `WINDOW_UI_AUTOMATION_FAILED`, hiding actionable device boundaries.
- The registered Device Bridge owner still launched an obsolete optional Desktop Commander sidecar. That block was removed from the host launcher; no Desktop Commander process was started by the repaired owner.

### IMPLEMENT → TEST → RETEST

- Added `BrowserCourierSessions` with host-injected worker-to-extension/origin bindings, correlated requests, 30-second observation custody, exact input SHA-256 binding, submit binding, and nonce-bound response readback.
- Routed browser-courier observations through the existing `DesktopAdapter`; no parallel command authority was created.
- Added trusted Runtime composition validation and configured-bridge injection for browser courier providers.
- Corrected extension response forwarding, gateway correlation/timeouts, orchestrator Bridge signatures, and Windows error propagation.
- Updated the local host wrapper's source pins and added optional environment-bound browser courier composition. With no browser settings present, the wrapper remains operational without advertising a fabricated browser connection.
- Regression evidence after the repair: MCP **184/184 PASS**; CLI **7/7 PASS**; browser/orchestrator **7/7 PASS**; total **198 passed, 0 failed, 0 skipped**. Syntax and `git diff --check` passed.
- Fresh host-wrapper startup probe: **PASS**, 68 tools, dynamic `workerId` accepted by the live `device_windows_window_list` schema.

### LIVE HOST EVIDENCE

- Canonical Boot Fabric registration validation: `SERVICE_REGISTRATIONS_READY` for `LeeWay Runtime Supervisor` and `LeeWay Device Bridge Relay`.
- Runtime supervisor source-pin validation: `PASS`, rooted at `E:\LeeWay-Work\pc-consciousness-live\runtime`.
- Registered owners started. Observed listeners: Runtime `127.0.0.1:4011` and governed relay `127.0.0.1:8008`.
- Real Bridge discovery listed five trusted registry IDs but reported reachability `NOT_PROBED`; this remains registration evidence only.
- Real Bridge Windows list returned Chrome `pid 14940`, title `Development Takeover Plan - Google Chrome`, receipt `1fbd7713-9d25-47e9-b2de-ec69f866da37`.
- Live unsent worker-input probe through the repaired host wrapper:
  - `w-chatgpt`: exact input SHA-256 readback succeeded; receipt `ab9862ac-068f-4953-a610-6e51fbb4e838`. The probe script's extra `readbackVerified` expectation was not part of the UIA result schema; the canonical result was successful and returned `EXACT_VALUE_PATTERN_READBACK` plus the text hash.
  - `w-codex`: denied before mutation because two matching windows existed (`WINDOW_COUNT_2`). A PID must be selected from a fresh list.
  - `w-antigravity`: denied before mutation because the native surface exposed zero writable UIA controls (`EDITABLE_COUNT_0`); browser courier is the intended adapter.
  - `w-copilot`: reached the selected composer but exact readback failed with `WINDOW_INPUT_READBACK_MISMATCH`; receipt `e7ae5377-be04-4ede-b6da-51b1929a3396`.

### OPEN PHYSICAL BOUNDARY

The host has no `LEEWAY_BROWSER_GATEWAY_SECRET`, no enrolled browser extension ID, no worker binding record, and no Native Messaging registration. Source integration is complete, but installing the browser extension is a distinct browser state change requiring action-time user confirmation. Until that enrollment is performed, Antigravity/Gemini browser-courier execution is **BLOCKED_AT_NATIVE_BROWSER_ENROLLMENT**, not globally blocked and not reported as passed.

### CHECKPOINT → CONTINUE

Next executable action: with action-time confirmation, install the unpacked LeeWay extension in the selected browser, capture its actual extension ID, provision the host-held gateway secret and dynamic worker/origin bindings, register the Native Messaging host, restart only the MCP client process that owns the wrapper, then retest Antigravity and Gemini through browser courier. Independently, select the intended Codex PID and refine the Copilot editor adapter against the observed readback mismatch.

### REPAIR → RETEST ADDENDUM — 2026-11-16T18:30:07-06:00

- False Codex discovery was repaired by enforcing each registered worker's title matcher after process enumeration. Fresh live readback now returns zero `w-codex` windows instead of misclassifying two PowerShell terminals; receipt `4bd95ace-90eb-4cd2-9d39-7578d9be09fa`. This is an honest absence, not a Codex input pass.
- Copilot's Electron editor rejected UIA `ValuePattern.SetValue`. A provider-agnostic fallback now focuses only the fresh observation-bound control, replaces its contents through correctly sized Win32 Unicode `SendInput`, and still requires exact `ValuePattern` readback before success.
- Focused contract suite: **12/12 PASS**. Full MCP suite after the repair: **185/185 PASS**.
- Physical Copilot retest through Device Bridge: **PASS**. Marker length 45, exact readback SHA-256 `42f4e272294271e18d66c3366e9cb0e686d225e6b90b08f000565595bbba43d3`, receipt `bff37e74-28c9-423f-9ae3-4dd31e971643`.
- Current repair head: `883ec7d` (`fix(workers): use Win32 input union layout`). The local host wrapper pin was advanced to source SHA-256 `E920FE699AC45BEB6A0677F384B212C98E8E3C02205925902737E426322127C7` and the host checkout was fast-forwarded to that commit.

### HOST LIFECYCLE REPAIR ADDENDUM — 2026-11-16T18:42:00-06:00

- A post-test stability readback found both `4011` and `8008` had dropped. The exact fault was ownership, not the worker adapter: the Device Bridge scheduled launcher spawned Runtime `4011` as its child, then exited; Windows later removed that child. Bounded retries raced the dying process and produced `EADDRINUSE`.
- Runtime API startup was moved under the existing `LeeWay Runtime Supervisor` launcher. The Device Bridge launcher now treats `4011` as an owned dependency and no longer starts a competing Runtime provider.
- The Device Bridge owner received explicit stdout/stderr capture; the obsolete Desktop Commander sidecar remains removed. Both scheduled owners received a bounded `RestartCount=3`, `RestartInterval=PT1M` policy.
- Two stale, reverified `node.exe supervisor.mjs` processes were found at PIDs `36532` and `50204`; only those exact PIDs were terminated. One canonical supervisor remains: PID `57872`, parent `20120`.
- Final 30-second clean-owner stability readback: Runtime `127.0.0.1:4011` listening at PID `38048`; relay `127.0.0.1:8008` listening at PID `40856`; `LeeWay Runtime Supervisor` state `Running`; Device Bridge relay launcher state `Ready` after leaving its independently persistent relay provider live.
- This proves the two localhost listeners survived the measured 30-second gate. It does not prove external Vercel relay continuity: captured relay logs still show intermittent WebSocket close `1006` and historical `404` responses, mixed with successful room joins for `pc-primary`.

### BROWSER NATIVE-HOST PACKAGING AND TRUST GATE — 2026-11-16T18:57:21-06:00

**Identity / authority:** Codex engineering worker under Leonard Jerome Lee's continuing repair order

**Committed source:** `9714e618dc476e2f5c9b7f9d4a9720a8ad5ff25e` on `repair/universal-relay-20261116`

**CI evidence:** GitHub Actions run `43991443038`
**Gate:** Cross-platform source qualification passed; Windows production signing and physical browser enrollment remain open.

#### INVESTIGATE → DIAGNOSE

- The extension and loopback gateway existed, but the Native Messaging host was only `operator/browser-native-host.mjs`. A Windows Native Messaging manifest needs a directly launchable host path; the source package did not provide or register one.
- The newly built Rust executable was blocked on this host by Windows Application Control with `An Application Control policy has blocked this file`. `Get-AuthenticodeSignature` returned `NotSigned`.
- No usable Current User code-signing certificate with a private key was present. The existing CI job only checked whether one secret existed; it did not sign a file or verify a signature.

#### PLAN → IMPLEMENT

- Added `leeway-browser-native-host`, a bounded Rust stdio host that accepts dynamic browser extension IDs, requests a one-use session from the authenticated loopback gateway, and exposes no Device Bridge authority of its own.
- Added an owner-scoped Windows installer that generates Chrome, Edge, or Firefox Native Messaging manifests, writes the appropriate `HKCU` registration, reads the registration back, and refuses any executable whose Authenticode status is not `Valid`.
- Extended the portable bootstrap to carry the extension package and the native-host executable.
- Replaced the CI credential-presence placeholder with an actual Windows signing lane: import protected PFX custody, sign both Windows executables with SHA-256 and timestamping, read both signatures back, remove temporary certificate material, and upload only the signed package.

#### TEST → VALIDATE → REPAIR → RETEST

- Rust workspace tests: **9 passed, 0 failed** (6 sovereign-core tests plus 3 native-host protocol/bounds tests).
- Focused browser courier/gateway/package tests: **8 passed, 0 failed** when run with permitted localhost access.
- Sovereign package, Rust registry adapter, and browser package tests: **11 passed, 0 failed**.
- PowerShell parser checks for `bootstrap.ps1` and `scripts/install-browser-native-host.ps1`: **PASS**.
- Release build: **PASS**.
- Installer negative gate against the local unsigned release binary: **EXPECTED FAIL CLOSED** with `LEEWAY_BROWSER_NATIVE_HOST_TRUST_REQUIRED: Authenticode status is NotSigned`.
- Local `cargo fmt` was blocked by Application Control and local Clippy was blocked by host directory access. Those exact gates subsequently passed on all three clean GitHub runners.
- GitHub matrix run `43991443038`: Windows, macOS, and Ubuntu each passed Rust tests, Clippy with `-D warnings`, release build, the selected JavaScript/browser suite, hashing, and artifact upload.

#### VERIFY → EVIDENCE

- Windows signing job downloaded the qualified Windows package and then failed closed with the exact error `WINDOWS_PRODUCTION_SIGNING_NOT_CONFIGURED`.
- The Actions environment showed both required secrets empty: `WINDOWS_CODE_SIGNING_CERTIFICATE_PFX` and `WINDOWS_CODE_SIGNING_CERTIFICATE_PASSWORD`.
- This is a credential-custody boundary, not a source compilation failure. No unsigned executable was installed or registered, no browser policy was weakened, and no Windows Application Control rule was bypassed.
- Task Formula evaluation: **NOT EXECUTED**. Independent Veritas: **NOT EXECUTED**. Canonical Receipt Authority: **NOT CREATED**. Learning Ledger: **NOT UPDATED**.

#### CHECKPOINT → CONTINUE

The browser-native transport is implemented and cross-platform qualified at source/build scope. Production installation is correctly stopped at one exact boundary: provide the two protected GitHub signing secrets from a valid Windows code-signing PFX, rerun workflow `LeeWay Core Portable Package`, verify the signed artifact, and only then request action-time confirmation to install/register the extension and native host in the selected browser. After enrollment, run physical unsent input/readback against the browser workers. Until then, browser-worker physical execution is not passed.

### CONTINUUM MEMORY PHASE 1 — 2026-11-16T19:25:32-06:00

**SOURCE_FIRST_ACK**

- **MISSION_ID:** `LW-CONTINUUM-MEMORY-PHASE1-20261116`
- **WORK_ID:** `device-bridge-universal-relay-20261116`
- **AGENT_ID:** `F1_CODEX_LEAD`
- **SOURCES_READ:** repository `4citeB4U/LEEWAY-DEVICE-BRIDGE` at pre-change SHA `b412f9ebe761714063387a36ec5b0457a5751b9c`; host `AGENTS.md`; LeeWay Agent Operating Loop and source-first evidence reference; current canonical checkpoint; user research attachments `862eeedb...`, `f09cba1a...`, and `e05f6d80...`; existing Continuum, Sandbox, registry, router, GPU-candidate, Apple-probe, protocol, and CI seams.
- **RULES_APPLIED:** preserve canonical Continuum authority; no parallel receipt/Formula/Veritas service; no kernel intrusion; distinguish lossy feature projection from reversible custody; keep hardware adapters contract-only until physical execution proves them.
- **CONFLICTS_OR_STALE_SOURCES:** the research claim that arbitrary input can be losslessly reconstructed from 256 aggregate values is mathematically unsupported; direct portable user-space PCIe/MMIO/MPS programming is not available in the current source or ordinary OS authority; silent self-trust of a generated certificate is not production Authenticode.
- **REUSABLE_ACCEPTED_WORK:** universal registry admission, sovereign partitions, Sandbox/Continuum evidence path, existing Apple local Metal probe, portable CI matrix, and browser-native packaging remain intact.
- **ACTIVE_GATE:** Level A/B Phase 1 source, unit, release-binary, regression, and cross-platform artifact qualification.
- **FIRST_UNFINISHED_ASSERTION:** bind one governed native compute adapter to the qualified projection/custody contract and run physical differential/readback evidence; no physical backend is yet bound.

#### IMPLEMENTED CANONICAL REPAIR

- **Commit:** `0275ec71857c8bef5f99f68c4fb16b13219d0bd9` (`feat(core): add truthful continuum memory phase one`), pushed to `origin/repair/universal-relay-20261116`.
- Added deterministic `TensorProjection16`: exactly 256 normalized feature cells, source/projection hashes, and explicit `losslessReconstruction: false`.
- Added `ReversibleBlockStream`: identity-coded 256-byte blocks, final valid-byte count, encoded/source SHA-256 manifests, bounded decode, exact round-trip, and tamper rejection. No compression ratio is claimed.
- Added `ContinuumMemoryCache`: tracked payload-capacity and entry-size limits, LRU eviction, original-byte retention, and Continuum pointer hash/state binding. Health truthfully reports that total process memory is not bounded by this payload counter.
- Added platform transport profiles and an opaque allocation safety arbiter. Windows selects D3D12, Linux/Android Vulkan, Apple Metal, and unknown hosts CPU fallback as preferred future adapters; every profile remains `CONTRACT_ONLY_NOT_BOUND` and advertises no direct PCIe configuration, MMIO, physical DMA, kernel intrusion, or verified zero-copy.
- Core startup now stages its already-recorded Sandbox event in the RAM cache against the persisted Continuum capsule and exposes the truthful cache/transport state through `/health`.
- Added release CLI seams `continuum-project`, `continuum-block-encode`, and `continuum-block-decode`; input, JSON document, and reconstructed output sizes are bounded.

#### TEST → VALIDATE → RETEST

- Local elevated Rust `cargo check --workspace --all-targets`: **PASS**.
- Local elevated Rust `cargo test --workspace --all-targets --no-run`: **PASS**; all test binaries compiled.
- Local elevated Clippy `--workspace --all-targets -- -D warnings`: **PASS**.
- Local release build: **PASS**.
- Local debug test execution: **BLOCKED before assertion execution** by Windows Application Control (`os error 4551`). Rebuilt unsigned release execution was also denied. This denial was preserved rather than treated as a source failure or bypassed.
- Before the final rebuild, the permitted local release seam plus related regressions executed **11 passed, 0 failed**. After rebuild, the host policy denied the three executable-backed tests while the other **8 passed**; CI below is the current-byte execution authority for this commit.
- GitHub Actions run `43995060731` at exact SHA `0275ec7...`:
  - Windows: Rust library **15/15 PASS**, native-host **3/3 PASS**, Node integration/regression **25/25 PASS**, Clippy PASS, release build PASS, hash/upload PASS.
  - macOS: same qualification chain **PASS**.
  - Ubuntu: same qualification chain **PASS**.
- CI annotations about GitHub Action Node 20 deprecation/Ubuntu label migration are platform notices, not Phase 1 assertion failures.

#### VERIFY → EVIDENCE BOUNDARY

- **VERIFIED (Level A/B):** deterministic projection contract; exact reversible block custody; malformed/tampered/oversized rejection; tracked payload eviction; 50,000-case allocation-range safety test; platform profile non-claims; three-OS source/build/integration qualification; portable artifact production.
- **NOT VERIFIED:** physical D3D12/Vulkan/Metal execution, PCIe MPS register state, MMIO/DMA, zero copy, thermal improvement, CPU utilization under sustained workload, total process RSS limit, physical-device transfer, Formula decision, independent Veritas, canonical Receipt Authority, Learning Ledger admission, or production release.
- Workflow result is overall red only because the separate Windows production-signing job failed closed with `WINDOWS_PRODUCTION_SIGNING_NOT_CONFIGURED`; both `WINDOWS_CODE_SIGNING_CERTIFICATE_PFX` and `WINDOWS_CODE_SIGNING_CERTIFICATE_PASSWORD` were empty. All three qualification jobs are green.

#### CHECKPOINT → CONTINUE

Phase 1 is accepted at scoped Level A/B evidence on commit `0275ec7...`. The next canonical engineering gate is Phase 2 adapter assembly: define the governed compute-backend request/evidence envelope, bind the existing Apple local Metal probe first without changing its receipt boundary, add CPU differential readback, and then qualify D3D12/Vulkan adapters independently. Raw PCIe/MMIO remains outside Device Bridge command authority unless a separately signed, OS-mediated driver and physical safety lab establish that capability.

### COMPUTE ADAPTER PHASE 2 AND ANDROID QUALIFICATION REPAIR — 2026-11-16T19:41:54-06:00

**Identity / authority:** `F1_CODEX_LEAD` under Leonard Jerome Lee's continuing Phase 1 → Phase 2 implementation order.

**Current branch head:** `3cd4e3cd28c4f2237031a416a13ce098537af746` on `repair/universal-relay-20261116`.

#### IMPLEMENT → TEST

- Commit `abd99628cacb16aeb5e55bc0c6ee095bc5bdb96a` added the governed `LEEWAY_TENSOR_AFFINE_16X16_V1` compute envelope. The CPU reference accepts exactly 256 finite `f32` lanes, computes `input[i].mul_add(3.0, i / 255)`, and emits domain-separated little-endian input/output hashes. Candidate evidence explicitly keeps `canonical_receipt_issued: false`.
- The existing Apple Metal probe now uses the same 256-lane fused affine contract, records the operation and hashes, and performs CPU differential readback. The Metal shader uses `fma`; no Formula, Veritas, Receipt Authority, or Learning Ledger result is self-issued by the adapter.
- Commit `dcdf8b1847601882225ab5d4f64faaaf9840585c` repaired the Swift evidence initializer exposed by the first clean Apple build.
- Apple Device Bridge Qualification run `43996180364` then passed source/package contracts, toolchain evidence, runtime boundary checks, Xcode project generation, unsigned iPhone arm64 source build, package assembly, and artifact upload. This is Apple build qualification, not physical iPhone Metal execution.

#### DIAGNOSE → REPAIR → RETEST

- The Android workflow originally ran executable-backed repository tests without building their Rust prerequisites. Commit `3a632e015a29b22452f02ed85fe972de3476e964` added the Rust toolchain and debug workspace build.
- Diagnostic commit `9acfe1a962352a63c67afba96590c762e7da1b0b` exposed the exact native-host result: `LOCAL_GATEWAY_OFFLINE`.
- Investigation proved the loopback socket was available, but the Node gateway emitted chunked JSON while the bounded Rust native host parsed the response body as direct JSON. Commit `dfd3fa32d71ecd2a7fec2cbebcb2615f2a0d3bc8` made the gateway emit an explicit UTF-8 `Content-Length` and added a framing regression. Local elevated gateway tests passed **4/4**; local spawning of the rebuilt unsigned Rust executable remained blocked by Windows Application Control (`spawn UNKNOWN`).
- The next clean run exposed an independent release-profile prerequisite: `continuum-memory-core.test.mjs` intentionally executes `target/release/leeway-core`, but Android CI had only built debug. Commit `3cd4e3cd28c4f2237031a416a13ce098537af746` now builds both debug and release profiles before the unfiltered test loop.
- Android Build run `43997157628` at exact SHA `3cd4e3c...` passed both Rust prerequisite builds, the complete source/contract loop, Android SDK 35 setup, compact APK assembly, package hashing, and artifact upload. The GitHub Pages publish step was not applicable on this non-default branch and was skipped by workflow condition.

#### VERIFY → EVIDENCE

- LeeWay Core Portable Package run `43997157356` at exact SHA `3cd4e3c...`:
  - Windows qualification: Rust tests PASS, Clippy `-D warnings` PASS, release build PASS, selected Node integration/regression suite PASS, hash/upload PASS.
  - macOS qualification: same chain PASS.
  - Ubuntu qualification: same chain PASS.
  - Overall workflow remains red only at `windows-production-signing-gate`; `Sign and verify Windows production executables` failed because protected production signing credentials are not configured. No unsigned artifact was relabeled as production-signed.
- **Scoped evidence admitted:** deterministic CPU compute contract, Apple source/build differential contract, three-OS portable-core qualification, compiled Rust native-host/gateway handshake on Linux CI, complete Android source/contract qualification, and APK artifact production.
- **Still not physically verified:** Apple Metal execution on an attached iPhone/Mac GPU, D3D12/Vulkan compute execution, direct PCIe register/MPS state, MMIO/DMA, zero-copy behavior, thermal or sustained CPU improvements, physical-device transfer, Formula decision, independent Veritas verdict, canonical receipt, Learning Ledger admission, Windows Authenticode production signing, or installation on a field device.

#### CHECKPOINT → CONTINUE

Phase 2's CPU reference and Apple build adapter are qualified at source/build scope. The next executable engineering gate is physical differential execution: bind an authorized device adapter to the compute envelope, run the same 256-lane vector through CPU and the real OS-mediated GPU backend, compare exact output/hash evidence, and then submit that evidence through the existing Formula → Veritas → Receipt → Ledger chain. D3D12 and Vulkan remain separate adapter gates; raw PCIe/MMIO remains outside this user-space implementation.

### NATIVE COMPUTE ADAPTER PHASE 3 — 2026-11-16T20:05:01-06:00

**Identity / authority:** Codex (`F1_CODEX_LEAD`) under Leonard Jerome Lee's continuing native-compute implementation order.

**Committed source:** `b6154c0da0a6dc322bfb7df714dbdaeb4024b230` (`feat(compute): bind bounded native gpu adapter`) on `repair/universal-relay-20261116`, pushed to `origin`.

#### INVESTIGATE → DIAGNOSE → PLAN

- Phase 2 had a deterministic 256-lane CPU reference and Apple source/build adapter, but no cross-platform user-space GPU adapter physically executed on this host.
- The canonical repair was a bounded `wgpu` adapter using only OS graphics APIs: D3D12 first on Windows, Metal on Apple compile targets, Vulkan first on Linux/Android, and GL only as a fallback. The adapter does not accept caller-supplied shaders, addresses, register offsets, buffer lengths, MMIO, DMA, PCIe controls, or kernel authority.
- Acceptance requires real GPU command submission, mapped-buffer readback, CPU differential comparison, truthful adapter classification, and separate exact-bit and tolerance evidence. A successful adapter probe must not mint Formula, Veritas, Receipt Authority, or Learning Ledger state.

#### IMPLEMENT

- Added `crates/leeway-core/src/native_compute.rs` with a fixed WGSL kernel for `output[i] = fma(input[i], 3.0, i / 255.0)`, fixed 1,024-byte input/output/readback buffers, bounded dispatch, and mapped-buffer readback.
- Added the `compute-native-probe` CLI seam and the evidence fields required to identify backend, adapter, device type, physical-hardware classification, hashes, exact mismatch count, tolerance mismatch count, maximum absolute error, and elapsed time.
- Added `docs/NATIVE-COMPUTE-ADAPTER-PHASE3.md`. Updated the workspace with `wgpu 24` and `bytemuck` while preserving the existing compute-envelope and receipt boundaries.
- Physical hardware is claimed only for `IntegratedGpu` or `DiscreteGpu`. Software and virtual adapters remain visibly classified and cannot silently become physical evidence.

#### TEST → VALIDATE → REPAIR → RETEST

- Local `cargo check --workspace --all-targets`: **PASS**.
- Local `cargo clippy --workspace --all-targets -- -D warnings`: **PASS**.
- Local `cargo build --workspace --release`: **PASS**.
- Local `cargo test --workspace --all-targets`: **PASS** — library **19/19**, browser native host **3/3**.
- An early `rustfmt` invocation reformatted unrelated module files through module discovery. Those incidental changes were identified before commit and reversed without resetting or discarding the scoped implementation.
- First physical probe selected Vulkan on `NVIDIA GeForce RTX 5060 Laptop GPU`: 256 lanes, exact CPU/GPU output-hash equality, exact mismatch count **0**, tolerance mismatch count **0**.
- Windows backend ordering was then repaired to prefer D3D12. Three physical D3D12 probes selected the same `DiscreteGpu` and completed GPU readback. Every run reported exact mismatch count **10**, tolerance mismatch count **0**, maximum absolute error `2.3841858E-07`, and tolerance `1E-06`. The stable GPU hash was `740ecffa3df3334f48bc6b5128d96dc4e20f9071926a86eaa39bb8429f5635d4`; stable CPU hash was `d37f072284cceac553ba0b2c36e08b72cdcddf2945cfcac83848b386e2691bc5`. Elapsed times were approximately 1302.44 ms cold, 341.45 ms, and 343.06 ms.
- The ten D3D12 exact-bit differences are preserved as evidence of cross-provider floating-point rounding. They are not hidden or relabeled as exact equality; all 256 lanes remain within the declared absolute tolerance.

#### VERIFY → EVIDENCE

- GitHub Actions run `43999672252` at exact SHA `b6154c0...` completed:
  - Windows qualification: tests PASS, Clippy with warnings denied PASS, release build PASS, selected Node integration/regression suite PASS, hash/upload PASS.
  - macOS qualification: the same source/build/integration chain PASS.
  - Ubuntu qualification: the same source/build/integration chain PASS.
- The overall workflow conclusion is red only because the separate `windows-production-signing-gate` failed closed with exact error `WINDOWS_PRODUCTION_SIGNING_NOT_CONFIGURED`. Readback showed both `WINDOWS_CODE_SIGNING_CERTIFICATE_PFX` and `WINDOWS_CODE_SIGNING_CERTIFICATE_PASSWORD` empty. No unsigned artifact was represented as production-signed.
- Real Device Bridge discovery currently lists `pc-primary`, `phone-fold6`, `LDB-04ff1b33-8a70-434c-9aba-8752a30789ee`, `pc-hp-secondary`, and `phone-apple-iphone` as trusted registry identities with reachability `NOT_PROBED`. `pc-primary` capability readback verifies ordinary Windows process/file/window/voice capabilities, but the Bridge does not yet expose a named GPU-compute execution capability.
- Further Fold6, iPhone, and HP capability probes in this segment were not executed because the external approval-review service reached its usage limit. That boundary is not a device rejection and is not physical-device evidence.
- **Scoped physical evidence admitted:** OS-mediated Vulkan and D3D12 command submission on the local NVIDIA discrete GPU, fixed-buffer readback, 256-lane CPU differential evaluation, exact/tolerance distinction, deterministic hashes, and three-OS source/build/integration qualification.
- **Not verified or claimed:** physical Metal execution, Android GPU execution, HP GPU execution, Device Bridge-routed GPU execution, PCIe MPS register state, MMIO, DMA, zero copy, thermal improvement, sustained CPU/RSS performance, Formula decision, independent Veritas verdict, canonical Receipt Authority record, Learning Ledger admission, Windows Authenticode production signing, or production release.
- `canonicalReceiptIssued` remained `false` for every native-compute probe.

#### CHECKPOINT → CONTINUE

Phase 3 is qualified at local physical D3D12/Vulkan evidence and three-OS source/build scope. The next canonical gate is not another GPU abstraction: expose the bounded native-compute request/evidence envelope as a registry-authorized Device Bridge capability, route one observation-bound request through the real Bridge to an enrolled node, and submit the returned evidence through the existing Formula → Veritas → Receipt Authority → Learning Ledger chain. Apple Metal, Android Vulkan, and HP execution remain independent physical gates; no platform inherits another platform's pass.

### DEVICE BRIDGE NATIVE-COMPUTE ROUTING GATE — 2026-11-16T20:14:00-06:00

- **Commit:** `4fa6407430cccaa3213416380e77709f9b7a27f0` (`feat(bridge): route bounded native gpu compute`), pushed to `origin/repair/universal-relay-20261116`.
- Added strict `gpu.compute.native.probe` protocol input: exactly 256 finite normalized lanes. No executable, shader, address, backend, buffer size, or device ID can be supplied inside capability arguments.
- Added a host-injected `nativeComputeProviders` map. A provider is bound by trusted startup code to a configured device; it is never parsed from config JSON or an MCP request.
- Added a fixed-binary provider that invokes only `compute-native-probe`, bounds stdin/stdout and time, and rejects nonzero exit, malformed evidence, non-256 results, tolerance failures, or a provider claiming it minted a canonical receipt.
- Desktop discovery advertises the capability only when that host provider is present. Existing Bridge grant, Formula/Veritas admission, live discovery recheck, compliance-card policy, and pre/post evidence remain in front of execution.
- Focused native-compute/runtime tests: **10/10 PASS**. Full MCP regression with required localhost access: **189/189 PASS**. The first sandboxed full run produced loopback `EACCES`; rerunning the identical suite with localhost permission cleared all 37 environment-caused failures.
- Physical provider-bound execution against `target/release/leeway-core.exe`: D3D12, `NVIDIA GeForce RTX 5060 Laptop GPU`, `DiscreteGpu`, 256 lanes, exact mismatches **10**, tolerance mismatches **0**, maximum error `2.3841858e-7`, tolerance `1e-6`, and `canonicalReceiptIssued: false`.
- Exact-SHA CI: Portable protocol/MCP run `44000926775` **PASS** across Windows/macOS/Ubuntu; Apple run `44000926781` **PASS**; Android run `44000926771` **PASS**; portable-core run `44000926772` passed all Windows/macOS/Ubuntu qualification jobs. Its separate production-signing job failed at the unchanged credential-custody gate.
- **Current evidence boundary:** source, tests, cross-platform CI, and local host-provider physical execution are established. A deployed authenticated MCP call through the real Device Bridge to an enrolled device has not yet executed this capability. Formula decision, independent Veritas, canonical Receipt Authority, and Learning Ledger admission remain open.
- **Next executable action:** bind `NativeComputeProvider` into the canonical host composition for the enrolled primary node, add the capability to that device's owner grant, restart only the owning Bridge process, confirm discovery, execute one authenticated MCP call, then carry its returned evidence through Formula → Veritas → Receipt Authority → Learning Ledger. Repeat physical execution independently for HP, Android, and Apple adapters.
