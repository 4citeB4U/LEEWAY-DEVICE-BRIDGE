# LeeWay Installation Adapter

## Purpose

The Installation Adapter selects an observed, authorized platform installer for a known package. It is a portable coordinator over existing platform mechanisms. It is not a package manager, signer, credential store, Apple-account substitute, or second LeeWay runtime.

## Current implementation

`operator/installation-adapter.mjs` implements the read-only part of the loop:

1. **Probe** — report the declared platform, expected installer, transport observation, and installer-provider health.
2. **Classify** — fail closed if package hash, transport, provider, signing, profile, device, or entitlement evidence is missing.
3. **Plan** — produce a deterministic dry-run route only after explicit owner approval is represented in the input.

`executeInstallation`, `verifyInstallation`, and `rollbackInstallation` deliberately return `NOT_IMPLEMENTED`. They do not start installers or change device state.

## Existing routes it recognizes

| Target | Observed provider required | Dry-run route |
| --- | --- | --- |
| iPhone / iPad | `iloader`, healthy USB transport, Apple signing and profile facts | `APPLE_ILOADER_USB` |
| Android | `android-package-installer`, healthy authorized handoff | `ANDROID_PACKAGE_INSTALLER_HANDOFF` |
| Windows | `windows-native-installer` | `WINDOWS_NATIVE_INSTALLER` |
| macOS | `macos-native-installer` | `MACOS_NATIVE_INSTALLER` |
| Linux | `linux-native-installer` | `LINUX_NATIVE_PACKAGE_MANAGER` |

The desktop provider routes remain dry-run only until their native adapters are implemented and qualified. The iOS route recognizes iLoader as the current Windows USB fallback; it does not call iLoader or represent SideStore as healthy.

## Apple preflight states

`PACKAGE_HASH_MISMATCH`, `TRANSPORT_NOT_READY`, `ANISETTE_PROVIDER_UNAVAILABLE`, `APPLE_ACCOUNT_AUTH_FAILED`, `SIGNING_IDENTITY_MISSING`, `CERT_EXPIRED`, `PROFILE_MISMATCH`, `DEVICE_NOT_IN_PROFILE`, `ENTITLEMENT_MISMATCH`, and `READY_TO_INSTALL` are separate findings. They are supplied by a future read-only host diagnostic; absent data never becomes a pass.

## Execution boundary

Before an execution adapter may be added, it must preserve the existing package and app data, require a verified package digest, obtain specific user confirmation, and create a post-install verification record. It must never reset credentials, revoke certificates, erase pairing data, uninstall an app, or bypass platform authorization as a recovery step.
