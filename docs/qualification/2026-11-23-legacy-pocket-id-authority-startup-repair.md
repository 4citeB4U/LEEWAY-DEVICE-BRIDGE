# Legacy Pocket ID authority startup repair

LEEWAY HEADER — DO NOT REMOVE  
REGION: LEEWAY.DEVICE_BRIDGE.QUALIFICATION  
TAG: LEEWAY.POCKET_ID.LEGACY_STARTUP.AUTHORITY_REPAIR.2026_11_23  
WHO: Codex, Creator-authorized local engineering contributor  
WHAT: Remove fabricated Runtime, device, Formula, Veritas, and receipt authority from the legacy Pocket ID launcher  
WHEN: 2026-11-23T07:54:14-06:00  
WHERE: `operator/identity/start-pocket-id-mcp.mjs`  
WHY: Windows host observation is evidence, not device enrollment or execution authority  
HOW: Fail closed and require the canonical host-injected Runtime composition through the universal startup path  
AUTHORITY: Source repair only; no production enrollment, deployment, Formula decision, Veritas decision, or receipt  

## Identity, continuity, and source

- Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- Branch: `codex/authority-startup-fail-closed-20261123`
- Base: `8a5cf68673e3e363f23db69797460bf5bc18e7d1`
- Repair commit: `d2092539dd19735b5235ddc8b0e2d0a0356a1575`
- Existing dirty and active Device Bridge trees were preserved. This repair used an isolated worktree.
- Current C3 checkpoint: source startup authority repaired; signed device enrollment and live Runtime composition remain unbound.

## Expected and observed

Expected: a local host probe may contribute identity evidence, but only an injected, qualified Runtime composition may supply a device registry, Formula gate, independent Veritas gate, receipt sink, issuer registry, replay guard, or execution authority.

Observed on Bridge `main`: `buildHostInjectedC3Composition()` read Windows CIM data, assigned the fixed key `pc-primary`, defaulted an owner subject, set `formulaPreGate` and `veritasPreGate` to unconditional success, and wrote a local JSONL record. The CLI path attempted that composition automatically on Windows. This made an unqualified local observation look like trusted Runtime authority.

Smallest repair: remove the self-created composition and automatic Windows binding. The exported legacy composition function now fails with `TRUSTED_RUNTIME_COMPOSITION_REQUIRED`; the launcher remains authenticated/read-only and receives no manufactured registration authority. Qualified execution continues to belong to `start-universal-pocket-id-mcp.mjs` with host-injected Runtime providers.

## Safety and rollback

- Production impact: none; no live process, service, scheduled task, deployment, credential, registry, passport, or device was changed.
- Permission impact: reduced. The legacy path can no longer generate permission-like objects.
- Rollback: revert commit `d2092539dd19735b5235ddc8b0e2d0a0356a1575`. Reversion is not recommended unless a real Runtime-composition replacement is simultaneously bound and reviewed.
- Scope exclusions: no passport issuance, enrollment, native listener startup, Tailscale/Render change, Formula execution, Veritas execution, receipt issuance, or physical device operation.

## Twelve-stage engineering loop

| Stage | State | Evidence |
|---|---|---|
| INVESTIGATE | EVIDENCED | Clean Bridge main worktree, source readback, blame, current listener/task inventory |
| DIAGNOSE | PASS | Fixed device key, owner default, unconditional gates, and local receipt sink isolated to the legacy startup path |
| PLAN | PASS | Preserve discovery; remove only manufactured authority; keep universal injected-composition path |
| IMPLEMENT | PASS | Commit `d2092539dd19735b5235ddc8b0e2d0a0356a1575` |
| TEST | FAILED then PASS | First run failed because clean worktree lacked `@modelcontextprotocol/sdk`; `npm ci` restored locked dependencies; focused suite then passed 20/20 |
| VALIDATE | PASS for source scope | Complete MCP suite passed 185/185; source assertions reject fixed device/owner and unconditional gates |
| REPAIR | PASS | Removed the self-authorizing composition and automatic Windows injection |
| RETEST | PASS | Focused 20/20 and full MCP 185/185 |
| VERIFY | UNVERIFIED | No independent Veritas provider ran; tests are contributor evidence only |
| EVIDENCE | PASS | This record and `evidence/2026-11-23-legacy-pocket-id-authority-startup-repair.json` |
| CHECKPOINT | PASS | Source state and remaining gates recorded here and in the local LeeWay checkpoint |
| CONTINUE | BLOCKED on higher authority | Next: inject a real Runtime composition and verify a signed registry before starting loopback discovery |

## Exact tests and contrary evidence

1. Initial command:
   `node --test tests/mcp/legacy-pocket-id-startup-authority.test.mjs tests/mcp/universal-pocket-id-startup.test.mjs tests/mcp/windows-passport-registry.test.mjs tests/mcp/runtime-composition.test.mjs`
   - Exit: `1`
   - Cause: `ERR_MODULE_NOT_FOUND` for `@modelcontextprotocol/sdk` in the fresh worktree.
2. Dependency restoration: `npm ci`
   - Exit: `0`
   - Result: 99 packages added from the lockfile.
3. Focused retest: same command as step 1.
   - Exit: `0`
   - Result: 20 passed, 0 failed.
4. Regression suite: `npm run test:mcp`
   - Exit: `0`
   - Result: 185 passed, 0 failed.
5. Dependency audit: `npm audit --json`
   - Exit: `1`
   - Contrary evidence: one indirect moderate-severity `hono` advisory, fix available. This remains a separate security/release blocker and was not silently auto-fixed.

## Governance truth

- Formula source/execution: `NOT EXECUTED`.
- Veritas PRE/POST: `NOT EXECUTED`.
- Canonical Receipt Authority record: `RECEIPT NOT CREATED`.
- Learning Ledger: `LEDGER NOT UPDATED`.
- Live/physical result: `NOT TESTED`.
- Production qualification: `BLOCKED` pending reviewed Runtime composition, signed registry/passport, independent gates, receipt readback, live discovery, and release approval.

## Next smallest action

Bind the clean Runtime candidate to the universal Device Bridge startup with explicit Formula, independent Veritas, Receipt Authority, trusted issuer/replay, and verified device-registry providers. Start on loopback only, prove authenticated discovery, and preserve negative tests before exposing Tailscale or Render.
