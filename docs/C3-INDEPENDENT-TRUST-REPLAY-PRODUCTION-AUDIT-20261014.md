# C3 Independent Trust, Replay and Production Gate Audit — 2026-10-14

## Identity
WHO: Agent Lee independent reviewer. WHAT: inspect contributor's five authority dependency repairs. WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE local checkout E:\LeeWay-Work\device-bridge-c34-build. WHY: preserve truthful source vs production claims. HOW: read-only code inspection and test execution. No private key extraction or phone mutation.

## Evidence
- Git HEAD c29f1d5823a4fe7430ea331e5c76b53728301f31, uncommitted candidate files and existing Android changes preserved.
- Executed node --test tests/passport-reconciliation-authority.test.mjs tests/c3-trusted-issuer-consent.test.mjs tests/c3-admission-binding.test.mjs tests/device-command-admission-production.test.mjs tests/device-passport-fixtures.test.mjs; 5 test files pass, 0 failures; 54 logged security invariants reported by contributors.
- passport-reconciliation.mjs now defaults requireCryptographicProof=true and rejects missing verifier; tests PASS.
- trusted-issuer-registry.mjs uses crypto.verify Ed25519; trusted-issuers.json is a local self-declared registry with static public key, but canonical authorized enrollment/owner consent attestation and correspondence to a live issuer private key are UNVERIFIED.
- ConsentReplayGuard uses an in-memory Map plus module singleton. This prevents duplicate nonce use in one process, NOT persistence across restarts or multiple processes. Describing it as persistent without qualification is wrong.
- tests/device-command-admission-production.test.mjs imports Bridge directly, generates a fresh test Ed25519 keypair, supplies a test trust registry, uses a mock adapter and locally authored veritasPreGate returning a boolean. It does NOT invoke apps/desktop/mcp-server.mjs start() via stdio and does not prove production canonical Formula/Veritas or real device execution.
- apps/desktop/mcp-server.mjs still configures admission: async () => true. Candidate c3-admission-binding.mjs is not wired to production. Mandatory callback presence is not canonical Veritas authenticity.
- Reconciliation HMAC with passed transportSecret is useful primitive; no live authenticated ingress binding/issuer key custody demonstrated. Manual passing of requireCryptographicProof=false is still possible through constructor (review before production).
- No physical iPhone developer-service handshake or signed Agent Lee install performed.

## Disposition / next smallest gate
SOURCE-LEVEL TARGETED TESTS PASS; PRODUCTION AUTHORITY BLOCKED. Verify trust registry authority from existing Root of Trust; enroll actual issuer key without exposing secret; establish durable/restart-safe replay state; exercise actual MCP server entrypoint and verified Runtime Fabric Formula/Veritas pre/post with denied and authorized commands. Do not plug candidate callback into production until these pass. Preserve Android uncommitted files and prior receipts. No new governed execution receipt or Learning Ledger update.

RECEIPT NOT CREATED; LEARNING LEDGER NOT UPDATED.
