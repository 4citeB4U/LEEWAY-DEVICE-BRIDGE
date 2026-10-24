# LeeWay Voice Fabric — Device Bridge integration

The separate Voice Fabric conversation engine remains in the LeeWay Edge RTC
project and uses the unchanged canonical Voice Fabric Studio UI.

- CLI: node operator/device-bridge-cli.mjs voice-status
- CLI: node operator/device-bridge-cli.mjs voice-open
- CLI: set LEEWAY_VOICE_FABRIC_ROOT to the local verified Voice Fabric checkout;
  node operator/device-bridge-cli.mjs voice-start launches its existing starter.
  The caller must explicitly initiate it. Follow with voice-status to confirm readiness.
  Voice start is not an MCP tool and does not grant device-command authority.
- MCP: voice_duplex_status reports local availability ONLY. This is read-only.
- Standalone browser: http://127.0.0.1:5173/LeeWay-Edge-RTC/conversation-gate.html
- Full original UI: http://127.0.0.1:8897/studio.html

The engine supports optional local LLM and existing LeeWay Machine Consciousness.
The Device Bridge does NOT route raw spoken commands to device execution.
All device commands still require owner consent, canonical Formula, independent
Veritas PRE/POST, and durable receipts where applicable. Availability is not
production certification. No privilege is granted by voice status or launcher.
Localhost links work only on the machine hosting the voice engine; real remote
bridging requires separately authenticated, governed transport.
