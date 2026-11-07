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

## 2026-11-06 00:15 America/Chicago (-06:00) — Production ingress and Voice Fabric verification

The read-only checkpoint is recorded in docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md. Fresh Render inspection found the canonical managed ingress process running, but not admitted: latest Render deploy is on integration/railway-public-mcp-ingress-20261028 at source commit f2fac5b65da437f56a3ec7ab372e308d28372a94, auto-deploy is disabled, and logs report liveQualified=false and productionAdmission=NOT_GRANTED. A fresh /healthz returned 200 with identityBinding=UNBOUND and runtimeUpstream=UNBOUND; authenticated MCP, Continuum, Veritas and ledgers remain not probed. Protected-resource metadata returns 503. No credentials were read or changed, no deployment was triggered, and no device operation occurred.

Voice readback changed from the previous failure: selected LeeWay carrier health and Kokoro status returned 200; selected bm_lewis synthesis returned 200 with a WAV response; carrier /render-voice also returned 200 with matching LeeWay voice identity. The earlier 500/connection-closed is therefore not reproducing on these requests. Playback remains unverified; this is not full-duplex/C3 qualification and does not guarantee future HTTP 200s.

Next gate is to resolve the existing owner-authorized LEEWAY_MCP_AUTH_ISSUER and LEEWAY_MCP_UPSTREAM bindings, compare the stale Render branch against accepted Device Bridge main, then qualify protected-resource metadata and authenticated read-only MCP through Runtime Fabric. Do not enable device control without a separate owner grant.


## 2026-11-06 00:25 America/Chicago (-06:00) — Vercel public ingress verified

Correction to the 00:15 checkpoint: /healthz is not a Vercel route, so its 404 was not a Device Bridge outage. Current production Vercel deployment dpl_BsxYBYEc6BvZERrxuBVXCDZABvWh is READY on exact main commit a2b8112bb67bdb52adedd005182cbc9a389868ed. Source vercel.json routes POST /mcp and the protected-resource metadata path. Public metadata returned 200 with the expected LeeWay resource, Zitadel issuer and read:runtime scope. Unauthenticated and deliberately invalid-bearer initialization requests returned 401 with the expected challenges, confirming transport to the OIDC-protected upstream and fail-closed rejection. Public issuer discovery matched and its JWKS returned two RS256 signing keys. Runtime health showed Vercel Streamable HTTP and OIDC token verification available; the authenticated read-only bridge_devices tool returned pc-primary as CONFIGURED_NOT_PHYSICALLY_PROBED. No physical device, GPU, mutation, valid public bearer token, or device command was used.

The Render service is a separate legacy/qualification service with its own old branch and unbound configuration; its /healthz state must not be conflated with the Vercel production ingress. No Render or Vercel configuration was changed. Public Vercel MCP access is qualified only for route, metadata and negative-auth rejection; a valid public client exchange and all device/Continuum/Veritas/receipt execution gates remain open. The detailed amendment is in docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md.


## 2026-11-06 00:27 America/Chicago (-06:00) — Post-deploy and playback confirmation

After the latest main deployment reached READY, the Vercel protected-resource endpoint returned HTTP 200 and an unauthenticated POST /mcp returned HTTP 401 BEARER_REQUIRED with the expected metadata challenge. The authorized LeeWay read-aloud adapter reported selected-voice playback completed for the prepared reply. This confirms software playback completion, not that the user physically heard it or that C3 live two-way voice passed. No production bindings or credentials changed. Remaining gates are a valid authorized public MCP exchange and qualified downstream device, Continuum, Veritas and receipt evidence. See docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md.


## 2026-11-06 10:23 America/Chicago (-06:00) — Runtime probes fixed; upstream health registration is the remaining immediate gap

Runtime Fabric main commit `e551cb2cb1d3ae6465b5f1952c8746f5b6afa75e` is deployed READY as Vercel deployment `dpl_FHkydQgJA4wZJ1wspPzJnzrFrNVD`. Its authenticated read-only health/info wrappers are now registered and validate device-bound PASS receipt shape. Fresh live probe: `bridge_device_info(pc-primary)` returned PASS receipt `1b78a77c-a97b-4538-aea8-f70dd882cd66`; `bridge_device_health(pc-primary)` returned `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. Capability discovery advertises both as granted but unverified. No inference, GPU, write, or mutation was run.

The canonical Device Bridge source confirms the specific upstream gap: authenticated discovery-only MCP entry points did not register `device.health` or `device.info` in their read-only tool list, though the common MCP factory already supports both. A clean-main candidate updates both ingress factories and the existing real-client qualification utility to require and validate both read-only probes. The full Device Bridge MCP source suite passed **117/117**; syntax and whitespace checks passed. This candidate remains unpublished/un deployed. The active connector provides no authorized host lifecycle operation, so source qualification must be followed by deployment through the approved lifecycle path before claiming physical health success.

The public resource metadata advertises `read:runtime`; no independently verified issuer grant for `device.bridge.read` was recovered. Existing owner-scoped app calls succeed, but do not change scope advertisement without issuer-side proof. Continuum, task-bound Formula, independent Veritas, and canonical receipt/Learning Ledger remain unprobed. Full production qualification is **NOT COMPLETE**. See `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md` for the detailed gate and next actions.


## 2026-11-06 10:30 America/Chicago (-06:00) — Source published; upstream release and full acceptance remain open

Device Bridge `main` now contains commit `5abef21583e379608b58f46b4b65cb5a24be0565`; Vercel production deployment `dpl_DFU2odNcJSdLvD3rayMHY9pwzn84` is READY on the exact commit. Read-only `device.health` and `device.info` are included in discovery-only MCP registration, and the owner qualification utility now requires device-bound PASS receipts for both. The MCP SDK/Zod pins were upgraded; Device Bridge suites passed 132/132 and `npm audit --omit=dev` reports 0 vulnerabilities.

Post-deployment Runtime check still returns `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED` for health. Device-info returns PASS receipt `85625393-1fff-4d6b-9432-92fc092b52a1`, bound to `pc-primary`/`device.info`, with Formula `NOT_EVALUATED`. This confirms the source and Vercel facade deployment; the actual configured Tailscale-hosted MCP upstream has not been released from the new source. The available app connector is read-only and has no host lifecycle operation, so do not equate Vercel READY with upstream activation.

Scope metadata still advertises only `read:runtime`; issuer-side `device.bridge.read` grant evidence is missing. Continuum, request-bound Formula, independent Veritas, and canonical receipt/Learning Ledger remain NOT_PROBED. Full production qualification is still **NOT COMPLETE**. The precise next action and evidence are in `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md`.

## 2026-11-06 10:38 America/Chicago (-06:00) — Fresh upstream and OAuth scope evidence

Production Vercel deployment `dpl_8fiCsAt5pCHcfgAKhejs1Z8YYfET` is READY on Device Bridge main commit `601c8d178a0c8d647e25726afb5f5656ad680324`. Protected-resource metadata returned HTTP 200 and advertised `read:runtime` plus `device.bridge.read`; anonymous `/mcp` returned HTTP 401. The metadata setting is advertisement-only. A fresh owner-scoped Runtime `device.info(pc-primary)` call passed the Runtime owner-subject and `device.bridge.read` checks and returned receipt `b7a9af49-fece-49a9-88ed-940fb54d653f` at `2026-11-06T16:37:14.519Z`; Formula is `NOT_EVALUATED`, and independent verification/admission did not occur. This is connected-client evidence, not a claim that all OAuth clients are granted the scope.

The health probe still returns `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. The source registration fix is on Device Bridge main (`5abef215`), while the production Vercel project is the forwarding facade and does not establish that the separately configured Tailscale MCP upstream is running that source. No authorized upstream lifecycle operation is available through the current read-only connector. Full production qualification remains **NOT COMPLETE / BLOCKED at upstream release**. Next: release commit `5abef21583e379608b58f46b4b65cb5a24be0565` through the configured upstream's authorized lifecycle; then rerun health/info and separately qualify Continuum, Formula, independent Veritas, and receipt/ledger admission.

## 2026-11-06 10:41 America/Chicago (-06:00) — Final live retest

Latest production deployment `dpl_AyLynXVh7CfNff5va1nPwjydnjZv` is READY on Device Bridge main `9437e19d4462d8f5df0c0e829b385a4e4ee9acae`. Metadata remains HTTP 200 with `read:runtime` and `device.bridge.read`; anonymous `/mcp` remains HTTP 401. Runtime OIDC is verified. The authenticated health probe still returns `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`; device-info returns PASS receipt `e44809fb-624d-4d0a-aa4b-e282f6e01dea` at `2026-11-06T16:41:36.121Z` and Formula `NOT_EVALUATED`. This is the facade and one read-only info capability functioning; full qualification is still blocked pending the configured upstream release and subsequent Continuum/Formula/independent Veritas/receipt gates.

## 2026-11-06 10:47 America/Chicago (-06:00) — Upstream release path remains unavailable

Runtime's existing `test:vercel-device-bridge` fixture suite passed. Its live read-only adapter probe returned BLOCKED: both `agent-lee-x.vercel.app/api/device-relay` and `/api/device-workstation` returned HTTP 404. The associated Vercel project is not present in the connected team inventory and the referenced `Leeway-Digital-Employment-Center` repository could not be fetched. Render exposes no workspaces in the connected account. The sole connected Railway project contains only MySQL, not a Device Bridge runtime. No Tailscale lifecycle adapter is available.

Do not use this stale Vercel relay or create a replacement service without canonical source and native device binding. The existing Tailscale MCP upstream remains the active read-only path; its info call works, but health reports `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. Full production qualification remains blocked until its authorized lifecycle owner releases the published Device Bridge source fix. The 10:47 detailed checkpoint is in `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md`.

## 2026-11-06 10:50 America/Chicago (-06:00) — Canonical Tailscale contract recovered

The private LeeWay Tailscale repo's `docs/initial-discovery.md` is updated on main at `d055f6813ac25ceb7ced339b086128ae414e7e3b` with the current authenticated `device.info` PASS receipt and the missing-health-tool error. Its README and service map are routing contracts only: tailnet-private Serve is the default, route application is manual after local verification, and the repository contains no tailnet state or automated deployment workflow. Route owner remains unverified. No route, Funnel/Serve setting, credential, or host process was changed.

This confirms the active Tailscale upstream cannot be released by pushing source alone. The exact deployment-owner/lifecycle access remains absent; keep full Device Bridge production qualification incomplete until authorized upstream release, fresh health/info, then independent Continuum, Formula, Veritas and receipt/ledger gates.

## K1 handoff — 2026-11-06 12:16 America/Chicago (UTC−06:00)

K1 traced the existing owner-scoped read-only registration end to end. The desktop adapter already implements `device.directories.list` and `device.files.read`; the discovery-only MCP server allowlist and both authenticated ingress factories omitted them. Runtime Fabric also lacked corresponding read-only tools and upstream name mappings. A scoped candidate adds just these two existing read operations, retains device grant/admission checks, verifies upstream registration and device-bound canonical receipt hashes, and leaves mutation/command tools excluded. Focused Device Bridge HTTP tests pass 5/5. Current live Runtime health is available, but fresh `bridge_devices` returns HTTP 502, so current grants and artifact paths cannot be checked; no artifact was read. Source changes remain candidates until main publication and release through the authorized Runtime/upstream lifecycle. See `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md` for exact evidence and next gate.

K1 release update — 2026-11-06 12:20 America/Chicago (UTC−06:00): Device Bridge `c1144ac` and Runtime Fabric `3625f63` are published on `main`; Vercel reports both deployments READY on the exact SHAs (`dpl_AjjK8HrstQQFmwHUMkdAvLiGWASg`, `dpl_6qbY6We8sW4ZHpTrKMMnwq9WiHya`). Fresh Runtime OIDC/health is available, but `bridge_devices` and `bridge_capabilities(pc-primary)` still return HTTP 502. Current grants are unverified, and no experiment file was listed/read. Continue only after authorized upstream lifecycle recovery and fresh grant confirmation.

## K1 handoff — 2026-11-06 14:53 America/Chicago (UTC−06:00) — 720 MiB large-file milestone

K1 continued from the existing streaming-hash branch, merged the then-current Device Bridge main (`baec293231789831ee155f6f669ff6481956be9c`), and preserved/reapplied the prior 64 GiB bounded streaming hash change. The existing governed `device.files.move` implementation now stages a streamed SHA-256-verified copy on `EXDEV`, checks destination space, commits without overwrite, and removes the source only after destination verification. The accepted 720 MiB milestone applies to hash and move; the distinct resumable append contract remains 128 MiB.

Focused Device Bridge MCP/file tests passed 17/17, then the complete MCP suite passed 120/120 on Windows Node `v24.15.0`. The first focused run had one incorrectly broad EXDEV test double; it was narrowed and the full focused set passed on retest. EXDEV was simulated on one NTFS volume; no physical second-volume copy, live Device Bridge execution, production release, Formula task evaluation, Veritas decision, canonical receipt, or Learning Ledger update occurred. Commit `7193edbb13ef2ab86c9a0f0d6b698fb9288d82fc` is published on canonical `main`; GitHub readback returned source blob SHA `80d119be7fb27a9a5eb7856ae6dc4066a37dbecb`. See `docs/qualification/2026-11-06-large-file-720mib.md` for exact commands, boundaries, rollback, failure and recovery handling. Next: qualify a physical cross-volume copy/recovery and supported platform matrix; production gates remain open.
## 2026-11-06 15:19 America/Chicago (UTC−06:00) — Fresh bounded device probes passed

The connected LeeWay Runtime / Device Bridge connector now returns OIDC-authenticated Runtime health and successful owner-scoped `device.health`, `device.info`, and `device.directories.list` calls for `pc-primary`. Receipts: health `47d4c7b0-c273-4d87-9403-e9ebc9289dc2`; info `7c8b028a-0868-412a-9010-e01c9e0db4ec`; directory listings `3378fe64-a28d-47db-9dd2-5f88871ecba7` (20 entries, truncated) and `c6061b6b-0e32-4845-918a-18c6d791858d` (complete workspace root). Health/info `physicalProbe` is `EXECUTED_NOT_INDEPENDENTLY_VERIFIED`; all report `FORMULA=NOT_EVALUATED`. Vercel production deployment `dpl_D1DXpKpALsqBDMgC1eTAoojVGrNV` is `READY` on exact `main` commit `dd2369ba367d96637901ada598222c733ae45257`; the parent `54e46df` already deployed the 720 MiB implementation. Runtime Fabric `main`/Vercel `6c46218` / `dpl_HFuRGw1kjTPnLezcVf8N4dQkxctT` is `READY` and source-registers `bridge_device_files_read`, but the active ChatGPT connector inventory does not publish it. Artifact contents and live 720 MiB move remain unqualified. The detailed checkpoint and next gate are in `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md`.

## 2026-11-06 15:32 America/Chicago (UTC−06:00) — Runtime source ready; ChatGPT connector omits file read

Runtime Fabric `main` commit `6c46218d144bd031a8887c57d35ea98b32235903` is production `READY` at Vercel deployment `dpl_HFuRGw1kjTPnLezcVf8N4dQkxctT`. Its source registers read-only `bridge_device_files_read`, mapped to upstream `device_files_read` with owner-receipt validation. The active ChatGPT connector catalog in this session exposes health, info, devices and directory listing only; it omits file read and move. This makes connector tool publication/refresh the next gate. No alternative path was used. Full Device Bridge production qualification and live 720 MiB move remain incomplete. See the detailed source/deployment split in `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md`.

## K1 handoff — 2026-11-07 — Windows UI composer contract

The clean `main` source did not contain the Windows UI adapter candidate, so a scoped candidate adds it to the existing `DesktopAdapter` and strict protocol registry. Each writable Edit and Invoke-capable button receives an opaque ID from a fresh 30-second UI Automation observation. Input requires the exact observed target, rechecks process start time and window identity, uses writable `ValuePattern`, and verifies complete value readback plus SHA-256. Submission is a separate operation bound to the same observation, a separately selected observed button, and that text hash. No blind keystrokes, coordinate actions, first-Edit selection or generic Send matching are used.

The recovered Antigravity observation still exposes no writable Edit; this source change does not create one. Official Antigravity Remote Control is a user-facing browser surface and requires the feature to be enabled plus the same signed-in Google Account. If UI Automation still exposes no composer, the next bounded route is an owner-authorized Device Bridge browser session to that official surface; existing personal browser cookies must not be attached implicitly. No provider message was sent and no historical text was replayed.

Focused source contract: 5/5; complete MCP source suite: 125/125; CLI suite: 7/7. PowerShell generated scripts parsed; source/runtime execution and production deployment remain unverified. See `docs/qualification/2026-11-07-windows-ui-composer-contract.md` for hashes, commands, authority boundaries, rollback and next gate. No Formula task evaluation, independent Veritas decision, canonical receipt or Learning Ledger update occurred.

Source publication follow-up: commit `8d9bb5f23eb1bc042c7018394d7f313911d09373` is on canonical `main`. GitHub Actions run `42351732680` passed its Windows/macOS/Ubuntu matrix and Pages run `42351732316` passed. The unrelated Android publication run `42351732707` was canceled before publishing an artifact. The secondary Pages live gate `42351732741` remained pending at the time of this note. This source publication does not install or restart the active Windows Bridge.

Final adapter source is `f5aca3de55f5731ff4caac7fe7d66a822f2a9a3d` on `main`; it additionally revalidates the current process main-window handle. Cross-platform protocol/MCP/CLI workflow `42352155546` and Pages deployment `42352154881` passed. Android Build `42352155548` was canceled before dependency installation/build/artifact steps. The secondary workstation live-pages test `42351732741` failed only because the deployed `/docs/` page lacked unrelated expected workstation copy; its repeat on the final source was pending at note time. The active Bridge host has not been updated or restarted, and the Antigravity composer/full exchange remains unqualified.

## K1 handoff — 2026-11-07 — Active Bridge retest

Fresh OIDC-authenticated read-only Runtime Fabric/Device Bridge health and capability calls still show the active `pc-primary` adapter with `uiControl:false`; its discovery catalog has no Windows UI capabilities. Controller-observation receipts: health `a7ec4d2e-1572-42e7-85ce-4a3b141f2fa7`, info `3f3d988f-84f0-4f50-9cce-ec2a6435d03e`. Both are `FORMULA=NOT_EVALUATED` and `physicalProbe=EXECUTED_NOT_INDEPENDENTLY_VERIFIED`. No message was entered or submitted.

Receipt Authority main is a source candidate, not the deployment lifecycle owner. The Tailscale source records no local tailnet state, no automation and no proven route owner. Creator-supplied `Agent-Lee`/DNS/IP identify the node but do not expose a callable restart/deployment capability. Source is published; active-host activation remains BLOCKED on that exact lifecycle binding. Full live composer qualification remains open.

## K1 handoff — 2026-11-07 — Multi-client MCP transport audit

Canonical source already implements local stdio and remote stateless Streamable HTTP. The supplied SSE suggestion is not required for current Antigravity, ChatGPT, or Gemini API remote routes; the TypeScript SDK recommends Streamable HTTP for new remote servers. Fresh Runtime health in this Codex session returned Vercel Streamable HTTP and verified OIDC; owner-scoped health/info calls returned receipts but still report `uiControl:false`, Formula `NOT_EVALUATED`, and `physicalProbe=EXECUTED_NOT_INDEPENDENTLY_VERIFIED`.

The public resource metadata for `https://leeway-device-bridge.vercel.app/mcp` returned 200, while an unauthenticated MCP initialize returned 401 as expected. The issuer has no dynamic client-registration endpoint. Both installed Antigravity configs pointed to an untracked Python server in a scratch clone; it exposes generic `run_operator_command`, while its Node target has no CLI dispatcher and the wrapper converts a zero-exit empty result into a success message. No operator command was run. Both config entries are now marked `disabled:true`, with byte-for-byte backups and hashes recorded in the qualification document. The on-disk change does not prove an already-running Antigravity process reloaded the config. This route is UNQUALIFIED and must not be treated as a working inter-agent channel.

The exact client support matrix, source references, live results, blockers, gates, and next action are in `docs/qualification/2026-11-07-mcp-client-connectivity.md`. No source code change, client enrollment, test run, task Formula evaluation, Veritas decision, canonical receipt, or Learning Ledger admission occurred.

Follow-up source review corrected the proposed bare Antigravity Node stdio example: `mcp-server.mjs` requires a config path, and its direct CLI does not inject trusted Runtime composition. `NODE_ENV=production` supplies no Formula/Veritas callbacks. A local JSONL receipt fallback is not canonical custody, and the fail-closed admission denies every Bridge call without the gates. Keep the Antigravity entry disabled until an approved trusted local launcher or per-client OAuth binding for remote Streamable HTTP is available; see the qualification record.

## K1 handoff — 2026-11-07 — Codex host-composition follow-up

Both Antigravity MCP config files now point on disk to the Codex host-composition launcher and Runtime URL; these newer values supersede the previous disabled-Python configuration observation. A read-only MCP stdio launch passed local source-pin/startup checks and returned 63 tools. No Antigravity restart or device capability call occurred.

The launcher pins a dirty local controller candidate rather than the clean Device Bridge `main` source: the eight pinned sources differ from or are absent in the clean `main` checkout. Runtime `/runtime/authorize-action` returns `AUTHORIZED_PENDING_VERIFICATION` after compliance-card validation/receipt emission; the launcher treats that as admission. Its receipt sink writes local JSONL records marked `CONTROLLER_OBSERVATION`, `formula: NOT_EVALUATED`, without proven Continuum custody or an independent Veritas decision. The broad tool catalog is therefore process-discovered but not production-admitted. See `docs/qualification/2026-11-07-mcp-client-connectivity.md` for the source comparison, exact gates and next action. No device operation, task Formula evaluation, Veritas decision, canonical receipt or Learning Ledger update occurred.

## 2026-11-07 02:54 America/Chicago — post-restart multi-client checkpoint

- Restart exposed a schema mismatch: the pinned recovery Bridge source rejects the newer shared Codex config's `browser` property and browser/Windows UI grants. The scheduled wrapper then stopped the Runtime process it had started. A version-scoped recovery config was added with only the four supported read grants and selected by the existing wrapper. The original wrapper was preserved with its hash. No production source or client config was changed.
- Recovery smoke passed (`smoke-20261107-084534969`); Runtime health/manifest on local port 4011 returned HTTP 200; protected MCP listener on 4271 returned expected unauthenticated HTTP 401. Scheduled task `LeeWay Device Bridge Relay` is `Running`.
- ChatGPT-hosted LeeWay connector is OIDC-authenticated and can discover `pc-primary`; fresh health/info passed. Device discovery still says `CONFIGURED_NOT_PHYSICALLY_PROBED`; receipts are `CONTROLLER_OBSERVATION`, Formula `NOT_EVALUATED`, independent verification absent; UI control false. No file read/list operation occurred.
- Antigravity configs point at the LeeWay trusted launcher and local tool-list handshake exposed 63 tools; Antigravity's own manager/session status remains unverified. No prompt sent.
- Gemini consumer web displayed custom MCP app setup but no LeeWay app; no authenticated handshake exists. No provider prompt sent.
- Full three-client production qualification remains open. Next: individually qualify Antigravity's app-managed handshake and obtain an approved Gemini MCP client binding, then verify initialize/tool discovery/reconnect. Do not infer production admission from discovery.
- No task Formula evaluation, Veritas decision, Continuum receipt, or Learning Ledger admission was produced. An unexpected Voice Typing overlay was closed and the unsent composer cleared; no message was submitted.

- Accessibility follow-up 2026-11-07 02:56 CST: LeeWay reader selected Kokoro m_lewis and was readiness-positive, but synthesis returned HTTP 429 from the configured provider endpoint; no WAV played and no voice fallback was used. Written response delivered; playback is unconfirmed.

## K1 voice integration follow-up — 2026-11-07 03:19 CST

Creator supersedes the older prepared read-aloud helper for this work. Do not use it as the Device Bridge ↔ Voice Fabric integration or as a playback workaround. Fresh restart checks found Runtime Fabric available/authenticated, while local Voice Auth Gateway reports `upstreamQualified:false`; its `:5173` voice-turn upstream and the prior `:8898` connector are not listening. The Bridge source has only `voice.status`/`voice.speak` schemas; the desktop adapter does not bind them, and its separate gateway still points at the fixture turn route and local Kokoro API. The Kokoro status endpoint returned HTTP 200 with 28 voices ready, which does not prove Voice Fabric session, streaming, or playback. Device Bridge voice-auth tests passed 6/6 and MCP tests passed 125/125; the Voice Fabric pinned-source verifier failed with 10/30 source mismatches. C3 duplex remains unqualified. See `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md` for evidence, accepted boundaries, and next action. No mic, external prompt, synthesis, playback, Formula task evaluation, Veritas decision, canonical receipt, or ledger admission occurred.

## K1 voice tool autonomy follow-up — 2026-11-07 03:56 CST

The Creator reported Voice Source, Edge RTC, Kokoro, and Machine Consciousness services started and the conversation page open. Device Bridge capability discovery now shows `voice.status` and `voice.speak` granted but unverified for `pc-primary`; a separate Runtime read-only capability surface still omits voice. Both Bridge voice-status attempts were blocked pre-execution with `COMPLIANCE_CARD_INVALID` (receipts `dd3f35e6-a5c6-4e5a-b834-9f145b232fe8` and `8ae55e2e-a229-46f4-bc9f-b0deaa3c1259`, each `CONTROLLER_OBSERVATION`, `FORMULA=NOT_EVALUATED`). No card issuer is exposed in this session; no card was fabricated and no speak call was made. This confirms the per-agent card friction that must move into server-side governed Bridge composition without removing Formula/Veritas/receipt gates. C3 remains unqualified; details and next action are in `docs/qualification/2026-11-06-device-bridge-voice-production-readiness.md`.
## K1 connector-contract finding — 2026-11-07 03:59 CST

Canonical `apps/desktop/mcp-server.mjs` accepts `deviceId` plus capability `arguments` and performs admission through the trusted server-side Bridge/Runtime composition. The active `mcp__leeway_device_bridge` wrapper instead requires the caller to provide `complianceCard`. A card produced by canonical Runtime `buildComplianceCard` was rejected pre-execution (receipt `1d72e0af-8c74-4266-9b0e-10182677ce5a`). Do not submit guessed cards again. The live connector contract and canonical Bridge main are mismatched; rebind the connector to server-side governance and then bind the Bridge voice adapter to Voice Fabric. C3 remains unqualified. See the qualification checkpoint for all three denied status probes.