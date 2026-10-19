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


## K2 closure reconciliation — 2026-10-18 (pending K1 review)

This reconciliation corrects the coordination gap after H-010. It records completed work **without granting installation or Veritas authority**. Owner requested reuse-before-build, canonical Formula and full Investigate → Diagnose → Plan → Implement → Test → Validate → Repair → Retest → Verify → Evidence execution. This ledger update is evidence bookkeeping, not a second installer or runtime.

| ID | Classification | Completion / proof | Remaining boundary | K1 acceptance |
| --- | --- | --- | --- | --- |
| H-011 | ALREADY BUILT | PR [#40](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/40), merge `00bb2fd0ed8df158d5c923621f77dda1639f4c44`: observer no longer reads iLoader private account/preferences content | Saved files cannot prove current authorization | REVIEW REQUESTED |
| H-012 | ALREADY BUILT | PR [#41](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/41), merge `9e7cd9a8a0c4b6ae7a492428dee5eccab2204f4d`: uninspected status explicitly NOT_OBSERVED | Unknown is not absence or authorization | REVIEW REQUESTED |
| H-013 | ALREADY BUILT | PR [#42](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/pull/42), merge `5392d7d9afc4220b6dd465f0be15b42703e2d5ab`: regression tests for observer and planner fail-closed trust boundary | No installation executor granted | REVIEW REQUESTED |
| H-014 | ALREADY BUILT | [Apple exported receipt](evidence/apple/artifacts/iphone11-metal-receipt-20261018.json) and [integrity replay](evidence/apple/G19-IPHONE11-LOCAL-RECEIPT-INTEGRITY-20261018.md): 256 Metal lanes, 0 mismatches, both hashes replay PASS | Local receipt verification is not canonical Veritas PASS | REVIEW REQUESTED |
| H-015 | PARTIALLY BUILT | [Build-27 IPA acceptance](evidence/apple/G19-DIRECT-ILOADER-ACCEPTANCE-20261018.md): v0.1.27/build27 source IPA hash verified | Earlier physical receipt came from different IPA: exact build-27 device installation/lineage NOT VERIFIED | REVIEW REQUESTED |
| H-016 | MISSING GLUE / NOT ESTABLISHED | [Receipt protocol](docs/APPLE-NATIVE-RECEIPT-PROTOCOL.md) defines external verifier handoff | Must locate existing canonical signed verifier decision, Runtime Fabric consumption, and Learning Ledger admission before implementing any integration | REVIEW REQUESTED |

### Closure gates and evidence ownership

- **K1**: review H-011–H-016 and reconcile upstream PR merges; validate canonical governance, Formula contract and independent receipt authority before marking shared gate complete.
- **K2**: locate supported non-secret evidence for exact installed IPA identity, external verifier decision and Runtime Fabric/Learning Ledger handoff. Preserve previously verified local receipt and source IPA. Never invent a decision from folder presence or hash replay.
- **K1/K2 shared**: record findings under [Issue #37](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/37) with paths, commit SHAs, PASS/FAIL/NOT_OBSERVED, and explicit K1 acknowledgment. Run or repeat an implementation/test **only for a proven gap**.
- **No automatic installation**: signing, pairing, install, rollback, certificate and account mutations require separate qualified authority and owner consent. This record authorizes none.
