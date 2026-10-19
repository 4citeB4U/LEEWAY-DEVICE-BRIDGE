# Issue #37 — Full Android JVM regression checkpoint — 2026-10-18

## Investigate / Test
Using the clean isolated PR #38 checkout at `E:\LeeWay-Work\evidence-staging\device-bridge-issue37-android-preflight-20261018`, ran the **entire unfiltered** Android unit suite with JDK17, Android SDK and isolated Gradle 8.9:
`gradle -p <checkout>/apps/android :app:testDebugUnitTest --no-daemon --console=plain`

Process exit 0; `BUILD SUCCESSFUL in 10s`; 22 actionable Gradle tasks (1 executed, 21 up-to-date). All suites were discovered and run, not merely selected tests.

## Validate / Verify
Parsed all generated `TEST-*.xml` reports: **15 suites, 61 tests, 0 failures, 0 errors, 0 skipped**.
- AgentLeeBehaviorRuntimeTest 5
- AndroidInstallPlanTest 7
- AndroidProvisioningCompatibilityTest 6
- AndroidProvisioningHttpContractTest 3
- AndroidProvisioningRouteContractTest 4
- AndroidTrustedObservationContractTest 3
- CapabilitiesEncodingTest 1
- ConversationPromptTest 5
- CreatorIdentityReplyTest 3
- FormulaF8GateTest 2
- InferenceGuardTest 1
- LocalBridgeHttpHandlerIntegrationTest 8
- LocalBridgeReadAuthorizationTest 4
- PocketCommandPolicyTest 3
- ProvisioningSocketFixtureTest 6

## Remaining boundaries
The eight socket integration cases exercise the **production-invoked HTTP processor** with fake injected authority and observation providers, not Android's actual BridgeSecret implementation or the Fold6 runtime. No malformed oversized-header or incomplete-request robustness tests have yet been accepted; production physical HTTP deployment and GPU physical correctness remain pending.

## Next smallest
Extend actual processor negative tests (incomplete headers, invalid request target, oversized request/headers, malformed URL escaping, wrong authorization scheme) and repair fail-closed behaviors before an owner-approved test APK. Preserve the installed production Fold6 Device Bridge, prior Android Pocket and Apple J-7 state.

## Governance
Formula canonical NOT_EXECUTED; no physical device install, GPU provider changes, canonical Veritas receipt or Learning Ledger mutation. Issue #37 authority; PR #38 remains draft.
