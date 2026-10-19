# Issue #37 — Isolated Android emulator install resumed, acceleration qualified — 2026-10-18

## Execution
Resumed official Android SDK package installation into the **isolated** root `E:\LeeWay-Work\evidence-staging\issue37-android-emulator-sdk`, using previously accepted Android SDK license records. Diagnostic log: `E:\LeeWay-Work\evidence-staging\issue37-emulator-sdk-resume.log`.

## Verified progress
- Emulator package archive download and extraction progressed successfully and `emulator/emulator.exe` exists in the isolated SDK root.
- Real executable test `emulator.exe -accel-check` reported **WHPX(10.0.26200) is installed and usable**.
- The SDK manager continued to Android 35 default x86_64 system-image download; most recent observed SDK manager overall progress was **57%**, with `system-images/android-35/default/x86_64/system.img` not yet present.
- No AVD was created, no emulator was booted and no PR #38 APK installed.

## Status
EMULATOR_BINARY_PRESENT; WHPX_ACCELERATION_PASSED; ANDROID_35_SYSTEM_IMAGE_PENDING; BOOT_NOT_EXECUTED; NATIVE_HTTP_TEST_NOT_EXECUTED.

## Next acceptance
Confirm successful SDK install exit, verify image and package metadata, create isolated AVD in staging (not user-default AVD folder), boot on a separate emulator ADB serial and only there install the PR #38 debug APK. Validate authenticated read-only provisioning route without copying owner credentials from the Fold6.

## Protected state
Production Fold6 Device Bridge v23, its pairing and permissions, Runtime Fabric, GPU settings and Apple J-7 unchanged. Full Android JVM suite previously 71/71 PASS. Installed Fold6 APK signing compatibility still UNKNOWN. Canonical Formula NOT_EXECUTED; no canonical Veritas receipt or Learning Ledger update.
