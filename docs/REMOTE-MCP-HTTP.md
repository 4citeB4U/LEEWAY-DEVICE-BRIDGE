# Device Bridge HTTP MCP transport

<!-- LEEWAY HEADER — DO NOT REMOVE -->
REGION: LEEWAY.DEVICE.BRIDGE.MCP
TAG: LEEWAY_REMOTE_MCP_INTEGRATION
5WH: WHAT=Remote transport integration; WHY=One device dispatcher across platforms; WHO=LeeWay Industries; WHERE=docs/REMOTE-MCP-HTTP.md; WHEN=2026-10-26; HOW=Shared MCP tools and authenticated principal-scoped Bridge.
LICENSE: MIT

## Implemented

`apps/desktop/mcp-http.mjs` exports `createRemoteMcpHandler`, a Node HTTP handler using the existing pinned official MCP SDK Streamable HTTP transport. The same tool factory now serves stdio and HTTP. Existing imports of `createServer` from `mcp-server.mjs` remain supported.

Every HTTP request authenticates before any device discovery. Trusted host code resolves a fresh Bridge scoped to that principal. The Bridge's existing device ID lookup, capability schemas, grants, admission callback, adapter discovery, dispatch and receipt sink remain the execution path. There is no phone default, OS-derived queue selection, new registry or new native executor. Platform implementations remain adapters.

The handler is stateless: no session IDs or process-local session map. POST uses JSON responses; authenticated GET/DELETE return 405. Exact Host and optional Origin allowlists, a 1 MiB body limit, generic errors and no-store responses are enforced. Requests cannot nominate provider modules or pass admission callbacks.

## Host integration contract

Trusted startup supplies:
- `authenticate(req)`: validate the existing owner authentication and return a principal, or null. Never trust a caller's asserted principal.
- `resolveBridge(principal)`: resolve the canonical owner-controlled device registrations and return a fresh `Bridge` containing only devices this principal may enumerate and address, with real admission and durable receipt callbacks.
- `allowedHosts`: exact inbound host values. Do not derive this from request headers.
- `allowedOrigins`: exact HTTPS origins if browser clients are permitted.

A deployment can export the factory's returned Node handler at its MCP route after binding these callbacks from its approved runtime. Do not instantiate DesktopAdapter on a cloud server and label that environment as the owner's PC. Remote device adapters must use their actually registered transports. Credentials stay in the host's secure authentication configuration.

This change supplies the HTTP transport implementation, not a production binding. No default allow callback, fake device list, credential, or placeholder runtime is included. No Vercel endpoint is deployed by this commit; the previous phone-specific workflow and relay are unchanged. Deployment must identify the owning Vercel source and bind authenticated owner providers before plugin registration.

## Verification

Run `node --test tests/mcp/bridge.test.mjs tests/mcp/http-transport.test.mjs tests/mcp/runtime-composition.test.mjs`.

Local Node 24.22.1, MCP SDK 1.31.0, zod 3.25.76, ws 8.22.0: 17 tests passed, 0 failed, 0 skipped. HTTP tests use actual SDK clients and sockets with synthetic adapters/providers for Android, iOS, Windows, Linux and an additional opaque device identity. They establish common routing and isolation, not physical platform qualification, Formula execution or independent Veritas approval.

Live acceptance remains: authenticated remote initialization/tools/list, owner device discovery, read-only device health, unauthorized mutation rejection with no side effects, and independently verified correlated evidence. No production receipt or Learning Ledger update is claimed.

Broader local MCP suite: 53 passed, 1 failed, 1 skipped. The failure is the existing process-enumeration test: this container's `ps -eo pid=,comm=` exits with `fatal library error, lookup self`. It is not reported as passing. Hosted Windows/Linux/macOS CI must independently resolve the platform regression status.
