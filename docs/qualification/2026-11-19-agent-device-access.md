<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.QUALIFICATION
TAG: LEEWAY.AGENT_DEVICE_ACCESS.2026-11-19
5WH:
WHAT: Source qualification record for owner-scoped agent access to registered devices.
WHY: Prevent a general-purpose LLM, agent, or helper from gaining device authority merely by naming a device.
WHO: Device Bridge, Runtime Fabric verifier, registered device owner, and separately authenticated agent.
WHERE: docs/qualification/2026-11-19-agent-device-access.md.
WHEN: 2026-11-19.
HOW: Bind a short-lived grant to agent, owner, device, capability, expiry, verifier, Bridge admission, and receipts.
LICENSE: MIT.
-->

# W01 — Agent-to-device access qualification

## Intent

LeeWay agents and helpers may request an operation on a registered owner device only
through an independently verified, owner-scoped, short-lived grant. This source change
does **not** create a shared password, a blanket LLM permission, or a new device control
plane.

## Source change

- `packages/protocol/agent-device-grant.mjs` validates agent, owner, device, capability,
  expiry, grant shape, and a Runtime Fabric verifier seam.
- `packages/protocol/index.mjs` invokes an optional `agentGrantGate` before existing
  Bridge admission and adapter execution.
- `tests/agent-device-grant.test.mjs` exercises matching-grant success, binding denial,
  expiry denial, Apple cross-app capability denial, verifier absence, and the real Bridge
  call seam.

The gate is opt-in at host composition. A production Runtime Fabric composition must
provide the verifier before this becomes live enforcement. A source-side verifier stub is
not a Runtime Fabric authorization decision.

## Apple/iPhone boundary

This contract preserves the current Apple catalog boundary. It explicitly denies these
unsupported iOS cross-app operations:

- `device.ui.pointer.cross-app`
- `device.apps.control.cross-app`
- `device.screen.observe.cross-app`

Only a capability that is both present in the enrolled iPhone adapter and separately
admitted by Device Bridge can execute. The existing source has no proof that an iPhone 11
is enrolled, that its native adapter is healthy, or that any agent is approved for it.

## Evidence

Executed on 2026-11-19 (America/Chicago), against this worktree's source:

```text
node --test tests/agent-device-grant.test.mjs
4 passed, 0 failed

npm run test:mcp
180 passed, 0 failed
```

`git diff --check` was also clean before commit.

## Acceptance state

| Claim | State |
| --- | --- |
| Agent/device/capability binding source | SOURCE_IMPLEMENTED |
| Bridge seam enforced when host opts in | SOURCE_TESTED |
| Runtime Fabric verifier composition | NOT_EXECUTED |
| Device Bridge discovery failure diagnosis | NOT_EXECUTED |
| iPhone 11 enrollment / device passport | NOT_EXECUTED |
| Actual iPhone 11 operation | NOT_EXECUTED |
| iLoader installation / Safari extension enablement | NOT_EXECUTED |
| Independent Veritas decision / production admission | NOT_EXECUTED |

## Fresh live discovery probe

After the source tests, the owner-scoped read-only `bridge_devices` connector was called
on 2026-11-19. It returned exactly:

```text
McpServerError: Payment required
```

The request did not reach a device-discovery response. This proves neither an iPhone
connection nor the location of the payment gate; it is an external access blocker to be
diagnosed at the connector/account/upstream boundary.

## Rollback

Remove the host's `agentGrantGate` composition to return to the prior Bridge authorization
path. Do not remove existing admission, per-device grants, compliance-card requirements,
or receipt storage as a workaround.
