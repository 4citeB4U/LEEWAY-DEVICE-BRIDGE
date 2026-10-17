# LeeWay Apple PWA Device Bridge

## Purpose

The canonical Device Bridge Pages application at `docs/` is an installable Safari PWA and the no-fee LeeWay front door for the iPhone. It presents the Device Bridge’s browser-safe Digital Brain projection, Diagnostics, Formula state, and evidence state without requiring TestFlight, an App Store record, an Apple Developer Program membership, MLC Chat, or a third-party runtime.

## Capability boundary

Safari PWA code cannot obtain an `MTLDevice`, create an `MTLCommandQueue`, or submit a Metal command buffer. The PWA may request WebGPU when the browser exposes it, run a deterministic browser-compute/readback probe, and report exactly that result. A passing browser probe is `BROWSER_WEBGPU_READBACK_PASSED`; it is not a native-Metal observation.

The separately packaged LeeWay iOS adapter at `apps/apple` owns the public-Metal probe. Until that adapter runs on the physical iPhone and returns a verified observation, Diagnostics must preserve `nativeMetal.state = NOT_OBSERVED`.

## Digital Brain and Diagnostics

The PWA writes a local observation projection only. It reports browser runtime facts, PWA installation state, browser-compute results, Formula state, Veritas state, and receipt state in one visible diagnostic record.

The projection does not evaluate the canonical Formula, issue authority, invoke a model, assert model locality, create a Veritas receipt, or become persistent memory authority. In the absence of a verified Formula Fabric call, it reports `canonicalState = NOT_EXECUTED`. In the absence of a verified receipt issuer, it reports `receipt.state = NOT_CREATED`.

## Acceptance gate

1. The PWA installs from the canonical Pages origin on the physical iPhone.
2. The Digital Brain / Diagnostics panel renders only browser-observable state.
3. A WebGPU-unavailable browser visibly fails closed.
4. A supported browser can complete the deterministic readback probe.
5. A browser probe never changes the native-Metal, Formula, Veritas, or receipt state.
6. Native-Metal evidence remains a separate iOS IPA qualification campaign.

## iPhone installation

1. Open the Device Bridge Pages origin in Safari.
2. Use Safari Share, then **Add to Home Screen**.
3. Open the LeeWay Device Bridge icon from the Home Screen.
4. Open **Apple browser adapter** and run **Refresh Diagnostics**.
5. Run **Run browser compute probe** only when the owner wants a fresh compute observation.

This PWA is a browser adapter. It supplies a native-feeling installed experience, not Apple-native process, entitlement, or Metal privilege.
