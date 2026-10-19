# Issue #37 / PR #38 — Emulator UI stop acceptance and merge lineage — 2026-10-18

## Emulator-only UI lifecycle
On ADB serial `emulator-5580`, launched installed review Device Bridge and navigated its actual Android UI with a specific serial selector. Used `uiautomator dump` to identify the START LOCAL DEVICE BRIDGE button, tapped it and confirmed the real guest loopback service via emulator-only host port forward: `GET /health` returned HTTP **200**.

Scrolled to the STOP LOCAL DEVICE BRIDGE button; Android UI hierarchy showed bounds `[42,333][278,381]`. Tapped its center (154,355). Subsequent `GET /health` through the same forwarded loopback port raised a connection WebException instead of returning 200. This confirms the on-screen stop control closes live loopback reachability in this execution. Removed the temporary port forward and explicitly stopped the emulator package.

**Verdict:** On-screen START and STOP native Device Bridge lifecycle **PASS** on isolated emulator. The previous inconclusive stop attempt is superseded by this bounded, observed UI test. No Fold6 mutation.

## PR #38 lineage and scope
GitHub PR API returned 47 changed file paths and no submitted reviews or review threads at last check. GitHub compare `main...issue-37-android-install-preflight-20261018` returned **status diverged**, 57 commits ahead / 13 behind and **merge base 92047100ab3c2696ee2b3e48923c8dad14d53f99**. Thus the histories are **related**. An initial local git merge-tree error `refusing to merge unrelated histories` was caused by the isolated checkout being a **shallow repository** (`git rev-parse --is-shallow-repository=true`); it is not proof of unrelated GitHub histories or an actual merge conflict.

**Conflict-free mergeability remains UNVERIFIED.** Use a sufficiently complete temporary checkout or GitHub PR mergeable metadata before taking a merge decision. No merge, rebase or force-push performed.

## Previously verified
71/71 JVM tests, 2/2 emulator native instrumentation tests; emulator authenticated provisioning read-only HTTP 200; disabled authority 403, enabled without bearer 401; CPU_SAFE_FALLBACK, GPU_UNOBSERVED, canonicalFormulaState NOT_EXECUTED. Physical Fold6 installed signer equality and Adreno correctness remain unknown. No canonical Veritas receipt / Learning Ledger.

## Remaining gates
Fresh non-shallow conflict review, independent PR review, physical signer compatibility, approved physical GPU observation, canonical Formula execution, Veritas and Learning Ledger. Keep PR in draft.
