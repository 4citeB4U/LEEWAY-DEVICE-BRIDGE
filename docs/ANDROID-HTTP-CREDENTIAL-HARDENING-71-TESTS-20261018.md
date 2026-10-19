# Issue #37 — HTTP credential/header hardening and 71-test regression — 2026-10-18

## Investigate / Diagnose
Production-invoked LocalBridgeHttpHandler accepted multiple Authorization headers (last value won), accepted Content-Length/Transfer-Encoding on otherwise read-only GET paths, and could throw IllegalArgumentException from malformed percent-escaped /owner-bootstrap nonce parameters.

## Implement
On draft PR #38:
- Count Authorization headers and fail closed with HTTP 400 when more than one occurs.
- Deny any Content-Length or Transfer-Encoding header in the GET-only loopback handler (HTTP 400) to prevent ambiguous body semantics.
- Catch invalid query escaping around owner-bootstrap nonce decoding and return HTTP 400 BAD_QUERY_ENCODING without invoking the bootstrap provider.
- Add five localhost socket integration tests using the **actual production-invoked** LocalBridgeHttpHandler, with controlled authorization callbacks: duplicate auth, GET Content-Length, GET Transfer-Encoding, malformed bootstrap percent escape, normal valid authenticated read.

## Test / Validate / Verify
Executed full unfiltered `:app:testDebugUnitTest --no-daemon --console=plain` from clean isolated Windows review clone, Gradle 8.9 / JDK17 / Android SDK.
`BUILD SUCCESSFUL in 14s`; 22 tasks (5 executed, 17 up-to-date). Parsed every TEST-*.xml result:
**17 suites, 71 tests, 0 failures, 0 errors, 0 skipped**.

## Limitations
This is the complete Android JVM regression and localhost production-processor socket coverage, not device-native credentials, actual installed Fold6 version-23 HTTP service, canonical Formula execution, signed-test APK or GPU correctness. A follow-up production security review should check ambiguous non-colon headers and authorization scheme formatting, and protect bootstrap query decoding limits. No owner-bootstrap was called on a real device.

## Next
Qualify build and signature compatibility for a separately authorized test APK, inspect the actual Android credential provider in an isolated instrumentation environment, then require explicit owner authorization before deploying a test build. Do not replace the active production Fold6 APK. No canonical Veritas receipt or Learning Ledger update.
