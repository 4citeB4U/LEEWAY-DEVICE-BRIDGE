# Issue #37 — Production HTTP processor socket integration — 2026-10-18

## Investigate / diagnose
Earlier mock-only socket fixture tested TCP I/O but not the processor invoked by production LocalBridgeServer. Server held private inline HTTP parsing, credential ordering, endpoint routing and response serialization.

## Implement
Extracted **LocalBridgeHttpHandler.serve(Socket, Dependencies)** and changed existing LocalBridgeServer.handle(Context, Socket) to invoke it. Production dependencies continue to call LocalAuthority.agentAccessEnabled, BridgeSecret.matches, native AndroidTrustedProvisioningObservation.capturePlan, status, bootstrap, existing read-only routes and ReceiptStore. No new listener or trust root. Legacy owner-bootstrap route is still delegated to its pre-existing authorized handler.

Added LocalBridgeHttpHandlerIntegrationTest: genuine ephemeral localhost TCP exchange against the **same processor production invokes**, but with injected fake authorization/capture dependencies. Eight cases: disabled 403; missing token 401; invalid token 401; valid 200 with CPU fallback; query claims ignored; POST 405; unknown path 404 after auth; /health 200 without auth.

## Test / Validate / Verify
Clean isolated PR #38 clone, JDK17, Android SDK, Gradle 8.9:
`gradle -p apps/android :app:testDebugUnitTest --tests '*LocalBridgeHttpHandlerIntegrationTest' --no-daemon --console=plain`
Result BUILD SUCCESSFUL in 19s, 22 tasks, process exit 0. Generated JUnit XML: tests=8, failures=0, errors=0, skipped=0.

## Important boundary
Unlike previous mocked socket handler, this test runs the **production HTTP processor**, with **injected fake dependency callbacks**, not real Device Bridge Context/BridgeSecret/token, nor physical Fold6. It does not prove installed device route or Android credential-store behavior. Other prior suites were not rerun in this specific invocation; full combined regression still needed. No phone app installed or changed.

## Next
Run all existing Android unit suites for regression; add negative cases for malformed headers, request limits and bootstrap invariants; then qualify owner-approved physical test build with independent package/signature/launch and authenticated route observation. Canonical Formula NOT_EXECUTED, GPU provider NOT QUALIFIED, no Veritas receipt / Learning Ledger update.
