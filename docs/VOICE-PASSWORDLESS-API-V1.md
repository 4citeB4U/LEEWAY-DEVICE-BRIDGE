# LEEWAY HEADER — DO NOT REMOVE

REGION: DEVICE.BRIDGE.VOICE.PASSWORDLESS.API
TAG: REGISTERED_APP_APPROVAL_WITHOUT_PASSWORD
WHO: LeeWay Industries. WHAT: shared voice-only API for individually registered apps.
WHY: no unknown passphrase and no common key shared across apps.
WHERE: main Agent-Lee Windows host. WHEN: 2026-10-24.
HOW: short-lived pairing challenge, Windows Yes/No approval with matching 6-digit code, signed single-use approval, origin/scoped browser session.
AUTHORITY: explicit owner action; no computer control or GPU authority. LICENSE: MIT.

## Reusable HTTPS API
GET /v1/voice/capabilities — available routes, scope, registered app count.
POST /v1/voice/pair/start — JSON with appId; returns id, token, 6-digit displayCode and 2-minute expiry.
POST /v1/voice/pair/claim — JSON with id and token; returns pending (202) or a signed owner-approved session.
GET /v1/voice/session — check session and request-scoped CSRF token.
POST /v1/voice/turn — final transcript only, CSRF protected, allowDeviceActions=false, scope voice:turn:readonly.

## Onboarding multiple applications
Existing default registration: leeway.voice.studio -> https://4citeb4u.github.io.
Additional apps require explicit owner registration in ACL-protected %LOCALAPPDATA%\LeeWay\VoiceAuth\registered-apps.json as JSON mapping unique app IDs to exact HTTPS origins. The registration validator supports up to 5,000 records. A fixture validated 1,600 entries; those 1,600 are NOT enrolled or authenticated. Each client must request its own approval, session and scopes. Native/server-to-server clients need an independently qualified client credential exchange; do not reuse browser cookies or give every app the same owner secret.

## Owner host
Use npm run voice:owner-start to launch the local gateway, and npm run voice:owner-approve in the signed-in Windows owner's desktop to display explicit approval prompts. Public HTTPS TLS is terminated by the separately verified Tailscale Funnel; never expose Node directly or bind it to 0.0.0.0. A generated HMAC signing key remains in the owner ACL-protected local directory, not GitHub.

Only accept the 6-digit approval code shown both on the requesting app and the desktop. The on-device dialog is NOT biometric Windows Hello. Owner approval never bypasses Veritas, GPU authorization or computer permissions.

Test commands: npm run test:voice-auth. Voice Fabric regression: node --test tests/studio-passwordless-voice-client.test.mjs and node tests/public-dictation-browser.mjs.

Chrome on the Tailscale-connected PC may classify the Funnel address as local-network access from GitHub Pages, requiring an explicit browser permission. Session readback and physical microphone/sphere playback remain separate acceptance checks.