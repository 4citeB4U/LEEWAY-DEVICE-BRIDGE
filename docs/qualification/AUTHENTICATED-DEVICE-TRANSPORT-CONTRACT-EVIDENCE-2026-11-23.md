# Authenticated Outbound Device Transport — Source And Negative-Control Evidence

**Date:** 2026-11-23 (America/Chicago)
**Status:** source and negative tests `DONE`; live physical acceptance `NOT_EXECUTED`
**Scope:** Gate 2 (versioned passport digest) and Gate 3 (authenticated outbound transport). Gate 1 remains `BLOCKED`.

## 1. What was implemented

### Gate 2 — versioned passport digest (additive)

| File | Change |
|---|---|
| `operator/windows-pc-primary.mjs` | Adds `PASSPORT_DIGEST_BASIS`, `signingPayloadSha256()`, and documents `windowsPassportSha256()` as the full signed document digest |
| `operator/identity/windows-passport-verifier.mjs` | Verifier record now carries `passportSha256` (full signed), `signingPayloadSha256` (unsigned payload), and `passportDigestBasis`; signature verification is unchanged |
| `tests/mcp/passport-digest-basis.test.mjs` | 3 tests: distinct bases, versioned verifier record, historical registry byte preservation |
| `registry/trusted-device-registry.json` | **NOT MODIFIED** — legacy digest `2b1630…4412` preserved |

Consumer inspection before the change: `apps/desktop/mcp-server.mjs:95`, `operator/c3-admission-binding.mjs:61`, `tests/*` and `registry/trusted-device-registry.json` all treat `passportSha256` as an opaque 64-hex value. No consumer recomputes it. Therefore adding a separately named field is backward-compatible, and no historical receipt is rewritten.

### Gate 3 — portable authenticated transport (new, additive)

| File | Role |
|---|---|
| `operator/transport/device-transport-contract.mjs` | Canonical transcript, portable platform vocabulary, exact-field validation, error taxonomy |
| `operator/transport/device-transport-verifier.mjs` | Trusted-issuer credential verification, owner/audience/registry binding, single-use challenge, proof-of-possession, revocation |
| `operator/transport/device-transport-gateway.mjs` | Per-device command correlation, per-operation grant + owner consent, request/result digests |
| `operator/transport/device-transport-client.mjs` | Device-initiated outbound client; injected native signer; bounded retry with fresh challenge and nonce per attempt; no static token |
| `tests/transport/device-transport.test.mjs` | 19 tests: 4 positive, 15 negative controls |
| `package.json` | Adds `test:transport` script |

Reused without modification: `packages/agent-relay/index.mjs` (transport source reference), `operator/workstation-relay-agent.mjs` (device role reference), `api/device-relay.mjs` (transport-only room/reference — **not** brought back as a public route), `operator/hosting/start-managed-device-mcp.mjs` and `apps/desktop/runtime-composition.mjs` (authority boundaries, untouched).

## 2. Authentication flow

1. Device dials **out** to the gateway's internal transport listener. The gateway never dials the workstation.
2. Gateway sends a short-lived, single-use `transport-challenge`.
3. Device returns a signed `hello` containing device id, platform, owner subject, audience, key id, registration digest, nonce, issued/expiry and a signature over the canonical transcript. A short-lived, audience-scoped, device-bound credential is attached.
4. Gateway verifies, in order: exact fields and schema → audience → owner → trusted issuer signature over the credential → TTL and clock skew → registry existence, verification state, revocation, registration digest and owner match → device signature over the challenge → single-use consumption.
5. Each command is issued with a unique command id, a device-specific grant and a non-expired owner consent. The device returns a result digest; the gateway refuses alteration or substitution.
6. Reconnect performs a **fresh** challenge exchange. There is no token, no shared secret, and no reuse of challenge or nonce.

The private key never enters these modules. The platform supplies a `{ keyId, sign(bytes) }` signer backed by approved native secure storage. No fixture key is written to disk or enrolled.

## 3. Negative controls (all executed)

| Required negative | Test assertion |
|---|---|
| Wrong owner | `TRANSPORT_OWNER_MISMATCH` at credential and hello |
| Wrong key | `TRANSPORT_PROOF_SIGNATURE_INVALID`, challenge not consumed |
| Forged signature | `TRANSPORT_CREDENTIAL_SIGNATURE_INVALID` and `TRANSPORT_PROOF_SIGNATURE_INVALID` |
| Expired credential | `TRANSPORT_CREDENTIAL_EXPIRED` |
| Revoked device | `TRANSPORT_DEVICE_REVOKED` despite valid credential |
| Replayed challenge | `TRANSPORT_CHALLENGE_REPLAYED` |
| Altered result | `TRANSPORT_RESULT_TAMPERED` |
| Device ID substitution | `TRANSPORT_DEVICE_ID_SUBSTITUTION` in hello, command and result |
| Unauthorized command | `TRANSPORT_OPERATION_NOT_GRANTED`, `TRANSPORT_CONSENT_REQUIRED`, `TRANSPORT_OWNER_MISMATCH` |
| Offline device | `DEVICE_OFFLINE`, `ok:false`, no synthetic result |

Additional controls: unknown/unverified device, registration digest mismatch, untrusted issuer, wrong audience, over-long TTL (refused, not clamped), duplicate/unknown command id.

## 4. Commands and observed output

```
node --test tests/transport/device-transport.test.mjs
  tests 19 / pass 19 / fail 0 / 129ms

npm run test:mcp
  tests 200 / pass 200 / fail 0 / 3349ms

node --test tests/windows-pc-primary.test.mjs
  tests 7 / pass 7 / fail 0 / 221ms
```

## 5. Portability and architecture checks

- New transport modules: `windowsHits=0`, `staticTokenHits=0`, no `pc-primary` default anywhere.
- No Windows path, CIM, PowerShell, Registry, WMI or drive letter in any shared module.
- No second MCP listener, no public route, no new relay authority, no new issuer, no paid infrastructure.
- The cloud managed gateway remains the only authorized client-facing endpoint. This transport contract is **not wired into any live service** in this change.

## 6. Rollback

- All changes are additive except two versioned fields on the verifier record. Reverting the commit restores the prior source exactly.
- `registry/trusted-device-registry.json`, `operator/trusted-issuers.json`, all receipts, the live Tailserve/Funnel configuration, listeners 4001/4011/4273/8008/8879 and the Creator Tablet are untouched.
- Historical unlabelled digests remain valid; the new basis applies only to newly produced records.

## 7. Remaining gates

- **GATE 1 `BLOCKED`:** owner-approved Ed25519 signer and custody evidence (see `OWNER-APPROVED-TRANSPORT-SIGNER-CUSTODY-PROPOSAL-2026-11-23.md`).
- **Integration `NOT_EXECUTED`:** wire the verified transport into the managed host only after signer approval and owner-reviewed security review.
- **Live physical acceptance `NOT_EXECUTED`:** cloud discovery, real `pc-primary` health/info, authorized native read, receipt correlation, reconnection, device-off-with-gateway-up test, independent Veritas/Receipt readback.
