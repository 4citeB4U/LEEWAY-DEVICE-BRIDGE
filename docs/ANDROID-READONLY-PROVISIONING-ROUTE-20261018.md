# Issue #37 — Read-only Android provisioning route integration — 2026-10-18

## Investigate / Diagnose
The native Android `RemoteCommandRouter` is the existing governed ingress. DevicePassport.capture(context) supplies a locally observed passport. Existing PackageInstallBroker.status(context) reads whether Android permits the package to request installation. The compatibility evaluator previously passed six unit tests; AndroidInstallPlan passed seven.

## Plan / Implement
Added `device.apps.install.plan` to `RemoteCommandRouter.remoteQualified`. Its read-only dispatch calls `AndroidProvisioningCompatibility.evaluate(DevicePassport.capture(context), null, null)` and attaches `PackageInstallBroker.status(context)`. Neither caller arguments nor remote flags can populate verified GPU qualification or owner approval. Existing local agent-access governance, first-seen eligibility and FormulaF8Gate still apply. No APK download, installer opening, privileges change or GPU configuration occurs on this route.

## Test / Validate
Clean isolated review checkout fetched commit `24f7d6613ca79b49b16069f6c2d212703ead0d8a`. Using JDK 17/Android SDK and isolated Gradle 8.9, ran `:app:testDebugUnitTest --tests '*AndroidProvisioningCompatibilityTest' --tests '*AndroidInstallPlanTest' --no-daemon --console=plain`. Build successful in 20 seconds, 22 tasks (5 executed, 17 up-to-date). Earlier focused JUnit suites had 13/13 passing cases. This integration build passed, but **no new endpoint-specific mocked/router test** or physical on-device invocation was performed, so don't claim live endpoint acceptance.

## Verify / Evidence
Source integration and compilation PASS; live read-only route NOT EXECUTED; GPU qualification remains UNKNOWN/UNOBSERVED; canonical Formula NOT_EXECUTED; installed package verification and provisioning NOT EXECUTED. Draft PR #38 remains under review.

## Next
Add endpoint-focused tests that prove spoofed input fields cannot change the result and governance denies commands when access is disabled. Then run a read-only physical `device.apps.install.plan` request through the existing authorized Device Bridge transport, compare it to native DevicePassport, and capture observation IDs. Only after real Formula/owner approval consider an install or GPU-provider change.

No Fold6 app installed or changed; no production security settings, iLoader/Apple J-7, Windows GPU drivers or Runtime Fabric mutations. No canonical Veritas receipt or Learning Ledger update.
