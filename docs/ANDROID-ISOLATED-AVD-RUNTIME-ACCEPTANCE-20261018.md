# Issue #37 — Isolated Android 35 AVD boot and APK runtime — 2026-10-18

## Investigate / Build / Test
The isolated SDK `E:\LeeWay-Work\evidence-staging\issue37-android-emulator-sdk` completed installing Android emulator 37.2.12 and `system-images;android-35;default;x86_64` revision 2. SDK manager list_installed confirmed both packages; `system.img` exists at 1,622,147,072 bytes. Initial avdmanager invocation from the primary SDK incorrectly did not discover the isolated image; copying SDK command-line tools into the isolated root and invoking it there resolved package recognition.

Created test AVD `LeeWay_Issue37_API35` in `E:\LeeWay-Work\evidence-staging\issue37-avd`; no default AVD was replaced.

Started emulator with `-port 5580 -no-window -no-audio -no-snapshot -gpu swiftshader_indirect -no-boot-anim`. WHPX detected operational; guest uses SwiftShader **software Vulkan**, NOT the Fold6 Adreno GPU, so emulator execution cannot qualify physical hardware acceleration.

## Verified runtime
`adb devices` reported `emulator-5580 device` alongside separately identified physical Fold6. Guest Android API 35 and `sys.boot_completed=1`; boot animation stopped; x86_64 model.

Installed isolated PR #38 review `app-debug.apk` using **explicit emulator-5580 selector only**: ADB `Performing Streamed Install / Success`; installed `industries.leeway.devicebridge` versionCode 23, versionName `0.9.8-pocket-rc8`. Started `MainActivity`; Android logs reported activity displayed and process PID 2361.

## HTTP gate
Temporarily forwarded **emulator only** local host port 15580 to guest 5323 and attempted unauthenticated `GET /health`; connection closed without HTTP response. The app process was running but this did NOT establish a running LocalBridgeServer socket. Forward was removed. We did **NOT** trigger `/owner-bootstrap`, generate/copy production pairing tokens, enable agent access, or test a fabricated 200 response. `GET /provisioning/plan` production runtime remains **UNVERIFIED/BLOCKED** until a separately verified test-only bridge startup/authority path is available.

## Acceptance status
SDK_IMAGE PASS; AVD_CREATE PASS; AVD_BOOT PASS; ISOLATED_APK_INSTALL PASS; MAIN_ACTIVITY_LAUNCH PASS; AUTHENTICATED_RUNTIME_HTTP NOT_VERIFIED; CANONICAL_FORMULA NOT_EXECUTED; GPU_QUALIFICATION NOT_VERIFIED.

## Safety
Physical Fold6 production Device Bridge, Pocket, permissions, signing state and GPU unchanged. Previously complete Android JVM regression 71/71 PASS. No canonical Veritas receipt or Learning Ledger update. Keep PR #38 draft pending actual authorized emulator transport and receipt checks.
