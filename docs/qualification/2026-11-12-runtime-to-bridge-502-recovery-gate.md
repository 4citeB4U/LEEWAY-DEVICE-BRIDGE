<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.QUALIFICATION.RUNTIME_UPSTREAM
TAG: LEEWAY.DEVICE_BRIDGE.RUNTIME_DISCOVERY_HTTP_502.RECOVERY.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Recover exact authenticated Runtime→Device Bridge MCP discovery upstream without bypassing law, original issuer, or device scope.
WHY = Vercel Runtime health/owner OIDC passes while Bridge discovery, capabilities and device health fail at upstream HTTP 502.
WHO = Creator-approved Runtime Fabric, Bridge MCP/Funnel, Zitadel/Pocket-ID, native daemon and independent evidence owners.
WHERE = docs/qualification/2026-11-12-runtime-to-bridge-502-recovery-gate.md.
WHEN = 2026-11-12 after production readback; no live host command was executed.
HOW = Deterministic staged read-only tracing and owner-authorized repair/retest/physical proof with original receipt custody.
LICENSE: Existing repository terms remain unchanged.
-->
# P0 — Runtime→Device Bridge discovery HTTP 502: exact owner recovery and qualification gate

**Mission:** existing Plan A / CORE_SELF_HOSTING_VERTICAL_SLICE_V1, not a replacement project. **State:** `HOSTED_RUNTIME_AVAILABLE__MCP_UPSTREAM_HTTP_502__PHYSICAL_NOT_PROBED`. [Original independent issue #109](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/issues/109). Outside F2 contributor, **not Agent Lee**, used only authenticated read-only tools and GitHub/Vercel source/status; no privileged local Windows/Android operation, new OAuth credential or self-certified Veritas action.

## Exact observed evidence and its limits

| Evidence source | FOR / result | AGAINST / limitation |
| --- | --- | --- |
| Original authenticated Runtime connector `runtime_health` at `2026-11-12T21:58:25Z` | Runtime `AVAILABLE`, `VERCEL_FUNCTION_STREAMABLE_HTTP`, session `OIDC_ACCESS_TOKEN_VERIFIED` | Device Bridge, Formula, Continuum, independent Veritas and Receipt Admission all `NOT_PROBED`; cannot assert native devices reachable |
| Runtime `bridge_devices` same session | Tool route exists; result terminates in `LEEWAY_BRIDGE_DISCOVERY_HTTP_502` | Failed before obtaining a device registry or real physical poststate |
| Runtime `bridge_capabilities(pc-primary)` and `bridge_device_health(pc-primary)` previous 2026-11-12T21:41:27Z probe | Exact owner-scoped query attempted | Both `LEEWAY_BRIDGE_DISCOVERY_HTTP_502`; no verified host rights or device capabilities |
| Vercel production inventory | Runtime production `READY`, git SHA `97ef2d5d23664bb6f050649e54fcb4cfa6b26bc0` (C3 permission contract); Bridge most recent reported production deployment `READY` SHA `56ef3f9b99292a23c48a788152449b8a5cf6fb28` | Bridge source `main` includes release-hold SHA `81abd5e3eee10e9a0cd92e55a55813f187ec7ff0`, **not proven deployed** in returned Vercel inventory. Vercel forwarding facade is not automatically Tailscale-hosted MCP backend |
| Vercel error/log check | No matching recent Runtime/Bridge application logs or aggregated errors returned for requested 30min/24h windows | No records is NOT proof of upstream success. Tailscale endpoint inaccessible from available public web tool; host-specific logs not seen |
| Canonical Runtime source | `src/server/device-bridge-discovery-upstream.mjs` requires exact `LEEWAY_RUNTIME_BRIDGE_DISCOVERY_UPSTREAM` HTTPS `/mcp`, owner-subject and `device.bridge.read`; sends JSON-RPC `initialize`, `notifications/initialized`, optional `tools/list`, `tools/call` with original authorized bearer token. `readJson` returns `LEEWAY_BRIDGE_DISCOVERY_HTTP_<status>` if upstream HTTP response is not 200 | The current 502 code does NOT identify which JSON-RPC stage failed or show the upstream host's cause; do not assert an OIDC mismatch, absent daemon or DNS fault without original host evidence |

## Before any changes: actor, authority and data hygiene

The original identity owner should confirm the exact issuer, audience, owner subject and `device.bridge.read` grant using **non-secret status indicators**. Never paste raw bearer tokens, client secrets, cookies, private addresses, signing material or password files into issues, conversations, CI logs or receipts. Do not change redirect URIs or remove issuer checking to defeat a gateway failure. Only the actual owning host may inspect protected secret names and rotate them; contributors should receive boolean/checkpoint results and redacted trace IDs.

Record the deployed exact Runtime and Bridge revisions, provider upstream host identity, relevant encrypted configuration **presence**, tested owner identity and original PR #109 correlation. Preserve the Git SHA of currently deployed host and rollback target before modifying any service. A Vercel `READY` forwarding function is **not** proof the upstream /mcp backend is alive.

## Five minimal diagnostic stages — stop at the first failing boundary

1. **R502-01 / Configure** — On the original Runtime deployment, verify required variable **presence, not value**: `LEEWAY_RUNTIME_BRIDGE_DISCOVERY_UPSTREAM` is the approved HTTPS URL ending exactly `/mcp`; `LEEWAY_MCP_AUDIENCE` is Runtime's separate expected protected resource; `LEEWAY_MCP_OWNER_SUB` exists and matches the validated principal; registered scope contains `device.bridge.read`. No local machine path or unapproved parallel proxy.
2. **R502-02 / Edge and routing** — From the authorized host/network, capture host-level DNS/TLS/Funnel proxy **status codes and correlation IDs only** for the configured upstream. Test bounded health/protected-resource metadata and anonymous MCP initialization (must be denied 401, **not** falsely returned 200). Do not send a real credential to an unknown endpoint, disable TLS validation, or classify a healthy HTML login as MCP.
3. **R502-03 / Native MCP process** — Original upstream host verifies the actual listening process, managed service/supervisor, expected bind/interface, and Tailscale Funnel forward destination match; inspect why a valid TLS gateway could generate a 502 when its local target is absent or unready. Check restart and local rollback **without** deleting device-owned Brain/Diagnostics or receipts. Record PID/service identity, observed local status and exact source commit; no invented path or hardcoded Windows drive letter in portable code.
4. **R502-04 / Authenticated MCP sequence** — With the real authorized owner client, execute `initialize` → `notifications/initialized` → `tools/list` → `tools/call bridge_devices`; capture response codes **for each stage** plus schema-valid JSON-RPC/SSE and actual tool list. Never log bearer value or full content. If request fails with 401/403, escalate issuer/audience/scope to existing owner; if 502, escalate to gateway/upstream process; if 200 with invalid schema, repair source handler rather than diluting normalization. Confirm no echo-loop between Runtime and Bridge upstream URLs.
5. **R502-05 / Actual device** — Only after live registry returns, require exact identity and original grant for `pc-primary`, then `device.info`/`device.health` **actual native** bound receipt and a separate authorized byte-exact read-only file operation. Work through Fold6, HP and iPhone individually. A room/proxy registration is not native camera, GPU, voice, file write or iPhone signed app proof.

## Failure and authority decision table

| Actual finding | Original correction owner | Forbidden shortcut | Retest required |
| --- | --- | --- | --- |
| 502 at Runtime↔upstream `initialize` | Device Bridge MCP process + Tailscale/Funnel routing owner | Replace Runtime or disable OIDC | Original authenticated `initialize` succeeds, expected MCP response and no stage 502 |
| 502 only after session negotiation / tool call | Bridge MCP / managed session upstream owner | Assume all `bridge_devices` data trustworthy or invent receipt | Same-session initialize/list/call readback with exact route/correlation |
| 401/403 with actual issuer mismatch | Pocket-ID/ZITADEL/Runtime identity owner | Reuse old public mesh secret or wildcard role | Issuer/audience/resource/scope signed check, revoked grant denied |
| Registered `pc-primary` but reachability `NOT_PROBED` | Original Device Bridge native adapter owner | Call `TRUSTED_REGISTRY_READ` physical VERIFIED | Actual health/info with device-bound original receipt and independent physical evidence |
| Source main advanced but Vercel/upstream deploy old | Original deployment/release custodian | Treat GitHub merge or `READY` alone as runtime admission | Exact SHA deployed and matched; alternate host/Funnel revision measured and rollback recorded |
| External model learns repair process | Workforce/Agent Skills/Learning Ledger owner | Grant badge or permanent skill from chat | Held-out permanent-worker evaluation and original LG-07/08 independent canonical admission |

## One vertical slice required before claiming qualified operation

After R502-01..05 pass, execute one **owner-consented, non-destructive, governed W02 read**: authenticate named worker and target, resolve native device identity, verify *read* grant (not write), record prestate, run original Bridge command once, read back data/hash, evaluate existing Formula policy, independent Veritas PRE/POST, Receipt Authority append/readback, Continuum checkpoint, Learning LG-08 only when independently applicable, and original Production owner sign-off. Record exact source/deployed SHAs and **FOR and AGAINST** evidence. Then test expired grant, wrong device, absent daemon, revoked permission and replay; every negative case must be denied before effects.

**Current acceptance:** `NOT_EXECUTED / BLOCKED_AT_UPSTREAM_HTTP_502`. Signed source CI, 7 workflow successes for Android installer hold, and new Engineering/Skills laws are valuable, but **cannot** substitute for this live authorization and physical poststate.

## Required owner handoff format

`workId, correlationId, activeGate, exactDeviceId, runtimeSha, bridgeSourceSha, bridgeUpstreamDeployedSha, secureIssuerConfigured(Boolean), upstreamBound(Boolean), phaseOfFirstHttpFailure, upstreamStatus, nativeDaemonReady, requestedTool, actorGrantChecked, sourceAndLiveEvidenceFor, evidenceAgainst, originalVeritasRefOrNA, originalReceiptRefOrNA, rollbackOwner, nextOwner`.

For inaccessible private host evidence use `NOT_OBSERVED`, never a fabricated PASS. Keep the existing original PR/issue, source lock, standards and custody chain. No new control plane, issuer, receipt store, Formula, verifier or learning ledger.
