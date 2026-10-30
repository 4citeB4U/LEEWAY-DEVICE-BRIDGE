# Issue #37 — Android debug APK build qualification — 2026-10-18

## Investigate
Compared Android build configuration with installed Fold6 user-0 package metadata. Build declares applicationId industries.leeway.devicebridge, minSdk 29, targetSdk 35, versionCode 23, versionName 0.9.8-pocket-rc8. Previously observed physical Fold6 user-0 installed Device Bridge had same version code/name. Same declared identifiers do NOT imply the binaries or signing certificates match.

## Implement / Build
No source changes; clean isolated PR #38 review checkout using Gradle 8.9, JDK17 and Android SDK:
`gradle -p apps/android :app:assembleDebug --no-daemon --console=plain`
`BUILD SUCCESSFUL in 14s`, 35 tasks (19 executed, 16 up-to-date).
Output `apps/android/app/build/outputs/apk/debug/app-debug.apk`, 66,445,369 bytes, observed local modified time 2026-10-18 20:44:30.

## Hash evidence
Computed local review-APK SHA-256 via Windows certutil:
`2455fdbfde54e696023a96717b3369ad16221800d437afd75c88a801ae4d87d8`

## Signing / deployment boundary
Attempted direct installed APK extraction/signature comparison was blocked by tool safety checks; it was NOT completed. Consequently installed-vs-review APK signing compatibility is **UNVERIFIED**. Do not declare the test APK installable over the existing production package or attempt adb install with replacement. Matching versionCode 23 and app ID is insufficient. Physical Fold6 production package remains unchanged. No auto-install, GPU activation, bootstrap, signing key extraction or permissions changes.

## Next
Use permitted, owner-approved package-signature metadata workflow or separate emulator/test device to verify build identity and provisioning HTTP endpoint; do not overwrite existing installed app on the Fold6. Central Formula NOT_EXECUTED; no canonical Veritas receipt or Learning Ledger update.
