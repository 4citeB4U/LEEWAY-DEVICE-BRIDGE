# Issue #37 — Read-only Fold6 signer metadata and isolated test environment recheck — 2026-10-18

## Investigate
Using the connected Windows host and Fold6 ADB, inspected `cmd package help`, `cmd package dump industries.leeway.devicebridge`, Android SDK directory inventory and default Android AVD location.

## Observations
- Fold6 user-0 installed `industries.leeway.devicebridge` remains versionCode 23.
- Android package metadata reports apkSigningVersion 2 and internal PackageSignatures identifiers; it does NOT provide a comparable installed certificate SHA-256 fingerprint.
- Prior verified review APK certificate SHA-256: `bd8cfff73383416d6c35d96617c49d53df4dc1610e6ea44e55b5b5c04836fce1`.
- Android SDK has build-tools, cmdline-tools/latest, platform-tools, platforms, ndk etc.; emulator and system-images folders were not seen.
- No emulator/avdmanager was discovered on the command path; no AVD in checked default user location.

## Decision
Installed vs review signing identity is **UNVERIFIED**; do not attempt in-place overwrite of version-23 Device Bridge. No emulator was available in the locations checked; this does not exhaust every possible host virtualization environment.

## Next
Prepare a completely separate authorized emulator/test deployment, or obtain an owner-approved comparable certificate fingerprint through a permitted metadata route. Existing Fold6 production app, permissions, signing material and GPUs remain unchanged.

## Governance
Canonical Formula NOT_EXECUTED; no physical provisioning, GPU verification, canonical Veritas receipt or Learning Ledger update.
