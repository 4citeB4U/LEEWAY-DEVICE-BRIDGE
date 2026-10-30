# Issue #37 — Loopback read authorization decision and 27-test gate — 2026-10-18

## Investigate / Diagnose
Existing LocalBridgeServer protected paths apply LocalAuthority.agentAccessEnabled before BridgeSecret.matches, returning 403 disabled, 401 unauthorized, or protected response. New GET /provisioning/plan remains after that boundary. Prior tests were contract-only and did not directly exercise status decisions.

## Implement
Introduced pure `LocalBridgeReadAuthorization.evaluate(agentAccessEnabled, bearerMatches)` returning a status/error decision of 403/401/200. LocalBridgeServer now calls the existing LocalAuthority and BridgeSecret implementations and uses this centralized, testable decision; it does not handle or persist raw tokens in the decision helper. If access is disabled, BridgeSecret.matches is not called. Added four JVM test cases for disabled/credential mismatch/authorized/fully absent credentials.

## Test
In isolated review clone with Gradle 8.9/JDK17/Android SDK ran `:app:testDebugUnitTest` with six filtered suites. BUILD SUCCESSFUL in 21s, 22 tasks (5 executed, 17 up-to-date), process exit 0.
Generated JUnit XML:
- AndroidInstallPlanTest: 7 tests, zero failures/errors/skips
- AndroidProvisioningCompatibilityTest: 6 tests, zero failures/errors/skips
- AndroidProvisioningHttpContractTest: 3 tests, zero failures/errors/skips
- AndroidProvisioningRouteContractTest: 4 tests, zero failures/errors/skips
- AndroidTrustedObservationContractTest: 3 tests, zero failures/errors/skips
- LocalBridgeReadAuthorizationTest: 4 tests, zero failures/errors/skips
TOTAL **27/27 PASS**.

## Validate / Verify boundary
This is a **pure authorization decision unit test**, not an actual socket-level HTTP test against Android LocalBridgeServer. Runtime token verification, GET status, response bodies and spoofed query response equivalence still need integration tests. No installed v23 Fold6 APK was touched. No canonical Formula run, GPU provider qualification, auto-install or live provisioning success.

## Next
Create a testable pure HTTP request routing/authorization core or Android instrumentation fixture, then execute real socket 403/401/200 plus invariance under query-injected claims. Keep /owner-bootstrap outside scope, preserve existing pairing. After that qualify owner-approved physical test build of PR #38. Canonical Formula NOT_EXECUTED; Veritas receipt NOT CREATED; Learning Ledger unchanged.
