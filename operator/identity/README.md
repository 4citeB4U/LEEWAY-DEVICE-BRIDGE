# LeeWay Device Bridge — Zitadel identity and OS-independent MCP

<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.ZITADEL.SOLE_IDENTITY_MCP_STARTUP.V1
WHAT: Keep one Zitadel OIDC authority while running an OS-neutral Device Bridge MCP.
WHY: Retire retired identity service startup and remove Windows identity fabrication.
WHO: Creator-approved Device Bridge and Runtime Fabric operators.
WHERE: operator/identity/README.md.
WHEN: 2026-11-23.
HOW: Reuse canonical Bridge adapters and the existing exact issuer/resource/owner JWT verifier.
AUTHORITY: Source candidate; no production deployment or passport issuance.
LICENSE: Repository terms unchanged.
-->

Zitadel is the only supported OIDC authority for the active LeeWay Device Bridge
MCP. The retired retired identity service startup/authorization modules are not runtime
dependencies and must not be launched. Historical source remains in Git history.

## OS-neutral service ownership

- The managed Runtime Fabric and public MCP ingress run on managed Node-capable
  infrastructure and do not depend on a Windows machine being powered on.
- The Device Bridge's local MCP adapter is a Node service runnable on an
  authorized Windows, Linux, Android or Apple host with supported Node/runtime
  dependencies. A disconnected adapter makes only its own device unavailable.
- Device discovery is not device execution. Neither the public MCP ingress nor
  an HTTP listener fabricates owner enrollment, Formula, Veritas or receipts.
- Voice, Vision, Model Hub, Agent Skills and the sovereign device adapters
  remain separately governed providers behind existing Runtime/Bridge interfaces.

## Native discovery-only loopback startup

The supported local entrypoint is:

```sh
npm run start:device-mcp
```

This runs `operator/identity/start-zitadel-mcp.mjs`.
The owner-controlled environment must provide:

- `LEEWAY_DEVICE_BRIDGE_CONFIG`: explicit local adapter configuration
- `LEEWAY_MCP_AUTH_ISSUER`: exact approved Zitadel HTTPS issuer
- `LEEWAY_MCP_AUDIENCE`: exact protected MCP resource HTTPS URL ending `/mcp`
- `LEEWAY_MCP_OWNER_SUB`: exact authenticated owner subject
- `LEEWAY_MCP_TOKEN_AUDIENCES`: optional explicitly enrolled project/client
  audiences, comma or newline separated
- `LEEWAY_MCP_LOCAL_PORT`: optional owner-selected local port, default `4272`

The local listener binds only to `127.0.0.1` and uses the existing
`createConfiguredBridge` + `createRemoteMcpHandler` contract. No Windows
CIM probe, device ID, private signing key, new issuer, synthetic registration,
Formula/Veritas bypass or local receipt authority is constructed by startup.

**Important:** loopback alone is not isolation when a configured reverse proxy,
Tailscale Serve/Funnel or other process forwards that port. Confirm port mapping
and owner grants before startup. Never expose the local development listener
through public ingress based solely on a successful health check.

## Authenticated execution boundary

The host-injected function `startZitadelMcp({ ..., enableExecution:true,
runtimeInput })` exists for a separately qualified command runtime.
A caller-supplied CLI environment cannot enable it. Actual device control
requires the canonical Runtime composition, registered device, scoped permission,
real Formula and independent Veritas checks, consent when required, and canonical
Receipt Authority. This module does **not** establish those authorities.

The managed, OS-independent public ingress remains:
```sh
npm run start:public-mcp
```
It is a transport-only HTTP gateway and must be bound to its genuine canonical
upstream rather than to a guessed workstation address.

## Non-destructive verification

```sh
node --test tests/mcp/zitadel-access.test.mjs tests/mcp/zitadel-universal-handler.test.mjs tests/mcp/zitadel-owner-execution.test.mjs tests/mcp/zitadel-mcp-startup.test.mjs
npm run test:mcp
```

Negative tests must reject missing Zitadel configuration, invalid tokens,
wrong owner/audience/scope, forged signatures, public bind, unqualified Runtime
composition, and command calls from discovery-only clients. GitHub CI is
SOURCE_TEST_PASS, not a live device or independent Veritas verdict.

**Recovery state at authoring:** Source patch only, no deployment. The remote
Runtime health previously returned AVAILABLE/OIDC verified while Bridge
discovery returned LEEWAY_BRIDGE_DISCOVERY_HTTP_502. Native owner-host service
state, production signer custody, real Formula/Veritas/Receipt chain and
physical device readback still require independently observed execution.

Mission custody: Engineering issue #6 and Device Bridge issue #109. Follow the
full twelve-stage LeeWay engineering cycle; preserve the existing current
approved work and rollback references.
