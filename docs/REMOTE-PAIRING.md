# LeeWay Device Bridge Remote Pairing

The Bridge manifest publishes the owner-bound production transport endpoint below.
The phone's local Device Bridge remains the execution boundary; a live relay health
response does not imply that the physical phone is qualified.

## Current state

- `docs/remote-relay.json` reports the Vercel production WSS endpoint and
  `relayDeployment: VERCEL_PRODUCTION`.
- The Android app clears a previously saved relay address when discovery returns no
  approved endpoint, and reports `RELAY_ENDPOINT_UNBOUND` rather than reconnecting to
  stale configuration.
- The relay route has a live transport health response. Physical phone pairing,
  phone reachability, durable delivery, and remote capabilities remain **NOT
  QUALIFIED** until a real phone/client hello and read-only command round trip is
  independently observed.

## Binding a future remote endpoint

The owner-authorized LeeWay deployment provides:

- `wss://leeway-device-bridge.vercel.app/api/device-relay`
- source binding `github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE@e1332e640eb32fdd49c26af06fefaae81c5c5637`
- owner-token pairing by device ID
- transport-only authority with volatile room state

A client may use that address only as this explicit deployment binding. The endpoint
must not be embedded as a universal default in source, configuration, or onboarding
scripts.

Until the physical phone handshake is verified, omit relay devices from qualified
client capability lists and use only locally available, individually authorized
Device Bridge capabilities.
