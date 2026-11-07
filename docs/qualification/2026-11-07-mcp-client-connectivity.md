# LeeWay Device Bridge — MCP Client Connectivity Qualification

**Checkpoint:** 2026-11-07 02:12 America/Chicago (UTC−06:00)  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Inspected source:** canonical `main` at `6e37df2fa14dc450c763003b0e39068c6cd9d7a5`  
**Acceptance target:** each supported local or cloud agent can connect to the same LeeWay-owned Bridge through a client-compatible MCP transport, authenticate as its own principal, discover only authorized tools, and execute only through the canonical LeeWay admission chain.

## Decision

The transport architecture is already present in canonical source. It supports local MCP over stdio and remote MCP over stateless Streamable HTTP. The supplied Gemini guidance correctly identifies that cloud clients cannot reach a private loopback address directly. It is incomplete in calling SSE the standard remote path: the current MCP TypeScript SDK recommends Streamable HTTP for new remote servers, and Google’s current Antigravity and Gemini API documentation supports Streamable HTTP. No second Python server or tunnel is needed to establish the transport contract.

Full multi-client connectivity is **NOT QUALIFIED**. Client configuration, OAuth client enrollment, actual tool discovery per client, and execution authorization are separate gates. MCP transport access does not make clients share their conversation transcripts or provide one another’s prompt boxes.

## Source findings

- `apps/desktop/mcp-server.mjs` registers the canonical Bridge tools on `StdioServerTransport` for a local process-spawned client. Its direct CLI startup does not receive a trusted Runtime composition; its fallback admission is deliberately fail-closed. A successful stdio handshake therefore would not prove production device execution.
- `apps/desktop/mcp-http.mjs` uses the official SDK `StreamableHTTPServerTransport`, stateless JSON responses, bounded request bodies, allowed-host/origin checks, an injected authentication provider, and an owner-scoped Bridge resolver. Discovery-only principals are limited to read capabilities; execution requires a separately trusted Runtime policy.
- `apps/desktop/remote-mcp-http.mjs` also uses Streamable HTTP, but binds only to loopback, requires an injected authenticator, rejects browser-origin requests, and exposes a read-only tool set. It refuses a public bind.
- `operator/hosting/start-public-mcp-ingress.mjs` is a transport-only public proxy. It requires explicit HTTPS OAuth-resource and upstream bindings, forwards `/mcp` to an independent Runtime MCP endpoint, and does not host or directly control the Creator’s PC.
- The canonical source has no `SSEServerTransport` implementation. That is not a blocker for Antigravity, ChatGPT’s remote MCP setup, or Gemini API Interactions, whose current documented paths accept Streamable HTTP. Retain SSE only if a specifically qualified client requires legacy compatibility.

## Current client and runtime evidence

### Active Codex/ChatGPT connector in this session

- Fresh Runtime health at `2026-11-07T08:06:53Z` returned `AVAILABLE`, transport `VERCEL_FUNCTION_STREAMABLE_HTTP`, and `OIDC_ACCESS_TOKEN_VERIFIED`.
- The same session’s LeeWay connector executed read-only `device.health` and `device.info` calls for `pc-primary`. Both returned `uiControl:false`, `FORMULA=NOT_EVALUATED`, and `physicalProbe=EXECUTED_NOT_INDEPENDENTLY_VERIFIED`; receipts were `fa5586e0-386d-40b0-82d1-202aad185ac3` and `4d686581-3a57-447c-a675-61b1c25735d2`.
- `bridge_devices` reports `pc-primary` as `CONFIGURED_NOT_PHYSICALLY_PROBED`. Capability discovery reports `executionAdmission=NOT_CONFERRED_BY_DISCOVERY` and the discovered capabilities as unverified. This is evidence for this session’s installed read-only connector path; it does not prove every Codex or ChatGPT client is configured.
- The local Codex configuration contains a remote MCP URL, `https://leeway-device-bridge.vercel.app/mcp`, and a separate stdio entry. Configuration alone is not proof either entry completed a current MCP handshake.

### Public remote endpoint

- A read-only GET of `/.well-known/oauth-protected-resource/mcp` returned HTTP 200 and identified resource `https://leeway-device-bridge.vercel.app/mcp`, authorization server `https://leeway-mcp-d3xoxh.us1.zitadel.cloud`, and advertised scopes `read:runtime` and `device.bridge.read`.
- The issuer’s OIDC discovery document supports S256 authorization-code PKCE but reports no dynamic client-registration endpoint. Any additional client needs an explicitly registered/approved OAuth client or another supported, owner-approved authentication binding.
- An MCP `initialize` POST without credentials returned HTTP 401 `BEARER_REQUIRED` with the protected-resource metadata challenge. The endpoint is reachable and protected; this is not authenticated tool discovery.
- `/healthz` returned 404. The canonical Vercel function does not define that path, so this is not evidence that `/mcp` is down.

### Antigravity configuration

- Both `C:\Users\Leona\.gemini\config\mcp_config.json` and `C:\Users\Leona\.gemini\antigravity\mcp_config.json` currently start `python` with `C:/Users/Leona/.gemini/antigravity/scratch/LEEWAY-DEVICE-BRIDGE/bridge_mcp.py` over stdio.
- That script is an untracked file in a scratch clone at commit `1c5e557`, not the canonical MCP server. It exposes `run_operator_command(action, target)` and shells no command, but starts Node with the unchecked action/target arguments. The target `operator/device-operator.mjs` only exports library functions and has no CLI dispatch. The Python wrapper treats a zero exit with empty output as “Operator command executed successfully.” Source inspection therefore identifies a false-success path; no operator action was executed in this investigation.
- The same script falls back to the static claim `Operational (pc-primary local node)` when its registry is absent. That fallback is not a live health probe.
- Both config entries have now been set to `disabled: true`; readback confirms the value in each file and confirms no other JSON setting changed. Byte-for-byte pre-change backups are `work/antigravity-config-backup-20261107/config-mcp_config.json` and `work/antigravity-config-backup-20261107/antigravity-mcp_config.json`. The original config SHA-256 was `31E84D52B27ADEF215417ECDAA5B508ED96504DBC0EADB47BE218C877B4A9547`; both updated files hash to `F2B74C7EC4CB0E2E85BBC9217FEF386E9F0FB1758C5437B200F1B1F149515341`.
- This verifies on-disk configuration only. Antigravity was not restarted, so whether an already-running process has dropped the old server is UNVERIFIED. Do not treat this as a qualified Antigravity connection or use the wrapper to execute/message another agent.

## Client support matrix

| Client surface | Supported transport in current official docs | LeeWay state |
| --- | --- | --- |
| Antigravity desktop/IDE | Local stdio via `command`, or remote Streamable HTTP via `serverUrl` | Current config points to the unqualified scratch Python wrapper; no current tool-list handshake verified. Remote OAuth client binding not established. |
| ChatGPT web custom MCP app | Remote HTTPS MCP, or an eligible OpenAI Secure MCP Tunnel for a private service | Public protected-resource metadata is live; this account’s custom-app enrollment is not verified here. The current Codex-hosted LeeWay connector is separately observed working for read-only calls. |
| Codex CLI/IDE | Local stdio and remote MCP configuration are supported | A remote URL and stdio entries exist in local config, but that file alone is not a connection receipt. The current LeeWay Runtime tool in this session is OIDC-connected and read-only. |
| Gemini API / Interactions API | Remote Streamable HTTP; current API docs say SSE is unsupported | No LeeWay server binding or authenticated Gemini API tool call verified. |
| Consumer Gemini web chat | No custom MCP connection path verified in the official source inspected for this task | UNVERIFIED. Do not conflate this with Antigravity or the Gemini API. |

Official references: [MCP TypeScript SDK transport guidance](https://ts.sdk.modelcontextprotocol.io/server), [Antigravity MCP configuration](https://antigravity.google/docs/mcp), [ChatGPT custom MCP connections](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt), [OpenAI MCP API guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), and [Gemini API remote MCP support](https://ai.google.dev/gemini-api/docs/function-calling).

## Required implementation and qualification gates

1. **Contain the false-success adapter.** Replace the Antigravity scratch entry with a LeeWay-owned, canonical adapter or disable that entry until a qualified endpoint and client identity are available. Remove generic `run_operator_command` from any agent-facing Bridge contract; use named, schema-bound LeeWay capabilities with the canonical admission and receipt chain.
2. **Bind each client separately.** Use the existing protected resource and Streamable HTTP endpoint for eligible remote clients. Register and approve each client with the existing issuer; never copy access tokens between ChatGPT, Codex, Gemini, or Antigravity. For local-only clients, use the canonical stdio server with a trusted composition, not an untrusted wrapper.
3. **Prove each handshake.** For each client record server identity, transport, issuer/resource, principal and scope, `initialize`, `tools/list`, enabled tool names, and disconnect/reconnect result. Unauthenticated, wrong-audience, wrong-owner, and wrong-scope requests must fail closed.
4. **Prove one bounded operation per scope.** Start with read-only health/info and a permitted file read. Record the actual device-bound result and canonical evidence. Tool listing, a host health check, or an MCP handshake does not prove execution or production admission.
5. **Promote actions independently.** UI input, filesystem mutation, process control, voice and inference each require their own capability grant and Formula/Veritas/receipt evidence. The active Bridge still reports `uiControl:false`; the new Windows composer source is not installed on the live host.
6. **Keep agent messaging separate from device execution.** MCP gives each model tool access; it does not mirror the other model’s chat or create an inter-agent conversation. The old `device-relay` source path is recorded as returning 404 in the prior production-readiness checkpoint. Do not substitute shell dispatch. A replacement relay must be a LeeWay-owned, authenticated message capability with recipient binding, correlation IDs, content limits, consent, response capture and receipts.

## Follow-up: proposed direct Node stdio config — not qualified

The suggested Antigravity entry that runs `node apps/desktop/mcp-server.mjs` directly is not a valid full-connection repair:

- The CLI reads `process.argv[2]` as a required Bridge config path. The suggested entry supplies only the script path, so it reaches `CONFIG_REQUIRED` and exits before creating an MCP server.
- The required JSON config needs a `devices` entry and either an explicit local `receipts` path or a trusted Runtime composition. `NODE_ENV=production` is not read as authority and does not construct Formula, Veritas, owner-consent or receipt callbacks.
- The direct CLI calls `start(configPath)` without `runtimeInput`. With only the local JSONL sink, its C3 admission has no Formula or Veritas pre-gate and denies every Bridge operation. If started with that sink, records are local controller observations, not canonical durable receipts.
- Consequently, adding an `args` path could make the process start, but would still not provide the claimed full operation, genuine canonical receipts, or production admission. Do not enable this config as an execution route.

The local stdio path is viable only behind an owner-approved launcher that injects the real trusted Runtime composition and canonical receipt sink. No such launcher was found or run here. The remote Streamable HTTP path remains the existing client integration route; it requires an approved OAuth client for Antigravity.

## Engineering loop and evidence

| Stage | State | Record |
| --- | --- | --- |
| Investigate | EVIDENCED | Canonical transport source, current client configs (secrets excluded), protected-resource metadata, OIDC discovery, existing qualification record and official client docs inspected. |
| Diagnose | EVIDENCED | Transport primitives exist; full client enrollment is not proven. Antigravity points to a scratch wrapper with a false-success command path. |
| Plan | EVIDENCED | Reuse stdio/Streamable HTTP and the current Runtime authority; replace the unqualified wrapper; bind clients independently; never expose an unauthenticated quick tunnel. |
| Implement | PASS / CONFIG ONLY | Disabled the unqualified legacy Python MCP entry in both Antigravity config files; preserved byte-for-byte backups. No canonical transport source change was needed. |
| Test | NOT_RUN | No source code changed. Existing transport suites were inspected but not rerun. |
| Validate | OBSERVED | Protected-resource metadata, OIDC discovery, unauthenticated MCP refusal, current Runtime connector and `pc-primary` read-only probes were observed. Both config files parsed and read back with the targeted server disabled. No Antigravity process reload was tested. |
| Repair / Retest | BLOCKED | The false-success config route is disabled on disk. Safe replacement requires a canonical local trusted-runtime composition or an approved OAuth client for the protected remote resource. Neither was installed here. |
| Verify | BLOCKED | Full client matrix, authenticated Antigravity/Gemini/ChatGPT tool discovery, production execution, and independent device verification remain unmet. |
| Evidence | EVIDENCED | Live response details above; no secret values recorded. Task Formula evaluation was not executed; Veritas decision, canonical receipt and Learning Ledger admission were not produced. |

**Rollback:** the Antigravity config change is reversible using the byte-for-byte backups above; the docs-only change can be reverted by reverting its commit. No Antigravity process was restarted and no runtime deployment changed.  
**Next action:** register/approve an Antigravity OAuth client with the existing LeeWay issuer or identify the canonical local trusted-composition launcher; then configure the existing remote Streamable HTTP endpoint and verify Antigravity’s authenticated `initialize` and `tools/list`. Do not substitute the bare Node CLI example and do not claim a full connection until that real client call passes.

**Current gate: TRANSPORT SOURCE PRESENT; CODEX SESSION READ-ONLY ROUTE OBSERVED; ANTIGRAVITY ADAPTER UNQUALIFIED; MULTI-CLIENT PRODUCTION CONNECTION NOT QUALIFIED.**

## Follow-up: Codex host-composition launcher discovered — 2026-11-07 02:28 America/Chicago (UTC−06:00)

Both installed Antigravity MCP configuration files now point to the same local launcher already configured in Codex:

- `C:/Users/Leona/.codex/leeway/codex-host-composition/leeway-device-bridge-mcp.mjs`
- Runtime base URL `http://127.0.0.1:4011`
- Device configuration `C:/Users/Leona/.codex/leeway/codex-host-composition/device-bridge.config.json`

These are current on-disk values observed during this follow-up. The earlier disabled-Python configuration and its backup remain historical evidence; this follow-up did not edit either Antigravity configuration and did not restart Antigravity.

### Read-only launcher qualification

Started the configured launcher as an MCP stdio child process and performed `initialize` plus `tools/list`; no device capability was called. It passed the launcher's eight local SHA-256 pin checks, Runtime `/runtime/health` and `/runtime/enforcement/manifest` startup checks, and advertised 63 tools. This proves the local process can start and expose its tool catalog from this Codex host. It does not prove Antigravity itself loaded the current config, nor does it prove device execution, provider authentication, or cross-agent messaging.

### Admission and evidence limits

- The pinned bridge files match the current local `device-bridge-controller` checkout, but none of the eight pinned files matches the corresponding file in the clean Device Bridge `main` checkout inspected at `bda068d74832a972e6bcea42aea5a356c5ca8544`; three pinned modules are absent from that clean checkout. The launcher is therefore pinned to a local candidate composition, not qualified canonical `main` source.
- Runtime `/runtime/authorize-action` validates the compliance card and writes a receipt with status `AUTHORIZED_PENDING_VERIFICATION`. The launcher treats that status as an affirmative admission result. This endpoint does not itself return an independent Veritas decision or final verification.
- The host-composition receipt sink appends Bridge records to local `codex-host-composition/receipts/device-bridge-mcp.jsonl`. Bridge receipts identify authority as `CONTROLLER_OBSERVATION` and Formula as `NOT_EVALUATED`. This file is not proven to be Continuum custody and must not be represented as a canonical LeeWay receipt or ledger.
- The referenced device config grants a broad set of file, process, browser, Windows UI, voice, and write capabilities. Since the local launcher is not yet bound to verified Continuum receipt custody and independent verification, the 63-tool catalog must not be treated as production-admitted capability.

### Updated state and next gate

| Gate | State | Evidence |
| --- | --- | --- |
| Antigravity config points to Codex host launcher | CONFIGURED_ON_DISK | Read-back of both JSON configs; no Antigravity restart |
| Local launcher startup and tool discovery | OBSERVED_PASS | MCP stdio `initialize`/`tools/list`; 63 tools; no operation invoked |
| Antigravity process loaded this configuration | UNVERIFIED | Process was not restarted or queried through its own MCP client |
| Pinned source equals clean Device Bridge `main` | FAILED | All eight local pins differ or are absent in the clean checkout |
| Runtime status means independent pre-execution verification | NOT_ESTABLISHED | Handler returns `AUTHORIZED_PENDING_VERIFICATION` after card validation/receipt write |
| Canonical Continuum receipt custody | NOT_ESTABLISHED | Launcher writes local JSONL; no Continuum binding proved |
| Device operation / Formula / Veritas | NOT_EXECUTED | No device tool was called; no task Formula or independent Veritas evaluation occurred |

The present configuration is **transport-connected at process level but not production-qualified for tool execution**. Keep the source/version, Runtime admission semantics, and receipt custody gates open before using the broad Antigravity tool surface. The next implementation gate is to reconcile the trusted composition with canonical source and bind its pre/post evidence through the approved Continuum and independent-verification authorities; then qualify Antigravity's own handshake and a narrowly scoped read-only device operation.

No source or runtime deployment changed in this follow-up. No device action, Formula task evaluation, Veritas decision, canonical receipt, or Learning Ledger admission was produced.

## Post-restart qualification — 2026-11-07 02:54 America/Chicago (UTC−06:00)

A fresh system restart exposed a local startup regression. The scheduled recovery wrapper used the newer shared Codex device config against its pinned older recovery source bundle. Config validation rejected the unsupported `browser` field and `device.browser.session.*` / `device.windows.window.*` grants; wrapper cleanup then stopped the Runtime it had launched. The wrapper now selects a separate, source-version-scoped recovery config containing only the four already supported read-only grants (`device.health`, `device.info`, `device.files.read`, `device.directories.list`). The original wrapper is preserved beside it with SHA-256 `0D87233BA62A0D42AB9EE68F93D027B4CC787522B64A0B66F46B6DD121A8664B`; the broader Codex config was not changed.

Smoke and live host checks after repair:

- Recovery smoke `smoke-20261107-084534969`: Runtime health/manifest succeeded; unauthenticated Bridge `/mcp` returned expected HTTP 401.
- Current scheduled task: `LeeWay Device Bridge Relay`, `Running`.
- Local Runtime `:4011/runtime/health` and `/runtime/enforcement/manifest`: HTTP 200.
- Local Bridge `:4271/mcp`: HTTP 401 `UNAUTHORIZED` for an unauthenticated GET, proving the protected listener responds. `/healthz` is HTTP 404 and is not the Bridge health endpoint.

### Fresh client matrix

| Surface | Current result | Qualification boundary |
| --- | --- | --- |
| ChatGPT-hosted LeeWay connector | OIDC-authenticated Runtime available; `bridge_devices`, `bridge_capabilities`, `device.health` and `device.info` succeeded | Confirms this ChatGPT session's read-only connector. `pc-primary` reports `CONFIGURED_NOT_PHYSICALLY_PROBED`; health/info receipts are controller observations with Formula unevaluated and independent verification absent. Not evidence of a separately enrolled ChatGPT web custom app. |
| Antigravity local config / launcher | Both on-disk configs point to LeeWay trusted host composition. Local launcher MCP `initialize`/`tools/list` previously exposed 63 tools. | Antigravity's own MCP manager/session state remains unverified; tool catalog discovery does not confer operation admission. No prompt sent. |
| Gemini web | Logged-in consumer UI exposes custom MCP app setup; connected-app list showed no LeeWay app | No LeeWay custom app was added; no authenticated MCP handshake or tool discovery. |

At `2026-11-07T08:53:10Z`, Runtime reported `AVAILABLE`, `VERCEL_FUNCTION_STREAMABLE_HTTP`, `OIDC_ACCESS_TOKEN_VERIFIED`. `device.health` receipt `4982dd50-639d-405e-a023-180a0c138c38`; `device.info` receipt `552c9b16-680e-463a-8d61-fe1c6c2a041e`. Both report `authority=CONTROLLER_OBSERVATION`, `formula=NOT_EVALUATED`, and `physicalProbe=EXECUTED_NOT_INDEPENDENTLY_VERIFIED`; results report `uiControl:false`. Discovery exposed 34 capabilities, but explicitly `executionAdmission=NOT_CONFERRED_BY_DISCOVERY`. No file operation was performed.

Gemini's current custom-app support and client-specific eligibility/auth requirements are documented by Google at [Gemini Apps connected apps and custom apps](https://support.google.com/gemini/answer/17209137). Antigravity supports MCP via its documented client configuration, including stdio and remote transport: [Antigravity MCP docs](https://antigravity.google/docs/mcp). Each provider requires a separate identity/auth binding; do not share tokens. The user-visible page or local config is not a client handshake.

A Windows Voice Typing overlay opened unexpectedly during Antigravity inspection. It was closed, and the unsent composer content was cleared; nothing was submitted. No provider prompt was sent.

**Current gate:** ChatGPT-hosted read-only connector `OBSERVED_CONNECTED`; local service `RUNNING`; Antigravity application connection `UNVERIFIED`; online Gemini LeeWay binding `NOT_CONFIGURED`; full three-client production qualification `OPEN`. No Formula task evaluation, Veritas decision, canonical Continuum receipt, or Learning Ledger admission was produced.

**Next action:** qualify each external client independently. First establish an approved Gemini MCP app auth/client binding and verify that client's authenticated `initialize`, `tools/list`, and reconnect. Separately inspect Antigravity's own MCP manager for an authenticated handshake to the configured LeeWay launcher. Do not submit prompts during connection qualification.
