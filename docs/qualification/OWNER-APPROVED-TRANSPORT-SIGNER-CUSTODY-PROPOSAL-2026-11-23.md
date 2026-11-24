# Owner-Approved Ed25519 Transport Signer — Custody And Approval Proposal

**Status:** `BLOCKED — OWNER_APPROVED_SIGNER_NOT_PRESENT`
**Date:** 2026-11-23 (America/Chicago)
**Authority chain:** Creator → LeeWay Standards → original Runtime Fabric / Device Bridge → governed Formula / Veritas / Receipt Authority
**Owner repositories:** `4citeB4U/LEEWAY-DEVICE-BRIDGE` (issues #109), `4citeB4U/LeeWay-Engineering` (issue #6)

## 1. Decision direction

Proceed with a **separately owner-approved Ed25519 signing key under the existing canonical LeeWay issuer authority**.

This proposal does **not**:

- use `dev-key.pem`, copy any development key material, or reuse a development SPKI as a new authority;
- generate an unapproved production signer;
- create a new issuer, a second trust root, an alternate control plane or a parallel registry;
- modify trusted issuance, promote any fixture key, or issue a passport;
- deploy anything or change any live service or security permission.

The existing `operator/trusted-issuers.json` and all historical receipts remain byte-for-byte unchanged until the Creator authorizes a specific action.

## 2. Why the gate is genuinely blocked

- The only enrolled issuer is `leeway.runtime.carrier.v1` / `carrier-ed25519-key-001`.
- Its `publicKeySpki` is byte-identical to `dev-key.pub.pem`. The corresponding private key is development material and is explicitly prohibited as a production signer.
- A full host scan found no file with `authority: OWNER_SIGNED_WINDOWS_PASSPORT`; the only registry record is the unsigned, non-owner-subject `hp-node-secondary-01`.
- The canonical issuer path (`operator/windows-pc-primary.mjs`, PR #134 `owner-windows-passport-issuance.mjs`) already fails closed with `ISSUER_NOT_APPROVED` / `ISSUER_OWNER_MISMATCH` for any key not explicitly enrolled.

There is no legitimate key to use. Creating one unilaterally would invent an authority.

## 3. Exact Creator approval required

The Creator must issue a scoped, dated authorization that states, in one record:

1. **Issuer authority:** that the new key is enrolled *inside* `leeway.runtime.carrier.v1` (or another already-canonical issuer), and that no new issuer or trust root is being created.
2. **Key identity:** exact `issuerId`, `keyId`, algorithm `Ed25519`, and the public SPKI SHA-256 fingerprint of the approved key.
3. **Owner binding:** the exact Zitadel owner subject `397621082842543343` to which the key is bound, and confirmation that the subject was verified against a live signed OIDC token rather than copied from configuration.
4. **Permitted use:** narrow scope — issuing/verifying device transport credentials and owner-signed Windows passports for enrolled devices only. No Formula, Veritas, receipt or execution authority.
5. **Validity:** `issuedAt`, `expiresAt`, maximum credential TTL, and the rotation/revocation trigger.
6. **Custodian:** the named owner of the private key and the approved secure-storage location.
7. **Rollback:** the exact registry entry to revert to, and who authorizes its use.

## 4. Exact custody evidence required

| # | Evidence | Acceptance |
|---|---|---|
| 1 | Creator approval record (signed or receipt-linked) | Links the decision to this proposal and lists all seven approval fields above |
| 2 | Public SPKI + fingerprint | Supplied as public material only; never a private key, seed, PKCS#8 blob or mnemonic |
| 3 | Key provenance record | Where the key was generated, by whom, on what date, under which approved process |
| 4 | Secure-storage attestation | Device/HSM/secure-enclave attestation that the private key is non-exportable and used behind a sign operation |
| 5 | Separation-of-duties proof | The key custodian is not the same authority that consumes verification results |
| 6 | Existing registry preservation | Diff showing `trusted-issuers.json` historical entries and all prior receipts untouched |
| 7 | Revocation and rotation procedure | Named authority, revocation list update path, and test of a revoked key denial |
| 8 | Independent verification | Veritas/receipt readback produced independently; contributor output alone is not acceptance |

## 5. What happens after approval — and only then

1. Add exactly one new `ACTIVE` entry to the existing issuer registry, with the approved `issuerId`/`keyId`/SPKI, preserving every historical entry.
2. Issue the original owner-signed Windows passport through the approved custody path; verify CIM hardware identity, owner binding, signature, TTL and nonce.
3. Bind the verified record into the host-injected `runtimeInput` (`deviceRegistry` + `adapterRegistry` + issuer + replay guard + C3 gates) already implemented in this branch.
4. Issue a short-lived, audience-scoped device transport credential for the enrolled device; the new transport contract in this branch verifies it with proof of key possession.
5. Run the full positive and negative acceptance set. Do not claim Veritas or Receipt Authority approval unless independently produced.

## 6. Current state

**GATE 1: `BLOCKED`.** No key, signature, passport, enrollment, registry entry, deployment or security setting was created or changed. Source for Gate 2 and Gate 3 is prepared and tested with ephemeral fixtures only; no fixture is trusted or promoted.
