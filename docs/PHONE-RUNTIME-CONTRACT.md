# Phone-Local Runtime Contract

GitHub Pages is the public discovery and distribution authority. The installed phone package is the execution authority for device-local operations.

## Required phone-local capabilities

The compact runtime SHALL implement or explicitly report BLOCKED/UNAVAILABLE for:

- device.info / device.health
- device.files.read / device.files.write
- device.screen.observe
- device.ui.pointer / device.ui.control
- device.camera
- device.notifications
- device.location
- device.apps
- device.heartbeat
- device.execute
- pairing/session authority
- receipts
- STOP AGENT ACCESS

## Normalized execution sequence

LLM/client -> LeeWay Device Bridge contract -> paired phone runtime -> Veritas/authority pre-gate -> native Android adapter -> operation -> post-gate -> receipt.

No LLM is the authority. No capability is implied by device branding. Supported, available, authorized, active, healthy and verified remain separate states.

## Reconnect behavior

The installed runtime owns durable device identity, pairing state, transport negotiation, heartbeat and reconnection. GitHub Pages is never a runtime proxy.

## Development sources

Containerized Device Operator/API Gateway logic may be used to improve this contract, but production execution moves to the phone runtime.
