# Issue #37 — Android installation preflight test execution evidence — 2026-10-18

## Investigate
Connected Windows workstation has JDK 17, Android SDK, and cached Gradle 8.4. Existing `E:\LeeWay-Work\device-bridge-c34-build` has 55 uncommitted entries and was preserved untouched. Downloaded an **isolated shallow clone** of `issue-37-android-install-preflight-20261018` to `E:\LeeWay-Work\evidence-staging\device-bridge-issue37-android-preflight-20261018`. Git checkout completed, exit 0, clean status.

## Plan and test
Ran:
`gradle-8.4/bin/gradle.bat -p <isolated-clone>/apps/android :app:testDebugUnitTest --tests '*AndroidInstallPlanTest' --no-daemon --console=plain`.

## Diagnose
**Gradle configuration FAILED before any tests ran.** Error from applying `com.android.application` at `apps/android/app/build.gradle.kts:1`:
`Minimum supported Gradle version is 8.9. Current version is 8.4.`
The inspected repo checkout had **no gradle wrapper executable or gradle/wrapper/gradle-wrapper.properties**; user Gradle cache listed only gradle-8.4-bin. There were no test assertion failures because the task never reached tests.

## Repair / retest gate
Do not lower Android Gradle Plugin version or edit production dependencies just to bypass the safety gate. Next use an isolated Gradle 8.9+ distribution, or a GitHub Actions runner provisioned with matching Gradle version; rerun the same seven JUnit tests and record actual PASS/FAIL and log. Do not claim seven tests passed until Gradle reaches them.

## Verify
No Android app built, installed, opened, or modified. No Fold6 package mutation. Prior PR #38 remains DRAFT, pure dry-run preflight added, **7 cases authored / 0 executed**. Existing PackageInstallBroker remains canonical execution mechanism and the installation-result state remains separate from installer handoff.

## Contributor evidence and governance
Issue #37 is installation adapter authority. No duplicate registry or runtime, no Apple J-7/iLoader or Windows GPU change. No canonical Veritas receipt; Learning Ledger unchanged.
