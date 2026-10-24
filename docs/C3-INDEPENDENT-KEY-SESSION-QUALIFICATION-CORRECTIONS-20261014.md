# C3 Independent Key and Session Qualification Corrections — 2026-10-14

## Identity
WHO: Agent Lee independent reviewer. WHAT: qualify contributor claim that existing Ed25519 signing, Android Keystore, and reconciliation sessions are operational production device-consent providers. WHERE: existing Runtime Fabric security/signing.mjs and Device Bridge source. WHY: prevent development keys and self-asserted evidence from becoming sovereign authorization. HOW: read-only inspection; no secret material displayed or copied.

## Verified source observations
- security/signing.mjs uses genuine Node crypto.sign/crypto.verify with Ed25519 keys, but chooses keysDir under process.cwd()/security/keys and generates a new development keypair if either expected file is missing. Its key identity, production custody, stable issuer registration, startup effects, and rotation are not established.
- security/keys/dev-key.pem and dev-key.pub.pem are present in inspected checkout. They are not thereby approved production consent credentials. Do not copy, log, distribute, or ingest private keys into tests.
- Android DeviceIdentity.kt creates EC secp256r1 keys with AndroidKeyStore and publishes public-key fingerprint. No proof in inspected source of StrongBox enforcement or independent certificate-chain attestation; 'hardware-backed' is UNVERIFIED.
- PassportReconciliationProvider.recordNativeObservation checks ingressEvidence.authenticated === true, an ingress transport enum, proofHash string length == 64, and deviceIdentity authority/fingerprint string shape. It does not itself verify ingress attestation signature or MAC or bind to a trusted channel callback. Matching, syntactically plausible evidence may be constructed by the caller. Default session nonce string is static 'default-nonce-000' unless caller supplies another; session map is memory-only. This is a candidate unit provider, not proven production authenticated session authority.
- Import of signPayload into agent-api/server.mjs shows signing use; proof that a named verifier is trusted by actual C3 admission, its live key, or end-to-end consent is not established from that import alone.
- apps/desktop/mcp-server.mjs still has admission: async () => true in inspected entrypoint. No general C3 Formula/Veritas admission path is proven.

## Finding classification
CRYPTOGRAPHIC PRIMITIVE PRESENT / OWNER ISSUER AUTHORITY UNVERIFIED / DEVICE ATTESTATION UNVERIFIED / RECONCILIATION AUTHENTICATION BLOCKED / C3 ENTRYPOINT BLOCKED.

## Next smallest tests
1. Prove canonical runtime key registry, stable public-key identity, operational signer/verifier references, startup behavior, and owner enrollment without exposing secrets.
2. Use signed challenge over requestId, deviceId, capability, argsDigest, nonce, expiry; verify with independently trusted public key and reject forged proofHash/authenticated booleans.
3. Require trusted device ingress to supply evidence from verified transport; validate Apple Lockdown or Android Keystore possession with appropriate platform attestation semantics.
4. Test unknown issuer, wrong key, revoked consent, replay, cross-device substitution, and absent Veritas pre-gate through production entrypoint.
5. Preserve existing Android changes and avoid treating mere hashes as signatures or source tests as a live executed path.

No existing executable source changed. RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
