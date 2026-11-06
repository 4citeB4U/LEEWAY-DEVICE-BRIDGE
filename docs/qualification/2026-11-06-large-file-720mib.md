# Device Bridge large-file operations — 720 MiB qualification

**Checkpoint:** 2026-11-06 14:53 America/Chicago (UTC−06:00)
**Canonical repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Working branch:** `codex/device-bridge-streaming-hash-20261106`
**Source lineage:** prior streaming-hash commit `4b1b34d640fea2384f490dbae57fb690a146fd5d`; merged current `origin/main` `baec293231789831ee155f6f669ff6481956be9c` before implementation commit `7193edbb13ef2ab86c9a0f0d6b698fb9288d82fc`. That commit was pushed to canonical `main`. GitHub main readback confirmed the updated source; source blob SHA is `80d119be7fb27a9a5eb7856ae6dc4066a37dbecb`.

## Creator scope and acceptance

The Creator authorized repairing the existing governed file-operation component and testing larger files. **720 MiB is the first acceptance milestone, not a permanent architecture ceiling.** Keep bounded streaming and SHA-256 validation; preserve source/workspace validation, owner grant/admission, no-overwrite behavior and the Bridge's Formula/Veritas/receipt boundaries. Cross-filesystem moves must safely stage, verify, commit and recover. Do not replace the canonical Device Bridge or activate unqualified production behavior.

## Investigate → Diagnose

- Current canonical main had a 64 MiB `MAX_MOVE_BYTES`; `fileDigest` used the same bound.
- The existing move path uses exclusive hardlink then source unlink. It is atomic with respect to destination creation on one filesystem but reports `EXDEV` across filesystems.
- `device.files.append_binary` is a separate resumable operation capped at 128 MiB. It hashes the full file before and after every append, so lifting its limit without redesigning its evidence algorithm would create disproportionate repeated I/O. This change leaves that contract unchanged.
- The current branch's earlier read-only streaming SHA-256 change was preserved and reapplied after merging the latest main. Hashing is bounded to 64 GiB, while move acceptance is currently bounded to 720 MiB.
- Host: Windows, Node.js `v24.15.0`, destination volume E: NTFS. At preflight inspection it had 672.87 GiB free. The 720 MiB test fixture was sparse; no large model or user artifact was moved.
- Governance: Formula health returned `LEEWAY_FORMULA_V1_PASS` for the canonical golden-vector diagnostic. No validated Formula input mapping exists for this software decision, so task Formula execution is `NOT_EXECUTED`. The targeted tests ran against the local adapter, not through a live authorized Device Bridge operation.

## Plan → Implement

Changes are limited to the existing `apps/desktop/file-parity.mjs` and its test/documentation surfaces.

1. Raise the streaming move milestone to 720 MiB while retaining bounded 256 KiB copy chunks and 64 KiB hash chunks.
2. Preserve exclusive hardlink/unlink for same-filesystem moves.
3. When the source-to-destination link returns `EXDEV`, check available destination space, stream to an exclusively created random same-directory staging file, sync and validate the staged bytes and source SHA-256, then commit with an exclusive hardlink. Delete the source only after the destination link is verified.
4. A handled interruption removes the staging file and preserves the source for retry. Existing destinations are never overwritten. If an uncertain failure occurs after destination commit, retain both source and destination for inspection and return reconciliation-required behavior.
5. Add an internal test-only dependency seam; MCP schema, advertised capabilities, owner grants, and admission are unchanged.

## Test → Validate → Repair → Retest

**Environment:** Windows, Node.js `v24.15.0`; E: NTFS; ample verified free space before sparse 720 MiB test allocation.

**Initial test run:** one negative cross-filesystem assertion failed because its injected `EXDEV` error also affected the final staging-file commit. The implementation path correctly reached the final link. The test double was corrected to inject `EXDEV` only on the source-to-destination link. This was a test harness defect, not a product-code repair.

**Retest command:**

```text
node --test tests/mcp/desktop-parity-batch1.test.mjs tests/mcp/desktop-parity-batch3.test.mjs tests/mcp/transfer-directory-parity.test.mjs
```

**Retest result:** 17 passed, 0 failed, 0 skipped. Included:

- Streamed hash and same-filesystem guarded move at 64 MiB + 1 byte and 720 MiB using sparse files.
- Simulated `EXDEV`, injected interruption after the staged write, source preservation, staging cleanup and successful retry through the copy/commit path.
- Existing-destination preservation under the cross-filesystem fallback.
- Insufficient-space preflight fails before copy and leaves source intact.
- Existing guarded move, file identity, symlink/hardlink, binary, append-resume, append-lock, schema and MCP denial regressions.

`node --check apps/desktop/file-parity.mjs`, `node --check tests/mcp/desktop-parity-batch1.test.mjs`, and `git diff --check` passed. The targeted output is local source-test evidence, not a canonical Device Bridge execution receipt.

**Full MCP suite:** `npm run test:mcp` — 120 passed, 0 failed, 0 skipped on the same Windows/Node environment. This includes the targeted cases and the repository's remaining MCP authorization, transport, protocol and regression tests.

## Verify / Evidence state

| Claim | State | Evidence boundary |
|---|---|---|
| Hash-only streaming above 64 MiB | `VERIFIED` | 64 MiB + 1 and 720 MiB sparse-file tests |
| 720 MiB same-filesystem guarded move | `VERIFIED` | Windows/Node local test, sparse NTFS file |
| Cross-filesystem fallback control flow | `VERIFIED` (simulated) | Injected `EXDEV` on the local NTFS host; the physical source and destination were on one filesystem |
| Interrupted-copy retry, no-overwrite and capacity refusal | `VERIFIED` (test fixtures) | Controlled local tests; no production or second-volume operation |
| Resumable append above 128 MiB | `NOT IMPLEMENTED` | Separate contract intentionally unchanged |
| Physical cross-volume copy/recovery | `UNVERIFIED` | No second-volume copy was run |
| macOS/Linux/Android adapters | `UNVERIFIED` | Windows only in this run |
| Live Device Bridge governed operation | `NOT RUN` | No physical device/runtime execution |
| Production release/admission | `NOT QUALIFIED` | No deployment or lifecycle mutation |
| Independent LeeWay Veritas PRE/POST | `NOT RUN` | Skill criteria were consulted; no independent runtime verifier decision returned |
| Canonical receipt / Learning Ledger | `NOT CREATED` / `NOT UPDATED` | None returned for this source-test scope |

## Rollback and recovery

Rollback is a revert of the scoped implementation commit; the prior 64 MiB move limit and its same-filesystem behavior remain the fallback. No runtime state was changed. During a handled interruption, the unique staging file is removed and source remains retryable. A hard process crash can leave a uniquely named partial file; do not auto-delete it without inspection. After destination commit but before source deletion, both paths can remain; inspect hashes and identities before any manual cleanup. Never retry an uncertain mutation blindly through the production bridge.

## Checkpoint and next action

Source and evidence commit `7193edb` is published on canonical `main` and was read back through the connected GitHub repository tool. The full MCP suite passed before publication. Next, qualify a real cross-volume operation and supported platform matrix, then use the authorized release path and fresh governed Device Bridge execution. Existing independent Formula/Veritas/receipt gates remain applicable to production acceptance. The 720 MiB result is a source-and-Windows-test milestone, not an unrestricted transfer claim.
