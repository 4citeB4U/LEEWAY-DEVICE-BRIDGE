# LeeWay Device Bridge web adapter

The canonical executable PWA lives at `../../docs/` because GitHub Pages publishes that directory. `docs/index.html` is the single Device Bridge web front door; do not create a competing browser authority in this folder.

The PWA must advertise only capabilities supported by the browser and granted by the owner. Apple browser diagnostics may perform an optional WebGPU compute/readback probe, but browser computation never proves direct Apple Metal, model inference, Formula execution, Veritas validation, or receipt creation.

WebUSB requires an eligible browser, compatible device interface and user permission; it is not general Android UI control. WebRTC requires signaling plus permission and an implemented peer adapter; media connectivity does not grant operating-system control. A browser page cannot silently start arbitrary desktop applications, capture every screen or operate unrelated apps.

Existing Android accessibility and screenshot routes remain Android-specific. The common MCP host can call those routes when the paired device is reachable and authorized, but it does not confer them on Chromebooks, iOS, macOS or other devices. Native Apple Metal remains the separate `apps/apple` adapter qualification path. The web PWA requires physical iPhone installation and platform-specific end-to-end evidence before any Apple capability is promoted.
