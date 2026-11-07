<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.C3.UNIVERSAL_CLIENT_CAPABILITIES
TAG: LEEWAY.BRIDGE.C3.MULTICLIENT_SKILLS_VOICE.WORKSTREAM.V1
5WH:
WHAT = Source-grounded bounded C3 integration and acceptance map for multi-client MCP, Agent Skills and canonical Voice Fabric.
WHY = Reuse existing governed capabilities without duplicate runtime, connector, skill registry or voice engine.
WHO = LeeWay Industries; Creator authority; Runtime Fabric C3 issue #21 with W00/W15 coordination.
WHERE = docs/C3-UNIVERSAL-CLIENT-SKILLS-VOICE-WORKSTREAM.md
WHEN = 2026-11-01
HOW = Read-only GitHub/source and live MCP discovery evidence, dependency graph, negative-case acceptance gates and rollback limits.
AUTHORITY: Documentation candidate only; no execution, owner grant, deployed audio or production Veritas acceptance.
LICENSE: MIT
-->
# C3 universal client, Agent Skills, and Voice Fabric integration workstream

**State: SOURCE DOCUMENTATION CANDIDATE / NOT PRODUCTION ACCEPTANCE.**
Owning mission: [Runtime Fabric C3 issue #21](https://github.com/4citeB4U/Leeway-Runtime-Fabric/issues/21).
Contributor directory: [Agent Skills hub #22](https://github.com/4citeB4U/LeeWay-Agent-Skills/issues/22).
Governing entry: [Device Bridge AGENTS.md](../AGENTS.md); [Contributor Handoff Protocol](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/docs/CONTRIBUTOR-HANDOFF-PROTOCOL.md).
Do not overwrite W00/W15 work, active Runtime Fabric PR #148, or the historical workplane queue.

## Master checkpoint

Current priority remains **one actual C3 governed request**:
Creator/Agent Lee ingress -> Runtime Fabric -> independent Veritas PRE -> Harness/Formula -> Dispatcher/capability -> native execution -> independent Veritas POST -> canonical receipt -> eligible Learning Ledger readback.
Discovery alone does not graduate any subsequent gate.

### Surviving canonical architecture

* One Runtime Fabric authority and permission/scope policy. Existing public `api/mcp.mjs` is the authenticated read-only entry surface. Its general `runtime_health` admission and bridge-specific `device.bridge.read` authorization remain separate; no blanket bridge/device grant is created.
* One Device Bridge with owner-bound device and native adapter contracts. Cross-platform clients access capabilities through supported local stdio or owner-approved authenticated remote MCP ingress. The public transport is not a privileged device-execution authority.
* One canonical [LeeWay Agent Skills](https://github.com/4citeB4U/LeeWay-Agent-Skills) library, existing MCP gateway and orchestration machinery. Preserve skill provenance, content hash, allowed tool/provider binding and scope; do not copy divergent catalogs into client products.
* One [LeeWay Voice Fabric](https://github.com/4citeB4U/LeeWay-Voice-Fabric), as a distinct first-class capability provider governed by the same Runtime admission. No competing `LeeWay Voice Clone` service or shadow synthesis engine. Creator-facing Agent Lee voice uses the approved `agent-lee-voice-one` identity; never silently substitute unrelated voices.
* Multiple authenticated AI clients, each with distinct client identity/grants. ChatGPT, Claude, Gemini CLI, Copilot/VS Code and other compatible clients are **candidates**, not automatically enrolled production participants. Tool listing, owner binding, scope and physical action are separate evidence classes.
* Model-to-model coordination uses the **existing** Runtime workplane/task registry and authorized message/result flow, not unrestricted browser-chat cross-talk and not a second orchestration layer. Every action remains bound to owner, request, scope, nonce, replay/STOP policy, executor and separately verifiable evidence.

### Source boundary inspected (GitHub blob IDs, not runtime hashes)

| Source | GitHub blob SHA | Observation |
| --- | --- | --- |
| Runtime Fabric `api/mcp.mjs` | `1815f8acc8b2fe75efa1f9fc03c514118000aebe` | Exposes runtime health and conditional owner-scoped read-only bridge discovery, not native/voice execution. |
| Device Bridge `apps/desktop/mcp-server.mjs` | `5f1db48be2bf822f11b0f129725ab214989fb4c8` | Local stdio server; schemas for native tools; command admission fails closed without trusted Runtime composition. |
| Device Bridge `packages/protocol/index.mjs` | `0fedafaadb7215b065620f7b1cdcaf8a33879975` | `skills.list/read/invoke` and `voice.status/speak` schemas exist. Contract presence is not live provider binding. |
| Voice Fabric `src/voice-tools.js` | `836fbfccef43cb5f4abec90b056b88852f377ddc` | Eight MCP-compatible voice tool definitions (`voice_speak`, `voice_stop`, `voice_list_voices`, `voice_select_voice`, `voice_status`, `voice_device_profile`, `voice_diagnostics`, `voice_self_test`). |
| Agent Skills `skills/leeway-voice-fabric/SKILL.md` | `c438b1c15718bd2272ff00d291aec4f75460f8ed` | Canonical voice provider instruction and distinct Agent Lee package identity. |
| Android Device Bridge `VoiceRuntime.kt` | `f2f0c70a3e3a7e2072b75c1ac7bc98aa4ac8f752` | Inspected adapter reports `VOICE_UNAVAILABLE` when no authenticated Voice Fabric speech adapter is bound; other Android read-aloud routes exist and must not be overwritten. |

## Latest externally observed ChatGPT connector state

The selected read-only LeeWay connector's successful discovery observation on 2026-11-01 (17:35:52.621Z Runtime timestamp):
* `runtime_health`: `AVAILABLE`, `OIDC_ACCESS_TOKEN_VERIFIED`; deviceBridge, Formula, Continuum, independentVeritas and receiptAdmission were `NOT_PROBED`.
* `bridge_devices`: `pc-primary`, `CONFIGURED_NOT_PHYSICALLY_PROBED`.
* `bridge_capabilities`: 35 supported, five configured `granted:true` (`device.health`, `device.info`, `device.files.read`, `device.files.write`, `device.directories.list`), all `verified:false`, `executionAdmission:NOT_CONFERRED_BY_DISCOVERY`.
* `bridge_device_health` and `bridge_device_info`: **not exposed in selected ChatGPT connector tool inventory** at that observation. No actual physical probe, voice output, native file command or canonical receipt.
* Prior downstream `LEEWAY_BRIDGE_DISCOVERY_HTTP_401` later cleared for the same discovery surface; do not reopen public Runtime/OIDC changes without new evidence.

## Scope and classification

| Work lane | Classification | Safe next gate |
| --- | --- | --- |
| Authenticated Runtime discovery | ALREADY BUILT / LIVE DISCOVERY PASS | Preserve; regression test no-token, incorrect audience/scope and cross-owner denial. |
| Physical Windows bridge | PARTIALLY BUILT / MISSING LIVE PROBE EXPOSURE | Inspect existing physical-probe implementation + current published tool inventory; publish only verified exact tool contract, then owner-authorized read-only response/receipt test. |
| Cross-client MCP | PARTIALLY BUILT / MULTI-CLIENT E2E UNVERIFIED | Independent client enrollment and per-client issuer/audience/scope qualification; prohibit token sharing or duplicate OAuth authority. |
| Agent Skills via Bridge | EXISTING SCHEMAS + EXISTING SKILLS MCP; PROVIDER BINDING UNVERIFIED | Compare actual gateway/adapter registration and verified skill identity; qualify one bounded read-only skill on two clients. |
| Voice Fabric via Bridge | EXISTING VOICE IMPLEMENTATIONS; ANDROID ADAPTER BINDING GAP OBSERVED | Inspect active canonical provider and runtime wiring; repair only missing authenticated adapter binding, then software status and owner-heard audio acceptance. |
| Cross-model tasks | EXISTING RUNTIME WORKPLANE; MULTI-MODEL TASK EXCHANGE UNVERIFIED | Map needed semantics to existing workplane, then two-client cross-model request/result with same lineage. |
| C3 Veritas/Receipt/Learning | PRODUCTION BLOCKED | Independent same-request PRE/POST, canonical receipt and durable Learning Ledger admission/readback. |

## Acceptance matrix and order (no gate skipping)

1. **C3-PHYS-01**: expose only existing approved read-only device-health/info probes after inspecting owner binding and actual deployed tool registry. Verify that returned reachability is `PHYSICALLY_PROBED` only if native Windows answered. Capture real receipt IDs if issued; otherwise `NONE`. Refuse synthetic or configured-only promotion.
2. **C3-CLIENT-01**: authenticate two different supported clients independently to the *same* canonical Runtime resource; test correct scope, wrong client, wrong owner, expired/invalid token, tool refresh, and revoked grants.
3. **C3-SKILLS-01**: both clients discover the *same* source-pinned Agent Skill through existing governed Skills/MCP. Execute one authorized harmless skill path, preserving real provider/receipt evidence; deny unknown or stale skill hash.
4. **C3-VOICE-01**: read `voice_status` from the real active Voice Fabric adapter through the governed bridge. Existing `VoiceRuntime.kt` `VOICE_UNAVAILABLE` is an observed integration gap, not permission to replace Kokoro, RTC, read-aloud, or Voice Fabric.
5. **C3-VOICE-02**: verified physical microphone -> speech/RTC -> speech output on the intended device, with authentic owner-heard quality, interruption/barge-in, one-mouth playback and AEC evidence. A source test or synthesized buffer is not audible proof.
6. **C3-FED-01**: two different model-backed participants exchange one bounded task and result through the *existing* Runtime queue, with provenance, ownership, replay/STOP rejection and failure recovery. No unrestricted direct chat/session impersonation.
7. **C3-FINAL**: execute one fully owner-authorized physical request with independent Veritas PRE/POST, original Receipt Authority admission and durable Learning Ledger readback; verify negative/adversarial case and rollback.

## Exact change control

* **Expected:** add truthful documentation and acceptance mapping without changing any deployed working route.
* **Observed:** source contracts for skills and voice exist; live ChatGPT public MCP exposes only discovery and not the two physical health/info probe tools or Voice Fabric.
* **Minimal repair decision:** inspect source-to-live mismatch and adapter registration before any code or connector change; change only the proven failed dependency on a separately reviewed scoped PR.
* **Non-goals:** duplicate runtime/bridge/voice/registry, blanket OAuth grant, credential rotation, connector deletion, native write or command execution, auto-migration of workers, fabricated receipts.
* **Rollback:** revert only this documentation change if an authoritative conflict is identified; preserve every existing branch, queue, device, token and runtime.
* **Validation:** source reference/readback and diff inspection for this documentation; all runtime/physical tests above remain `NOT TESTED` until executed.
* **Formula:** `NOT EXECUTED`; do not invent evaluator hash/decisions.

## Handoff

CONTRIBUTOR: Agent Lee (GitHub-connected documentation lane).
PARENT: Runtime Fabric C3 issue #21, coordination via Agent Skills hub #22.
STATUS: Documentation candidate; underlying capabilities classed above.
CHANGED: This documentation file only.
EXECUTED: GitHub source reads and prior separate selected MCP discovery; no new device execution.
TESTED: Source document readback pending; live cross-client/audio tests NOT TESTED.
VERITAS/RECEIPTS: NOT CREATED.
LEARNING LEDGER: NOT UPDATED.
UNRESOLVED: Physical Windows probe tool exposure, Agent Skills/provider and Voice Fabric adapter binding, multi-client verification, complete C3 governed request.
NEXT ACTION: recover current tool registration and exact deployed source for read-only physical health/info; preserve C3-first ordering.
