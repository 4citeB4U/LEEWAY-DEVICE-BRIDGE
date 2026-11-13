# LEEWAY HEADER — DO NOT REMOVE
<!--
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.ZITADEL.INTEGRATION
WHO: LeeWay Industries, owner-authorized maintainers
WHAT: Single-authority ZITADEL OIDC integration for the Device Bridge distribution
WHY: Reuse one canonical ZITADEL identity provider across every LeeWay app without duplicating OAuth authority or running retired Pocket ID services
WHERE: operator/identity/README.md
WHEN: 2026-11-12
HOW: Shared ZITADEL HTTPS issuer + resource-scoped access tokens + canonical MCP read-only/governed tools + SHA-256 host source pins
AUTHORITY: No production OAuth issuer or owner enrollment is claimed by this document
LICENSE: MIT
-->

# Single ZITADEL Identity Authority Across LeeWay Applications

**ZITADEL is the sole supported LeeWay identity provider.** Self-hosted Pocket ID instances, Docker compose manifests, local port 1411 listeners, and retired issuer environment variables are superseded and blocked fail-closed by Source & CI Supersession Gate (`SUP-IDENTITY-001-POCKET-ID-TO-ZITADEL`). Historical identity database archives are preserved strictly for Continuum readback custody via `operator/identity/continuum-identity-archive-custody.mjs` and never act as an active OIDC issuer or authentication fallback.

## Authoritative Environment Contract

Configure ZITADEL bindings explicitly in the deployment or workstation environment (never hardcode tokens or secrets in Git):

- `LEEWAY_MCP_AUTH_ISSUER` (or explicit workstation alias `LEEWAY_OIDC_ISSUER`, reconciled with conflict refusal)
- `LEEWAY_MCP_AUDIENCE` (or explicit workstation alias `LEEWAY_MCP_RESOURCE`, ending in `/mcp`)
- `LEEWAY_MCP_OWNER_SUB` (or explicit workstation alias `LEEWAY_OIDC_OWNER_SUB`)
- `LEEWAY_MCP_PROJECT_ID` / `LEEWAY_MCP_TOKEN_AUDIENCES` (optional explicit project/audience allowlist)

Setting any retired Pocket ID environment variable or issuer hostname/port causes fail-closed rejection (`MCP_OAUTH_RETIRED_FALLBACK_FORBIDDEN` / `RETIRED_IDENTITY_ISSUER_REJECTED`).

## Deployment and Host Boundaries

- **Loopback desktop MCP (`operator/identity/start-zitadel-mcp.mjs`, `start-universal-zitadel-mcp.mjs`):** Binds only to `127.0.0.1` or `::1`. Read-only discovery stays separate from `device.bridge.execute`, which additionally requires trusted Runtime C3 composition.
- **Workstation host wrapper template & pins (`operator/identity/zitadel-host-composition-template.mjs`, `scripts/pin-zitadel-host-sources.mjs`):** Hosts must verify `config/zitadel-host-pins.v1.json` before starting local MCP or persistent relay workers.
- **Public Vercel / Railway MCP ingress (`api/mcp.mjs`, `operator/hosting/start-public-mcp-ingress.mjs`):** Stateless transport proxy forwarding Bearer tokens and rewriting `/.well-known/oauth-protected-resource/mcp` challenges to Runtime Fabric.
- **Persistent WebSocket/MCP relay (`api/device-relay.mjs`, `operator/persistent-relay-server.mjs`):** Requires authenticated read-only ZITADEL MCP authorization (`createRelayMcpAccessPolicy`), omits mutating tools on `/mcp`, bounds HTTP request bodies, enforces session tracking, and preserves fail-closed `LEEWAY_MESH_TOKEN` room pairing.
