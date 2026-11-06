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
