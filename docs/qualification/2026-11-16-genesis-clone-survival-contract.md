<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.CONTINUITY.GENESIS
TAG: LEEWAY.SOVEREIGN.GENESIS.CLONE.SURVIVAL.CONTRACT.V1
5WH:
WHAT = Add Creator-approved onboarding, Genesis Clone, Continuum survival and proof-driven experience requirements to Extension Manifesto V2.
WHY = Avoid fabricated guaranteed backups, copied device identities and provider lock-in.
WHO = Creator Leonard Jerome Lee; outside contributor GPT-6/F2; original Runtime, Continuum, Device Bridge and Receipt authorities.
WHERE = docs/qualification/2026-11-16-genesis-clone-survival-contract.md.
WHEN = 2026-11-16.
HOW = State transitions, signed metadata verification, negative tests and source/physical proof boundaries.
LICENSE = Existing repository terms; no new license asserted.
-->

# Sovereign Genesis Clone & Continuum Survival — same Device Bridge mission

**Scope:** Amendment to the current Universal Device Bridge / Rust Sovereign Core / Extension Manifesto V2 work. Keep the seven local partitions, existing Formula, Continuum, Runtime, device registry, receipt and independent Veritas authorities. The browser extension is a replaceable client, not an independent backup service or runtime. Device-local Digital Brain and Diagnostics continue to belong to their own physical machine.

## Seven phases — the HOW and acceptance gate

| Phase | Mechanism required | Evidence before any success claim |
| --- | --- | --- |
| 1. Website and citizenship | Versioned purpose, self-trust, ecological stewardship and achievement-based provisioning text; explicit consent, original covenant SHA-256 and an owner-bound acceptance reference. Do not invent a cost-yield Formula evaluator or treat passive reading as consent. | Versioned text readback, consent/reject accessibility tests, actual authorized receipt |
| 2. Identity and acquisition | User authenticates with their **own** approved issuer (ZITADEL or equivalent configured identity provider). Validate OIDC issuer, audience, state/nonce, PKCE and tenant. Install verified platform package. No Creator account, paths or hardware singleton embedded in defaults. | Cross-owner denial, distinct device enrollment, package authenticity, signature and rollback tests |
| 3. Atomic seven partitions | On the selected host create Workspace, Sandbox, Continuum, DigitalBrain, Diagnostics, Ledger and Receipts using qualified platform storage and original vault authority, not a developer drive assumption. | Alternate installation root, interrupted provisioning recovery, complete poststate |
| 4. Genesis clone | Export **signed non-secret configuration + encrypted Continuum reference manifest**, *not* device private keys, passwords, OAuth tokens or live Diagnostics. New device creates its own keypair/passport, native host and browser-profile-specific extension registration. | Creator/secret exclusion, user-signed enrollment, new key != old key, owner grant readback |
| 5. Encrypted replication | Continuum encrypts capsules before transit, records their ciphertext SHA-256 and authenticated encryption metadata, sends to independently durable replicas through existing mesh outbox, obtains authenticated receiver ACK and performs readback. Browser storage.local and a browser extension are not disaster backups. | Replay/duplicate/conflict/partial-network tests, authenticated replica custody, actual digest and object count |
| 6. Loss/disaster recovery | Revoke lost device key, enroll new device, recover owner-approved decryption key by a documented independently usable method, read signed snapshot, verify owner binding, sequence and Merkle root, fetch each ciphertext, verify/digest/decrypt with AEAD, atomically write capsules, build a **new** device-owned Brain index and fresh Diagnostics. | Single-device loss; *all-devices-lost* independent offsite restore; wrong-owner, missing-key, corrupted capsule, revoked-key and partial restore tests |
| 7. Exit | User retains local records, exportable encrypted archives and key custody even after hosted LeeWay service ends; BYO transport/storage configuration may replace a hosted provider. No assertion that a managed tunnel remains free or active after exit. | Offline restore, documented provider-independent export/import, continuity of local data |

## Implemented this revision: signed Genesis manifest verifier

Source: packages/protocol/sovereign-genesis-v1.mjs. Tests: tests/sovereign-genesis-v1.test.mjs.

- A versioned envelope binds ownerSubject (opaque OIDC subject), monotonic sequence, created timestamp, covenant content digest/acceptanceRef, HTTPS issuer/provider discovery references, nonsecret extension channel and recovery key *reference*, capsule metadata and snapshot root.
- Capsule metadata binds ID, length, AES-256-GCM declaration and SHA-256 of encrypted bytes. A sorted, domain-separated **binary Merkle tree** binds the ID to the ciphertext digest; this is not a string-concatenation substitute.
- A detached trust input is mandatory: the caller must provide the **independently authenticated current owner Ed25519 public key** and validated minimum sequence. A self-supplied key inside an untrusted bundle is never authority.
- Strict field allowlists reject injected private keys, passwords, credentials, unknown fields, unsafe file names and duplicate IDs. Positive tests prove signature validity; negative tests prove owner mismatch, issuer mismatch, rollback, tampering, wrong signing key, unsafe IDs, changed digest and ciphertext mismatch.
- The only positive verdict is SIGNED_MANIFEST_VALIDATED_NOT_RESTORED, with restoreQualified=false. This validator neither encrypts/decrypts, fetches backups, provisions devices nor issues canonical receipts.

**Source warning:** The provided transcript's continuum_sync.rs silently ignores I/O failures, writes unverified caller-supplied capsule IDs and plaintext, labels sorted-hash concatenation a “Merkle root,” and copies old Brain files into a new device. The proposed extension continuum-sync.js stores data in browser.storage.local, which does **not** give a verified off-device recovery path. Neither is accepted as-is. Preserve the Creator's requirement but replace those draft algorithms with the qualified original provider and the above integrity gates.

## Explicit survivability model

A complete recovery is possible only if **at least one independently durable, reachable encrypted replica** exists *and* its owner-authorized recovery key remains accessible after every local device is gone. An authenticated backup manifest alone does not prove availability. Browser sync, website login, extension installation or a working relay alone do not meet this condition.

Define RPO as the newest capsule sequence/time backed by an independently acknowledged durable replica; define RTO as measured time from authorized new-device recovery start to verified data/search readback. Do not claim zero loss, instantaneous recovery, “digital immortality,” or 60% measured hardware independence without physical evidence.

The pasted Gemini narrative also assumes Cloud chat tab permissions survive future new chats. An extension can preserve LeeWay-controlled context subject to consent and browser/platform constraints, but cannot grant itself permanent tool access inside other AI providers or control their memory.

## Next ownership and gates

- Original Continuum and enrollment owners: integrate authenticated replica ACK and restore, OS-protected keys, issuer/tenant grants, lost-device revocation and independent restore tests. Do not create a parallel vault/receipt/control plane.
- Existing extension PR: add consent-driven recovery status UI **only after** the original native host exposes an owner-qualified read-only restore-status capability. Do not transfer ciphertext into browser local storage as the sole backup.
- Website owner: publish the Creator's citizenship and achievement-based provisioning narrative with versioned consent and approved mathematical/formula economics. This source update is **not** a website deployment.
- Original production owner: verify Rust core and signed Windows build, live browser native-host installation, paired hardware tests and independent Formula/Veritas/Receipt Authority/Continuum/Learning readback.
- Reconcile overlapping draft extension PR #120 (based on universal relay) and #121 (based on main) before any merge. Preserve both source histories; **do not promote both implementations**.

**Evidence state:** local Node test fixture 11/11 PASS in an isolated container at authoring time; exact GitHub CI and actual host validation must be checked separately. Production G4 execution, real off-device replica readback, authorized Formula, independent Veritas, Receipt Authority and Learning admission for this amendment: NOT_EXECUTED.
