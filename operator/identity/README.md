# LEEWAY HEADER — DO NOT REMOVE
<!--
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.POCKET_ID.INTEGRATION
WHO: LeeWay Industries, owner-authorized maintainers
WHAT: Single-instance Pocket ID service integrated into the Device Bridge distribution
WHY: Reuse one identity provider in every LeeWay app without duplicate OAuth authority
WHERE: operator/identity/README.md
WHEN: 2026-10-25
HOW: Shared HTTPS issuer + resource-scoped access tokens + canonical MCP read-only tools
AUTHORITY: No production OAuth issuer or owner enrollment is claimed by this document
LICENSE: MIT
-->

# One Pocket ID authority, multiple LeeWay applications

**Do not start a copy of Pocket ID in every application or device.** Install the service once on persistent owner-controlled infrastructure. All authorized LeeWay applications share that one OIDC issuer. The Device Bridge SDK/distribution may include deployment configuration and an OIDC client adapter, but **it must not duplicate the user's signing keys or SQLite database**.

## Included distribution artifact

`operator/identity/pocket-id.compose.yml` runs a single Pocket ID server listening only on loopback port 1411 and storing data in a persistent named volume. A separately approved HTTPS reverse proxy is required. This file by itself **does not** configure a remote HTTPS endpoint or authenticate the MCP handler.

## Startup requirements

1. Select one always-on host for the issuer, with durable, backed-up storage and a trusted HTTPS endpoint.
2. Put `LEEWAY_POCKET_ID_APP_URL` and `LEEWAY_POCKET_ID_ENCRYPTION_KEY` in the deployment environment (never in GitHub). The URL must be the actual HTTPS issuer address; generate a high-entropy encryption key and retain it securely.
3. Run `docker compose -f operator/identity/pocket-id.compose.yml up -d` on that host, then check health and reach the HTTPS site.
4. Complete Pocket ID's first-admin enrollment and add an owner passkey through its real setup flow. Back up both persistent data and encryption key.
5. In Pocket ID's Administration > APIs, register one API resource **equal to the actual canonical HTTPS MCP resource identifier**, and create a read-only permission (candidate name `device.bridge.read`). Grant user-delegated access only to owner-authorized OIDC clients.
6. Register the ChatGPT client using the actual callback URL shown in ChatGPT, a supported client registration method and PKCE settings. Verify supported scopes and token audience against live Pocket ID metadata. Avoid exposing metadata-document clients to all users unless explicitly authorized.
7. Bind an independently tested JWT/access-token validator to the canonical `createRemoteMcpHttpServer({ bridge, authenticate })` boundary. Validate signature against the issuer's JWKS, exact issuer, correct MCP resource audience, expiry, read-only permission, and an explicit owner-subject allowlist. Reject ID tokens used as API access tokens. Do not allow an unauthenticated fallback.
8. Implement MCP protected-resource metadata from the **verified** issuer configuration; do not synthesize issuer, token, authorization or signing-key endpoints. Qualify public HTTPS routing separately from the loopback service.
9. Test unauthenticated 401, wrong audience/issuer/scope/owner denial, valid owner initialization, tools/list restricted to `bridge_devices` and `bridge_capabilities`, and absence of all mutation tools. Use a real remote MCP client.

## Deployment boundary

The desktop distribution's MCP server remains loopback-only and discovery-only unless separately paired and configured. It is not made publicly reachable by deploying this repository to Vercel.

The Vercel project can host a separate, stateless MCP ingress at `/mcp`. That ingress is a transport proxy: it validates request shape, requires a bearer token to reach the upstream, and forwards the OAuth challenge and MCP session headers. It does **not** itself validate Pocket ID JWT signatures, own devices, provide Continuum, or authorize device execution. Its upstream must be an independently authenticated Runtime Fabric MCP service at an explicit HTTPS `/mcp` URL.

Configure `LEEWAY_MCP_UPSTREAM`, `LEEWAY_MCP_AUTH_ISSUER`, and `LEEWAY_MCP_AUDIENCE` only in the Vercel project environment, never in Git. The audience is the exact client-facing Device Bridge URL ending in `/mcp`; the same audience and issuer must be accepted by the upstream Runtime Fabric validator. The public protected-resource metadata is path-scoped at `/.well-known/oauth-protected-resource/mcp`. Verify ordinary TLS for the issuer and upstream; do not disable certificate validation.

The current Vercel deployment remains SSO-protected, and its production environment values and live authenticated MCP path have not been verified. The manual workflow `Public MCP OAuth discovery qualification` checks the unauthenticated challenge, protected-resource metadata, live Pocket ID OIDC discovery, and issuer-origin JWKS at explicitly supplied HTTPS endpoints. A pass does not prove an authenticated call, device connection, or device execution. **Do not run SQLite inside an ephemeral Vercel Function**. Host Pocket ID on durable owner-controlled infrastructure and expose the issuer through owner-approved HTTPS. Leave the existing Vercel SSO policy intact unless an exact access-policy change is separately approved.

The trusted Ed25519 consent-issuer registry and voice-owner-auth sessions are **not** substitutes for Pocket ID access tokens. Even with a valid OAuth token, no device execution is authorized until the independent canonical Runtime Fabric admission/receipt controls qualify it.

References: https://pocket-id.org/docs/setup/installation and https://pocket-id.org/docs/guides/apis
