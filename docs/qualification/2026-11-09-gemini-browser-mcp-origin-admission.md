# Gemini browser MCP origin admission — candidate repair

LEEWAY HEADER — DO NOT REMOVE  
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.MCP.GEMINI.ORIGIN  
TAG: GEMINI.BROWSER.MCP.ORIGIN.ADMISSION.CANDIDATE.V1  
WHEN: 2026-11-09 11:30 America/Chicago  
AUTHORITY: Source/test evidence only; not Veritas, Receipt Authority, Learning Ledger, or production admission.

## Identity and continuity

- Repository: `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- Local checkout: `C:\Users\Leona\workspaces\LEEWAY-DEVICE-BRIDGE-main`
- Base source SHA before repair: `7d499f3c867947556f997577a331bd6623536ed3`
- Working branch at investigation: `main`
- Affected surface: Vercel public `POST /mcp` ingress and its managed-host test fixture.
- Existing preflight: `LeeWay Standards → LeeWay Engineering → Receipt Authority qualification start → LEEWAY-VERITAS independent evidence/trust gate → LeeWay Learning Ledger admission boundary → LeeWay-Production-Final-Execution-Layer handoff contract → owning repository contributor notes/issues/PRs`.
- Contributor rules read: repository `AGENTS.md` and `docs/qualification/ENGINEERING-LOOP-EVIDENCE-PROTOCOL.md`.
- Existing public records: no open Device Bridge PRs or matching open issues were returned by `gh` at investigation time.

## Investigate

Live unauthenticated probes against `https://leeway-device-bridge.vercel.app`:

- `GET /.well-known/oauth-protected-resource/mcp`: HTTP `200`; resource is the exact `/mcp` origin, issuer is the existing ZITADEL issuer, and scopes include `read:runtime` and `device.bridge.read`.
- `GET /mcp`: HTTP `405 METHOD_NOT_ALLOWED`.
- `POST /mcp` with `Origin: https://gemini.google.com`, JSON-RPC initialize body, and no bearer: HTTP `403 BROWSER_ORIGIN_NOT_ADMITTED`.
- `POST /mcp` without Origin and without bearer: HTTP `401 BEARER_REQUIRED` with the path-scoped OAuth metadata challenge.
- `OPTIONS /mcp` from `https://gemini.google.com`: HTTP `405 METHOD_NOT_ALLOWED`.

## Diagnose

Source at the base SHA rejects every request carrying an `Origin` header before checking OAuth. The Gemini browser therefore cannot reach the bearer challenge, even though the public metadata and JSON POST route exist. The exact failure is origin admission, not a missing `/mcp` POST handler or a subdomain mismatch.

## Plan and implementation

The smallest repair adds an explicit `LEEWAY_MCP_ALLOWED_BROWSER_ORIGINS` deployment allowlist. It:

1. admits only exact HTTPS origins with no path/query/fragment;
2. handles admitted `OPTIONS` preflight with `POST, OPTIONS` and bounded MCP headers;
3. returns origin-specific CORS headers on admitted responses;
4. preserves bearer authentication, upstream forwarding, cookie exclusion, and all existing fail-closed checks;
5. keeps the default allowlist empty, so deployments without the variable retain the old denial behavior.

The candidate value for the Vercel deployment is `https://gemini.google.com`. It must be provisioned in the protected environment through the existing owner-approved deployment path; it is not embedded as a new authority or credential.

## Test and retest

Command:

```text
npm run test:mcp
```

Result: exit `0`; `176` tests passed, `0` failed, `0` cancelled, `0` skipped.

The new regression covers:

- admitted Gemini preflight returns `204` with exact origin and bounded headers;
- admitted Gemini POST without bearer returns `401` and the correct OAuth challenge;
- no upstream call occurs before authentication;
- hostile origins remain `403`;
- originless `OPTIONS` remains `405`.

`git diff --check`: exit `0`.

## Verification boundary

This is candidate source/test evidence. No Vercel environment variable was changed, no deployment was made, no OAuth token was minted, no Gemini connection was completed, no device action was executed, no Veritas PRE/POST was issued, no canonical Receipt was created, and no Learning Ledger record was admitted.

`RECEIPT NOT CREATED`  
`LEARNING LEDGER NOT UPDATED`  
`INDEPENDENT VERITAS DECISION NOT ISSUED`  
`PRODUCTION HANDOFF NOT MADE`  
`AUTONOMOUS OPERATION NOT ELIGIBLE`

## Rollback

Revert the two source/test changes and remove `LEEWAY_MCP_ALLOWED_BROWSER_ORIGINS` from the deployment environment. Because the default allowlist is empty, removing the variable restores the prior browser-origin denial behavior without changing OAuth or Runtime authority.

## Next gate

Owner-review the candidate source, provision the exact allowlist in the existing Vercel project, deploy the reviewed commit, and re-run the live Gemini handshake. Treat a successful Gemini connection as client transport evidence only. Continue to require independent Veritas PRE before W02 and preserve the Receipt/Learning/Production gates.
