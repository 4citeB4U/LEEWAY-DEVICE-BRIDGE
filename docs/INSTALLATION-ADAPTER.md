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

The desktop provider routes remain dry-run only until their native adapters are implemented and qualified. The iOS route recognizes iLoader as the current Windows USB fallback; the LeeWay bridge does not call iLoader or claim installer readiness on its own.

## Apple preflight states

`PACKAGE_HASH_MISMATCH`, `TRANSPORT_NOT_READY`, `ANISETTE_PROVIDER_UNAVAILABLE`, `APPLE_ACCOUNT_AUTH_FAILED`, `SIGNING_IDENTITY_MISSING`, `CERT_EXPIRED`, `PROFILE_MISMATCH`, `DEVICE_NOT_IN_PROFILE`, `ENTITLEMENT_MISMATCH`, and `READY_TO_INSTALL` are separate findings. They are supplied by a future read-only host diagnostic; absent data never becomes a pass.

## Execution boundary

Before an execution adapter may be added, it must preserve the existing package and app data, require a verified package digest, obtain specific user confirmation, and create a post-install verification record. It must never reset credentials, revoke certificates, erase pairing data, uninstall an app, or bypass platform authorization as a recovery step.

## Apple native execution route — source candidate (2026-11-07)

The Bridge now has a distinct executable capability `device.apps.install.apple`, separate from the existing `executeInstallation()` dry-run stub. Its request schema carries only a canonical package ID, expected SHA-256, and request ID; Apple password, 2FA and private signing material are never MCP arguments.

`apps/desktop/runtime-composition.mjs` accepts `appleInstallProviders` only as a trusted host-injected Map. `apps/desktop/mcp-server.mjs` checks the Map references an enrolled `physical-apple` device. `PhysicalAppleAdapter` will advertise the capability only when such a provider exists. Each real execution still requires `Bridge.call()` grants, Runtime C3 admission, owner consent and receipts. The live session does **not** currently expose an authorized signing provider; adding source code does not grant permissions.

`operator/native-apple-installer/runtime-provider.mjs` binds an exact USB hardware identity to the native `usbmuxd` device UDID, uses host callbacks for real device readback and owner consent, requires a locally measured IPA and worker-binary SHA-256, and only then invokes the Bridge-owned Rust `isideload` worker. The worker signs the existing official LeeWay IPA, installs through the authorized device transport, and reads back the signed bundle from InstallationProxy. Output is an observation pending independent Veritas, not an automatic production PASS.

The general consumer flow is **not** this signer. Customers receive a LeeWay-signed App Store build and use Apple's system identity controls; see [Apple consumer distribution](APPLE-CONSUMER-DISTRIBUTION-20261107.md). No hardware or Apple account is used in source CI fixtures.
