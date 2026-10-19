# LeeWay Device Bridge contributor coordination

## Authority and working law

Creator authority governs this repository. K1 owns integration and final evidence review; K2 owns the native Apple preflight and physical-delivery lane. Neither lane may declare a shared milestone complete alone.

Every lane follows this loop:

> Investigate → Diagnose → Plan → Implement → Test → Validate → Repair → Retest → Verify → Evidence

Source, browser observation, build qualification, physical-device execution, Formula evaluation, Veritas approval, and receipt verification are distinct states. A missing fact remains `NOT_OBSERVED`; no contributor may infer it from a device name, saved login, package presence, or prior success.

## Active contributors and helpers

| ID | Role | Responsibility | Mutation boundary | Status |
| --- | --- | --- | --- | --- |
| K1 | Integration and governance | Own this ledger, merge scoped work, preserve the existing Device Operator and Runtime Fabric boundaries, and verify cross-lane evidence. | `CONTRIBUTORS.md`, shared integration/docs after review | ACTIVE |
| K1-H1 | K1 helper — evidence historian | Audit repository evidence and commits into a dated, non-secret history report. | New file only under `evidence/coordination/` | COMPLETED; K1 ACKNOWLEDGED |
| K2 | Native Apple preflight | Define the supported read-only Apple/iLoader evidence input and close diagnostic gaps without mutating credentials, certificates, pairing, packages, or the phone. | New K2-scoped source/docs/tests only | DISPATCHED |
| K2-H1 | K2 helper — provider research | Identify supported, non-secret sources for Apple signing/profile evidence and report feasibility to K2. | K2 helper report only; no shared-ledger edits | PENDING K2 DISPATCH |

## Shared acceptance gates

| Gate | Required evidence | Current state |
| --- | --- | --- |
| Package integrity | Source release, intended bundle ID/version, complete SHA-256 match | Apple build-27 hash recorded; no new package selected in this lane |
| Host transport | Fresh physical connection observation | Windows/iLoader observer saw USB transport on 2026-10-18 |
| Apple authorization | Fresh non-secret evidence of current authorized account and signing identity | NOT OBSERVED |
| Provisioning compatibility | Fresh profile/device/bundle/entitlement compatibility evidence | NOT OBSERVED |
| Install | Owner-approved install result for the intended package | NOT EXECUTED in this adapter lane |
| Launch and native Metal | New physical launch and direct Metal probe for the installed build | Prior local probe reported; independent current proof pending |
| Independent verification | Veritas/Device Bridge receipt acceptance | PENDING |

## Handoff ledger

| ID | Date | Contributor | Work completed | Evidence | Blockers / requested help | Receiving acknowledgment |
| --- | --- | --- | --- | --- | --- |
| H-001 | 2026-10-17 | Prior Apple lane | Apple PWA browser path and native IPA delivery path separated. | `docs/APPLE-PWA-DEVICE-BRIDGE.md`, `docs/APPLE-DIRECT-ILOADER-DELIVERY.md` | PWA cannot directly call Metal; native IPA is required for direct Metal. | K1 recorded boundary. |
| H-002 | 2026-10-18 | Prior Apple lane | Native iOS package build `0.1.27` / build `27` qualified by source build and digest. | Issue #37 evidence references `evidence/apple/G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md` | Physical install/launch/new probe and independent receipt were pending at qualification time. | K1 recorded as build evidence only. |
| H-003 | 2026-10-18 | Prior device observation | iPhone screen reported local Metal readback: Apple A13 GPU, 256 lanes, zero mismatches, local receipt generated. | Existing Apple evidence and prior posted contributor note | External receipt verification, Formula, and model inference remain unverified. | K1 preserves observed/pending distinction. |
| H-004 | 2026-10-18 | K1 | Device Bridge UI consolidated into Apple, Android, Windows, and Linux lanes; technical JSON moved behind expandable evidence. | Commit `9204710`; `evidence/apple/G19-DEVICE-BRIDGE-PLATFORM-CONSOLIDATION-20261018.md` | SideStore phone sign-in remains independently blocked. | Published Pages interface inspected; K1 accepted UI boundary. |
| H-005 | 2026-10-18 | K1 | iLoader persistence guide added; selected server and saved credentials are documented as supported local state, not perpetual Apple authorization. | Commit `9204710`; `docs/ILOADER-PERSISTENCE.md` | Apple session expiry/renewal remains external. | K1 accepted. |
| H-006 | 2026-10-18 | K1 | Deterministic cross-platform Installation Adapter dry-run added. | Commit `c09a6cf`; `operator/installation-adapter.mjs`; `docs/INSTALLATION-ADAPTER.md` | No execution adapter yet. | Fixture tests passed; K2 review requested. |
| H-007 | 2026-10-18 | K1 | iOS/iPadOS, Android, Windows, macOS, Linux, and unsupported-target dry-run routing covered. | Commit `3f5f19c`; `tests/installation-adapter.test.mjs` | Desktop routes are dry-run only, not native installer qualification. | K1 accepted test boundary. |
| H-008 | 2026-10-18 | K1 | Read-only Windows/iLoader observer added and executed locally. | Commit `81b61bf`; `operator/windows-iloader-observer.mjs`; `evidence/installation/G19-WINDOWS-ILOADER-READONLY-OBSERVATION-20261018.json` | Account authorization, signing identity, certificate, profile, device enrollment, and entitlements remain not observed. | K2 review requested. |
| H-009 | 2026-10-18 | K1-H1 → K1 | Completed a repository-wide, non-secret evidence audit and reconciled physical observation, build qualification, and pending gates. | `evidence/coordination/K1-H1-EVIDENCE-HISTORY-20261018.md` | Earlier local Metal receipt evidence does not bind the later `0.1.27` / build `27` release candidate; latest-package physical qualification remains pending. | K1 acknowledged; K2 must preserve this version-binding boundary. |
| H-010 | 2026-10-18 | K1 + K2 | K2 reviewed PR #39 source semantics; K1 verified published-head focused tests and merged conservative Windows/iLoader observer repair. | [PR #39](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/39); merge `df9a6903efdd7afa7845d18f8ef1cb9e21a69c48` | Qualified positive exact-device and signing observations still missing; unrelated Android Build Voice contract workflow failed. | K1 accepted fail-closed semantics; K2 source review recorded in Issue #37. |

## Current work split

### K1 — integration, evidence, and governed adapter contract

1. Receive K1-H1 history audit and reconcile it against this ledger.
2. Review K2’s preflight design for compatibility with `operator/installation-adapter.mjs`.
3. Maintain tests, documentation, Pages evidence, contributor acknowledgments, and Runtime Fabric handoffs.
4. Do not add a second runtime, Formula, Veritas authority, or credential store.

### K2 — Apple read-only preflight completion

1. Dispatch K2-H1 and record the helper’s scope in this ledger through a K2 handoff.
2. Identify legitimate, non-secret sources for: iLoader account authorization status, signing identity presence, certificate validity, provisioning profile compatibility, device membership, and entitlement compatibility.
3. Implement only a read-only evidence input/adapter and tests. Missing facts must remain `NOT_OBSERVED`.
4. Return a K2 evidence report, tests, source paths, limitations, and an explicit K1 review request.

## Operating boundaries

- Never read, print, commit, or transmit passwords, tokens, Anisette headers, pairing records, private keys, or credential-store contents.
- Never reset Anisette, revoke certificates, delete pairing, uninstall the Device Bridge, or modify the phone as a diagnostic shortcut.
- No physical install occurs without an intended package, package-hash match, a fresh preflight, owner authorization, a rollback/data-preservation plan, and recorded result.
- Contributors report checkpoints in this file and may not self-certify a shared acceptance gate.

## Recovery reconciliation — K1/K2 shared review (2026-10-18)

**Authority:** Owner request to stop redundant work; K1 Codex transcript audit; independent K2 conclusions; existing K1-H1 historian; Issue #37. These are evidence classifications, not a new implementation or external verifier decision.

| Handoff | Lane | Established fact | Remaining boundary | K1 disposition / K2 acknowledgment |
| --- | --- | --- | --- | --- |
| H-011 | K1 + K2 | PRs #40, #41, #42 merged following K2 compatibility/source reviews; fail-closed iLoader observation and regression tests preserved. | No qualified positive pairing/signing observer | K1 incorporated K2 reviews; no repeat build. |
| H-012 | K1-H1 + K2 | Prior native iPhone Metal local PASS (Apple A13, 256 lanes, zero mismatches), receipt exported and deterministic local hashes independently replayed PASS; evidence under `evidence/apple/`. | Receipt declares `PENDING_EXTERNAL_VERIFICATION`; not a Veritas signature or Ledger admission | K1 accepts local-only PASS; K2 independent review conclusion agrees. |
| H-013 | K1 + K2 | Source IPA v0.1.27/build27 digest `833d88a1...` and ARM64/Info.plist/Metal resource qualification complete; owner-designated iPhone/iLoader GUI evidence recorded. | Earlier physically observed receipt-enabled IPA digest `9457b8bd...` differs; exact build27 physical install identity not proven | Both reviews preserve lineage; no repeat local probe. |
| H-014 | K1 evidence-vault inventory | Read-only inventory of `C:\\LeeWay-Evidence-Vault` found four top-level Gemma/Agent Lee files and no directories. | This folder does not establish full Runtime Fabric/Veritas/Evidence Vault storage; search canonical receipt authority separately | K1 read-only observation; not external acceptance proof. |

### Next jointly reviewed work — no duplication

1. **K1 + K2:** Discover the existing canonical Veritas receipt acceptance, Runtime Fabric receipt consumer and Learning Ledger provider before altering code or importing a second record. Confirm repository/path/commit and matching receipt/evidence SHA-256, or explicitly record `NOT_FOUND_IN_SCOPED_SEARCH`.
2. **K2/J7:** Search existing signing and installed-version evidence for exact source v0.1.27/build27 digest before asking owner to install anything. Do not replace earlier local physical acceptance.
3. **K1:** After evidence comparison, produce one pass/fail master checkpoint with provenance; request only the smallest truly missing execution step and separate owner authorization if physical changes are needed.

**Operating law:** Investigate → Diagnose → Plan → Implement → Test → Validate → Repair → Retest → Verify → Evidence. Apply reuse-before-build classification `ALREADY BUILT / PARTIALLY BUILT / MISSING GLUE / TRULY MISSING`; one authority chain; no LLM runtime dependency; no fresh Formula/Veritas authority invented. No device, credential or signing mutation in reconciliation.
