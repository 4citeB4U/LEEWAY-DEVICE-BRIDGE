# G19 dual workstation launchers

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Purpose:** restore both LeeWay workstation entry points while keeping their device responsibilities explicit.

## Implemented launchers

The shared Device Bridge page now exposes a top-level **LeeWay Workstation Launchers** card with two explicit controls:

| Control | Destination | Purpose |
| --- | --- | --- |
| **Open Apple PWA Workstation** | The installed LeeWay PWA’s Digital Brain and Diagnostics panel | Refreshes the local Apple browser observation and opens the Apple workstation surface. |
| **Open Android Remote Workstation** | The existing LeeWay cloud workstation route | Opens the separate Android remote-development lane. |

The detailed Android package, runtime, and Secondary Workstation material remains suppressed in iPhone presentation mode. The explicit Android remote launcher is retained because it is an intentional cross-device workstation entry point, not an Apple adapter operation.

## Verification

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
2 passed, 0 failed
```

## Claim boundary

The two buttons provide navigation and local observation controls. They do not establish iPhone GPU execution, native Metal, Formula authorization, Veritas validation, inference, or a receipt.
