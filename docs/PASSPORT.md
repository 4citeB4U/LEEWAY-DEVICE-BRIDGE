# Device Passport

The browser bootstrap is discovery evidence, never exact-device authority.

The native app captures platform-authorized hardware identity and reconciles it with the browser bootstrap.

States:

BROWSER_DISCOVERY_ONLY
→ NATIVE_ANDROID_OBSERVED / NATIVE_APPLE_OBSERVED
→ reconciliation
→ VERIFIED_DEVICE_PASSPORT

A mismatch is evidence. It must not be silently overwritten.

The verified passport drives adapter selection, resource envelopes, capability qualification, transport preference and package/update compatibility.
