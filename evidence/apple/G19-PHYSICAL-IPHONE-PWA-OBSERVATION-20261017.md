# G19 physical iPhone PWA observation

**Recorded:** 2026-10-17  
**Source:** owner-provided output from the installed LeeWay PWA on the physical iPhone  
**Observation ID:** `5bc47001-ccf2-450f-b27f-ffe56d009874`

## Measured result

| Field | Result |
| --- | --- |
| Adapter | `leeway.device.bridge.pwa` |
| Adapter state | `BROWSER_SURFACE_ACTIVE` |
| Installation mode | standalone PWA |
| Connectivity | online, secure context |
| Service worker | controlled |
| Digital Brain projection | `LOCAL_OBSERVATION_ONLY` |
| Browser compute | `NOT_RUN` |
| Native Metal | `NOT_OBSERVED` |
| Formula | `NOT_EXECUTED` |
| Veritas | `NOT_EXECUTED` |
| Receipt | `NOT_CREATED` |

## Interpretation

The **Open Apple PWA Workstation** control reached its intended Apple path. The current LeeWay PWA is running on the physical iPhone as an installed application and returned a local browser observation.

This is the first physical-device environment evidence for the Safari PWA. It is deliberately not treated as compute evidence or as a governed execution receipt.

## Next gate

From the Apple Digital Brain and Diagnostics panel, run **Run Browser Compute Probe** once and preserve the returned state. A pass or unavailable result is meaningful evidence about Safari’s browser-exposed compute capability; neither outcome establishes direct native Metal.
