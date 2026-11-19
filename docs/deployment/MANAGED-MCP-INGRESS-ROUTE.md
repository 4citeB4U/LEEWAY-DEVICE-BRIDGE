# Managed MCP ingress route

## Canonical route decision — 2026-11-19 America/Chicago

`https://leeway-device-bridge.vercel.app/mcp` is retired. It is not a valid
Device Bridge audience, deployment target, or client-configuration example.
The source rejects it to prevent its accidental return.

The currently observed transition ingress is:

`https://leeway-device-bridge-mcp-qual.onrender.com/mcp`

It is **CONFIGURED_NOT_PROBED**. Its observed `/healthz` response showed a
running process and configured identity/upstream bindings, but did not prove
OAuth exchange, Runtime forwarding, device discovery, or a physical command.
It must not be represented as production-qualified until those gates pass.

The preferred operating model is a qualified owner-controlled, self-hosted
Bridge/Runtime path. A managed ingress is transport only and never becomes an
authority, billing gate, device executor, or replacement control plane.

### Client migration boundary

Existing MCP clients that still store the retired Vercel URL must be updated in
their own connection settings. Source changes cannot rewrite a third-party
client's saved connector configuration. A Vercel HTTP 402 is an external-route
failure, not an authorized LeeWay runtime response.

### Rollback

This change only rejects the retired host and removes the Vercel deployment
manifest. Rollback is a source revert; it does not alter deployed services,
identity bindings, user data, or device grants.
