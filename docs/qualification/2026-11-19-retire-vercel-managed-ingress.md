# Retire Vercel Device Bridge ingress — source qualification

- **Authority:** Creator-approved W01 continuation; `AGENTS.md`
- **Repository / branch / starting SHA:** `4citeB4U/LEEWAY-DEVICE-BRIDGE` / `codex/w01-agent-device-access-20261119` / `ac2af0b7267d60c247266cc7547b22c221bda4f2`
- **Timestamp:** 2026-11-19 America/Chicago
- **Classification:** `SOURCE_RUNTIME_DRIFT`

## Observed failure

The connected ChatGPT MCP tool reported HTTP `402 Payment required` from
`https://leeway-device-bridge.vercel.app/mcp`. This observation identifies the
stored external connector route; it does not establish a LeeWay Runtime Fabric
payment gate.

## Smallest repair

1. Remove `vercel.json` and replace the Vercel-specific ingress source contract
   with a provider-neutral Node HTTP managed-ingress contract.
2. Reject the retired Vercel audience in the OIDC resource resolver.
3. Remove the retired WebSocket relay URL rather than present it as usable.
4. Preserve fail-closed OAuth, bearer, upstream, and device-authority behavior.

## Executed source tests

```text
node --test tests/mcp/public-ingress.test.mjs tests/mcp/public-managed-ingress.test.mjs tests/mcp/three-part-sources.test.mjs tests/device-relay-server.test.mjs
```

Result: **31 passed, 0 failed, 0 skipped**. This is Level A source evidence
only. It proves the changed contracts reject the retired audience and preserve
the bounded transport behavior. It does not prove a deployment, OAuth token
exchange, Runtime Fabric forwarding, client migration, device discovery, or a
physical device operation.

## Contrary evidence and blocker

The existing ChatGPT connector remains configured outside this repository. Its
stored URL must be changed by its owning client configuration. The observed
Render ingress returns health/metadata responses but remains
`CONFIGURED_NOT_PROBED` for authenticated MCP and device control.

## Rollback

A normal source revert restores the deleted deployment manifest and retired
route references. No deployment, identity environment, user data, grant, or
device was changed by this source repair.

## Next gate

Install an owner-authorized client configuration that uses the chosen
provider-neutral managed or self-hosted `/mcp` audience, then test bearer
challenge, OAuth exchange, Runtime forwarding, discovery, and one scoped
physical operation separately.
