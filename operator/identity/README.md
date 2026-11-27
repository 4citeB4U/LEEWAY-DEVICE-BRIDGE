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
9. Test unauthenticated 401, wrong audience/issuer/scope/owner denial, valid owner initialization, and a discovery-only tools/list containing `bridge_devices`, `bridge_capabilities`, `device_health`, and `device_info`, with no mutation tools. When a target device is supplied, execute the bounded health and info probes and verify their PASS receipts bind the target device and exact capability. Use a real remote MCP client.

## Deployment boundary

The desktop distribution's MCP server remains loopback-only and discovery-only unless separately paired and configured. Public transport is provider-neutral managed Node HTTP or an owner-controlled self-hosted Node path; it is not an execution authority.

The public ingress at `/mcp` validates request shape, requires a bearer token to reach the upstream, and forwards the OAuth challenge and MCP session headers. It does **not** itself validate Pocket ID JWT signatures, own devices, provide Continuum, or authorize device execution. Its upstream must be an independently authenticated Runtime Fabric MCP service at an explicit HTTPS `/mcp` URL.

Configure `LEEWAY_MCP_UPSTREAM`, `LEEWAY_MCP_AUTH_ISSUER`, and `LEEWAY_MCP_AUDIENCE` only in the selected managed-host or self-hosted environment, never in Git. The audience is the exact client-facing Device Bridge URL ending in `/mcp`; the same audience and issuer must be accepted by the upstream Runtime Fabric validator. The public protected-resource metadata is path-scoped at `/.well-known/oauth-protected-resource/mcp`. Verify ordinary TLS for the issuer and upstream; do not disable certificate validation.

The retired Vercel route is explicitly rejected and must not be configured by clients. The manual workflow `Public MCP OAuth discovery qualification` checks the unauthenticated challenge, protected-resource metadata, live Pocket ID OIDC discovery, and issuer-origin JWKS at explicitly supplied HTTPS endpoints. A pass does not prove an authenticated call, device connection, or device execution. Host Pocket ID on durable owner-controlled infrastructure and expose the issuer through owner-approved HTTPS.

The trusted Ed25519 consent-issuer registry and voice-owner-auth sessions are **not** substitutes for Pocket ID access tokens. Even with a valid OAuth token, no device execution is authorized until the independent canonical Runtime Fabric admission/receipt controls qualify it.

References: https://pocket-id.org/docs/setup/installation and https://pocket-id.org/docs/guides/apis

## Governed owner-command mode (source candidate, not production enabled)

The canonical Device Bridge has more capabilities than discovery. The reusable
`apps/desktop/mcp-server.mjs` tool factory exposes schema-backed file,
process, job, session, search, native UI and other adapter commands. These
tools route through the original `Bridge.call()` contract; a tool appearing
in an MCP list is **not** an execution grant.

The local universal Pocket ID host retains its safe read-only default.
There are two separate owner-scoped token permissions:

- `device.bridge.read`: device IDs and capability discovery, never command tools.
- `device.bridge.execute`: may publish the canonical tool factory **only if**
  the trusted host has explicitly enabled command exposure and injected the
  canonical Runtime Fabric admission plus durable receipt composition.

`startUniversalPocketIdMcp({ ..., enableExecution: true, runtimeInput })`
requires a trusted, validated Runtime composition. This option must be set
by owner-controlled host code and **never** by a user request, tool arguments,
browser state, or device-supplied configuration. The native server remains
loopback-only. Any command still requires registered device capability,
owner grant and, as applicable, signed consent, Formula evaluation,
independent Veritas pre-gate and durable pre-execution evidence. Command
success is not independently certified until Veritas POST and canonical
ledgers also admit the same request.

Do not add the execute permission to existing read-only clients or
automatically promote read tokens. Do not configure the production host
using a synthetic admission callback. Enroll the exact Pocket ID resource,
owner subject and permission only through its approved administrative flow,
and prove a real authenticated deny-path and one scoped physical operation.

**The public managed `/mcp` ingress is a transport proxy to Runtime
Fabric's separately authenticated `/mcp` service.** Its currently
configured upstream exposes no qualified authenticated capability; it does not forward
commands to this loopback host. Publishing owner-command mode publicly
requires a separately authorized Runtime Fabric execution-provider
binding, independent Veritas PRE/POST and ledger qualification. Do not
switch `LEEWAY_MCP_UPSTREAM` to an unqualified device endpoint, restore or
configure the retired Vercel route, or treat this source change as proof of production execution.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE BEGIN -->

# LeeWay Universal Formula Governance

Authority: Creator and LeeWay Standards.
Formula identity: LEEWAY-FORMULA-v1.0.

The canonical LeeWay Formula is mandatory throughout
the entire LeeWay ecosystem.

Every current and future application, capability,
agent, worker, employee, model, provider, adapter,
automation and integration inherits this requirement.

All applicable interactions, responses, decisions,
actions, revisions, executions, computations, model
inferences, resource allocations, information transfers,
memory operations, storage operations and deployments
must consume the canonical Formula through their
authorized and qualified domain contracts.

Formula availability, documentation, configuration,
health and historical results do not constitute actual
Formula consumption for a new operation.

Recover relevant authorized memory before substantive
work. Preserve identity, provenance, Formula integrity,
authorization, original receipts and verified learning.

Never invent observations, adapter mappings, mathematical
results, execution evidence or independent verification.

No application may bypass applicable Formula governance
by dispatching directly to a provider.

Every new application and capability must demonstrate
applicable Formula consumption before production admission.

Preserve the existing authority hierarchy:

Creator > Standards > Root of Trust > Runtime Fabric >
Agent Lee > Harness > Formula > skills/models/tools >
execution > Veritas > Receipt Authority > Learning Ledger.

Execute the complete engineering loop:

INVESTIGATE > DIAGNOSE > PLAN > IMPLEMENT > TEST >
VALIDATE > REPAIR > RETEST > VERIFY > EVIDENCE >
CHECKPOINT > CONTINUE.

Documentation compliance does not establish executable
enforcement or production admission.

<!-- LEEWAY UNIVERSAL FORMULA GOVERNANCE END -->
