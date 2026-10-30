# Issue #37 — Review APK signature and runtime test environment inspection — 2026-10-18

## Investigate
The PR #38 review APK was built in the isolated Windows checkout with SHA-256 `2455fdbfde54e696023a96717b3369ad16221800d437afd75c88a801ae4d87d8`. Installed Fold6 user-0 Bridge metadata remains versionCode=23, versionName=0.9.8-pocket-rc8.

## Inspect and verify
Ran Android SDK build-tools 34.0.0 `apksigner verify --print-certs` against review APK (no device mutation). Command succeeded. Review signing certificate:
- Subject: `C=US, O=Android, CN=Android Debug`
- SHA-256 certificate digest: `bd8cfff73383416d6c35d96617c49d53df4dc1610e6ea44e55b5b5c04836fce1`.

Read-only `adb shell dumpsys package industries.leeway.devicebridge --user 0` exposed installed package `apkSigningVersion=2` and Android PackageSignatures internal labels, **not a comparable certificate SHA-256 digest**. Therefore installed-vs-review certificate equality is UNKNOWN.

Android SDK paths checked for emulator binary and system images; none surfaced from that specific installation. `where emulator` and `where avdmanager` returned no path. This establishes only that an emulator was not found in the checked environment, not that other test environments do not exist.

## Decision
**Review APK SIGNATURE_VERIFIED; IN_PLACE_UPDATE_SIGNATURE_COMPATIBILITY_UNVERIFIED.** Do not replace production Fold6 APK. Review signer is Android Debug and may not match the installed package signer. No APK pull, install, removal, credential extraction or permission changes occurred.

## Next controlled option
Use an approved Android test device/emulator or owner-authorized metadata comparison with a comparable installed certificate digest and signature-chain continuity; then isolate runtime test identity to avoid production app data mutation. Canonical Formula NOT_EXECUTED; no canonical Veritas receipt, GPU qualification or Learning Ledger update.
