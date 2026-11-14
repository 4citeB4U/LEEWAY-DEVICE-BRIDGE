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

## Runtime issuance investigation — 2026-11-14T00:39:00-06:00

The exact deployed Runtime Fabric source reference was inspected at
`794801494bcf250b26243a6b2daf58fc0fdea373`
(`fix/sentinel-retired-source-fallback-20261113`), the commit Vercel reported
as serving the Runtime deployment during this investigation.

Observed facts:

- Its `vercel.json` exposes only `/mcp`, OAuth protected-resource metadata,
  and `/agent-lee/public-question`; no enrollment route is declared.
- The deployed Runtime returned HTTP `404` to unauthenticated bounded POST
  probes for both `/v1/device-enrollments` and
  `/v1/device-enrollments/example/complete`.
- The deployed source contains a read-only Device Bridge discovery proxy in
  `src/server/device-bridge-discovery-upstream.mjs`. It explicitly denies
  command and enrollment authority.
- The Runtime’s configured environment inventory contains OIDC and read-only
  discovery bindings but no relay-binding signer, relay-binding verifier-key
  set, or enrollment-authority configuration. Secret values were not read or
  recorded.
- A repository search across accessible LeeWay workspaces found no existing
  implementation of `relayBindingArtifact`,
  `leeway.device-bridge.relay-binding.v1`, or an enrollment endpoint beyond
  this Device Bridge client contract and its tests.

**Conclusion:** the next gate is a genuinely missing Runtime-owned enrollment
issuer and native verifier integration, not a discoverable existing service or
a Device Bridge configuration mistake. It requires a separately governed
signing-key lifecycle, owner/device enrollment registry, issuance/revocation,
receipt custody, and an authenticated Runtime route. Do not generate an
ad-hoc key or substitute a static relay manifest merely to make a test pass.
