# LeeWay Device Bridge — C3 candidate source provenance (2026-10-23)

Authority: **4citeB4U/LEEWAY-DEVICE-BRIDGE**. Provenance base: commit `c29f1d5823a4fe7430ea331e5c76b53728301f31` on the local `c3-4-voice-adapter` checkout.

## Source origin

This review branch captures an **explicitly selected byte-for-byte candidate snapshot** of the existing working implementation from `E:/LeeWay-Work/device-bridge-c34-build`; files were copied into an isolated Git worktree with zero observed byte mismatches. No claim of inherited upstream history is made for previously untracked files. The commit establishes new traceable source history, not retroactive provenance.

Existing components reused: `apps/desktop/mcp-server.mjs`, `apps/desktop/adapter.mjs`, `packages/protocol/index.mjs`, `operator/device-operator.mjs`. Candidate additions include `operator/c3-admission-binding.mjs`, `operator/trusted-issuer-registry.mjs`, `operator/trusted-issuers.json`, Formula gate mathematics and C3 test suites.

## Qualification evidence

- Five C3 security test files PASS (including unsigned-nonce regression).
- Desktop MCP 18/18 PASS.
- CLI 7/7 PASS.
- The MCP startup implementation enforces missing Formula/Veritas providers **fail-closed**.
- Source pin in the Runtime Fabric registration module ties to the reviewed local admission module.

## Limits and promotion policy

**CANDIDATE_REVIEW_ONLY**. No producer-signed source attestation, separately authenticated independent Veritas custodian, owner-authorized physical command, independent POST receipt, or Learning Ledger production admission has been demonstrated. The trusted issuer fixture contains a **public** key; enrolled production issuer status must be independently validated. Do not merge to main or deploy with bypass credentials. Revalidate hashes, separate custodians and device authorization at production promotion.
