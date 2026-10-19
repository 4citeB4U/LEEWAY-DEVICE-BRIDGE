# Issue #37 — Native-only Android provisioning observation gate — 2026-10-18

## Investigate / Diagnose
The `device.apps.install.plan` route previously captured the native Android passport inline. That path did not accept caller-supplied GPU qualification, but a dedicated boundary makes the data source and absence of verified GPU evidence explicit. Previous focused unit suites passed 17/17.

## Plan / Implement
Added `AndroidTrustedProvisioningObservation.capturePlan(context)` as a read-only local entrypoint. It calls `DevicePassport.capture(context)`, then `AndroidProvisioningCompatibility.evaluate(passport, null, null)`, attaches `PackageInstallBroker.status(context)`, and labels `passportOrigin=DEVICE_BRIDGE_CAPTURED_AT_REQUEST` and `gpuEvidenceOrigin=NO_VERIFIED_GPU_RECEIPT`. Updated `RemoteCommandRouter` to use this function for `device.apps.install.plan`. No remote arguments are passed into the trusted observation; no GPU receipt is invented.

Added three JVM contract tests covering route registration, spoofed GPU authority rejection at evaluator level, and local Formula-shaped eligibility not being mistaken for canonical Formula execution.

## Test / Validate
In isolated review checkout, JDK17, Android SDK and Gradle 8.9 ran `:app:testDebugUnitTest` filtered to four installation/provisioning suites. `BUILD SUCCESSFUL in 20s`, 22 tasks (5 executed, 17 up-to-date). Generated JUnit XML inspected individually:
- AndroidInstallPlanTest: 7/7
- AndroidProvisioningCompatibilityTest: 6/6
- AndroidProvisioningRouteContractTest: 4/4
- AndroidTrustedObservationContractTest: 3/3
**20/20 PASS**, 0 errors/failures/skips.

## Verify / boundary
The native entrypoint was compiled but **not executed through a live Android transport** or Android instrumentation. The label `DEVICE_BRIDGE_CAPTURED_AT_REQUEST` is a source-description field, not a cryptographic attestation. A local developer or malicious caller who constructs their own JSON can still spoof these string labels outside the constrained route; production qualification must bind actual observation IDs to a trusted source and verified GPU receipts. No physical install, GPU modification, or performance acceptance.

## Next acceptance
Read-only physical device observation via the already authorized bridge, with observer identity, timestamp, platform and device capability evidence; then verify on-device plan behavior on a controlled test APK before separate owner-approved installation. Central Formula NOT_EXECUTED, no canonical Veritas receipt/Learning Ledger update.

## Scope
Existing Device Bridge broker and Runtime Fabric authority unchanged. Fold6 production APK, Windows drivers and J-7 Apple delivery untouched.
