# Issue #37 — Android Installation Adapter increment (2026-10-18)

## Investigate / reuse first
Existing `apps/android/app/src/main/java/industries/leeway/devicebridge/PackageInstallBroker.kt` already implements HTTPS download, APK staging in private cache, SHA-256 verification, Android `FileProvider` installer handoff and handoff-only receipt. `RemoteCommandRouter.kt` exposes `device.apps.install.status` and `device.apps.install` and gates them with local eligibility. The Android manifest already requests `REQUEST_INSTALL_PACKAGES` and declares the `FileProvider`. No parallel broker or runtime/registry is permitted.

## Diagnose
Issue #37 has a proposed Probe → Classify → Plan → Preflight → Owner authorization → Install → Verify → Receipt path. Current Android execution exists, but it lacks a separately testable, side-effect-free, fail-closed installation plan. Existing `INSTALLER_OPENED` does not verify installation or launch. This increment builds a plan component without allowing caller-supplied flags to grant runtime authority.

## Implementation
New pure `AndroidInstallPlan.kt` with `Input(platform,url,sha256,installerAvailable,ownerApproval)` and deterministic `Decision(state,code,mechanism,mayHandoff)`. Unknown/non-Android, non-HTTPS source, malformed hash, unavailable installer, and missing approval fail closed. A ready plan returns `READY_FOR_BROKER_PREFLIGHT`, **never** `INSTALLED`. This is a dry-run planning contract, not a new installer or remote capability.

New `AndroidInstallPlanTest.kt` contains seven JUnit cases: readiness without install claim, non-Android, unknown OS, HTTP rejection, missing digest, unavailable installer, no owner approval.

## Test / validation
Source/tests created on isolated review branch. Workstation inventory found Java 17, but no `gradle` or `kotlinc` executable on PATH; no Android compile/unit-test run was completed. Seven cases are **authored, not PASS**. No APK build, install, screen action, phone permission change, or runtime integration has been attempted.

## Next step
On qualifying Android build runner, run `testDebugUnitTest`. Then integrate a read-only plan endpoint against **device-observed** installer capabilities, with actual owner consent checked by canonical authority at execution time. Keep `PackageInstallBroker` as the single Android installer, route only after eligibility is validated, verify installed package/version/signature and launch in a separate device acceptance run, and produce Veritas ingress/egress receipts. Do not allow an input boolean to authorize an install. Only then attempt owner-approved physical install.

## Boundaries
Issue #37 design contract remains master. No production APK, iLoader, Apple signing, Android security settings, driver, personal data, GPU inference or J-7 mutations. RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
