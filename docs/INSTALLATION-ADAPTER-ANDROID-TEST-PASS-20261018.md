# Issue #37 Android installation preflight — unit-test acceptance, 2026-10-18

## Investigate
Existing Device Bridge issue #37 / draft PR #38. The previous test was blocked before compilation by cached Gradle 8.4 versus Android Gradle plugin minimum 8.9. The canonical main checkout has 55 dirty entries; it remains untouched. A separate clean branch clone exists at `E:\LeeWay-Work\evidence-staging\device-bridge-issue37-android-preflight-20261018`.

## Diagnose / Plan / Implement
Downloaded official Gradle 8.9 binary ZIP to `E:\LeeWay-Work\evidence-staging\gradle-8.9-bin.zip` (136114148 bytes), read ZIP successfully (305 entries), and expanded only into `E:\LeeWay-Work\evidence-staging\gradle-8.9-isolated`. No repo build-file or Android plugin downgrade.

## Test
With JDK 17 and the installed Android SDK:
`gradle-8.9/bin/gradle.bat -p <isolated-clone>/apps/android :app:testDebugUnitTest --tests '*AndroidInstallPlanTest' --no-daemon --console=plain`
Reported `BUILD SUCCESSFUL in 35s`, 22 executed tasks, exit code 0.

## Validate / Verify
Parsed generated JUnit XML:
`industries.leeway.devicebridge.AndroidInstallPlanTest`: **tests=7, failures=0, errors=0, skipped=0**.
Tests exercise ready-but-not-installed, platform mismatch, unknown platform, insecure HTTP, missing SHA-256, unavailable installer and absent owner approval. Application Kotlin and unit-test Kotlin compilation also completed. Pre-existing Kotlin/WebSocket naming and SDK XML compatibility warnings are not test failures. Isolated clone status clean after run.

## Evidence boundary
These are **JVM unit tests**, not a physical installation, no APK deployment and no verification of installed version, signature, launch or application data retention. `AndroidInstallPlan` remains dry-run only, and cannot be used as self-attested execution permission. Existing Android `PackageInstallBroker` continues to own the OS-authorized installer handoff. Draft PR #38 should not be merged as complete runtime integration until read-only plan ingress, canonical owner authority, and device installation verification are separately accepted.

## Next smallest
Add trusted runtime-observed `device.apps.install.plan` endpoint without installing, unit-test the endpoint; then separately gate any physical install with explicit approval, pinned package/hash and independent Veritas evidence. Preserve existing Fold6 Pocket and Apple J-7 delivery.

## Governance
No phone, driver, security, Apple installation or production binary changes. No canonical Veritas receipt; Learning Ledger unchanged.
