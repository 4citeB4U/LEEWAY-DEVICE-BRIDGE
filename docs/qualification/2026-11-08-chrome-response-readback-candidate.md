# Chrome response readback candidate — 2026-11-08

## Identity and scope

- Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- Work item: `LEEWAY-SELFHOST-CORE-FIVE-W01`
- Acceptance slice: `CORE_SELF_HOSTING_VERTICAL_SLICE_V1` → `W02-DEVICE-BRIDGE / governed-device-read`
- Candidate PR: `#97`
- Pinned Device Bridge base: `45323fe0d001cef94706b299b3dd55b8ed843021`
- Candidate head: `dda8a2e960ba9a6642eac72b64e219fc34d5605c`
- Pinned Runtime Fabric: `c686dfa0082c3117d0ca1f1dd8ac5d94fddb5cac`
- 17-repository source-lock SHA-256: `B00601B146E528EDCF55AF82E386A17112E4AA46B845C730EC5E9E0E268E9731`
- Changed source: `apps/desktop/windows-ui-sessions.mjs`
- Changed tests: `tests/mcp/windows-ui-composer-contract.test.mjs`
- No Runtime, host-composition, Formula, Veritas, Receipt, Learning, or deployment source was changed.

## Review findings and smallest repair

The automated review of the preceding candidate head `b678bcad2894c190da7fc2b84ebc1aa48ec22d05` identified:

1. **P1 — missing scope-specific engineering-loop record.** This record supplies the required source identity, commands, failures, rollback, engineering-loop states, and production limits.
2. **P2 — stale response matches.** A prior assistant match could survive a later user-turn marker. The read loop now clears matches at the user boundary and accepts nonce text only after a user turn has been observed.
3. **P2 — browser identity checked only once.** The read loop now revalidates process start identity, HWND, title, and exact browser URL on every poll.
4. **P2 — digest differed from returned text.** The response is bounded first; the returned bounded text and its SHA-256 are now computed over the same bytes, with `responseTextTruncated` exposed.

The repair preserves one existing Device Bridge authority. It does not create a relay, second control plane, browser launcher, verifier, Formula, queue, ledger, or deployment issuer.

## Ten-stage engineering-loop record

| Stage | State | Evidence |
| --- | --- | --- |
| Investigate | PASS / SOURCE_ONLY | Read `AGENTS.md`, the prior Windows UI qualification record, the pinned Device Bridge source, PR #97 review findings, and the pinned Runtime/source-lock identities. |
| Diagnose | PASS / SOURCE_ONLY | Isolated stale-match retention, one-shot browser identity validation, and full-text-versus-bounded-text digest mismatch. |
| Plan | PASS / SOURCE_ONLY | Chose the smallest repair in the existing `WindowsUiSessions.read()` path plus regression tests and this record. |
| Implement | PASS / SOURCE_ONLY | Updated the read state machine, per-poll identity checks, bounded digest path, tests, and qualification record. |
| Test | PASS / LOCAL SOURCE | Focused composer suite: `10/10`, exit `0`. Full MCP suite: `163/163`, exit `0`. |
| Validate | PASS / SOURCE ONLY | `node --check` for Windows UI, DesktopAdapter, and protocol modules: exit `0`; `git diff --check`: exit `0`. |
| Repair | PASS | Corrected one test fixture after the first attempt failed with the intended `BROWSER_URL_IDENTITY_MISMATCH` guard because mocked `surfaceUrl` was omitted. |
| Retest | PASS | Reran focused and full suites after the fixture correction: `10/10` and `163/163`, all passing. |
| Verify | BLOCKED | No independent Veritas evaluation, live Device Bridge execution, current UIA response read, or production qualification was performed. |
| Evidence | EVIDENCED / LIMITED | Commits, hashes, diff, test outputs, review findings, and this record are inspectable; evidence remains source-only. |

## Commands and results

- `node --test tests/mcp/windows-ui-composer-contract.test.mjs` → exit `0`, `10/10`.
- `npm run test:mcp` → exit `0`, `163/163`.
- `node --check apps/desktop/windows-ui-sessions.mjs` → exit `0`.
- `node --check apps/desktop/adapter.mjs` → exit `0`.
- `node --check packages/protocol/index.mjs` → exit `0`.
- `git diff --check` → exit `0`.
- `git commit -m "Harden Chrome response readback boundaries"` → exit `0`.
- `git push origin codex/windows-ui-response-readback-w01` → exit `0`.

The first post-repair focused run failed only because the test double omitted `surfaceUrl`; the production identity guard correctly returned `BROWSER_URL_IDENTITY_MISMATCH`. The fixture was corrected, and the final rerun passed. No live command failed because no live command was attempted.

## Expected, observed, and unqualified state

Expected: a source-owned, existing-tab-only Chrome observation/readback path that rejects stale turns, identity drift, nonce mismatch, replay, timeout, and ambiguous text before any downstream admission.

Observed: the candidate source now contains those local fail-closed checks and passes source tests. The new Vercel deployment is preview-only and is not the active Device Bridge host.

Still unqualified: the live carrier reports `uiControl:false`, has zero browser sessions, omits live `device.windows.window.submit` and `device.windows.window.read`, and has no independently evidenced five-agent message exchange. Existing signed-in UI surfaces and prior visible responses are controller/UI observations only.

## Rollback and acceptance limits

- Rollback: revert the scoped candidate commits `dda8a2e...`, `10835ca...`, `b678bca...`, and `7ddff5c...` to the pinned base if owner review rejects the source candidate. No production rollback is required because nothing was promoted.
- No credentials, cookies, CDP flags, browser processes, host composition, Runtime source, or authority artifacts were changed.
- `VERITAS: NOT ISSUED`.
- Canonical Receipt: `NOT CREATED`.
- Learning Ledger: `NOT UPDATED`.
- Production Final Execution Layer: no handoff.
- Current gate: `SOURCE CANDIDATE TESTED; LIVE CHROME ATTACH, CORRELATED RESPONSE, INDEPENDENT VERITAS, CANONICAL RECEIPT, LEARNING ADMISSION, AND PRODUCTION HANDOFF UNQUALIFIED`.

## Next authorized action

Obtain owner review/merge/deployment and reconcile the Device Bridge ↔ Runtime response envelope. Then re-probe the actual production carrier and qualify one non-mutating Chrome round trip with independent PRE/POST evidence before any five-agent message exchange.
