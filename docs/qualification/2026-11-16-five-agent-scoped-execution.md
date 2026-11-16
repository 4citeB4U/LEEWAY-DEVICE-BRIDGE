<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.SCREEN2.FIVE_AGENT_ACCESS
TAG: LEEWAY.DEVICE.BRIDGE.FIVE_AGENT.SCOPED_EXECUTION.CHECKPOINT.V1
5WH:
WHAT = Preserve five independent agent connections and execution-policy integration acceptance.
WHY = Restore visible Screen 2 collaboration without requiring Codex to drive every computer.
WHO = Creator/Human Authority, W00 integrator and F2 outside support; not Agent Lee.
WHERE = docs/qualification/2026-11-16-five-agent-scoped-execution.md
WHEN = 2026-11-16
HOW = Extend existing MCP HTTP handler with trusted per-agent tool selection and call-time authorization.
LICENSE = Existing LeeWay Device Bridge repository license; no new credentials or deployment rights.
-->
# Screen 2 — five independent authenticated agents (source checkpoint)

**Parent:** existing W01 / Device Bridge issue #109. **No new project, credential issuer, device control plane, queue, receipt writer, Formula or Veritas.**

## Creator's acceptance target
F1 local Codex, F2 online ChatGPT, F3 online Gemini, F4 local Antigravity, and F5 VS Code Copilot may each connect directly as their own authenticated principal to the canonical Runtime Fabric/Device Bridge and become lead when the existing workforce lease permits. Each can request the **same eligible capability types**; actual authorizations remain bound to owner, device, task, action and expiry. The target computer's approved adapter performs visible UI observation, input, submission and response readback; no F1 computer-takeover proxy is necessary.

**Correction:** do not permanently label an authorized agent as discovery-only when it has a qualified execution policy. Equally, never hide an actual unsupported/unauthorized state by merely renaming or deleting a security denial. Use accurate states: IDENTITY_UNBOUND, AGENT_EXECUTION_NOT_AUTHORIZED, ADAPTER_UNAVAILABLE, EXECUTION_NOT_VERIFIED, PRODUCTION_QUALIFIED.

## Source changes on this candidate branch
- apps/desktop/mcp-http.mjs accepts a host-injected `resolveAgentExecutionPolicy(principal)` and rejects missing/mismatched agent identity or absent policy; refuses to override a host-side discovery hold. No MCP request can choose its identity.
- apps/desktop/mcp-server.mjs exposes only that agent's explicitly approved capability names, and performs `authorizeCapabilityInvocation` again immediately before invoking the canonical Bridge. The Bridge retains its original device grant/admission/receipt gates.
- tests/mcp/http-transport.test.mjs uses **five real HTTP/MCP client sessions** with distinct synthetic principal labels, matching eligible tool lists, a negative unapproved file-write exposure test, independent synthetic calls, and mid-session revocation denying one agent without disabling the others. It also checks that a discovery policy hold cannot be bypassed.

**Scope caution:** these test credentials, compliance/card callbacks, receipts and adapters are fixtures. They do not prove actual ZITADEL clients, physical UI or original production Receipt Authority.

## Required host configuration (not performed by this source PR)
Existing trusted Runtime Fabric host (not any model or browser request) must provide:
- Verified OIDC principal and agentId, unique across F1–F5; valid issuer, audience, owner, expiry/revocation, execution scope and approved device/workforce lease.
- A trusted `resolveBridge(principal)` and original compliance/Formula/Veritas/receipt providers, not stand-ins.
- `resolveAgentExecutionPolicy(principal)` yielding `{agentId,allowedCapabilities,recheckCapability}` only after actual authorization; `recheckCapability` must reject a revoked or expired operation at dispatch.
- A compatible supported MCP client for each provider; native ChatGPT consumer UI and Gemini browser must be qualified separately, rather than claiming an API client is the original consumer chat.
- A physical Windows UI adapter capable of observing the intended real target; source Windows UI now recognizes only Codex/ChatGPT/Antigravity/Chrome, so VS Code Copilot and browsers other than Chrome require scoped adapter work.

No production token, OAuth setting, workstation process, ZITADEL client registration, source release, device UI or provider account permission was changed by this PR. The currently connected F2 assistant remains on a tool-limited integration.

## Checkpoints and negative evidence
- Base Device Bridge source SHA: `53dfbc83d184bc56fa55fd5c3c1fc760d5f39171` (candidate universal relay branch, not canonical main).
- Five-client source test commit: `2777291a14f954f679d81d733da25bd55c2ff9d2`.
- GitHub Action Portable protocol and MCP run `43951017584`: SUCCESS. Android Build run `43951017643`: SUCCESS. Confirm exact runner tests in the logs before claiming a distinct 5-client count or true host execution.
- Verified live Runtime: OIDC_ACCESS_TOKEN_VERIFIED; configured device capabilities marked verified=false, authenticated device command NOT_PROBED. Current F2 connected tool surface remains read-only.
- Runtime Fabric has a separate source candidate that requires exact `device.bridge.execute` for command execution and adds submit/read mapping; it still needs its owning PR and integrated deployment.
- No physical F1–F5 independently authenticated MCP round trip; no actual window input/submit/reply; no Formula, Veritas PRE/POST, canonical Receipt Authority or Learning readback performed here.

## Independent acceptance — repeat separately for F1/F2/F3/F4/F5
1. Genuine client registration, signed owner/agent identity and OIDC scope verification, no credentials borrowed from other workers.
2. Actual authenticated MCP initialize and tools/list with eligible execution tools for that agent.
3. Live device health and governed window list/observe via the same connection.
4. Owner consent and correctly leased window input with exact UI target and text readback.
5. Separate submit and genuine provider response read with correlation nonce and correct conversation.
6. Revoke agent's permissions or expire lease; further action must fail without moving the GUI.
7. Actual Formula/independent Veritas PRE/POST, canonical Receipt and Learning readback; no self-certified proof.
8. Repeat with alternate lead; no F1 dependency and no race/double-send.

**Scope:** SOURCE TESTED; LIVE EXECUTION NOT QUALIFIED. **Rollback:** revert this candidate branch's commits; legacy handler and deployment remain unchanged. Continue same owning mission until physical acceptance passes.
