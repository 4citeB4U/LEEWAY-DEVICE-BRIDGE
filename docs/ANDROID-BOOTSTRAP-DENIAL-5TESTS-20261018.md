# PR #38 — Emulator consent denial and nondisclosure acceptance — 2026-10-18

## Implementation
Introduced `BootstrapDenialUiTest.kt` as an Android instrumented UI test; added the AndroidX UI Automator 2.3.0 test dependency. Commits: `163b03a628f5d803fc913ae223de78950ca5c211`, `04bedb506a0fca33c49bf8b8de9fd77787a12893`.

## Actual emulator-only acceptance
- Built `:app:assembleDebugAndroidTest :app:testDebugUnitTest`: **BUILD SUCCESSFUL in 28s** (50 tasks, 12 executed, 38 up-to-date). JVM task up-to-date; the last fully enumerated JVM suite remains 71/71 PASS.
- Installed the new Android test APK on the explicit isolated Android 35 emulator `emulator-5580`; `BootstrapDenialUiTest` returned **OK (1 test)**, 3.071s.
- The test starts the exported `MainActivity` with a syntactically valid emulator-only nonce, observes the DENY consent action, asserts agent access remains disabled while waiting and after DENY, sends a local GET /owner-bootstrap?nonce request, asserts HTTP 401 and no pairingToken field, and restores authority/bridge state.
- Ran the **entire installed Android instrumentation suite**: `OK (5 tests)`, 2.888s (1 consent-denial + 4 native authorization, replay, expiry and lifecycle tests).

## Critical distinction
This is exported-activity-style invocation from Android instrumentation using targetContext, **NOT an independently installed untrusted third-party Android UID**. It verifies consent and denial state, not caller authenticity or same-signer authority. The exported `TERMUX_BOOTSTRAP` still has no cryptographically trusted caller identity check, and authorized bootstrap consumption returns a persistent `pairingToken` over Android loopback. Owner consent mitigates but does not substitute for authenticated IPC. Do not mark trusted-caller security clearance PASS.

## Remaining
Independent third-party caller/UID negative tests, stronger trusted-caller identity and credential-scope design, submitted independent security approval. No production Fold6 touch. Keep PR #38 draft, Formula and Veritas acceptance still pending.
