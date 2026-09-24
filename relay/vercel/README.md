# LeeWay Device Bridge Relay

Transport-only WebSocket relay for the LeeWay Device Bridge.

Authority remains with GitHub Pages contracts and the phone-local runtime. The relay:
- challenge-authenticates registered device/controller public keys,
- routes command envelopes,
- routes receipt envelopes,
- stores no private keys,
- performs no device execution.

This component is not a replacement for GitHub Pages or the phone runtime.
