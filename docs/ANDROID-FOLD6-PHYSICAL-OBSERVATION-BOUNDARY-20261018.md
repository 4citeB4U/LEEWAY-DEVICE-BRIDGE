# Issue #37 — Fold6 Android provisioning physical observation boundary — 2026-10-18

## Investigate / Diagnose
Read-only ADB inventory of connected Fold6 showed device attached, Android SDK 37, CPU ABI arm64-v8a, Vulkan hardware identifier adreno. Installed packages include industries.leeway.devicebridge, industries.leeway.pocket and industries.leeway.pocket.test.

Unscoped `dumpsys package` surfaced a permission exception from Android Secure Folder user 150. `pm list users` identified user 0 and user 150. A subsequent explicit user-0 package query returned Device Bridge versionCode=23, versionName=0.9.8-pocket-rc8 and lastUpdateTime=2026-10-17 10:34:21. Package is present under user 0.

## Plan / Test / Validate
Read-only commands only: adb devices, pm inventory, OS and ABI properties, user-0 package query. User-specific permission boundary was respected; no security/permission alterations or Secure Folder inspection pursued.

## Verify
Existing installed native Device Bridge package is version 23. Draft PR #38 contains newly authored device.apps.install.plan native route, but no evidence confirms the installed APK incorporates that route. **No new route invocation, no verified live compatibility response and no new GPU provider qualification.** The observed adreno identifier is not a LeeWay GPU registration claim.

## Next smallest action
Review installed release/source mapping and existing authorized read-only transport, obtain current package/build identity and available capability list without credentials. Then qualify a separate owner-approved test APK/isolated device session for the new route, respecting package signature/data continuity. Do not replace the existing production APK simply to test read-only planning.

## Authority
Issue #37 canonical; draft PR #38 review. No APK install/uninstall, permissions, GPU settings, signing, Apple J-7 or Runtime Fabric mutations. Canonical Formula NOT_EXECUTED; Veritas receipt NOT CREATED; Learning Ledger unchanged.
