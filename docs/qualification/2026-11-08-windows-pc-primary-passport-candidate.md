# Windows `pc-primary` passport adapter candidate

Checkpoint time: 2026-11-08 23:56:30 America/Chicago  
Agent lane: F4 — Device Bridge builder  
Work ID: `LEEWAY-SELFHOST-CORE-FOUR-W00`  
Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
Branch: `fix/zitadel-token-audience-allowlist`  
Source HEAD before this work: `f5414be26513078cf9d5b450debb173eddfcdddb`  

## Preflight

`LeeWay Standards → LeeWay Engineering → Receipt Authority qualification start → LEEWAY-VERITAS independent evidence/trust gate → LeeWay Learning Ledger admission boundary → LeeWay-Production-Final-Execution-Layer handoff contract → owning repository contributor notes/issues/PRs`

## Scope and authority

This is a Device Bridge-only candidate repair. It adds a read-only Windows host identity observer for `pc-primary`, an owner-signed passport verifier, a trusted-registry record builder, and fail-closed C3/MCP checks. It does not create an owner credential, production trust root, Veritas decision, canonical Receipt, Learning admission, Runtime composition, deployment, merge, or push.

The existing five uncommitted candidate composition files were present before this lane and were preserved. They are not part of this F4 patch:

- `apps/desktop/mcp-server.mjs` candidate seam changes
- `apps/desktop/runtime-composition.mjs` candidate seam changes
- `operator/identity/start-universal-pocket-id-mcp.mjs` candidate seam changes
- `tests/mcp/pocket-id-owner-execution.test.mjs` candidate tests
- `tests/mcp/runtime-composition.test.mjs` candidate tests

## Engineering loop

| Stage | State | Evidence |
|---|---|---|
| Investigate | EVIDENCED | Windows registry row was `PROPOSED`; passport schema was Android-shaped; `DesktopAdapter` reported `SOURCE_BOUND_NOT_LIVE_PROBED`. |
| Diagnose | EVIDENCED | No source-bound Windows passport, exact CIM/BIOS comparison, or trusted Windows registration predicate existed. |
| Plan | PASS | Reuse the existing Device Bridge adapter boundary; add only read-only Windows identity and preserve Runtime/Veritas ownership. |
| Implement | PASS | Added `operator/windows-pc-primary.mjs`; extended passport schema; narrowed Windows registry; added C3/MCP identity predicates and focused tests. |
| Test | PASS | Focused Windows suite 6/6; registration discovery 3/3; C3 regressions 2/2; physical adapter regressions 9/9; full MCP suite 165/165. |
| Validate | PARTIAL | A real local PowerShell/CIM read returned non-placeholder UUID, BIOS serial, manufacturer and model presence. No owner passport or production trust record was used. |
| Repair | PASS | Corrected asynchronous denial assertions and server-registry fixture construction after the first focused test run. |
| Retest | PASS | The corrected focused and regression suites passed. |
| Verify | BLOCKED | No independent LEEWAY-VERITAS PRE/POST was requested or issued. |
| Evidence | PASS | Exact commands, exit codes, file hashes and proof limits are recorded here and in the scoped JSON evidence file. |

## Changed F4 files

- `operator/windows-pc-primary.mjs` — read-only CIM/BIOS probe, signed passport verification, registry-record builder.
- `contracts/device-passport.schema.json` — preserves the Android branch and adds a Windows owner-signed passport branch.
- `operator/adapter-registry.json` — changes Windows from `PROPOSED` to `PARTIAL`, declares only `device.info` and `device.health`, and points to the candidate adapter.
- `operator/c3-admission-binding.mjs` — requires source-bound Windows identity fields before C3 admission for `pc-primary`.
- `apps/desktop/mcp-server.mjs` — requires the same trusted Windows identity before `TRUSTED_REGISTRY_READ` listing and reports `identityVerified` explicitly.
- `operator/physical-adapters.mjs` — re-exports the new adapter without changing Android or Apple transport behavior.
- `tests/windows-pc-primary.test.mjs` — focused positive and denial coverage.
- `docs/qualification/2026-11-08-windows-pc-primary-passport-candidate.md` — this engineering-loop record.
- `evidence/2026-11-08-windows-pc-primary-passport-candidate.json` — scoped machine-readable evidence.

## Exact checks

| Command | Exit | Result |
|---|---:|---|
| `node --check operator/windows-pc-primary.mjs` | 0 | PASS |
| `node --check operator/c3-admission-binding.mjs` | 0 | PASS |
| `node --check apps/desktop/mcp-server.mjs` | 0 | PASS |
| `node --check operator/physical-adapters.mjs` | 0 | PASS |
| `node -e "JSON.parse(...device-passport.schema.json); JSON.parse(...adapter-registry.json)"` | 0 | PASS |
| `node --test tests/windows-pc-primary.test.mjs` | 0 | 6/6 PASS |
| `node --test tests/mcp/registered-device-discovery.test.mjs` | 0 | 3/3 PASS |
| `node --test tests/c3-admission-binding.test.mjs tests/c3-unsigned-consent-regression.test.mjs` | 0 | 2/2 PASS |
| `node --test tests/physical-apple-usb.test.mjs tests/mcp/physical-usb-composition.test.mjs tests/mcp/physical-usb-c3-admission.test.mjs` | 0 | 9/9 PASS |
| `npm run test:mcp` | 0 | 165/165 PASS |
| `git diff --check` | 0 | PASS |

The local host probe was read-only and returned `platform=windows`, non-placeholder computer UUID and BIOS serial presence, manufacturer/model presence, and local SHA-256 digests. It did not sign or enroll a passport and did not dispatch a Device Bridge capability.

## Proof limits and next gate

- The generated Ed25519 material in the focused test is test-only and is not a production root.
- No current owner-signed passport exists in this repository as a production enrollment artifact.
- The Windows adapter is not wired into Runtime Fabric by this repository-only change.
- `identityVerified=true` is emitted only after a fresh host observation matches the injected owner-signed passport and active trust record; configuration alone is rejected.
- `TRUSTED_REGISTRY_READ` is a qualified host-registry result in the source contract, not proof of live reachability or W02 execution.
- Veritas PRE/POST, Formula, Receipt Authority, Learning Ledger and Production Final Execution Layer remain outside this lane and unchanged.

Next authorized action: the Runtime owner must inject a real owner passport trust record and compose this adapter through the existing Runtime-to-Device-Bridge seam. Only after that independent boundary qualifies may the broader W02 sequence be considered.

**W02 NOT RUN.**  
**VERITAS DECISION NOT ISSUED.**  
**RECEIPT NOT CREATED.**  
**LEARNING LEDGER NOT UPDATED.**  
**DEPLOY NOT PERFORMED.**  
**MERGE NOT PERFORMED.**  
**PUSH NOT PERFORMED.**
