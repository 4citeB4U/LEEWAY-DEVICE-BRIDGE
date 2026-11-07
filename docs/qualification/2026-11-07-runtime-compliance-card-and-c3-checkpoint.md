# Runtime compliance-card integration and C3 checkpoint

**Checkpoint time:** 2026-11-07 09:10 America/Chicago (2026-11-07 15:10 UTC)
**Agent identity:** Codex; not Agent Lee.
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Canonical source:** `main`, latest readback `42c4c5d4d422aa859177dd6198a8c95db7cce308`.
**Compliance-card source revision:** `2ce8216b27e217c951e2712fcaecc30b311c01b6`.
**Production Vercel deployment:** `dpl_HatFmhKGXKxFoMKysUFJxe7uP1wS`, state `READY`, target `production`, source commit `42c4c5d4d422aa859177dd6198a8c95db7cce308`.
**Scope:** trusted card generation/validation, receipt semantics, live Bridge surface, and the requested Bridge-only two-way conversation test.

## Decision and preserved constraints

- Runtime Fabric remains the issuer and validator for operation-scoped compliance cards. Device Bridge does not self-assert card validity.
- Every dispatched operation receipt must carry the validated card digest, `complianceCardStatus: VALID`, and authority `LEEWAY_RUNTIME_FABRIC` when that trusted provider is bound.
- `operationMayHaveExecuted` is a dispatch fact: it is `false` on the pre-dispatch `ADMITTED` receipt and `true` once the adapter has been invoked, including a post-dispatch failure. Setting it to `true` before dispatch would create false execution evidence.
- Preserve fail-closed behavior for absent, invalid, mismatched, or unvalidated cards. Do not label an invalid or unavailable card `VALID`.
- Do not claim the full Codex online conversation is controllable through Codex App Server or a separate model endpoint. Do not use browser automation, another speech service, or an alternate audio path for the requested Bridge-only test.
- Preserve the existing voice provider selection. No fallback provider was started.

## Expected and observed state

**Expected:** an authorized Device Bridge host obtains the card from the trusted Runtime provider, validates its exact digest and authority, and exposes operation tools without requiring the LLM to compose a card. Receipts distinguish pre-dispatch admission from post-dispatch execution. The same Bridge connection must expose microphone input, an authorized active conversation turn, playout, interruption, and stale-output rejection before a two-way C3 conversation can pass.

**Observed:** Device Bridge source now supports trusted card generation for local stdio and the authenticated Pocket-ID host, and its protocol gate verifies Runtime's `valid: true`, matching card hash, and `LEEWAY_RUNTIME_FABRIC` authority. Focused source/runtime tests passed. A local trusted host composition exposed 63 tools with caller-supplied `complianceCard` omitted for the tested tools. Real `device.health` and `voice.status` calls through that composition produced valid-card pre/post receipts. A real `voice.speak` dispatch had a valid card but failed after dispatch with `VOICE_FABRIC_HTTP_500`.

The current in-session `mcp__leeway_device_bridge` schema still requires a caller-supplied `complianceCard`; that active surface has not been shown to reload the trusted provider composition. Separately, the deployed Vercel `/mcp` handler in this repository is a transport-only forwarder to Runtime Fabric. A READY Vercel deployment therefore proves source deployment, not that the active ChatGPT connector adopted the card provider.

Fresh read-only connector discovery lists `voice.status` and `voice.speak` as supported and granted but `verified: false`; it lists no Bridge microphone/listen/turn capability. `pc-primary` is configured, not independently physically verified. Its current adapter reports `uiControl: false`.

## Full engineering loop

| Stage | State | Evidence and limits |
|---|---|---|
| Investigate | EVIDENCED | Inspected canonical Bridge source, current connector schemas/capabilities, current production deployment, CI runs, and local Bridge receipts. |
| Diagnose | EVIDENCED | Source-level card provider exists; the active tool surface still requests a caller card. Voice output separately fails after dispatch with HTTP 500. The active tool surface has no microphone ingress. |
| Plan | PASS | Reuse the Runtime-issued card provider; preserve validation and accurate dispatch semantics; trace the active client/Runtime binding; keep C3 blocked until the real input/turn/output/interruption path exists and is exercised. |
| Implement | PASS | Commits `f32785781c1bbe77811f032dfd5e4b714038fd8a`, `36666fda801255c4672efb45a4e0cb7e9adc7b46`, and `2ce8216b27e217c951e2712fcaecc30b311c01b6` were pushed directly to canonical `main`. Concurrent APK publication commits were preserved. |
| Test | PASS | `npm run test:mcp`: 135 passed, 0 failed on the exact source before the later APK-only commit. GitHub Actions run `42384420173` passed on macOS, Windows, and Ubuntu; each job ran `npm run test:mcp`, the CLI MCP probe, and trusted-composition startup regression. Android run `42384420188` also passed. |
| Validate | PARTIAL | Runtime-issued card validation, local trusted-host schema, receipt hashes/links, physical read-only calls, and production deployment identity were observed. Current external tool schema adoption and production voice operation were not verified. |
| Repair | PASS | The provider binding and remote Pocket-ID path were added; post-dispatch failures now link to the admitted receipt and preserve stable error codes. |
| Retest | PARTIAL | Local `device.health` and `voice.status` passed with valid cards; `voice.speak` was dispatched with a valid card but failed with HTTP 500. This is not a successful voice-output retest. |
| Verify | PARTIAL | The card status and receipt chain were verified for the listed local host-composition operations. No independent Veritas decision, Continuum receipt admission, or live C3 exchange was obtained. |
| Evidence | EVIDENCED | Machine-readable observations are recorded in `evidence/2026-11-07-runtime-compliance-card-and-c3.json`; this file is an engineering record, not a canonical receipt or Veritas signature. |

## Inspectable source and release evidence

- Runtime card provider: `operator/runtime-compliance-card-provider.mjs`.
- Protocol validation and receipt fields: `packages/protocol/index.mjs`.
- Local MCP schema/provider binding: `apps/desktop/mcp-server.mjs` and `apps/desktop/runtime-composition.mjs`.
- Authenticated remote host binding: `apps/desktop/mcp-http.mjs`, `operator/identity/create-pocket-id-universal-handler.mjs`, and `operator/identity/start-universal-pocket-id-mcp.mjs`.
- Source commits: `f32785781c1bbe77811f032dfd5e4b714038fd8a`, `36666fda801255c4672efb45a4e0cb7e9adc7b46`, `2ce8216b27e217c951e2712fcaecc30b311c01b6`.
- CI: Portable protocol/MCP run `42384420173` succeeded on all three operating systems at `2ce8216b27e217c951e2712fcaecc30b311c01b6`; Android Build run `42384420188` succeeded at the same commit. The subsequent current `main` commit `42c4c5d4d422aa859177dd6198a8c95db7cce308` only updated the published Android APK and manifest; Pages run `42384602727` succeeded.
- Vercel deployment `dpl_3iNPQHMRd6S2qbjJhJ6qde7NxBs5` is `READY`/production for commit `2ce8216b27e217c951e2712fcaecc30b311c01b6`; latest deployment `dpl_HatFmhKGXKxFoMKysUFJxe7uP1wS` is `READY`/production for current `main` commit `42c4c5d4d422aa859177dd6198a8c95db7cce308`.
- The Vercel public `/mcp` source (`api/mcp.mjs`) forwards authenticated requests to Runtime Fabric. The READY deployment does not establish that the separate in-session MCP server schema was refreshed or that the trusted card provider is bound there.

## Runtime and receipt readback

Local trusted-host composition receipts in `C:\Users\Leona\.codex\leeway\codex-host-composition\receipts\device-bridge-mcp.jsonl` were read back and checked for pre/post links and card authority:

- `device.health`: ADMITTED `b49c8bfc-f3d8-4ff5-83fe-3820ec60d015` (`VALID`, Runtime authority, `operationMayHaveExecuted:false`) → PASS `8ae62531-77ea-4dc0-920d-2d5ad7240620` (`VALID`, Runtime authority, `operationMayHaveExecuted:true`). Both are `CONTROLLER_OBSERVATION`; Formula is `NOT_EVALUATED`.
- `voice.status`: ADMITTED `bfa68e8f-1ebf-450b-953d-9d6bed195576` (`VALID`, Runtime authority, `operationMayHaveExecuted:false`) → PASS `16a0d039-eb3a-41b5-b364-76189abea37a` (`VALID`, Runtime authority, `operationMayHaveExecuted:true`). Provider state was unavailable; playback was not verified. Both are `CONTROLLER_OBSERVATION`; Formula is `NOT_EVALUATED`.
- `voice.speak`: ADMITTED `dfa66c61-0b6d-4dd2-b992-4b4dcb9895de` (`VALID`, Runtime authority, `operationMayHaveExecuted:false`) → FAILED `19e8014f-4ff3-444a-b6b7-07316ca76cbf` (`VALID`, Runtime authority, `operationMayHaveExecuted:true`, error `VOICE_FABRIC_HTTP_500`). The post-failure receipt links to the admission hash. Audio playback was not confirmed. Both are `CONTROLLER_OBSERVATION`; Formula is `NOT_EVALUATED`.
- Follow-up `voice.status`: ADMITTED `e2758e29-0b37-431e-ab2c-a6ea123c806b` → PASS `ae1e24c9-968f-4b4a-99a0-7768363b36b0`; card was `VALID` under Runtime authority; provider remained unavailable. Both are `CONTROLLER_OBSERVATION`; Formula is `NOT_EVALUATED`.

Fresh owner-scoped read-only connector probes at 2026-11-07 15:04 UTC returned `device.health` PASS receipt `2bea04d7-adc4-4867-bbd3-dbf8d700938e` and `device.info` PASS receipt `593cafd6-2f9a-40de-b563-383e488d8ec5`. The adapter reported `bounded-workspace`, `uiControl:false`, and `physicalProbe: EXECUTED_NOT_INDEPENDENTLY_VERIFIED`; these connector receipts are `CONTROLLER_OBSERVATION`, Formula `NOT_EVALUATED`. Device discovery said `CONFIGURED_NOT_PHYSICALLY_PROBED`.

The pre-dispatch `false` marker is intentional and truthful: no adapter operation had started at that point. Once dispatch occurred, the marker was `true`, including on the HTTP 500. The card itself remained `VALID` in both receipts of each locally composed operation. This is not evidence that every external connector currently uses that composition.

## Voice and production qualification

- **Compliance-card source contract:** IMPLEMENTED and CI-VERIFIED.
- **Trusted local host composition:** runtime card validation and tested schema omission were observed.
- **Current in-session Bridge tool schema:** still requires caller-supplied `complianceCard`; automatic binding is NOT VERIFIED on that active server.
- **Production source deployment:** Vercel reports READY for current `main`; the deployed `/mcp` path is a forwarder to Runtime Fabric.
- **Voice status:** provider unavailable; physical playback not verified.
- **Voice speak:** dispatched with a valid card and failed with HTTP 500.
- **Microphone → authorized active conversation → response → playback → human interruption → stale-output rejection:** NOT EXECUTED. No microphone/listen/turn operation is exposed by the current Bridge tool inventory.
- **Two-minute Codex conversation through Device Bridge:** NOT PERFORMED. This session has no Bridge microphone-input capability to feed the current online Codex conversation; a separate Agent Lee or model endpoint would not prove that conversation.
- **Production conversation and C3:** NOT QUALIFIED on current evidence. The evidence verifies bounded card/Bridge operations, not the full two-way acceptance path.
- **Canonical receipt / Veritas / Learning Ledger:** no Continuum receipt admission, independent Veritas decision, or Learning Ledger update was created by these checks. Local JSONL observations are not canonical admissions.

## Safety, rollback, and next executable action

No production configuration was changed in this checkpoint; source commits and Vercel deployments already exist on `main`. Source rollback is a reviewed revert of the three card/failure-chain commits; deployment rollback must use the existing Vercel production rollback control to a previously qualified deployment. No rollback was executed.

**Next:** bind the Runtime-issued card provider to the exact active ChatGPT/Device Bridge MCP host so its discovered operation schema no longer asks the model to supply a card; read back the new schema and a real card-valid operation receipt from that same host. Separately repair Voice Fabric’s selected provider for the HTTP 500, then expose an owner-authorized Bridge microphone/turn path that targets the positively identified conversation, if the platform supports it. Do not claim the requested two-minute conversation until that exact live input/response/interruption sequence is observed. Keep the recorded source successes; do not repeat passing source tests without a source change.

## Publication readback — 2026-11-07 09:15 America/Chicago (UTC−06:00)

Concurrent contributor commits `0819c55396252e37095109292ba3c150a578e63b` (Vision protocol registration) and `97cba6311518538dbaaf048dae57f477e2d56ee6` (APK publication) were preserved before this record was pushed. The current `main` readback at this follow-up is `584420c8d00bf48a8984462ff5bd64550f6ecb05`, which adds only this engineering record/evidence and the contributor handoff beyond those preserved source commits. Vision protocol/MCP run `42385202039` and Android run `42385202080` passed at `0819c553...`; Vercel production deployment `dpl_3ELCDGBvbQmxzXVo3Au5ib77yWk7` is READY for `584420c...`. Pages run `42385390331` passed; Secondary Workstation Live Pages Gate `42385390600` was still in progress at this readback.

Source inspection confirms `packages/protocol/index.mjs` defines only `voice.status` and `voice.speak` in the canonical voice MCP schema, while `apps/desktop/adapter.mjs` does not discover or implement either voice operation. The active session's separate Bridge surface advertises those two operations but still requires a caller-supplied card and reports `verified:false`. No microphone/listen/turn operation is available to this chat. The 15:04 UTC health/info probes and the prior 14:54 UTC HTTP 500 speak attempt remain bounded observations; no fresh speech attempt was issued. The deployment and source checks do not close these active-host, audio-provider, microphone, or live-conversation gaps.
