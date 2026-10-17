# G19 iPhone first-launch qualification

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Purpose:** make the first post-install iPhone action explicit and reachable before Android-specific content.

## Implemented path

The installed LeeWay Safari PWA now presents this sequence at the top of the application:

1. **Apple iPhone / iPad — Install and launch LeeWay from Safari** confirms that the Home Screen icon completes installation.
2. **Next Step for This iPhone — Check LeeWay on this device** offers **Check This iPhone Now**.
3. That control refreshes the local Digital Brain and Diagnostics observation and moves to the Apple Browser Adapter panel.
4. The owner may then choose **Run Browser Compute Probe** to make a separate browser WebGPU readback measurement when Safari exposes that capability.

## Evidence boundary

The first-launch control records browser-observable PWA state only. Native Metal remains `NOT_OBSERVED`; Formula and Veritas remain `NOT_EXECUTED`; and no receipt is created. A browser-compute result has meaning only after the physical iPhone returns a measured value.

## Source verification

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
2 passed, 0 failed
```
