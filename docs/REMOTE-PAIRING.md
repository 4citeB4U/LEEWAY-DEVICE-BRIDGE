# LeeWay Device Bridge Remote Pairing

The Bridge manifest currently publishes no remote phone relay endpoint. The phone's
local Device Bridge remains a separate capability; it does not imply that a cloud
agent or remote client can reach it.

## Current state

- `docs/remote-relay.json` reports `relayUrl: null` and `relayDeployment: NOT_BOUND`.
- The Android app clears a previously saved relay address when discovery returns no
  approved endpoint, and reports `RELAY_ENDPOINT_UNBOUND` rather than reconnecting to
  stale configuration.
- Remote pairing, phone reachability, durable delivery, and remote capabilities are
  therefore **NOT QUALIFIED** from this manifest.

## Binding a future remote endpoint

An owner-authorized LeeWay deployment must provide a WSS endpoint, its authentication
and pairing contract, capability admission, and the canonical receipt route. A client
may use that address only as an explicit deployment binding. The endpoint must not be
embedded as a universal default in source, configuration, or onboarding scripts.

Until that binding is verified, omit relay devices from client configuration and use
only locally available, individually authorized Device Bridge capabilities.
