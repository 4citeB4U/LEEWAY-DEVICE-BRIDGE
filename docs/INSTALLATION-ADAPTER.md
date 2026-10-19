# LeeWay Installation Adapter

## Purpose

The Installation Adapter selects an observed, authorized platform installer for a known package. It is a portable coordinator over existing platform mechanisms. It is not a package manager, signer, credential store, Apple-account substitute, or second LeeWay runtime.

## Current implementation

`operator/installation-adapter.mjs` implements the read-only part of the loop:

1. **Probe** — report the declared platform, expected installer, transport observation, and installer-provider health.
2. **Classify** — fail closed if package hash, transport, provider, signing, profile, device, or entitlement evidence is missing.
3. **Plan** — produce a deterministic dry-run route only after explicit owner approval is represented in the input.

`executeInstallation`, `verifyInstallation`, and `rollbackInstallation` deliberately return `NOT_IMPLEMENTED`. They do not start installers or change device state.

## Windows iLoader observation

`npm run observe:iloader` runs the read-only Windows observer. It reports privacy-reduced booleans and state labels. Only file existence (`localStatePresent`), generic Apple USB presence, process presence, and Apple Mobile Device Service state are observed. `selectedServerStored` and `accountRecordStored` are **null (unknown)**, with `selectedServerObservationState` and `accountRecordObservationState` set to `NOT_OBSERVED`; no account or preference file contents are parsed. Consumers must not interpret unknown as false or as proof that saved settings are absent. It does not return, log, or inspect credential values, pairing material, certificate keys, profile contents, Anisette headers, or iLoader logs.

Generic Apple USB presence is only a diagnostic marker and **does not** prove exact selected-device identity, pairing, or transport readiness. `transport.ready=false` until a trusted target-specific provider is integrated. Apple Mobile Device Service is diagnostic information only because iLoader may use its own mobile-device stack.

## Existing routes it recognizes

| Target | Observed provider required | Dry-run route |
| --- | --- | --- |
| iPhone / iPad | `iloader`, verified exact-device transport, Apple signing and profile facts | `APPLE_ILOADER_USB` |
| Android | `android-package-installer`, healthy authorized handoff | `ANDROID_PACKAGE_INSTALLER_HANDOFF` |
| Windows | `windows-native-installer` | `WINDOWS_NATIVE_INSTALLER` |
| macOS | `macos-native-installer` | `MACOS_NATIVE_INSTALLER` |
| Linux | `linux-native-installer` | `LINUX_NATIVE_PACKAGE_MANAGER` |

The desktop provider routes remain dry-run only until their native adapters are implemented and qualified. The iOS route recognizes iLoader as the current Windows USB fallback; it does not call iLoader or represent SideStore as healthy.

## Apple preflight states

`PACKAGE_HASH_MISMATCH`, `TRANSPORT_NOT_READY`, `ANISETTE_PROVIDER_UNAVAILABLE`, `APPLE_ACCOUNT_AUTH_FAILED`, `SIGNING_IDENTITY_MISSING`, `CERT_EXPIRED`, `PROFILE_MISMATCH`, `DEVICE_NOT_IN_PROFILE`, `ENTITLEMENT_MISMATCH`, and `READY_TO_INSTALL` are separate findings. They are supplied by a future read-only host diagnostic; absent data never becomes a pass.

## Execution boundary

Before an execution adapter may be added, it must preserve the existing package and app data, require a verified package digest, obtain specific user confirmation, and create a post-install verification record. It must never reset credentials, revoke certificates, erase pairing data, uninstall an app, or bypass platform authorization as a recovery step.
