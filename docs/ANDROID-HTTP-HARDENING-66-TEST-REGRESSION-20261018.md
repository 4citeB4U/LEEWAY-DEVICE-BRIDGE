# Issue #37 — Android HTTP bounded-parser hardening and full regression — 2026-10-18

## Investigate / Diagnose
The production-invoked LocalBridgeHttpHandler previously used unbounded readLine for request and headers, accepted structurally malformed first lines, and could wait for incomplete headers until socket timeout. The injected-dependency real-socket processor already had eight passing integration tests; full suite was 61/61.

## Implement
- Added a 4096-character bound for first-line and per-header parsing.
- Validated basic GET/HTTP request line structure with absolute URLs rejected.
- Required completion of the header terminator and bounded header count (40) and combined chars (8192).
- Fail closed with 400 BAD_REQUEST, 400 INCOMPLETE_HEADERS or 431 HEADERS_TOO_LARGE when appropriate.
- Preserved existing authorization checks (LocalAuthority / BridgeSecret), and owner-bootstrap route remains governed by existing dependencies.
- Added 5 real-loopback socket tests against production-invoked LocalBridgeHttpHandler for malformed target, missing header terminator, oversized single header, oversized request line, valid authorized read.

## Test / Validate / Verify
From isolated, clean PR #38 branch checkout using JDK17/Android SDK/Gradle 8.9:
`gradle -p apps/android :app:testDebugUnitTest --no-daemon --console=plain`
Result **BUILD SUCCESSFUL in 15s**, 22 Gradle tasks (5 executed, 17 up-to-date). Parsed all generated TEST-*.xml summaries: **66 tests, 0 failures, 0 errors, 0 skipped**. Prior full regression was 61.

## Known remaining risks
This is bounded JVM processor testing with injected authority/providers, NOT Android on-device credential verification nor a native installed test APK. Follow-up hardening should include duplicate Authorization handling, explicitly rejecting unsupported Transfer-Encoding/Content-Length for GET, and any malformed URI decoding for bootstrap; a reviewer should verify limits and return codes against clients. No claim that GPU compute is qualified or that provisioning runs automatically.

## Authority and state
Issue #37 master, PR #38 DRAFT. No phone APK, permissions, driver, GPU, Apple J-7 or production state changed. Golden Formula NOT_EXECUTED; no canonical Veritas receipt or Learning Ledger update.
