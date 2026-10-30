# PR #38 — Termux bootstrap consent-gate initial repair — 2026-10-18

## Implementation
Modified `MainActivity.kt` `TERMUX_BOOTSTRAP` intent path to reject invalid nonce before any authority side effects, show an explicit non-cancelable owner consent dialog, deny with BLOCKED receipt, and call `LocalBridgeServer.armOwnerBootstrap` only following an affirmative Allow click. The owner-approved original completion and relay behavior now resides in `completeOwnerTermuxBootstrap` helper. This affects the review branch only, not the production Fold6.

Commits: `a9c9d80055ff3dc376b6b5e2de3bf7abac26224a` (initial change), `306cc9e43ffed8910052e2f0b401ed0b68262c22` (fix Kotlin helper scope after initial failed compile).

## Verified
- First build failed due to Kotlin brace/scope error, explicitly fixed before retest.
- `:app:assembleDebug :app:testDebugUnitTest :app:assembleDebugAndroidTest` => BUILD SUCCESSFUL in 21s, 67 actionable tasks (9 executed / 58 up-to-date).
- Parsed JVM XML: **71/71 tests**, 0 failed, 0 errors, 0 skipped.
- Installed newly built review APK and instrumentation APK on **explicit emulator-5580** only; `NativeProvisioningAuthorizationTest` => **OK (2 tests)**, 0.164 seconds.

## Open security gates
**Not yet verified:** actual external untrusted activity invocation with synthetic nonce, denial and replay tests against device, callback-origin/caller identity, concurrency and expiry. An approval dialog lowers unintended authority activation but does not cryptographically identify Termux and could still be socially engineered. Do not label original source-level security finding fully closed. Owner-approved UI consent mechanism must be independently tested, and a signature/provenance-bound IPC design should be considered.

## Boundary
No production Fold6 APK, pairing secret, authority, GPU or software changed; canonical Formula NOT_EXECUTED; no canonical Veritas receipt or Learning Ledger update. PR remains draft.
