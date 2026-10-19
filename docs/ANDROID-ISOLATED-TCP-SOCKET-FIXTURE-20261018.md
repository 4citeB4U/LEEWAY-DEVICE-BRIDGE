# Issue #37 — Isolated Android provisioning TCP socket fixture — 2026-10-18

## Investigate
The real Android LocalBridgeServer handles GET paths and local authorization in a private handle(Context, Socket). JVM unit tests previously proved authorization decision logic but not socket I/O. Production handler needs Android Context/LocalAuthority/BridgeSecret and is not directly exercised by a plain JVM socket fixture.

## Implement
Added test-only `ProvisioningSocketFixture.kt` under `apps/android/app/src/test`: binds ephemeral `127.0.0.1:0`, uses a single TCP GET exchange with lightweight deterministic responses and the **same pure LocalBridgeReadAuthorization.evaluate decision**, and excludes `/owner-bootstrap`. Added six socket tests: 403, 401, 200, query-injection invariance for an explicitly fixed CPU-fallback plan, 405 for unsupported method, 200 fixture health. The fixture does **not** reuse production LocalBridgeServer.handle(), real BridgeSecret credential check or actual AndroidTrustedProvisioningObservation.

## Test / Validate / Verify
Isolated clean review checkout; Gradle 8.9, JDK17, Android SDK:
`gradle -p apps/android :app:testDebugUnitTest --tests '*ProvisioningSocketFixtureTest' --tests '*LocalBridgeReadAuthorizationTest' --no-daemon --console=plain`
`BUILD SUCCESSFUL in 13s`; 22 tasks (2 executed, 20 up-to-date). XML evidence:
- `ProvisioningSocketFixtureTest` 6/6 PASS, zero errors/failures/skips.
- `LocalBridgeReadAuthorizationTest` 4/4 PASS, zero errors/failures/skips.
Total **10/10 focused tests PASS**; earlier 27/27 focused suite not rerun in this command.

## Crucial limitation
These are **real localhost socket bytes but a mocked HTTP handler**. They do not prove the production LocalBridgeServer 403/401/200 implementation, actual credentials, device service reachability, or the new Android provisioning endpoint running on Fold6. Avoid upgrading fixture status to production integration PASS. Next refactor the actual protocol handler into injectable native request/response seams or add instrumentation against real LocalBridgeServer, then test denied/authorized behavior with controlled test credentials; keep credential secrets undisclosed.

## Authority / safety
Issue #37 master; PR #38 draft. Fold6 installed Device Bridge v23 untouched, no APK install, permissions, GPU activation, Android security changes or Apple J-7 changes. Formula NOT_EXECUTED; no canonical Veritas receipt or Learning Ledger update.
