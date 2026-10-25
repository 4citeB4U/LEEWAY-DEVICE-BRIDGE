# LEEWAY HEADER — DO NOT REMOVE
REGION: DEVICE.BRIDGE.VOICE.SESSION
TAG: OWNER_AUTHENTICATED_VOICE_ONLY_GATEWAY
WHO: LeeWay Industries. WHAT: authenticated read-only LeeWay Voice Fabric endpoint.
WHY: reuse existing Edge RTC / model without exposing Ollama or the Device Bridge control relay.
WHERE: operator/voice-auth-gateway.mjs. WHEN: 2026-10-24.
HOW: scrypt login -> Secure HttpOnly cookie -> CSRF -> bounded turn -> Edge RTC loopback.
AUTHORITY: owner-provisioned login, no GPU or device execution. LICENSE: MIT.

# Device Bridge voice authentication boundary

This package supplies a **local-only HTTP upstream** for a separately provisioned **trusted HTTPS reverse proxy**. It is not itself a publicly deployed HTTPS service; do not direct GitHub Pages to `http://127.0.0.1:5332`.

## Required enrollment (no default password)

Before starting the service, an authorized owner provisions the `LEEWAY_VOICE_AUTH_SCRYPT_SALT` (at least 16 random bytes, encoded as lowercase hexadecimal) and `LEEWAY_VOICE_AUTH_SCRYPT_HASH` (64-byte scrypt output encoded as lowercase hexadecimal). Store them in the host's secured secrets mechanism, **not GitHub, public HTML, logs, or repository .env files**. The hash must be calculated from an owner-chosen high-entropy passphrase using `scryptSync(passphrase, Buffer.from(salt, 'hex'), 64).toString('hex')`. Use a Node interactive provisioning process that never places the passphrase in command-line arguments; keep it out of shell history. Never share the plaintext passphrase with ChatGPT or the repository.

From the Device Bridge checkout on the authorized machine, with secrets provided in the process environment:

```powershell
npm run test:voice-auth
npm run voice:auth-gateway
```

The service refuses startup if those values are missing or malformed. It binds only `127.0.0.1:5332`, never `0.0.0.0`. A trusted HTTPS reverse proxy must terminate TLS, enforce the exact origin `https://4citeb4u.github.io`, send no credentials to static HTML, and forward only `/v1/voice/login`, `/v1/voice/session`, and `/v1/voice/turn` to loopback. Configure a host allowlist, TLS certificates, restricted CORS, anti-CSRF defense, per-user request limits, audit and secure secret rotation. A cross-site `SameSite=None` cookie requires Secure and may be blocked by third-party-cookie restrictions; browser acceptance must be measured before deployment. Do not treat local fixture tests as production qualification.

The voice gateway never exposes device-control capabilities or GPU authorization. Machine replies require verified Machine Consciousness evidence; explicit Qwen replies are marked `GENERATED_NOT_VERITAS_VERIFIED`, `verified:false`, `gpuInferenceVerified:false`. The upstream is the existing owner-local Edge RTC `/__leeway/voice-turn` endpoint (must be healthy first).

### Browser contract
- `POST /v1/voice/login`: user-supplied passphrase over approved HTTPS; response sets HttpOnly Secure `__Host-leeway-voice` cookie and returns a CSRF nonce. 
- `GET /v1/voice/session`: requires active cookie and returns `schema=leeway.voice.session.v1`, `authenticated:true`, `authority=LEEWAY_DEVICE_BRIDGE_VOICE`, `csrfToken`.
- `POST /v1/voice/turn`: requires active cookie and `x-leeway-voice-csrf`. Validates final text, mode (`machine` or `llm`) and `allowDeviceActions:false`. No auto-execution.
- Default request origins other than `https://4citeb4u.github.io` are denied; the user-supplied password is never stored in the static browser app.

Once the HTTPS proxy, owner authentication, and upstream Edge RTC health are demonstrated, set the approved API origin in the existing Voice Fabric PR #21 configuration and run a **real end-to-end microphone → response → Kokoro voice → existing sphere** test. The proxy endpoint **must not be certified or published as operational before those tests**.
