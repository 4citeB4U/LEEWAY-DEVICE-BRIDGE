# Issue #37 — Authenticated Android provisioning HTTP route — 2026-10-18

## Investigate / Diagnose
Previous Fold6 read-only observation established native installed Device Bridge user-0 version 23 but no running loopback service at 127.0.0.1:5323. PR #38 had a read-only RemoteCommandRouter capability, but no HTTP path. LocalBridgeServer already protects read-only endpoints after agent-access and Bearer token checks.

## Plan / Implement
Added `GET /provisioning/plan` to the EXISTING `LocalBridgeServer` protected route map **after** the `LocalAuthority.agentAccessEnabled` (403) and `BridgeSecret.matches` (401) checks. It invokes `AndroidTrustedProvisioningObservation.capturePlan(context)`; caller query parameters cannot supply GPU certification or authorization. Native capture is DevicePassport + PackageInstallBroker.status. NO new server, registry or signing material.

Added `AndroidProvisioningHttpContractTest`: local Formula eligibility is not canonical Formula execution; missing governance is blocked; missing GPU evidence keeps CPU fallback and disables automatic install.

## Test / Validate / Verify
Isolated clean branch checkout; JDK17, Android SDK, Gradle 8.9.
`gradle -p apps/android :app:testDebugUnitTest --tests '*AndroidProvisioningHttpContractTest' --tests '*AndroidTrustedObservationContractTest' --tests '*AndroidProvisioningRouteContractTest' --tests '*AndroidProvisioningCompatibilityTest' --tests '*AndroidInstallPlanTest' --no-daemon --console=plain`
Result: BUILD SUCCESSFUL in 19s; 22 tasks (5 executed, 17 up-to-date).
Generated JUnit XML:
- AndroidInstallPlanTest: 7/7
- AndroidProvisioningCompatibilityTest: 6/6
- AndroidProvisioningHttpContractTest: 3/3
- AndroidProvisioningRouteContractTest: 4/4
- AndroidTrustedObservationContractTest: 3/3
TOTAL **23/23 PASS**, 0 failures, 0 errors, 0 skipped.

## Acceptance boundaries
These are JVM contract tests, **not** physical HTTP tests of 401/403 behavior, not installed APK acceptance and not verified GPU compute. Physical Fold6 installed v23 remains unchanged; endpoint only exists on review branch pending approved deployment. No bearer credentials were accessed or printed. Formula central execution NOT_EXECUTED. No canonical Veritas receipt and Learning Ledger unchanged.

## Next engineering gate
Add isolated HTTP integration tests with fake local authority/secret adapters, checking /health availability, 403 for disabled agent access, 401 for absent/bad token, 200 with correct token, and that query-injected claims cannot change a plan. Then qualify owner-approved test APK before physical invocation. Do not use owner-bootstrap to obtain pairing tokens for a test.
