<!-- LEEWAY HEADER — DO NOT REMOVE
WHO: GUARD_FAMILY_5_SIGNAL_SENTINEL.
WHAT: Source and operational evidence for the bounded live-device qualification attempt.
WHEN: 2026-11-15 America/Chicago.
WHERE: docs/qualification/2026-11-15-live-device-qualification.md.
HOW: Separate committed source tests, endpoint observations, and unproven device/provider gates.
WHY: Preserve truthful outcomes without promoting a local test into production authority.
-->
# Live Device Qualification — Guard Family 5

**Disposition: SOURCE TEST PASS / LIVE G4 NOT QUALIFIED / PRODUCTION BLOCKED**

## 1. Identity, continuity, and authority

- Bridge repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- Branch: `feature/device-bridge-g3-g4-spine-20261115`
- Test commit: `7df87cbbab1cf575a72181d876363eea9cfe6854`
- Parent: `26f452f7abd1ac5c794359f466f3479efa3590f5`
- Scope: add a host-plan-gated Guard 5 test for one bounded `pc-primary` workspace write/read and read-only `device.info`/screen capture on canonical Fold6 and iPhone IDs. HP secondary is explicitly blocked until a remote adapter exists.
- The test commit is local only. It was not pushed, merged, or deployed. No GitHub readback exists for this commit. The worktree was clean after the commit.
- Provider source identities observed:

| Provider | Branch | HEAD |
|---|---|---|
| Formula | `feature/g3-g4-attestation-bridge-20261115` | `aff392627c89efb6d20cf2322a89f50d67cbcff7` |
| Veritas | `feature/g3-g4-provider-endpoints-20261115` | `b0c50fa73718da4901f0c9b06d282aa5dbc63223` |
| Receipt Authority | `feature/g3-g4-provider-endpoints-20261115` | `40b1b27c81425beb5471c4155669ffa0d944c684` |
| Learning Ledger | `feature/g3-g4-provider-endpoints-20261115` | `3557c84dd4a6c3f9986d8cfcfb910a6093627532` |
| Runtime source checkout | existing, dirty before this task; not modified | `c1e7d5196145d4c50a872248bc837dfd0237fd96` |

The test contract is in [live-device-qualification.test.mjs](../../tests/mcp/live-device-qualification.test.mjs). It requires a host-only plan outside the repository, verifies the plan's source SHA against the checked-out Git HEAD, excludes the duplicate Fold6 alias from host exposure, records failed admission as `G4_NOT_TRANSITIONED`, saves only screen metadata (not image bytes), and keeps its result outside Git.

## 2. Expected and observed state

### Expected

1. Start the owner-bound Runtime, Formula, independent Veritas, Receipt Authority, and Learning Ledger services on their specified loopback endpoints.
2. Authenticate the native stdio MCP host and prove a bounded `pc-primary` write followed by independent readback with signed Receipt/Learning readback.
3. Use only `phone-fold6` for the one observed Fold6 transport; perform read-only info/view checks on Fold6 and iPhone. Do not use the duplicate LDB ID as another device.
4. Report HP as blocked unless a real remote adapter and trusted registration mapping are present.
5. Preserve exact outcomes; do not infer OS denial from a generic error.

### Observed

- No host-only plan was created or supplied. `LEEWAY_LIVE_QUALIFICATION_PLAN` was unset; the live guard therefore skipped. No MCP host was started by this run.
- No device operation was made: no `device.files.write`, `device.files.read`, `device.info`, or screen capture. The workspace file in the test is UUID-scoped and was not created.
- `pc-primary`'s configured workspace exists.
- `pc-hp-secondary` is configured as a local `desktop` adapter and its configured workspace is missing. This is not a verified remote host. The test blocks it as `NO_REMOTE_ADAPTER`.
- The configured `phone-fold6` and `LDB-04ff1b33-8a70-434c-9aba-8752a30789ee` records use the same serial. Earlier read-only ADB discovery associated them with one attached transport; that transport was not re-probed in this run. The test exposes only `phone-fold6`.
- The configured iPhone hardware ID matched a currently present Windows PnP identity. This does not establish a trusted Apple pairing, screen permission, or successful Bridge operation; none was attempted.
- Runtime and Formula loopback health requests returned HTTP 200. Runtime reported `leeway-runtime-fabric` in `cloud` mode. Formula reported `formula-only`, `LEEWAY_FORMULA_V1_PASS`, and `VERIFIED_AT_STARTUP`; its health explicitly reports other Runtime Fabric services as not restored.
- Listener ownership was unstable. At the 2026-11-15 13:28 snapshot, 4011, 4015, 4312, 4302, 4304, and 4305 had zero visible Windows listeners; 4306 briefly showed one, but an immediate owner lookup found no listener/PID. Earlier snapshots also briefly showed 4015, 4302, or 4305, with the same disappearance. No stable process owner was identified.
- Read-only loopback endpoint observations:

| Port | Endpoint | Result |
|---|---|---|
| 4011 | `/runtime/health` | HTTP 200; `service=leeway-runtime-fabric`, `mode=cloud`; owner/source unresolved |
| 4011 | `/runtime/enforcement/manifest` | HTTP 200; response body not retained; no authorization action made |
| 4015 | `/runtime/health` | HTTP 200; `scope=formula-only`; other Runtime Fabric services not restored |
| 4015 | `/runtime/formula/v1/health` | HTTP 200; `LEEWAY_FORMULA_V1_PASS`, `VERIFIED_AT_STARTUP` |
| 4302 | `/v1/receipts/public-key` | HTTP 200; `leeway-receipt-local-ed25519-v1`, matching the existing local qualification key; no append/readback |
| 4305 | `/v1/ledger/public-key` | HTTP 404; no Ledger admission/readback |
| 4306 | `/v1/ledger/public-key` | HTTP 200; `leeway-ledger-local-ed25519-v1`, matching the existing local qualification key; no admission/readback or stable process owner |
| 4312 | No Veritas verdict request | No stable Windows listener; no PRE/POST executed |

These endpoint observations are not proof of canonical service ownership or authority. Receipt/Ledger route responses do not establish that a service was listening under an identified process.
- A source search of the checked-out Runtime `server/index.cjs` found `/runtime/health` but not the host provider's `/runtime/enforcement/manifest` or `/runtime/authorize-action` routes. That checkout's package describes a management API defaulting to port 4001, not the requested 4011 owner. The 4011 health response therefore remains source-unattributed and was not used for an action.
- The current Bridge host provider [runtime-fabric-host-provider.mjs](../../operator/runtime-fabric-host-provider.mjs) returns a Runtime admission callback and a local JSONL receipt sink, but does not supply a trusted `deviceRegistry`. The strict C3 contract in [runtime-composition.mjs](../../apps/desktop/runtime-composition.mjs) requires trusted registry, adapter registry, Formula PRE, independent Veritas PRE, Receipt sink, trusted issuer registry, durable replay guard, and consent provider. The current endpoint observations did not complete or qualify that composition.
- Earlier in this execution, local qualification keys were created outside Git and local Receipt/Ledger services were attempted on 4302/4306. Those keys are test-only, not production trust roots; the later listener snapshots did not show stable services, and no canonical records were produced. No host configuration or key material was added to the repository.

## 3. Safety, rollback, and admission evidence

- The only committed source change is the gated test. Runtime source, devices, accounts, provider source trees, configuration, and credentials were not changed by this continuation.
- No service was stopped or replaced in this continuation. No remote alias was added. No file was written to the device workspace.
- The test commit can be reversed with `git revert 7df87cbbab1cf575a72181d876363eea9cfe6854`. Rollback was not performed.
- **Evidence for source readiness:** committed, source-SHA-bound test; current MCP regression suite passed.
- **Evidence against live or production admission:** no authenticated native MCP session, no `device.files.write/read`, no screen or info operation, no independent Veritas PRE/POST, no canonical Receipt append/readback, no Learning Ledger admission/readback, no stable owner for the observed loopback endpoints, and no production handoff.
- **Receipt:** `RECEIPT NOT CREATED`.
- **Learning Ledger:** `LEDGER NOT UPDATED`.
- **Veritas:** no PRE/POST decision executed for this scope.
- **G4:** no admission state or admission ID was produced. Do not reuse historical prototype IDs as evidence for this run.

## 4. Engineering loop and test evidence

| Stage | Status | Evidence |
|---|---|---|
| Investigate | `EVIDENCED` | Inspected the committed Bridge host/test surfaces, provider source identities, device configuration facts, and current endpoint responses. |
| Diagnose | `EVIDENCED` | Live path remains unqualified: Runtime source/endpoint ownership mismatch, missing trusted device registry in the host provider, and absent/unstable service ownership. HP has no remote adapter. |
| Plan | `EVIDENCED` | Host-only plan is required; canonical Fold6 ID is used once; iPhone is read-only; HP remains blocked; no physical operation is allowed without the bound host. |
| Implement | `PASS` | Added and committed the gated Guard 5 test at `7df87cbbab1cf575a72181d876363eea9cfe6854`. |
| Test | `PASS` | `node --check tests/mcp/live-device-qualification.test.mjs` — exit 0. `node --test tests/mcp/live-device-qualification.test.mjs` — exit 0, 1 skipped because no plan was supplied. `npm run test:mcp` — exit 0; 215 tests, 212 passed, 0 failed, 3 skipped. |
| Validate | `BLOCKED` | The three skips were: separate-process provider guard (`LEEWAY_PROVIDER_TEST_ROOTS` not set), this live-device guard (`LEEWAY_LIVE_QUALIFICATION_PLAN` not set), and Runtime handler integration (`LEEWAY_RUNTIME_ROOT` not configured for that test). No authenticated live run occurred. |
| Repair | `NOT_TRIGGERED` | No provider authority or production composition was fabricated or edited. |
| Retest | `NOT_TRIGGERED` | No live repair occurred to retest. |
| Verify | `PASS` / live `BLOCKED` | Test commit SHA, parent, provider HEADs, and clean Bridge worktree were verified. Live device and authority verification remain blocked. |
| Evidence | `EVIDENCED` | This scope-specific record preserves source, tests, observed failures, uncertainty, rollback, and remaining gates. |

The previous combined CI run `43749006451` passed at the parent Bridge SHA `26f452f7abd1ac5c794359f466f3479efa3590f5`. It predates this test commit and the subsequent deploy-key rotation; it does not validate this SHA or the current secret contents. No CI run for `7df87cbbab1cf575a72181d876363eea9cfe6854` was triggered because the commit remains local and was not pushed.

## 5. Remaining gates and smallest next action

1. Identify and source-pin the actual owner of the Runtime endpoint at 4011; reconcile its live routes and auth with the checked-out provider before binding any action.
2. Supply the complete trusted host composition from existing authorities, including a real trusted device registry. Do not infer registration from device configuration or HTTP health.
3. Confirm stable, owned Formula, Veritas, Receipt, and Ledger services and verify public-key pins against the exact host-held local qualification keys; keep local qualification distinct from production roots.
4. Only then create a protected host-only plan whose `sourceCommit` matches the exact checked-out Bridge HEAD (the test enforces this), run the authenticated native MCP test, read back exact Receipt/Ledger records, and retain its private result outside Git.
5. Qualify Fold6 once under `phone-fold6`; qualify iPhone only through its verified trusted adapter and owner-approved view; keep HP blocked until a remote adapter and trusted registry record exist.
6. Rerun provider-spine CI after publication to validate the current private-source secrets. Do not merge, deploy, open Funnel, or claim production readiness before independent Veritas, canonical Receipt/Learning readback, and approved production handoff.

**Promotion limit:** local source CI is not physical-device qualification. This record does not authorize or prove production execution.

## Follow-up execution attempt — 2026-11-15 14:26 CST

- Rechecked ports 4011, 4015, 4312, 4302, 4304, and 4305: no Windows listener was present, so there was no process on those target ports to terminate. The only listener was a known Ledger qualification process on 4306, launched from the pinned Ledger worktree by the prior qualification attempt; its lock file names its current PID. It is not bound to a requested target port and was left running rather than force-killed.
- `LEEWAY_LIVE_QUALIFICATION_PLAN` and `LEEWAY_PROVIDER_TEST_ROOTS` remain unset. No plan was fabricated and the live test was not run in this attempt.
- `LEEWAY_RUNTIME_CONTROL_TOKEN` is absent, but the existing `LEEWAY_WORKPLANE_CONTROL_TOKEN` was used only for a read-only authenticated GET of `/runtime/enforcement/manifest` at 4011; it returned HTTP 200. No action authorization or device operation was requested.
- The pinned Bridge host provider still supplies only Runtime admission and a local observation JSONL sink; it does not supply the trusted device registry required by `requireHostInjectedC3Composition`. The checked-in `createC3AdmissionBinding` also fails closed without real Formula PRE and Veritas PRE callbacks. The pinned Veritas G3 endpoint is a post-execution evidence verifier, not that admission PRE callback. The measured provider attests bounded local file read/write only, not health/info or physical VIEW.
- Therefore no provider processes were newly started, no existing process was terminated, no `.skip` was removed, and no physical or workspace MCP operation was attempted. Starting an incomplete spine or making the test fail instead of skip would not produce the requested authorized execution and would risk obscuring the missing authority.
- **Stage result:** `BLOCKED` at complete trusted host composition and source-bound Runtime ownership; no Receipt or Ledger IDs were generated. This follow-up does not alter the previous test results or production admission limits.
