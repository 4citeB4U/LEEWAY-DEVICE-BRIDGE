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
