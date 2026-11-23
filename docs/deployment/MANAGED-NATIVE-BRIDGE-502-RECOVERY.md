# Managed native Device Bridge — eliminate legacy upstream HTTP 502

<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.RECOVERY
TAG: LEEWAY.BRIDGE.HTTP_502.CLOUD_RECOVERY.V1
WHAT: Repair Runtime-to-Bridge hop without requiring Windows or any single owner device.
WHY: Legacy Tailscale DNS from managed Runtime is not a native cloud Bridge endpoint.
WHO: Creator and approved deployment operator.
WHERE: docs/deployment/MANAGED-NATIVE-BRIDGE-502-RECOVERY.md.
WHEN: 2026-11-23.
HOW: Source/ingress evidence, exact approved environment bindings, fail-closed tests, authenticated readback.
AUTHORITY: SOURCE CANDIDATE; separate production deployment authorization required.
LICENSE: MIT
-->

## Verified cause, November 23, 2026

A read-only Railway inspection found Runtime Fabric deployed from
`4citeB4U/Leeway-Runtime-Fabric@07c27e23a00f801c70a1921361ca0757984c3bd5`
on November 22. During authenticated `bridge_devices` failure at
`2026-11-23T19:09:48Z`, Railway DNS showed
`agent-lee.tailb186e7.ts.net` resolution. The connected MCP tool returned
`LEEWAY_BRIDGE_DISCOVERY_HTTP_502`; Runtime HTTP transport itself returned
200 and Zitadel/OIDC token verification passed.

The Railway project contained Runtime Fabric, keepalive and MySQL,
but **no native Device Bridge service**. The previously documented Render
`leeway-device-bridge-mcp-qual.onrender.com/mcp` is a **public ingress
forwarder into Runtime Fabric**, not a canonical Bridge MCP server.
Never assign that Render public ingress as Runtime's own Bridge discovery
upstream; the resulting gateway→Runtime→gateway cycle is not a repair.

The Railway environment contains
`LEEWAY_RUNTIME_BRIDGE_DISCOVERY_UPSTREAM`, but its value is redacted
in the connected OAuth API. DNS evidence supports a legacy Tailscale
upstream call at the instant of failure; do not claim the redacted full
variable was read.

## Source repair, no new control plane

This repository provides a new **managed hosting entrypoint**:
`npm run start:managed-device-mcp`, implemented in
`operator/hosting/start-managed-device-mcp.mjs`.

It reuses the original canonical `createConfiguredBridge`,
`createZitadelMcpHandler`, `createRemoteMcpHandler`, and
`createServer` machinery. It binds to the managed `PORT` on
`0.0.0.0`; the public route is exact HTTPS `/mcp`, and each request
enforces the signed Zitadel access token, owner subject, read scope,
and allowed public host.

In standalone managed mode it is **discovery only**, with
`executionEnabled:false`, no trusted registration invented from
a configuration row, and no synthetic Formula, Veritas or receipt
decision. A config with no enrolled devices advertises an
unbound/empty roster honestly; this is **not** physical connectivity.

### Required managed service configuration

Provision a separate managed Node 22+ **Device Bridge runtime service**
under the existing owner-authorized host; do not repurpose or overwrite
the live gateway or Runtime Fabric service.

Set these owner-controlled bindings **only on the new managed Bridge service**:

| Name | Value or required provenance |
| --- | --- |
| `PORT` | Hosting platform listener port |
| `LEEWAY_DEVICE_BRIDGE_CONFIG` | Valid owner-scoped adapter config file path in the service deployment; no hardcoded workstation drive |
| `LEEWAY_MCP_AUTH_ISSUER` | Exact enrolled Zitadel HTTPS issuer, no issuer substitution |
| `LEEWAY_MCP_AUDIENCE` | Exact existing protected public MCP resource URL, ordinarily the current Render gateway `/mcp` |
| `LEEWAY_MCP_OWNER_SUB` | Exact short-lived access-token owner `sub`, supplied from owner enrollment, never guessed |
| `LEEWAY_MCP_TOKEN_AUDIENCES` | Optional approved Zitadel project client audiences, no secrets |
| `LEEWAY_MANAGED_DEVICE_BRIDGE_URL` | **New** independent managed native Bridge HTTPS URL ending exactly `/mcp`; must not equal issuer or gateway resource |

Only once this new native Bridge is live, has a **real** Zitadel
owner token and returns signed authenticated MCP discovery:

1. Preserve the original Railway variable, deployment SHA and rollback
   evidence without exposing secrets.
2. Update `LEEWAY_RUNTIME_BRIDGE_DISCOVERY_UPSTREAM` **on Runtime Fabric**
   to the newly verified, separate `https://<native-bridge-host>/mcp`
   endpoint. Do not point to the Render gateway, a workstation, a
   Tailscale name, or the Runtime service itself.
3. Redeploy Runtime only under separate release authorization.
4. Verify `runtime_health` still succeeds with Zitadel OIDC,
   `bridge_devices` returns a bounded response (possibly empty with
   `REGISTRATION_AUTHORITY_UNBOUND`), and wrong-owner / unsigned
   tokens fail.
5. Enroll owners' Windows/Linux/Apple/Android adapters through the
   existing canonical trusted Runtime registry, prove each adapter's
   source identity and reachability independently, then qualify one
   actual bounded operation with Formula PRE/POST, independent Veritas,
   canonical Receipt Authority, Continuum and Learning where applicable.

### Explicit acceptance distinctions

- A 200 `/healthz` proves **managed listener**, not authentication.
- A 401 unauthenticated MCP refusal proves **negative access**, not owner access.
- An authenticated empty `bridge_devices` roster proves **real MCP
  discovery response**, not any physical device or trusted registry.
- A device response and receipt prove execution at the bridge transport,
  not independent production admission.
- An OS label classifies a registered adapter, not an operating system
  fingerprint, security attestation, verified signature or reachability.

## Current execution boundary

Only the GitHub source patch and CI are executed by the outside contributor.
No Render service was created/modified, Railway variables were changed,
production deployment/restart was triggered, or authentic device command
was executed. Existing `no deploy` instruction remains in effect.
Render API inspection remains blocked pending explicit workspace selection.
No production authority or physical connection has been claimed.
