# Device Bridge and Voice Fabric production readiness checkpoint

**Checkpoint:** 2026-11-06 00:15 America/Chicago (UTC−06:00).  
**Authority:** Creator request to continue Device Bridge production qualification and restore LeeWay Voice Fabric HTTP success.  
**Scope:** Read-only production and existing carrier probes. No production settings, credentials, service source, device, or GPU were changed.

## Expected gate

The public LeeWay Device Bridge ingress must have an authenticated Runtime Fabric identity/upstream and pass its actual protected MCP request. Device and Continuum/Veritas/receipt capabilities must be separately qualified. LeeWay Voice Fabric must return valid synthesis through the currently selected LeeWay voice; a health response alone is insufficient.

## Observed evidence

### Runtime and Device Bridge

- Fresh runtime_health at 2026-11-06T06:11:06.264Z reported Runtime Fabric AVAILABLE over Vercel Streamable HTTP with OIDC token verification. Device Bridge, Continuum, Formula, Veritas and receipt admission were NOT_PROBED; no authenticated device command was executed.
- Device discovery listed only pc-primary with CONFIGURED_NOT_PHYSICALLY_PROBED. No device-specific call was made.
- The Vercel Device Bridge project's guessed /healthz path returned HTTP 404. This is not the canonical public MCP ingress.
- The actual configured managed ingress is Render service leeway-device-bridge-mcp-qual (srv-dbh4vv6k1f9s73efipv0) at https://leeway-device-bridge-mcp-qual.onrender.com. Render reports its latest deployment as live, but the service is on branch integration/railway-public-mcp-ingress-20261028, has auto-deploy off, and the active deployment source commit is f2fac5b65da437f56a3ec7ab372e308d28372a94 (2026-10-28).
- After the cold-start request timed out, a fresh read to /healthz returned HTTP 200: process RUNNING; identityBinding and runtimeUpstream are UNBOUND; authenticated MCP, Continuum readback, Veritas and ledgers are NOT_PROBED; device control is NOT_AUTHORIZED.
- /.well-known/oauth-protected-resource/mcp returned HTTP 503. Current Render app logs (2026-11-06T06:14:19Z) report listener BOUND, liveQualified false, productionAdmission NOT_GRANTED.
- The existing deployment contract names the required bindings LEEWAY_MCP_AUTH_ISSUER, LEEWAY_MCP_AUDIENCE, and LEEWAY_MCP_UPSTREAM. Their qualified live values/authority are not established here. No values were read, generated, or changed.

**Diagnosis:** the web listener runs, but the ingress is not production-qualified. The HTTP 200 health is process-only. The exact live boundary is missing identity/upstream binding and an unqualified source deployment; authenticated MCP and downstream LeeWay authorities have not passed.

### LeeWay Voice Fabric

- The local LeeWay carrier /health returned HTTP 200 and reported canonical Formula PASS plus selected Kokoro voice kokoro-bm_lewis as provider-reported ready.
- The selected Voice Fabric provider /status returned HTTP 200 and reported 28 Kokoro voices ready.
- A direct request to the selected provider's canonical /synthesize route, using bm_lewis, returned HTTP 200 JSON with a WAV payload (audioContent, 237,083 response bytes). The carrier's /render-voice path also returned HTTP 200 JSON with the same selected voice/provider identity.
- These are fresh successful requests on 2026-11-06, after earlier render errors. They establish successful synthesis responses for these requests only; generated audio was not played during these probes. They do not guarantee all future requests will return 200, nor prove live microphone/full-duplex voice.

## Action and recovery

No source or production configuration was mutated. No restart, redeploy, provider fallback, or GPU/device call occurred. Rollback is not applicable.

## Next executable steps

1. Trace the existing authorized issuer and Runtime Fabric upstream owner/binding for the Render ingress without reading or disclosing secret values; bind only those canonical authorities.
2. Compare the Render branch commit against current Device Bridge main; stage production onto the accepted canonical source only after verifying the security-sensitive ingress changes and binding requirements.
3. Recheck /healthz, protected-resource metadata, then perform an authenticated read-only /mcp handshake through the authorized Runtime Fabric path. Keep device control denied until an explicit qualified owner grant exists.
4. Read this checkpoint and update the contributor handoff with actual deploy/test evidence after the binding repair.
5. Separately complete an authorized speaker playback check for the successful LeeWay synthesis response. Do not equate synthesis HTTP 200 with audible playback or C3 two-way qualification.

**Veritas:** Production ingress acceptance BLOCKED by unbound identity/upstream and unprobed authenticated MCP/downstream providers. Voice synthesis request result OBSERVED HTTP 200; playback NOT VERIFIED; full C3 voice NOT QUALIFIED.  
**Receipt:** No governed execution receipt created. Learning Ledger not updated.


## Vercel production-path correction — 2026-11-06 00:25 America/Chicago (UTC−06:00)

The earlier 00:15 check tested /healthz on Vercel, a route that is not configured. It correctly returned 404 but was the wrong readiness probe. Current main vercel.json maps POST /mcp to api/mcp and the protected-resource metadata path to api/oauth-protected-resource.

Fresh Vercel evidence:
- Project leeway-device-bridge latest production deployment dpl_BsxYBYEc6BvZERrxuBVXCDZABvWh is READY and built from exact Device Bridge main commit a2b8112bb67bdb52adedd005182cbc9a389868ed.
- GET https://leeway-device-bridge.vercel.app/.well-known/oauth-protected-resource/mcp returned HTTP 200. It advertises resource https://leeway-device-bridge.vercel.app/mcp, LeeWay Zitadel issuer https://leeway-mcp-d3xoxh.us1.zitadel.cloud, and read:runtime scope.
- POST /mcp with no bearer returned HTTP 401 BEARER_REQUIRED and the correct resource_metadata challenge.
- A negative-auth POST with a deliberately invalid bearer returned HTTP 401 invalid_token with a Runtime challenge. This confirms the routed request reached the OIDC-protected upstream path and was rejected. No valid token or tool execution was used in this probe.
- OIDC discovery returned the exact advertised issuer; the issuer JWKS endpoint returned two public RS256 signing keys.
- Fresh Runtime Fabric health again reported AVAILABLE and OIDC_ACCESS_TOKEN_VERIFIED. An authenticated read-only bridge_devices tool call returned pc-primary as CONFIGURED_NOT_PHYSICALLY_PROBED. No device-specific probe, command, GPU route, or mutation occurred.

**Correction:** Vercel is the current production MCP ingress path to qualify. The separate Render service remains a legacy/qualification service on its old integration branch; its process-only HTTP 200 and unbound configuration are not evidence that the Vercel ingress is unbound. No Render or Vercel settings were changed.

**Current gate:** Vercel public route and OAuth challenge/negative-auth behavior are OBSERVED PASS. A valid client-authorized POST /mcp exchange was not made through the public URL. The live Runtime connector separately verified OIDC and returned the read-only device list. Device physical reachability, delegated device scope, native device authorization, Continuum, independent Veritas, receipt and production execution remain unverified. Keep device control closed until the existing owner grant and end-to-end evidence are verified.

**Next:** trace the existing ChatGPT/Runtime client registration and owner grant for the advertised LeeWay issuer, verify whether the current authenticated connector has the needed read-only Device Bridge scope, then invoke only a non-device-specific read-only capability through the live Vercel-backed integration. Do not change Vercel scopes, Render settings, or production credentials without the canonical grant.


## Post-deployment and playback verification — 2026-11-06 00:27 America/Chicago (UTC−06:00)

After the documentation commit, Vercel production again returned HTTP 200 for the protected-resource metadata and HTTP 401 BEARER_REQUIRED for an unauthenticated POST /mcp, with the expected resource_metadata challenge. The latest code deployment remained READY on main; these responses are expected protected-ingress behavior.

The authorized LeeWay read-aloud adapter subsequently reported: “LeeWay Runtime Fabric selected-voice playback completed.” This upgrades the earlier synthesis-only observation to software playback completion for that prepared reply. It does not prove the user physically heard it, nor qualify live microphone/full-duplex C3.

No source/runtime configuration or credentials were changed. Public valid-bearer exchange, delegated device capability, physical device health, Continuum, Veritas, and receipt gates remain open.

## 2026-11-06 10:23 America/Chicago (UTC−06:00) — Runtime health/info route repair and upstream qualification

**Authority and constraint:** Creator-directed production qualification. The LeeWay Device Bridge remains the device adapter. `pc-primary` was used only for bounded read-only device-info/health qualification; no GPU, model inference, file access, mutation, or command was run.

**Runtime Fabric release:** Main commit `e551cb2cb1d3ae6465b5f1952c8746f5b6afa75e` adds the missing owner-scoped `bridge_device_health` and `bridge_device_info` MCP registrations and receipt-bound upstream validation. Vercel Runtime Fabric deployment `dpl_FHkydQgJA4wZJ1wspPzJnzrFrNVD` reached READY on that exact main commit.

**Fresh authenticated result after deployment:** `runtime_health` reported Vercel Streamable HTTP and verified OIDC; provider composition (Device Bridge, Continuum, Formula, independent Veritas and receipt admission) remained `NOT_PROBED`. `bridge_device_info(pc-primary)` returned a PASS receipt `1b78a77c-a97b-4538-aea8-f70dd882cd66` bound to `device.info` and `pc-primary`. `bridge_device_health(pc-primary)` now reaches the owner-scoped Runtime route but returns `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. Capability discovery still marks health/info granted but `verified:false`. This is a real read-only device-info execution; it is not independent Veritas acceptance.

**Upstream source diagnosis and candidate:** Current Device Bridge main's shared MCP server already supports the bounded `device.health` and `device.info` schemas, while both authenticated discovery-only HTTP entry points pass only `model.hub.catalog` to the read-only allowlist. A clean main checkout has a candidate change to expose health/info alongside bridge discovery, without adding mutation tools. The qualification utility is extended to require those tools and validate device/capability-bound PASS receipts. Full Device Bridge MCP suite passed **117/117** after correcting expectations to include the two read-only probes and keep command/mutation tools absent. Syntax checks and `git diff --check` pass. **These are source fixtures only; this candidate is not yet published or deployed.**

**Production binding boundary:** Runtime deployment and its current upstream target have not been changed. The authorized app connector remains read-only for device service lifecycle; no available adapter can publish/restart the underlying remote MCP host. The active public Vercel protected-resource metadata advertises `read:runtime`; it does not advertise `device.bridge.read`. An encrypted owner-subject and discovery-upstream environment binding exists, but no issuer-side grant evidence was obtained and no environment value was decrypted. Do not advertise/add the bridge scope until the canonical OIDC grant is independently confirmed.

**Current gate:** Vercel ingress and Runtime OIDC **PASS**; Runtime health/info tool registration **DEPLOYED**; device info **EXECUTED WITH PASS RECEIPT / NOT INDEPENDENTLY VERIFIED**; device health **BLOCKED BY UPSTREAM TOOL REGISTRATION**; fresh OAuth scope advertisement **UNQUALIFIED**; Continuum/Formula/Veritas/receipt-ledger composition **NOT PROBED**; full Device Bridge production qualification **NOT COMPLETE**.

**Next actions:** push the tested upstream read-only registration fix to Device Bridge `main`; identify the approved deployment/lifecycle path for the configured upstream and deploy that exact commit; rerun the authenticated health/info probes and independently check the returned receipt chain. Separately establish the issuer-side bridge-scope grant before changing OAuth metadata. Then qualify the original Continuum readback, request-bound Formula/LDWMD path, independent Veritas result and canonical receipt/Learning Ledger chain. Keep model inference off `pc-primary` and on LeeWay GPU only.

## 2026-11-06 10:30 America/Chicago (UTC−06:00) — Mainline release and post-deploy retest

The Device Bridge source change is now on `main` as `5abef21583e379608b58f46b4b65cb5a24be0565`. It enables only the existing read-only `device.health`/`device.info` capabilities for discovery-only authenticated MCP, updates the live qualification utility to require device-bound PASS receipts, and upgrades the MCP SDK/Zod dependencies. Vercel deployment `dpl_DFU2odNcJSdLvD3rayMHY9pwzn84` is READY on that exact commit. The Runtime Fabric route fix remains deployed on `e551cb2cb1d3ae6465b5f1952c8746f5b6afa75e` as `dpl_FHkydQgJA4wZJ1wspPzJnzrFrNVD`.

**Verification:** Device Bridge MCP suite **117/117**, installation adapter **1/1**, iLoader observer **1/1**, CLI **7/7**, and Voice auth **6/6** passed (132/132 total). `npm audit --omit=dev` reports **0 vulnerabilities** after the dependency upgrades (`@modelcontextprotocol/sdk` 1.32.2, Zod 4.6.7). Syntax and `git diff --check` passed. These are source/build checks and Vercel deployment evidence.

**Post-deploy live retest at 2026-11-06T16:30Z:** Runtime returned AVAILABLE with verified OIDC; provider composition remained NOT_PROBED. `bridge_device_info(pc-primary)` returned PASS receipt `85625393-1fff-4d6b-9432-92fc092b52a1` for `device.info`, with `formula: NOT_EVALUATED`. `bridge_device_health(pc-primary)` still returns `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. The new Vercel deployment updated the public ingress facade, but did not update the configured Tailscale-hosted MCP upstream. No authorized upstream host lifecycle control is available in this session; its deployment remains unverified.

**Current gate:** Device Bridge source and dependency audit **PASS**; Vercel public facade **READY**; Runtime OIDC and info probe **PASS / NOT INDEPENDENTLY VERIFIED**; upstream health tool **NOT REGISTERED IN LIVE UPSTREAM**; fresh OAuth `device.bridge.read` scope advertisement **NOT QUALIFIED**; Continuum, Formula task evaluation, independent Veritas and canonical receipt/Learning Ledger readback **NOT PROBED**. Full production qualification remains **NOT COMPLETE**.

**Next:** use the authorized lifecycle path for the configured Tailscale-hosted MCP upstream to release Device Bridge main commit `5abef21`, then repeat the real owner-scoped health/info checks and verify receipt-chain state. Do not switch to direct Windows shell service control or treat the Vercel facade deployment as an upstream rollout. Confirm the issuer-side device scope before altering protected-resource metadata, then complete the independent governance and storage readbacks.

## 2026-11-06 10:38 America/Chicago (UTC−06:00) — Fresh scope, facade, and device probe correction

**Authority and scope:** Creator-directed continuation of Device Bridge production qualification. No device mutation, model inference, GPU execution, service restart, or credential access occurred. The current Runtime/Device Bridge connector exposes read-only probes only.

**Fresh public ingress evidence:** Production deployment `dpl_8fiCsAt5pCHcfgAKhejs1Z8YYfET` is `READY` on Device Bridge main commit `601c8d178a0c8d647e25726afb5f5656ad680324`. GET `/.well-known/oauth-protected-resource/mcp` returned HTTP 200 and advertised `read:runtime` plus `device.bridge.read`. The metadata-only `LEEWAY_MCP_DISCOVERY_AUTHORIZED=owner-read-only` setting enables that advertisement; it is not itself an issuer grant. Anonymous POST `/mcp` returned HTTP 401. This qualifies the public facade's metadata and unauthenticated denial behavior, not its upstream MCP execution or physical device reachability.

**Authenticated owner-scope evidence:** Through the existing authenticated Runtime connector, a fresh `device.info` call returned PASS receipt `b7a9af49-fece-49a9-88ed-940fb54d653f`, bound to `pc-primary` and `device.info`, at `2026-11-06T16:37:14.519Z`. The tool's Runtime owner-subject and `device.bridge.read` checks passed for this connected client. Capability discovery still marks both `device.health` and `device.info` `verified:false`; the receipt records Formula `NOT_EVALUATED` and execution state `EXECUTED_NOT_INDEPENDENTLY_VERIFIED`. Do not generalize this connected-client evidence to every client or treat metadata as authorization.

**Current production blocker:** `bridge_device_health(pc-primary)` still returns `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. Source main commit `5abef21583e379608b58f46b4b65cb5a24be0565` registers health/info in the authenticated discovery-only server and passed the recorded source checks, but the configured Tailscale-hosted MCP upstream has not been shown running that commit. The newer Vercel deployment is the public authenticated forwarding facade; its `READY` state does not release or restart the separately configured upstream. No authorized upstream lifecycle/deploy operation is exposed by the current connector. We did not use workstation shell or infer deployment from source/Vercel state.

**Veritas gate:** `OBSERVED` for source-level tests and dependency audit, Vercel deployment readiness, metadata response, anonymous denial, and the single authenticated `device.info` receipt. `FAILED_ACCEPTANCE` for the current health probe because the upstream tool is absent. `NOT_PROBED` for device health success, Continuum readback, request-bound Formula evaluation, independent Veritas decision, canonical receipt admission/Learning Ledger, mutations, inference/GPU, and multi-client/platform qualification. Overall production qualification remains **NOT COMPLETE / BLOCKED at configured-upstream release**.

**Next executable action:** use the authorized lifecycle owner for the configured upstream to release Device Bridge main commit `5abef21583e379608b58f46b4b65cb5a24be0565` (or its verified descendant) and confirm the active deployment identity. Then rerun authenticated `device.health` and `device.info`, verify exact device/capability/receipt binding, and independently read back receipt integrity. After those pass, qualify Continuum, task Formula, independent Veritas, receipt admission and learning in their own authority paths. No release or host restart is claimed here.

## 2026-11-06 10:41 America/Chicago (UTC−06:00) — Production retest after documentation release

The latest Device Bridge Vercel production deployment `dpl_AyLynXVh7CfNff5va1nPwjydnjZv` is READY on main commit `9437e19d4462d8f5df0c0e829b385a4e4ee9acae`. Fresh post-deployment readback: protected-resource metadata HTTP 200 with scopes `read:runtime` and `device.bridge.read`; anonymous `/mcp` HTTP 401; Runtime reports AVAILABLE and OIDC_ACCESS_TOKEN_VERIFIED. Authenticated `device.health(pc-primary)` remains `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`. Authenticated `device.info(pc-primary)` again returned PASS, receipt `e44809fb-624d-4d0a-aa4b-e282f6e01dea` at `2026-11-06T16:41:36.121Z`, with Formula `NOT_EVALUATED` and execution `EXECUTED_NOT_INDEPENDENTLY_VERIFIED`.

This confirms the public facade and existing owner-scoped info path after the latest release; it does not qualify health or full production operation. The configured upstream release and all independent Continuum/Formula/Veritas/receipt-admission gates remain open. No inference, GPU operation, mutation or service lifecycle action occurred.

## 2026-11-06 10:47 America/Chicago (UTC−06:00) — Release-path investigation and rejected legacy relay

The canonical Runtime Vercel adapter fixture suite passed (`npm run test:vercel-device-bridge`; `status: PASS`). Its actual read-only live probe returned `BLOCKED`: configured `agent-lee-x` relay `/api/device-relay` and workstation `/api/device-workstation` both returned HTTP 404. The corresponding Vercel project is absent from the connected Vercel team inventory; GitHub did not return the referenced `Leeway-Digital-Employment-Center` source. Treat this route as unavailable legacy configuration, not as an alternate production upstream.

Hosting inventory found no accessible Render workspaces. The connected Railway account has one project, `heroic-tenderness`, whose only service is MySQL; it has no Device Bridge MCP runtime. No Tailscale management/deploy adapter is exposed. The active read-only Device Bridge connector still reaches `device.info`, while health reports `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`.

**Recovery decision:** retain the existing configured Tailscale MCP upstream and the published source fix; do not substitute the stale agent-lee-x route, create a new service without the canonical native binding/source, or repurpose the Railway database project. Full qualification remains **BLOCKED at upstream lifecycle access**.

**Exact dependency to resume:** an authorized deploy/restart operation for the already configured upstream, or access to its canonical deploy project/repository and qualified owner-controlled release mechanism. After release, repeat health/info and continue Continuum, task Formula, independent Veritas, receipt and Learning Ledger gates. Evidence: Vercel adapter suite PASS; live relay/workstation probes HTTP 404; Render workspaces empty; Railway service inventory MySQL-only; Runtime health call still reports upstream health tool absent.

## 2026-11-06 10:50 America/Chicago (UTC−06:00) — Canonical Tailscale authority checked

The private `4citeB4U/Leeway-Tailscale` source was recovered and its `docs/initial-discovery.md` amended at commit `d055f6813ac25ceb7ced339b086128ae414e7e3b`. The record distinguishes the October 26 `NoState` snapshot from the November 6 authenticated Device Bridge observation: `device.info(pc-primary)` returned PASS receipt `e44809fb-624d-4d0a-aa4b-e282f6e01dea` (Windows x64, Node v24.15.0), while `device.health` returned `LEEWAY_BRIDGE_UPSTREAM_TOOL_NOT_REGISTERED`.

The Tailscale repository README and service map define contracts only: default exposure is tailnet-private Serve, application is manual after local verification, route owner must be established, and no tailnet state or automatic deployment workflow is held in the repository. This confirms that source publication alone cannot release the active upstream and that no route/Serve/Funnel change is authorized by the source record. Keep the existing route unchanged until its node owner and lifecycle are positively identified.

The active upstream release remains the immediate blocker. No inference, GPU operation, mutation, Tailscale command, route change, host restart or credential access was performed. Current qualification remains **NOT COMPLETE**.

## 2026-11-06 12:16 America/Chicago (UTC−06:00) — Existing directory/file read registration repair

**Intent and authority:** Creator-authorized repair of the existing owner-scoped `device.directories.list` registration, followed by locating and verifying original experiment artifacts only through the existing Device Bridge read path. No file write, command, process, inference, GPU operation, grant change, credential access, or direct target-host shell inspection is in scope. Current capability grants must be rediscovered live before any artifact read.

**Recovered checkpoint:** Device Bridge source is inspected at main `d735477d2e8f902268429fe020f0e9b81f69f814`; Runtime Fabric source at main `1e230d4df7976cd493eaca2a0b9b21f5bd9acb11`. The Device Bridge desktop adapter already implements bounded `device.directories.list` and `device.files.read` with workspace path containment, text size limits, and receipt creation. The authenticated discovery-only server policy did not allow these capabilities. Runtime source exposed no wrappers/mapping for them. This isolates a registration gap across both hops; it does not establish that the remote upstream has the new code.

**Live state at 2026-11-06T18:11Z:** Runtime Fabric health returned `AVAILABLE` with OIDC verified, and provider composition remained `NOT_PROBED`. `bridge_devices` returned `LEEWAY_BRIDGE_DISCOVERY_HTTP_502`. Therefore current device identity and current capability grants could not be refreshed; prior grant observations are historical evidence only. No directory listing or file read occurred, and no experiment artifact has yet been identified or verified.

**Candidate repair:** Expose only the existing read-only `device.directories.list` and `device.files.read` operations in the authenticated Bridge allowlist and Runtime owner-scoped tools. Runtime requires the mapped upstream tool in `tools/list`, validates strict bounded arguments, validates device/capability/outcome and recomputes the canonical Bridge receipt/result hashes, and adds a SHA-256 of the returned UTF-8 artifact bytes. The discovery-only policy continues to exclude file writes and command/process controls. Fixture coverage passed 5/5 Device Bridge HTTP tests and 17/17 Runtime discovery tests; syntax checks passed. These are source tests, not a live tool registration or physical read.

**Current gate:** source implementation and focused fixtures `PASS`; published `main` and Vercel deployment `PENDING`; active upstream registration/current grants `BLOCKED` by HTTP 502; authorized directory listing/file read `NOT EXECUTED`; original experiment artifacts and their provenance/integrity `NOT VERIFIED`; Formula task evaluation `NOT EXECUTED`; independent Veritas and canonical ledger admission `NOT RUN`.

**Next action:** complete focused/full test and diff checks, publish both scoped source repairs directly to the already-authorized `main` branches, verify exact production deployment identities, then refresh the connected MCP tool list and current `pc-primary` grants. Only after current grants are returned should the bounded listing locate experiment files and the canonical Bridge file-read call retrieve them. Preserve returned PASS receipts, path, UTF-8 content SHA-256 and artifact metadata. If the separately hosted MCP upstream still returns 502 or omits a tool, stop before reading and record that precise boundary.

No Formula task evaluation, independent Veritas decision, Learning Ledger update, or production-readiness claim was made in this checkpoint.
## 2026-11-06 12:20 America/Chicago (UTC−06:00) — Main release verified; active upstream remains blocked

Both scoped commits are published to `main`: Device Bridge `c1144accd75961ab87b25aa6705dab09de39ee9e` and Runtime Fabric `3625f63a3782e6c31295edceccfe771e24ba2465`. Vercel reports Device Bridge deployment `dpl_AjjK8HrstQQFmwHUMkdAvLiGWASg` READY on the exact Device Bridge SHA, and Runtime deployment `dpl_6qbY6We8sW4ZHpTrKMMnwq9WiHya` READY on the exact Runtime SHA.

Post-deploy Runtime health at `2026-11-06T18:19:30.265Z` is AVAILABLE with OIDC verified. `bridge_devices` and fresh `bridge_capabilities(pc-primary)` both still return `LEEWAY_BRIDGE_DISCOVERY_HTTP_502`. Therefore the separately hosted configured MCP upstream has not been verified by these Vercel releases, current grants are not re-established, and no directory listing or file read was attempted. The connected tool inventory does not expose a `device.files.read` wrapper at this time.

**Gate:** source checks and main publication PASS; both Vercel deployments READY on exact SHAs; active upstream discovery BLOCKED (HTTP 502); current grants NOT VERIFIED; artifact location/read/integrity NOT VERIFIED; no artifact accessed. The next executable action remains release/recovery of the configured upstream through its authorized lifecycle owner, then refresh its tool registration and current grants. Only then may the original artifacts be located and read using Device Bridge.
