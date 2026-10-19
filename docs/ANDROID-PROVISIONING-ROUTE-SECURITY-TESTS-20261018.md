# Issue #37 — Android provisioning route contract security tests (2026-10-18)

## Investigate
Read existing RemoteCommandRouter route for device.apps.install.plan, FormulaF8Gate and AndroidProvisioningCompatibility on draft PR #38. Identified missing route registration and denial-path coverage in existing JVM tests.

## Diagnose / Plan / Implement
Added AndroidProvisioningRouteContractTest.kt with four focused tests: capability registered; local Formula-shaped gate denies missing governance; gate denies missing first-seen/replay condition; a spoofed GPU observation authority cannot qualify the provider or authorize GPU/installation.

## Test / Validate / Verify
In isolated, clean Windows branch clone using Gradle 8.9/JDK17/Android SDK:
:app:testDebugUnitTest --tests '*AndroidProvisioningRouteContractTest' --tests '*AndroidProvisioningCompatibilityTest' --tests '*AndroidInstallPlanTest' --no-daemon --console=plain
BUILD SUCCESSFUL in 17s. 22 actionable tasks (2 executed, 20 up-to-date).
JUnit XML checked:
- AndroidInstallPlanTest: 7 tests / 0 failures / 0 errors / 0 skipped.
- AndroidProvisioningCompatibilityTest: 6 tests / 0 failures / 0 errors / 0 skipped.
- AndroidProvisioningRouteContractTest: 4 tests / 0 failures / 0 errors / 0 skipped.
TOTAL: 17/17 PASS, 0 failures/errors/skips.

## Known test boundary
JVM tests of route registration, local Formula-shaped gate and spoofed data evaluator are not a runtime instrumentation test of RemoteCommandRouter.execute end-to-end, not a test of Android transport authorization, and not a live Fold6 device observation. No actual package install, GPU configuration, speedup or Canonical Formula execution was performed.

## Next smallest
Add a testable trusted-observation projection boundary to avoid mistaking JSON authority strings as verified receipts; obtain a read-only physical Android Device Bridge observation via existing authorized transport without installing/updating production app. Any live testing of this newly added route needs a separately approved test deployment, not an assertion that already installed build contains it.

## Engineering authority
Issue #37 master; draft PR #38 review; existing PackageInstallBroker preserved. No production or J-7 changes. No canonical Veritas receipt or Learning Ledger update.
