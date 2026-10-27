# Device Bridge engineering-loop evidence protocol

LEEWAY HEADER — DO NOT REMOVE  
REGION: LEEWAY.DEVICE_BRIDGE.QUALIFICATION  
TAG: DEVICE_BRIDGE_ENGINEERING_LOOP_EVIDENCE_PROTOCOL  
WHO: LeeWay Industries / Creator-authorized engineers and contributors.  
WHAT: Local documentation procedure for existing LeeWay engineering and Veritas requirements.  
WHEN: 2026-10-27.  
WHERE: Canonical Device Bridge repository, `docs/qualification/` and `evidence/`.  
WHY: Retain verified successes and failures, prevent context loss and false production promotion.  
HOW: Stage-by-stage source/test evidence, signed-authority boundaries and candidate Learning Ledger handoff.  
AUTHORITY: PROCEDURAL GUIDE subordinate to LeeWay Standards, Runtime Fabric, Veritas and canonical ledgers; not a new gate provider.  
LICENSE: Existing repository terms.

## Binding rule for substantial Device Bridge work

Before declaring a substantial task done, merged, or production-qualified, produce a **task-specific engineering-loop record** in `docs/qualification/` and, when inspectable machine-readable facts exist, a separate scoped evidence record in `evidence/`. These are *engineering records*, not newly issued canonical Veritas signatures or Receipt Ledger entries.

The record must include:

1. **Identity, continuity and authority:** repository/branch/PR, exact source commit SHA, owner decisions already approved, rejected alternatives, current C3 checkpoint, affected native/runtime surfaces and dependencies.
2. **Expected vs observed:** expected behavior, observed defect, exact failure boundary and smallest justified repair; note scope exclusions and known consequences.
3. **Safety:** source/runtime identity, production impact, permissions, explicit authorization, backup or rollback, and preservation of prior passing behavior.
4. **Full engineering loop:** `Investigate → Diagnose → Plan → Implement → Test → Validate → Repair → Retest → Verify → Evidence`. Assign each stage the honest status `EVIDENCED`, `PASS`, `FAILED`, `BLOCKED`, `UNVERIFIED` or `NOT_TRIGGERED`, with an inspectable link or an explicit reason. **Do not manufacture a repair or retest** where none occurred.
5. **Exact test evidence:** test command, environment, GitHub workflow/run/job IDs, conclusion and source SHA, plus all meaningful failed or skipped steps. Source CI cannot silently certify later revisions.
6. **Veritas truth:** distinguish contract availability from actual execution, test fixtures from live physical results, Formula source identity from a real evaluator call, PRE from POST and controller observations from independent attestation.
7. **Receipt and learning truth:** list canonical Receipt Ledger and Learning Ledger record IDs/hashes/readbacks *only if actual providers returned them*. Otherwise say `RECEIPT NOT CREATED` or `LEDGER NOT UPDATED` for that scope.
8. **Lessons:** record evidence-bounded successes **and** failures, reproducible root causes, counterexamples, uncertainty, reusable repair and next smallest action. Tag learning proposals as `CANDIDATE`; they cannot become authority or automatic admission.
9. **Promotion:** enumerate the gates still required for real device execution and release. Retain the PR as draft or blocked if any required independent gate remains unproven.
10. **Readback:** confirm the new record exists in canonical GitHub at the intended branch/path, and verify its own source commit and content. Do not rely on an unpushed local note.

## Anti-inflation boundary

- CI `success` proves only the exact steps executed at the reported SHA.
- An MCP `tools/list` proves tool registration, **not** authorization or physical capability.
- A synthetic admission or locally appended receipt is not independent Veritas.
- A GitHub commit is source evidence, not automatically a canonical execution receipt.
- `configured != proven`, `generated != executed`, `executed != independently verified`.
- When a blocker exists, preserve completed unblocked work and identify the specific remaining gate instead of marking the entire task failed or pretending it passed.
- Never duplicate the canonical Runtime Fabric, Formula, Device Bridge, Veritas or ledgers to fill documentation gaps.

## Learning admission order

Engineering observation → reproducible source/test record → scoped validation → independently governed execution evidence where required → canonical receipt/readback → canonical Learning Ledger admission/readback → promoted reusable capability or skill.

Documented source successes can inform later engineering and are preserved immediately; they do **not** wait for production qualification to be archived. Production learning admission, however, cannot be represented as complete before the independent governing dependencies pass.

## Reference implementation

[PR #77 engineering-loop retrospective](DEVICE-BRIDGE-PR77-ENGINEERING-LOOP-20261027.md) and its [machine-readable evidence](../../evidence/DEVICE-BRIDGE-PR77-ENGINEERING-LOOP-20261027.json) are an initial scoped example, not proof that all production gates pass.
