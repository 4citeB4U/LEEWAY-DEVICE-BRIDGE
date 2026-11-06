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
