# Public execution resource — source checkpoint

Date: 2026-11-14T08:28:39-06:00 (America/Chicago)  
Gate: IMPLEMENT → TEST → EVIDENCE (source and public unauthenticated probe only)

## Observed production state

`https://leeway-device-bridge.vercel.app/.well-known/oauth-protected-resource/mcp`
returned HTTP 200 and advertised only `read:runtime` and `device.bridge.read`.
An unauthenticated `POST /mcp` returned HTTP 401 `BEARER_REQUIRED` with the exact path-scoped metadata challenge. This proves the public read ingress is reachable; it does not prove a token can authenticate or a device command can execute.

## Repair committed

Commit `5cc7803` adds a separately opt-in `/mcp-execute` resource. It requires all of:

- `LEEWAY_MCP_EXECUTION_AUTHORIZED=owner-execute`;
- a distinct HTTPS `/mcp-execute` audience;
- a distinct HTTPS Runtime `/mcp-execute` upstream; and
- a Runtime-side execution handler that independently verifies the token, owner policy, and C3 admission.

The public read resource remains unchanged. Client-supplied scope headers are not forwarded, so a Git credential or `X-Device-Scopes` header cannot become a ZITADEL execution grant.

## Test evidence

`npm run test:mcp` completed: 212 passed, 0 failed, 1 skipped (environment-specific Runtime handler test).

## Still unbound — do not call this production execution

The pushed source has not been deployed to Vercel. Railway does not yet expose a qualified `/mcp-execute` Runtime handler, and no ZITADEL OAuth client/redirect registration or execution scope assignment has been verified for Gemini or another external client. Therefore no online service has been proven able to execute a device command.

Next executable gate: bind the qualified Runtime C3 execution handler, create or verify the exact external-client OAuth PKCE registration and callback URI in ZITADEL, deploy the matching Vercel/Railway configuration, then perform an authenticated tools/list and one owner-approved physical command with Formula, Veritas, and receipt readback.
