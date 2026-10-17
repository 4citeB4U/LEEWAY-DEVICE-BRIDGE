# G19 Apple PWA publication verification

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Published revision:** `72799ef` — `Add governed Apple Safari PWA diagnostics`

## Publication evidence

The reviewed Apple PWA source was fast-forwarded to the repository's `main` branch. GitHub Pages is configured for that branch at the repository root with HTTPS enforcement enabled.

GitHub's Pages API then reported:

```text
status: built
source: main /
HTTPS enforced: true
published site: https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/
```

An HTTPS retrieval of the published PWA route completed with these measured results:

```text
GET /LEEWAY-DEVICE-BRIDGE/docs/                         HTTP 200
Apple Browser Adapter markup                            present
Run Browser Compute Probe control                       present
GET /LEEWAY-DEVICE-BRIDGE/docs/apple-pwa-diagnostics.js HTTP 200
BROWSER_WEBGPU_READBACK_PASSED state                    present
```

## Meaning

The LeeWay-owned Safari PWA source is publicly reachable over HTTPS at the Pages origin and is eligible to be installed from Safari using **Add to Home Screen**. This publication provides the no-fee LeeWay web front door.

## Claim boundary

Publication verification does not establish that a particular iPhone installed the PWA, that Safari exposed WebGPU, that a GPU ran the probe, that Metal ran, or that a Formula, Veritas, model, or receipt authority executed. Those require their own measured evidence after installation and use.
