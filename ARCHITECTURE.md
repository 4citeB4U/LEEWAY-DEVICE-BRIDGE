# Architecture

## Linchpin

The bridge is not a remote-control app. It is a governed device capability fabric.

Agent Lee asks the device what it can do; the device reports support, authorization, activation, health and verification separately.

## Layers

1. Native UI — human inspection, consent, stop control.
2. Local Runtime — offline capability/session/receipt state.
3. Capability Registry — stateful device and application capabilities.
4. Permission Broker — LeeWay permissions layered over platform permissions.
5. Platform Adapter — Android/Samsung or Apple-authorized execution.
6. Perception — screen/accessibility context when authorized.
7. Control Arbiter — separates point/highlight from tap/swipe/type.
8. Transport Manager — local, USB, LAN, remote; transport is replaceable.
9. MCP Bridge — normalized Agent Lee verbs.
10. Veritas/Receipts — pre/post evidence and audit boundary.

## Modes

LOCAL_OFFLINE | LOCAL_NETWORK | REMOTE

Offline does not impersonate remote Agent Lee. It runs only locally authorized capabilities.

## Shared control

VIEW, POINTER, CONTROL are separate authorities. STOP AGENT ACCESS terminates the active assist session and remote command authority while preserving evidence.
