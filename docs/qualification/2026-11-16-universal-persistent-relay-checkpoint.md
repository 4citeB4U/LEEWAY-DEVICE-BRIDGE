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
