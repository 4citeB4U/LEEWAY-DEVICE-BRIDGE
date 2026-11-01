# LEEWAY HEADER — DO NOT REMOVE
<!--
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.OIDC.INTEGRATION
WHO: LeeWay Industries, owner-authorized maintainers
WHAT: Single owner-controlled OIDC provider integrated into the Device Bridge distribution
WHY: Reuse one identity provider in every LeeWay app without duplicate OAuth authority
WHERE: operator/identity/README.md
WHEN: 2026-10-25
HOW: Shared HTTPS issuer + resource-scoped access tokens + canonical MCP read-only tools
AUTHORITY: No production OAuth issuer or owner enrollment is claimed by this document
LICENSE: MIT
-->

# One OIDC authority, multiple LeeWay applications

**Do not start a copy of the OIDC provider in every application or device.** Install the selected provider once on persistent owner-controlled infrastructure. All authorized LeeWay applications share that one OIDC issuer. The Device Bridge SDK/distribution may include deployment configuration and an OIDC client adapter, but **it must not duplicate the user's signing keys or identity database**.

The current replacement candidate is ZITADEL. Its issuer, owner subject, API resource, read-only permission, and client registration are not yet configured or live-qualified for LeeWay.

## Included distribution artifact

`operator/identity/pocket-id.compose.yml` is retained only as a legacy rollback artifact and is not the active provider deployment. The selected OIDC provider requires its own persistent deployment and separately approved HTTPS ingress. A compose file by itself **does not** configure a remote HTTPS endpoint or authenticate the MCP handler.

## Startup requirements

1. Select one always-on host for the issuer, with durable, backed-up storage and a trusted HTTPS endpoint.
2. Deploy ZITADEL or the explicitly approved replacement with PostgreSQL, TLS, and its master/secrets outside GitHub.
3. Complete owner enrollment and verify the live OIDC discovery and JWKS documents.
4. Register one API resource for the actual canonical HTTPS MCP resource and define only project roles `runtime.read` and `device.discovery.read`. Enable role assertion for the project and assign those roles only to the owner. The verifier maps the signed role claims to the LeeWay read permissions `read:runtime` and `device.bridge.read`.
5. Register the MCP client using the actual callback URL, a supported client-registration method, and PKCE. Prefer pre-registration for the single-owner deployment; enable dynamic registration only with explicit policy, rate limiting, and redirect restrictions.
6. Configure JWT access tokens with RS256, exact issuer, exact resource/project audience, expiry, signed owner subject, and the required role claim. Opaque tokens and ID tokens are not accepted by the local JWT verifier.
7. Bind the independently tested provider-neutral OIDC validator to the canonical `createRemoteMcpHttpServer({ bridge, authenticate })` boundary. Reject ID tokens, wrong issuer/audience/scope/subject, expired tokens, and missing bearer tokens. Do not allow an unauthenticated fallback.
8. Implement MCP protected-resource metadata from the **verified** issuer configuration; do not synthesize issuer, token, authorization or signing-key endpoints. Qualify public HTTPS routing separately from the loopback service.
9. Test unauthenticated 401, wrong audience/issuer/scope/owner denial, valid owner initialization, tools/list restricted to `bridge_devices` and `bridge_capabilities`, and absence of all mutation tools. Use a real remote MCP client.

## Deployment boundary

Vercel `leeway-device-bridge` is linked to the canonical GitHub repository, but the replacement OIDC deployment, owner enrollment, and live public MCP gateway are not yet verified. **Do not run identity-provider state inside an ephemeral Vercel Function**. Host ZITADEL on durable owner-controlled infrastructure and expose the issuer using owner-approved HTTPS; Vercel may serve a separate MCP gateway only after token verification and safe connectivity to the actual Device Bridge are demonstrated.

The trusted Ed25519 consent-issuer registry and voice-owner-auth sessions are **not** substitutes for the selected OIDC access token. Even with a valid OAuth token, no device execution is authorized until the independent canonical Runtime Fabric admission/receipt controls qualify it.

References: https://zitadel.com/docs/self-hosting/manage/requirements and https://zitadel.com/docs/guides/integrate/dynamic-client-registration
