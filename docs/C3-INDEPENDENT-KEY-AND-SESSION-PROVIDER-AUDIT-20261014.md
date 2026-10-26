# C3 Independent Key and Session Provider Audit — 2026-10-14

## WHO / WHAT / WHERE / WHY / HOW
- **WHO**: Agent Lee independent reviewer.
- **WHAT**: Audit and identify existing operational key-verification and trusted session providers across the LeeWay ecosystem before authoring or installing device-command consent code.
- **WHERE**: Local checkouts `E:\LeeWay-Work\*` and `E:\Leeway-Ecosystem v2.1.4`.
- **WHY**: Ensure device-command consent binds to actual operational cryptographic and session mechanisms without substituting placeholder checks or inventing unverified sovereign authorities.
- **HOW**: Exhaustive filesystem scan for cryptographic keys (`*.pem`, `*.pub`, `*.key`, `*.keystore`), call-site trace of signature generation/verification routines, session registries, and Android/Apple hardware bindings. Zero executable source, driver, credential, or physical device modifications.

## Verified Evidence: Operational vs. Framework Providers

### 1. Host Cryptographic Key & Verification Engine (`security/signing.mjs`)
- **Key Source**: Real asymmetric Ed25519 keypair (`crypto.generateKeyPairSync('ed25519')`).
  - Private key: `security/keys/dev-key.pem` (PKCS#8 PEM).
  - Public key: `security/keys/dev-key.pub.pem` (SPKI PEM; public key content: `MCowBQYDK2VwAyEAVZ7KX4QCfpId1dtpHK866vZhCL1jY1k/mzPcYsft7yE=`).
  - Key presence: Deployed identically across 14 LeeWay repositories (`runtime-c3-clean-formula-20261007`, `c3-vision-pc-authority`, `host-commander-v0`, `pc-consciousness-live`, `runtime-reconcile-20261005`, `_private/security-remediation`, etc.).
- **Cryptographic Operations**:
  - Signer: `signPayload(payload)` uses `crypto.sign(null, data, priv).toString('base64')`.
  - Verifier: `verifyPayload(payload, signature)` uses `crypto.verify(null, data, pub, Buffer.from(signature, 'base64'))`.
  - Ledger integration: Chained to `ledger/append.mjs` (`appendLedger`, `verifyChain`).
- **Live Call Sites**:
  - `agent-api/server.mjs`: Signs admission receipts on `/agent/request` (`receipt.proof = { signature }`).
  - `production-proof/security/security-proof-suite.mjs` and 18 proof suites: Proves signature validity (`valid === true`).
- **Verdict**: **OPERATIONAL ASYMMETRIC CRYPTOGRAPHIC ENGINE**. Real Ed25519 digital signatures, not placeholder string checks. However, key files are host-filesystem developer keys, not interactive human consent or hardware token credentials.

### 2. Device Hardware-Backed Identity Key Provider (`DeviceIdentity.kt`)
- **Key Source**: Hardware-backed ECDSA `secp256r1` (P-256) keypair generated inside `AndroidKeyStore` (`KeyProperties.PURPOSE_SIGN`).
  - Alias: `leeway_device_identity`.
  - Output: X.509 DER certificate (Base64) and SHA-256 fingerprint of public key.
- **Verdict**: **OPERATIONAL DEVICE HARDWARE ATTESTATION**. Genuine hardware key provider on Android (Samsung Fold 6), but resides in the Android app source worktree (uncommitted, preserving all working changes).

### 3. Local Pairing Shared Secret Provider (`BridgeSecret.kt`)
- **Secret Source**: 256-bit CSPRNG token generated via `SecureRandom().nextBytes(bytes)` into hexadecimal string.
- **Storage**: Private Android `SharedPreferences`.
- **Call Sites**: Validated by `LocalBridgeServer.kt` and `RemoteRelayService.kt` during HTTP/WebSocket handshakes.
- **Verdict**: **OPERATIONAL LOCAL SECRET PROVIDER**.

### 4. Dynamic Session & Replay Protection Providers
- **`PassportReconciliationProvider` (`operator/passport-reconciliation.mjs`)**:
  - In-memory session registry enforcing:
    - Single-use challenge nonces (`sessionNonce`, `nonceConsumed = true`).
    - Expiration TTL (`expiresAt = registeredAt + ttlMs`, default 120s).
    - Cryptographic hash binding (`canonicalHash(nativePassport)`).
    - Rejection of matching passport contents if ingress transport, device identity, or nonce is missing, replayed, or expired.
  - Verified by 15 passing invariant tests in `tests/passport-reconciliation-authority.test.mjs`.
  - **Verdict**: **OPERATIONAL SESSION PROVIDER**.
- **`CarrierServer` Turn Session Context (`carrier-server.mjs`)**:
  - Turn ingress `respond()` establishes immutable, non-forgeable turn context:
    `{ requestId: 'TURN-...', outcomeId, inputHash: sha256(text), committed: true, authorized: true }`.
  - Fails closed on uncommitted input.
  - **Verdict**: **OPERATIONAL TURN CONTEXT PROVIDER**.
- **`governed-host-read-handler.mjs` Authority Provider**:
  - Authority constructor: `{ allowed: true, revoked: false, correlation_id, request_sha256, target, capability, scope: 'OWNER_LOCAL_HOST_READ', authorization_sha256, binding_sha256, issued_at, expires_at, max_age_ms: 120000 }`.
  - Enforces `scanForbidden()` against caller-supplied tokens.
  - **Verdict**: **OPERATIONAL HOST-READ AUTHORITY PROVIDER**.

### 5. Architectural Frameworks with Placeholder Checks (NOT Operational Key Providers)
- **`CreatorAuthority` (`standards/src/core/security/creator.authority.ts`)**:
  - Explicitly states: *"cryptographic framework only - real keys must be external"*.
  - Lines 177, 182: Uses placeholder mock checks `selfSignature !== '' && founderId === 'Lee'`.
  - **Verdict**: **FRAMEWORK ONLY — STRICTLY FORBIDDEN TO SUBSTITUTE AS PRODUCTION VERIFIER**.
- **`capability-work-order-router.mjs`**:
  - Uses raw boolean `approved = false`. Production callers omit `approved`, halting in `HOLD_APPROVAL`.
  - **Verdict**: **CONTROL FLOW HOLD — NOT A CRYPTOGRAPHIC VERIFIER**.
- **`apps/desktop/mcp-server.mjs`**:
  - Sets `admission: async () => true`.
  - **Verdict**: **PERMISSIVE STUB — PENDING HARDENED C3 BINDING**.

## Summary Matrix

| Component | Key / Token Type | Operational Status | Cryptographic Integrity | Usable for Device Command Consent? |
|---|---|---|---|---|
| `security/signing.mjs` | Ed25519 (`dev-key.pem`) | Operational (Host) | Real `crypto.sign` / `crypto.verify` | Yes, as runtime token signing engine |
| `DeviceIdentity.kt` | ECDSA secp256r1 | Operational (Android Keystore) | Hardware-backed P-256 | Yes, for native device attestation |
| `BridgeSecret.kt` | 256-bit CSPRNG | Operational (SharedPreferences) | Cryptographic Random | Yes, for local transport auth |
| `PassportReconciliationProvider` | Session Nonces + TTL | Operational (Operator) | Single-use nonce & expiry | Yes, for anti-replay session gating |
| `CarrierServer` | Request context + Hash | Operational (Runtime Fabric) | SHA-256 input digest | Yes, for turn authority ingress |
| `CreatorAuthority` | Framework mock checks | Non-operational template | Mock string checks (`founderId === 'Lee'`) | **NO (Forbidden placeholder)** |
| `capability-work-order-router` | Raw boolean | Non-operational provider | None | **NO (Stops at HOLD_APPROVAL)** |

## Next Smalleст Action & Repair Boundary
1. **Never substitute `CreatorAuthority`'s mock check** (`founderId === 'Lee'`) for cryptographic verification.
2. For request-bound device-command consent (`leeway.consent-evidence.v1`), use the **operational Ed25519 cryptographic verifier** (`crypto.verify`) with a runtime session keypair or ephemeral carrier secret, binding:
   `{ issuer, subjectSha256, deviceId, platform, capability, argsDigest, issuedAt, expiresAt, sessionNonce, tokenNonce }`.
3. Require `sessionNonce` consumption through `PassportReconciliationProvider` to prevent replay attacks.
4. Exercise acceptance tests through the production entrypoint (`apps/desktop/mcp-server.mjs`) verifying rejection of forged, expired, replayed, wrong-device, and unauthenticated requests.
5. Preserve all 6 modified Kotlin files in `apps/android` and their `.bak` backups.

RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
