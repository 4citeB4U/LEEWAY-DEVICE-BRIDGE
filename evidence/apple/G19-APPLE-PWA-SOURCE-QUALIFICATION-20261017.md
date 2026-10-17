# G19 Apple PWA source qualification

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Branch:** `feature/apple-device-bridge-qualification-20261017`  
**Scope:** the no-fee Safari PWA front door implemented in the repository's canonical GitHub Pages application under `docs/`.

## Purpose

The Apple PWA provides the daily LeeWay Device Bridge front door without an Apple Developer Program membership, signing certificate, IPA expiry, sideloaded-app count, or MLC dependency. It is an installed Safari web application, not an iOS native adapter.

The PWA projects browser-observable device state into its Digital Brain and Diagnostics panel. It may run an optional deterministic WebGPU compute and readback probe. It must keep browser compute, native Metal, Formula authorization, Veritas validation, and receipts as separate evidence lanes.

## Implemented source

| Source | Change | Claim boundary |
| --- | --- | --- |
| `docs/index.html` | Adds an Apple Browser Adapter panel with Digital Brain and Diagnostics state, refresh, and browser compute controls. | UI does not establish an execution claim by itself. |
| `docs/apple-pwa-diagnostics.js` | Adds local observation snapshots and the deterministic eight-value WebGPU compute/readback probe. | Reports only `BROWSER_WEBGPU_*` outcomes. |
| `docs/app.js` | Connects the panel to local observation and probe results. | Does not call a Formula, runtime, Veritas, or receipt service. |
| `docs/sw.js` and `docs/manifest.webmanifest` | Cache and describe the installed web application. | Supports offline application delivery; it grants no native privilege. |
| `docs/APPLE-PWA-DEVICE-BRIDGE.md` | Records installation and acceptance instructions. | Preserves the native-Metal boundary. |
| `apps/web/README.md` | Identifies `docs/` as the single canonical browser PWA. | Prevents a competing web adapter. |

## Evidence recorded

The following command completed on the Windows development host:

```text
node --test tests/apple-pwa-source.test.mjs tests/pages-contract.test.mjs
```

Result:

```text
PASS Apple PWA keeps browser compute separate from native Metal and Formula authority
PASS pages bootstrap contract
2 passed, 0 failed
```

`git diff --check` also completed without diff errors. Git issued its normal line-ending conversion warning for `docs/styles.css`; it did not identify a source defect.

## Enforced evidence states

| Evidence lane | State before a qualified external result |
| --- | --- |
| Apple PWA adapter | `BROWSER_SURFACE_ACTIVE` |
| Digital Brain | `LOCAL_OBSERVATION_ONLY` |
| WebGPU compute | `NOT_RUN`, then a measured `BROWSER_WEBGPU_*` result when the owner runs the probe |
| Native Metal | `NOT_OBSERVED` |
| Formula | `NOT_EXECUTED` |
| Veritas | `NOT_EXECUTED` |
| Receipt | `NOT_CREATED` |

The PWA has no JavaScript API for `MTLDevice`, Metal command queues, or native model execution. A browser WebGPU readback pass may show that Safari exposed a browser compute device. It is not direct Metal proof and must not be presented as a LeeWay GPU-provider or model-inference receipt.

## Outstanding physical acceptance gates

1. Open the published HTTPS site in Safari on the physical iPhone and use **Add to Home Screen**.
2. Open the installed application and retain the local observation snapshot as device evidence.
3. Run the browser compute probe only if Safari exposes WebGPU, preserving its measured result.
4. Qualify native Metal separately through the independently owned `apps/apple` adapter.
5. Integrate a request-specific Formula authorization, canonical Veritas result, and authentic receipt only after their authorities provide a supported interface.

## Claim boundary

This source qualification does not prove physical iPhone installation, installed-PWA behavior, Safari WebGPU availability, GPU execution, native Metal execution, model inference, Formula authorization, Veritas validation, or receipt issuance. Those gates remain pending measured evidence.
