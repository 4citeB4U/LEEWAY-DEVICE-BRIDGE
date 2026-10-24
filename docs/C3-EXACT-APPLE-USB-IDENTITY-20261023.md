# LeeWay Device Bridge — exact iPhone USB identity repair

Date: 2026-10-23. Owner-authorized targeted candidate and live host-side read-only qualification.

## Problem

`operator/physical-adapters.mjs` previously accepted `records[0]` if the intended iPhone USB ID was absent, and emitted static defaults including `ok:true`, `Apple iPhone`, `Apple Inc.` and `OK`. Its `device.health` response was unconditional. A generic Apple/Bluetooth PnP record could satisfy that path.

## Repair

`operator/physical-apple-usb.mjs` requires exactly one healthy Windows `USB\\VID_05AC&PID_XXXX\\<expected-qualified-serial>` match, an Apple manufacturer and Apple Mobile Device/iPhone name. No record fallback, Bluetooth, generic vendor or synthetic status. `PhysicalAppleAdapter.execute('device.info')` throws if this condition is absent, and `device.health` now reads the same exact physical identity instead of returning a constant.

Affected source and SHA-256:
- `operator/physical-adapters.mjs`: `9ce9de4016f21780d355f1fbde52f5333a5da11450f25130ceb013334a164d91`
- `operator/physical-apple-usb.mjs`: `8d28668f94830ee7125a697c4863221ec20e60fd69de9e09d6c6b2e4e7ee7d48`
- `operator/c3-admission-binding.mjs`: `9a7f789984344a9fcd6a37628b4c377e4367bc48812282201cbb1494380875f4` (LF-normalized reviewed source, logic unchanged).

## Real acceptance

On `AGENT-LEE`, read-only host PnP inspection of the connected USB iPhone returned a healthy, exact authorized device. The fixed adapter `device.info` and `device.health` succeeded. Running the exact same adapter against an intentionally incorrect iPhone ID raised `APPLE_USB_DEVICE_IDENTITY_NOT_QUALIFIED`, not `ok:true`.

Automated `tests/physical-apple-usb.test.mjs`: 3/3 PASS. Existing MCP suite: 18/18 PASS. CLI suite preserved and retested independently. Runtime Fabric corresponding identity helper and source pins are in the companion PR #79.

## Active host deployment and rollback

The active adapter `E:/LeeWay-Work/device-bridge-c34-build/operator/physical-adapters.mjs` was first proved byte-identical after LF normalization to the reviewed branch's original source. It was then replaced with this exact tested adapter. The new helper was copied into the adjacent `operator` folder. A byte-for-byte rollback copy of the original was created at `E:/LeeWay-Work/evidence-staging/c3-apple-identity-repair-20261023/physical-adapters.before.mjs` (SHA-256 `6a4d96909d6efedccf88a3b95a5b4164ceb8809e2b6e3ce5b663372d7bf0c31e`).

## Important boundaries

This verifies **host USB PnP identity**, not native iOS device execution, user approval, a Formula result, independent Veritas production custody, or a ledger append. An unrelated Apple USB device cannot be substituted in this read-only path. Production request dispatch remains fail-closed until owner/Formula/Veritas sources and decisions meet their separate requirements.
