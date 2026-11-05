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



## K1 handoff — 2026-11-05 Model Hub-first search release and live boundary

K1 merged Device Bridge PR #89 to `main` as `a0e2e0273bff5c202c7083891e3521c3c337a846` and Runtime Fabric PR #159 to `main` as `2bc2d76722f2d55ec94439931e4481e82cef0255`, following the Creator's direct-to-main instruction. Vercel production deployments are READY on those exact commits: Device Bridge deployment `dpl_Ct5XWoM6ZUAxUewD397v52pKCdnU`; Runtime Fabric deployment `dpl_FENrBkUg4iy6nK1yYRc3R4JKKRGw`. Pre-merge focused tests passed (Device Bridge 14/14; Runtime 16/16), and the recorded PR workflow checks passed. These establish source/CI/deployment status only.

Fresh owner-scoped Runtime readback still does not advertise `model.hub.catalog` for `pc-primary`; discovery says `CONFIGURED_NOT_PHYSICALLY_PROBED`. Local read-only HTTP probes returned Model Hub `/health` 200, `/v1/catalog` with five entries, and Runtime carrier `/health` 200. The Runtime health projection reports Model Hub `UNAVAILABLE` and Device Bridge route `NOT_OBSERVED`; local Model Hub status reports no selected/active model, backend `OLLAMA`, and no qualified LeeWay GPU binding. Port 4271's previously used local Bridge health route was unreachable. The `AgentLee` Windows service is stopped/automatic, but its relation to the Device Bridge MCP listener is NOT_OBSERVED and must not be assumed.

**Remaining acceptance boundary:** discover the canonical Bridge host service and its supported `LEEWAY_MODEL_HUB_URL` binding, update/restart only that proven service through the authorized LeeWay route, then require live capability discovery and an owner-scoped catalog query through Runtime with a device-bound receipt. No host environment change/restart, inference, Formula evaluation, independent Veritas decision, canonical execution receipt, or Learning Ledger admission occurred. LeeWay GPU-only inference and Continuum-backed model-asset admission remain separate gates. K1 records this handoff; live Model Hub-through-Bridge remains **NOT QUALIFIED**.

### Closure gates and evidence ownership

- **K1**: review H-011–H-016 and reconcile upstream PR merges; validate canonical governance, Formula contract and independent receipt authority before marking shared gate complete.
- **K2**: locate supported non-secret evidence for exact installed IPA identity, external verifier decision and Runtime Fabric/Learning Ledger handoff. Preserve previously verified local receipt and source IPA. Never invent a decision from folder presence or hash replay.
- **K1/K2 shared**: record findings under [Issue #37](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/37) with paths, commit SHAs, PASS/FAIL/NOT_OBSERVED, and explicit K1 acknowledgment. Run or repeat an implementation/test **only for a proven gap**.
- **No automatic installation**: signing, pairing, install, rollback, certificate and account mutations require separate qualified authority and owner consent. This record authorizes none.


### K1 addendum — host binding scope check (2026-11-05)

A fresh local environment-scope check found `LEEWAY_MODEL_HUB_URL` absent from Process, User, and Machine scopes. Local Model Hub HTTP health/catalog still respond, while local port 4271 is unreachable and Runtime's owner-scoped device capability list omits `model.hub.catalog`. This supports a missing host adapter binding as a concrete gap but does not identify the adapter service or authorize starting/reconfiguring one. The automatic-start Windows service named `AgentLee` is stopped; its ownership of the Device Bridge MCP listener is NOT_OBSERVED. The next action remains identify the authoritative Bridge process/lifecycle, then apply the binding through its supported LeeWay service configuration and requalify the live Runtime query.


## Creator architecture correction — 2026-11-05 — no PC-primary dependency

This instruction supersedes the earlier K1 Model Hub handoff that proposed Runtime → Device Bridge → `pc-primary` → local Model Hub. **Do not use `pc-primary` or the owner's PC as the Model Hub, GPU, or Continuum execution host for the standalone LeeWay system.** No local binding, grant, process restart, or GPU activation was made.

Fresh primary-source review found the deployed Model Hub project is not a live hosted inference API: its Vercel project reports `live: false` with SSO protection; GET `/health` and `/v1/catalog` on the production domain return 404. The Model Hub README explicitly separates GitHub source/catalog/UI from persistent inference compute and says no authenticated public inference endpoint or qualified physical LeeWay GPU LLM provider is bound. The Edge GPU README requires trusted provider bindings and full governed acceptance; its source/contract evidence is not a cloud GPU runtime. Continuum's README labels its repository source-only and live production integration unqualified. The active Vercel projects contain Runtime Fabric and Device Bridge, but no evidence yet establishes an independent hosted Model Hub + LeeWay GPU + Continuum service path.

To prevent accidental reuse of the rejected device path, Runtime Fabric main removed the `bridge_model_hub_catalog` tool in commit `4bfb89a8e4863a9a1b6f6aa13df1c1a8e94269d2`. The Device Bridge catalog adapter commit remains source/deployed but is not accepted as the standalone-system integration and must not be invoked through `pc-primary`. **Next gate:** identify the canonical LeeWay-hosted service contract and deployed Model Hub/GPU/Continuum provider, implement the direct ecosystem-to-ecosystem binding using existing LeeWay authority, and qualify it without a workstation/device dependency. Keep model inference unavailable until LeeWay GPU, Continuum, Formula, LDWMD, Veritas, and receipt gates are actually proven.


## K1 follow-up — hosted catalog path on Runtime Fabric main — 2026-11-05

The Creator's no-PC-primary correction has been applied to Runtime Fabric `main`. Commit `0e90d29e376dccc73139c39a5209439f289c0e87` adds the read-only `leeway_model_hub_catalog` Runtime MCP tool. It fetches only the HTTPS LeeWay-hosted static catalog at `/catalog/models.json`, requires no `deviceId`, contains no call into Device Bridge, rejects non-allowlisted/local endpoints and redirects, bounds response/query size, validates the catalog schema, and labels asset presence, residency, and inference admission `NOT_ESTABLISHED`. Runtime's prior `bridge_model_hub_catalog` device-bound tool had already been removed in `4bfb89a8e4863a9a1b6f6aa13df1c1a8e94269d2`.

The main-branch source was read back. Focused source tests passed 4/4 before push; the push-triggered Runtime Fabric workflow completed successfully (run `42108560185`), and Vercel production deployment `dpl_AC7y7inP6ogHgFGSRzJapLGkLzyN` is READY on the exact `0e90d29` commit. A direct hosted-catalog query using the helper returned five catalog entries; this verifies static catalog retrieval only. The active ChatGPT connector exposed in this session still lists only device-scoped tools, so invocation of the newly deployed Runtime MCP tool from this chat is `NOT_OBSERVED`. No `pc-primary` tool was called, and no host configuration, process, GPU, or local device state was changed.

**Remaining gate:** provide/refresh an authorized connector binding to the deployed Runtime MCP tool and execute a live catalog call through it. Then separately identify and qualify a standalone LeeWay Model Hub asset/residency service, LeeWay GPU inference provider, Continuum persistence binding, and Formula/LDWMD/Veritas/receipt chain. The static catalog does not establish those services, model availability for inference, or production readiness. Do not reinstate a device-host route as a workaround.

## K1 follow-up — hosted execution and connector gates — 2026-11-05

Read-only cross-repository/deployment investigation after the direct hosted-catalog Runtime release found the following exact boundaries:

- **Runtime connector:** Runtime Fabric main includes leeway_model_hub_catalog in commit 0e90d29e376dccc73139c39a5209439f289c0e87 and production deployment dpl_AC7y7inP6ogHgFGSRzJapLGkLzyN is READY. The current ChatGPT connector surface in this session still exposes only the prior Runtime/Device Bridge read-only tool set and does not expose the hosted catalog tool. No supported connector-refresh/configuration operation is available in this session's tool surface; therefore a live call through the current connector is NOT_OBSERVED. No pc-primary tool was called.
- **Model Hub:** 4citeB4U/LeeWay-Model-Hub main describes its executable Node server as a local candidate. src/server.mjs defaults to 127.0.0.1:8879; the repo has no api/ directory or vercel.json route. Vercel project leeway-model-hub reports live:false, SSO protection enabled, and its deployed /health and /v1/catalog routes return 404. The public static catalog is available, but model asset storage, residency and inference are not established there. Its GPU consumer further requires trusted startup authentication and independent qualification/result verifier callbacks.
- **LeeWay Edge GPU:** 4citeB4U/LeeWay-Edge-GPU main at d7347eddeb1db3423f322fdc599c82e5f26eae5f has package start serve -s . -l 8080; fly.toml declares one shared CPU and 256 MB, not an inference GPU. The latest Fly deployment workflow run 40146848637 failed because FLY_API_TOKEN was empty (no access token available), before any deployment could prove service availability. Source and historical bounded GPU experiments remain distinct from hosted model inference.
- **Continuum:** 4citeB4U/LeeWay-Continuum main README labels the repo source-only and live production integration NOT QUALIFIED; it says its original owner service is in local PC modules. That host binding is not an acceptable standalone path. The connected Railway account exposes one project with a single MySQL service and no Continuum/GPU service. No Continuum-hosted asset/read/write path was proven.

**Diagnosis:** catalog lookup is the only newly deployed standalone LeeWay service-to-service capability. There is no verified hosted Model Hub inference API, no active hosted LeeWay GPU model-execution provider, and no qualified Continuum production authority. The active connector also cannot yet call the new catalog tool. GitHub source, Vercel READY status, and a static catalog do not fill those runtime gaps.

**Next action:** provision or identify an already-authorized, independently hosted LeeWay GPU execution runtime and Continuum authority, with no owner-device dependency; deploy and qualify the Model Hub router with trusted callbacks bound to those LeeWay services; then refresh the ChatGPT Runtime connector through an authorized connector-management path and execute a live catalog call. Until then, inference remains unavailable/unqualified. Do not route model weights or inference through pc-primary or substitute ordinary cloud CPU/GPU APIs outside LeeWay's admitted service identity.

No provider, credentials, paid service, or production configuration was changed. No inference ran; no Formula execution, Veritas decision, receipt, or Learning Ledger admission was produced.

## K1 handoff — ChatGPT tool refresh and VRAM storage boundary — 2026-11-05

OpenAI's current official custom-MCP connection guide says tool updates do not appear automatically; app/workspace owners with permission can refresh the existing custom MCP app's tool list from ChatGPT Apps/Plugins settings after confirming the server connection. See https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt. The newly deployed Runtime Fabric tool is ready, but this agent session has no supported connector-management action, so the owner/admin settings refresh is the remaining ChatGPT-side step. Expected new read-only action: leeway_model_hub_catalog. No ChatGPT app settings were changed here.

LeeWay-VRAM-Database main is explicitly a source candidate: local SQLite metadata/content-addressed encrypted objects pass local tests; optional R2 has mock tests only; live R2 and production C3 binding are unverified. Its own migration contract preserves the existing Runtime Fabric LDWMD allocator and says production Continuum/Veritas/receipt admission remains unproven. It must not become an independent durable store or bypass Continuum. No second allocator or storage authority is to be introduced.

**Owner handoff:** refresh the existing Runtime Fabric custom MCP app's tool list in ChatGPT Apps/Plugins settings, subject to the app/workspace owner permissions. Then invoke only the catalog read action and record its actual result. Continue to withhold inference until independent hosted LeeWay GPU and Continuum authorities are deployed and qualified.