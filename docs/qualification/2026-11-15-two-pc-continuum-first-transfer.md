# Two-PC Continuum-First Transfer — Engineering Loop Record

**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Implementation branch:** `feature/two-pc-sovereign-transfer-20261115`
**Implementation source:** `f1b6eb710c7f6216aaa06da7c584f9f93274859c`
**Baseline:** `2eb0328a5e5f678e718b0a637d93564fa1a2eb62` (`main`)
**Authority:** Creator explicitly authorized the Two-PC (`pc-primary` ↔ `pc-hp-secondary`) implementation and requested a clean promotion branch on 2026-11-15.
**Scope:** desktop/relay source contract and local test fixtures. Phones, production secrets, Formula, independent Veritas, Receipt Ledger, Learning Ledger, and physical host configuration are excluded.

## Expected and observed state

Expected: both PCs expose different node identities and independently addressable Diagnostics/Digital Brain state. Stage one transfers bytes to the receiving PC's Continuum container only, registers the Digital Brain record as `inContinuum: true` and `materializedToWindowsOs: false`, and does not write those bytes to its workspace. Stage two may materialize the exact staged bytes only with `explicitUserRequest: true`, after SHA-256 verification. An owner-injected `LEEWAY_USER_SUBLINK_URL` supports peer staging when cloud consciousness is unavailable.

Observed before this source repair: current `main` had no `apps/desktop/digital-brain.mjs` or `operator/workstation-relay-agent.mjs`; its configuration schema did not distinguish a remote relay from a local workspace-bound desktop. The currently available live Device Bridge connector is read-only and its production probes previously returned upstream adapter/discovery failures for `pc-hp-secondary`; no physical command was attempted here.

Smallest repair: add a per-node Continuum/Digital Brain implementation, a workstation relay capability endpoint, three bounded transfer schemas, strict `relay` versus `desktop` config validation, and focused tests. No drive path, token, default remote URL, or cloud-consciousness dependency is embedded in source.

## Safety and rollback

- `DigitalBrainEngine` stores stage-one bytes under the injected Continuum root, never the receiving workspace.
- Materialization accepts only a relative destination and only `explicitUserRequest: true`; it writes a temporary file, verifies SHA-256, then renames it.
- The relay and sub-link URLs are owner-injected; credentials in URLs are rejected. The sub-link uses an injected peer client and activates only when the caller marks cloud consciousness unavailable.
- `pc-hp-secondary` requires the same host-injected Windows identity properties as `pc-primary`; config alone does not establish identity or admission.
- Rollback: revert `f1b6eb7`. No hosts, relays, registry records, secrets, device files, or production deployments were changed by this source commit.

## Engineering loop

| Stage | Status | Evidence |
| --- | --- | --- |
| Investigate | EVIDENCED | Inspected `AGENTS.md`, this protocol, current main's MCP server/schema/relay client, and existing Continuum tests. |
| Diagnose | EVIDENCED | Main lacked the requested Digital Brain and workstation relay modules and did not encode relay/workspace exclusivity. |
| Plan | EVIDENCED | Add narrowly scoped transfer capabilities and owner-injected sub-link peer transport; do not merge the divergent 108-commit branch. |
| Implement | PASS | `f1b6eb7` adds the engine, agent, schemas, strict configuration boundaries, and tests. |
| Test | PASS (focused) | Command below: 3 passed, 0 failed. |
| Validate | PASS (source contract) | The test proves two different node IDs, stage-one absence from the HP workspace, Continuum readback, explicit materialization, SHA-256 parity, and sub-link staging while cloud is unavailable. |
| Repair | NOT_TRIGGERED | Focused transfer tests passed on first executable run. |
| Retest | NOT_TRIGGERED | No repair was required after focused test pass. |
| Verify | BLOCKED (physical) | The session has no mutation-enabled Device Bridge command, file, process, screen, or Formula/Veritas/ledger authority for either live PC. |
| Evidence | PASS (local) | This record and `evidence/2026-11-15-two-pc-continuum-first-transfer.json` are committed after the implementation source. GitHub readback remains required after push. |

## Test evidence

Passed on this source checkout:

```text
node --check apps/desktop/digital-brain.mjs
node --check operator/workstation-relay-agent.mjs
node --test tests/mcp/two-pc-sovereign-transfer.test.mjs
```

Result: `3 passed, 0 failed`, exit `0`.

The added test proves only local source behavior with temporary fixture directories and injected peer transport. A broader run of pre-existing relay/MCP tests was attempted, but package installation cannot complete in this environment because the package manager is denied creation of the workspace symlink `node_modules/@leeway/device-relay-client` (`EPERM`). A transient partial install also produced unrelated failures in the pre-existing stdio process and relay-timeout tests. Those failures are not classified as passing and are not attributed to this repair.

## Veritas, receipts, and promotion

`Formula`: **NOT EXECUTED**. `Independent Veritas`: **NOT EXECUTED**. `RECEIPT NOT CREATED`. `LEDGER NOT UPDATED`. The local Bridge receipt structure remains controller observation and explicitly reports `formula: NOT_EVALUATED`; it is not a Formula/Veritas result.

This branch is a clean source-promotion candidate, not an authorization to update `main`. Required next gates are: (1) a dependency-capable CI run, (2) a trusted Runtime registry/admission binding for both Windows nodes, (3) a mutation-enabled owner-scoped Device Bridge grant, (4) a real owner-approved stage and materialization operation, and (5) actual Formula → Veritas → Receipt → Ledger provider responses and readbacks. Only then may production acceptance be claimed.

