# Enrollment Relay-Binding Contract Checkpoint — 2026-11-14

**Timestamp:** 2026-11-14T00:35:00-06:00
**Project:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Branch:** `repair/production-zitadel-portable-integration-20261113`

## Purpose

Repair the portable-enrollment seam where a completed device enrollment could
start a runtime without an owner/device-scoped, verified relay endpoint. This
does not make an endpoint universal, expose a relay URL as customer
configuration, or claim a live transfer.

## Implemented source contract

`operator/dynamic-enrollment.mjs` now requires all of the following before it
starts an enrolled runtime:

1. A signed-artifact-shaped `relayBindingArtifact` from the enrollment
   authority alongside the device record.
2. An injected `relayBindingVerifier` that independently reports both
   `verified: true` and `signatureVerified: true`.
3. A binding whose schema is
   `leeway.device-bridge.relay-binding.v1`, whose owner and device exactly
   match the completed enrollment, whose issuer is HTTPS, whose endpoint is a
   credential-free `wss://…/api/device-relay` URL, and whose expiration is in
   the future.

Only the verified normalized binding is persisted through `localCustody` and
passed to `runtimeStarter`. The coordinator does not mint, sign, resolve, or
transport the binding itself.

`scripts/start-enrolled-workstation-relay.ps1` is explicitly documented as an
internal post-verification carrier. Its relay input remains only for the
runtime handoff; it is not a customer-entered configuration surface.

## Evidence

| Command | Result |
| --- | --- |
| `node --test tests/dynamic-enrollment.test.mjs tests/runtime-enrollment-authority-client.test.mjs tests/remote-relay-source.test.mjs` | 8 passed, 0 failed |
| `node --check operator/dynamic-enrollment.mjs` | exit 0 |
| `node --check operator/identity/runtime-enrollment-authority-client.mjs` | exit 0 |
| `git diff --check` | exit 0 |
| `npm run test:mcp` | 211 passed, 0 failed, 1 declared environment skip |

The focused tests include: arbitrary-device enrollment, custody/runtime
handoff of the verified binding, rejection of a missing artifact, and rejection
of a binding for another device.

## Truth boundary

**SOURCE_TESTED:** A client cannot treat static relay discovery as a completed
portable enrollment under this contract.

**NOT_EXECUTED:** Runtime enrollment authority issuance of a real signed relay
binding, native platform verifier integration, authenticated pair attestation,
Continuum journal append/readback, and file transfer/hash comparison.

## Next executable gate

Implement the corresponding Runtime enrollment-authority issuance and native
verifier adapter under its owning repository, then run a real sign-in on two
devices. Read back the relay binding through each platform’s local custody,
call the Bridge peer-transport attestation, and only then execute the bounded
Continuum transfer contract.
