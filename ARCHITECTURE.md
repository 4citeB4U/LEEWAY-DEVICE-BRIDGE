# Architecture

## Linchpin

The bridge is not a remote-control app. It is a governed device capability fabric.

Agent Lee asks the device what it can do; the device reports support, authorization, activation, health and verification separately.

## Layers

1. Native UI — human inspection, consent, stop control.
2. Local Runtime — offline capability/session/receipt state.
3. Capability Registry — stateful device and application capabilities.
4. Permission Broker — LeeWay permissions layered over platform permissions.
5. Device Operator Kernel — normalized command admission, authority tier, consent and platform resolution.
6. Platform Adapter — Android, iOS/iPadOS, Windows, macOS or Linux-authorized execution.
7. Perception — screen/accessibility context when authorized.
8. Control Arbiter — separates point/highlight from tap/swipe/type.
9. Transport Manager — local, USB, LAN, remote; transport is replaceable.
10. MCP Bridge — normalized Agent Lee verbs.
11. Veritas/Receipts — pre/post evidence and audit boundary.

## Modes

LOCAL_OFFLINE | LOCAL_NETWORK | REMOTE

Offline does not impersonate remote Agent Lee. It runs only locally authorized capabilities.

## Shared control

VIEW, POINTER, CONTROL are separate authorities. STOP AGENT ACCESS terminates the active assist session and remote command authority while preserving evidence.


## Universal Device Operator

The canonical Device Operator is an execution layer inside this bridge, not a competing bridge. Its portable kernel is `operator/device-operator.mjs`, with adapter declarations in `operator/adapter-registry.json` and contract `contracts/platform-adapter.schema.json`.

One normalized capability may resolve to different native mechanisms by platform. A missing or OS-prohibited mechanism returns BLOCKED/UNAVAILABLE; no adapter fabricates privilege.
