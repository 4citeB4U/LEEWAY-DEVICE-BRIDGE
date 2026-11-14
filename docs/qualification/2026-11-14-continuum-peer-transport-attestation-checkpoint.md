# Continuum peer-transport attestation checkpoint

**Checkpoint time:** 2026-11-14 America/Chicago.
**Agent identity:** Codex; not Agent Lee.
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`.
**Branch:** `repair/production-zitadel-portable-integration-20261113`.
**Scope:** truthful Device Bridge input to the previously accepted offline
Continuum route contract.

## Decision

Continuum remains the owner of route selection, local change journals and later
reconciliation. Device Bridge contributes only a read-only attestation of facts
it can actually bind:

1. source and target each have trusted Runtime Registry enrollment;
2. both enrollment records share one verified owner subject (never returned to
   the caller);
3. source and target relay rooms are currently observed online or offline.

The Bridge must not infer a direct nearby carrier or LAN peer path from a USB
attachment, device label, Wi-Fi association, matching account, or relay token.
It must not report a file transfer, Continuum journal append, canonical index
write, Formula decision, Veritas decision, receipt admission, or device pairing
when none occurred.

## Source change

- `api/device-relay.mjs` adds the owner-scoped, read-only
  `bridge_peer_transport` MCP tool.
- It fails closed for an invalid/same-device pair, untrusted registration, or
  absent/mismatched owner subject.
- Its result reports direct/LAN as `NOT_OBSERVED`, and reports WSS availability
  only from current relay room observation.
- `config/zitadel-host-pins.v1.json` was updated with the exact current SHA-256
  for the changed relay source.
- `tests/mcp/peer-transport-attestation.test.mjs` covers shared-owner relay
  observation and negative owner/pair cases.

## Executed evidence

| Command | Result | Scope |
| --- | --- | --- |
| `npm run test:mcp` | 211 passed, 0 failed, 1 declared environment skip | Device Bridge MCP source suite, including new peer-attestation cases |
| `node --test tests/device-relay-server.test.mjs tests/remote-relay-source.test.mjs tests/dynamic-enrollment.test.mjs` | 7 passed, 0 failed | Relay wire, source gate, and portable enrollment regressions |
| `node --check api/device-relay.mjs` | exit 0 | Changed relay syntax |
| `git diff --check` | exit 0 | Whitespace validation |
| changed-file portability scan | no fixed drive or historical test-device binding | New peer-attestation source/test |

## Evidence state

- **VERIFIED (source scope):** the read-only bridge attestation is owner-bound,
  fails closed, and does not manufacture a direct/LAN transfer.
- **NOT EXECUTED:** deployment of this source, live MCP schema readback, direct
  peer discovery, LAN pairing, encrypted peer session, file transfer, Continuum
  journal append/readback, reconciliation, Veritas evaluation, and canonical
  Receipt Authority custody.
- **FORMULA:** no task Formula evaluation was executed.
- **RECEIPT:** no production receipt was created.

## Rollback and next gate

Revert the commit created for this checkpoint if the source contract must be
withdrawn. The next executable gate is deployment plus authenticated MCP schema
readback, followed by an actual two-enrolled-device transfer whose source and
target hashes, Continuum journal readback, owner mismatch denial and authorized
receipt custody are all observed. Display sharing remains separate and is not
part of this change.
