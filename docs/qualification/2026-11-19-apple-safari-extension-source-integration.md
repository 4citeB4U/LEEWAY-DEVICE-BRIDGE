# Apple Device Bridge Safari integration — source checkpoint

- **Authority:** Creator-approved W01 Apple Device Bridge repair
- **Repository / branch / starting SHA:** `4citeB4U/LEEWAY-DEVICE-BRIDGE` / `codex/w01-agent-device-access-20261119` / `6a102b54a0fc58d31ff356e6b5a9ff7e12cef40d`
- **Timestamp:** 2026-11-19 America/Chicago
- **Gate:** Apple source integration, not signing, installation, enrollment, or physical device execution.

## Diagnosis

The Universal Extension’s Safari handler existed outside the canonical Apple
Device Bridge Xcode project. Therefore Safari could not form a real native
app-extension relationship with the installed iPhone app.

## Repair

- Added an embedded `LeeWaySafariExtension` iOS app-extension target.
- Added matching App Group entitlements for the containing app and extension.
- Added Safari Web Extension resources and a correlated message handler.
- Added a bounded shared App Group inbox. It stages explicit user-selected text
  only after an unexpired `OWNER_AUTHENTICATED_RUNTIME_GRANTED` session exists.
- Added an owner-visible inbox in the Apple app.

The implementation rejects absent, expired, malformed, or mismatched sessions.
It does not create a Runtime grant, send a browser excerpt to a device adapter,
perform cross-app control, or issue a production receipt.

## Acceptance boundary

`SOURCE_IMPLEMENTED` only. A macOS/Xcode build, Apple signing, iLoader
installation, Safari Settings enablement, authenticated Runtime handoff, and
physical iPhone handshake remain required and are **NOT_EXECUTED** by this
source checkpoint.

## Executed evidence

```text
node --test tests/apple-agent-capability-source.test.mjs tests/apple-camera-provider-source.test.mjs tests/apple-camera-transport.test.mjs tests/apple-native-package-contract.test.mjs tests/apple-github-iloader-update-channel.test.mjs tests/installation-adapter.test.mjs
```

Result: **15 passed, 0 failed**. This verifies only the Apple source and
package contracts touched by this repair.

```text
npm run observe:iloader
```

Observed on Windows: Apple USB present; Apple Mobile Device Service not
running; iLoader not running; no selected server or account record observed;
certificate and provisioning states not observed. The resulting installation
target is not ready. No installer, account, profile, certificate, phone, or
Safari setting was changed.

## Rollback

Revert this integration commit. No Apple account, signing certificate, profile,
iLoader installation, phone data, or device permission changes occur here.
