# Persistent Relay Recovery Checkpoint — 2026-11-14

**Timestamp:** 2026-11-14T00:27:06-06:00  
**Project:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Source branch:** `repair/production-zitadel-portable-integration-20261113`  
**Source commit at recovery:** `b9d3b389fdf66c223ab5b901cd0e2f0f089a9f49`

## Gate and authority

This is an operational recovery record for the persistent relay boundary. It
does not assert a completed peer transfer, Formula evaluation, Veritas decision,
or production-wide device qualification.

The recovery used the canonical checked-out persistent relay rather than the
older host checkout. The canonical checkout passed:

```text
node scripts/pin-zitadel-host-sources.mjs
status: PASS
provider: ZITADEL
pinnedCount: 10
failureCount: 0
```

The canonical `createRelayMcpAccessPolicy()` also reported `configured: true`,
provider `ZITADEL`, and scope `device.bridge.read`; no secrets are recorded
here.

## Observed recovery evidence

Before recovery:

- The historical host checkout at
  `C:\\Users\\Leona\\.codex\\leeway\\device-bridge-controller-zitadel-ingress`
  had no running persistent relay process and no port-8008 listener.
- Its launcher referenced a relay access-policy module absent from that stale
  checkout.
- The public Funnel path returned HTTP `404` for `/api/device-relay` and HTTP
  `502` for `/mcp`.

Recovery action:

- Started `operator/persistent-relay-server.mjs` from this canonical checkout.
- Reattached the existing Tailscale Funnel path `/api/device-relay` to
  loopback port `8008`.

After recovery:

- Process observed: `node.exe …operator\\persistent-relay-server.mjs`.
- Process log reports listening on `http://127.0.0.1:8008` and the public
  Funnel URL `wss://agent-lee.tailb186e7.ts.net/api/device-relay`.
- Both loopback and public `GET /api/device-relay` returned HTTP `401` with
  `MCP_READ_AUTHORIZATION_REQUIRED` and a ZITADEL resource-metadata bearer
  challenge. This is the expected protected-read boundary, not an error-free
  authenticated MCP execution.
- The active Device Bridge connector returned a receipt-backed `ONLINE` health
  result for `phone-fold6` and a receipt-backed bounded-adapter health result
  for `pc-primary`. Those calls do not establish a qualified relay pair.

## Current acceptance state

| Capability | State | Evidence boundary |
| --- | --- | --- |
| Canonical persistent relay process | OBSERVED_RUNNING | process and startup log |
| Public Funnel relay path | OBSERVED_PROTECTED | public HTTP 401 bearer challenge |
| Fold health | OBSERVED_PASS | receipt `c4e1e013-157e-4d46-9f6e-c7b379240496` |
| Primary-PC adapter health | OBSERVED_LIMITED | receipt `bc38f0ac-6a8f-402c-8525-a0a8cbdf67ea` |
| Shared-owner peer attestation | NOT_EXECUTED | authenticated relay session not yet read back |
| Continuum file transfer | NOT_EXECUTED | no journal readback or target hash comparison |

## Next executable gate

Use an authenticated bridge session to connect two trusted, shared-owner devices
to the restored persistent relay; call the read-only `bridge_peer_transport`
attestation; then perform the Continuum contract's one-file transfer with
durable journal readback and a source/target content-hash comparison. Do not
infer direct or LAN transport from a device label, USB attachment, or this
relay recovery alone.

## Rollback

Stop the relay process and remove only the `/api/device-relay` Funnel mapping
if the recovered process causes a verified fault. Do not alter the `/mcp` or
OAuth metadata Funnel mappings as part of that rollback.
