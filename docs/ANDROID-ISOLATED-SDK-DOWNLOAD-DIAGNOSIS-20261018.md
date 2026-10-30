# Issue #37 — Isolated emulator SDK download diagnosis (2026-10-18)

## Investigate
The normal Android SDK contains accepted `licenses/android-sdk-license`, Android SDK command-line tools, and platform-tools, but no emulator binary, system image or AVD. The first isolated emulator installation did not populate the isolated SDK root. The isolated SDK root lacked pre-existing license records.

## Implement / Diagnose
Copied the **already accepted** license record from normal SDK into `E:\LeeWay-Work\evidence-staging\issue37-android-emulator-sdk\licenses`. No new terms were accepted. Used the existing sdkmanager tool with an explicit `--sdk_root` pointing solely to evidence-staging. Redirected installer diagnostics to `E:\LeeWay-Work\evidence-staging\issue37-emulator-sdk-install.log`.

## Observed evidence
The installer progressed through local and remote repository metadata, found the advertised Android emulator archive, and started downloading `emulator-windows_x64`. The captured log progressed to **13% of the overall SDK manager operation**. This demonstrates repository discovery and attempted download, **not** completed emulator installation. The SDK manager process was explicitly stopped after collecting diagnostics; no SDK emulator binary or Android 35 system image had appeared. No AVD was created/booted, and no test APK was installed.

## Diagnosis
The missing isolated-root license files were a plausible contributing cause of the earlier run, but they are **not established as the sole cause** of the incomplete emulator setup. Download was seen progressing, so network download was not totally blocked, but transfer completion and unpacking remain unverified. A reliable longer-running, authorized SDK provisioning session is still needed.

## Next
Re-attempt or resume emulator and Android 35 x86_64 system image acquisition with explicit log collection and enough time for the download to complete, verify both installations and the emulator check-accel output, then create a separate AVD. Do not change the installed Fold6 application, authority, pairing or GPU settings.

## Prior acceptance
PR #38 review APK built and signed; 71/71 Android JVM unit tests PASS; installed Fold6 signer compatibility UNKNOWN. Canonical Formula NOT_EXECUTED; no physical provisioning, canonical Veritas receipt or Learning Ledger update.
