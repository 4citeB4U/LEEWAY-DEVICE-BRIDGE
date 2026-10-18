# Apple native Metal receipt protocol

## Purpose

The Apple Device Bridge records each completed native Metal probe as a local observation receipt. The receipt binds the measured iOS adapter evidence to a deterministic SHA-256 hash and persists it on the device for export.

This protocol records the completed local operation. It does not replace canonical Formula, Veritas, Runtime Fabric, or a canonical receipt issuer.

## Preconditions

The app may issue a local receipt only after `MetalDeviceProbe` returns a non-`UNVERIFIED` observation. A successful observation must retain its actual adapter ID, physical Metal device name, backend, lane count, mismatch count, timestamp, and detail. Failed probes are also receiptable as `FAIL`; a never-run probe produces no receipt.

## Receipt fields

| Field | Meaning |
| --- | --- |
| `receiptId` | Fresh UUID for this local record. |
| `deviceId` | A hashed, per-install Device Bridge identifier. No raw Apple device identifier is exported. |
| `capability` | `device.gpu.metal.probe`. |
| `preGate` | `LOCAL_NATIVE_METAL_PROBE`. |
| `result` | Local operation result only: `PASS`, `FAIL`, or `BLOCKED`. |
| `postGate` | `PENDING_EXTERNAL_VERIFICATION`. |
| `verificationState` | `PENDING_EXTERNAL_VERIFICATION`. |
| `evidenceHash` | SHA-256 of canonical JSON for the native observation. |
| `receiptHash` | SHA-256 of the canonical receipt payload, excluding the hash itself. |

The receipt hash provides integrity binding for an exported record. It is not a signature, a proof of an external issuer, a Veritas approval, or a Formula decision.

## Storage and export

The native app retains the most recent 32 records in its local application storage. The **Export local receipt** control shares canonical JSON. The owner may deliver that JSON to the canonical receipt/verifier authority once its endpoint and authentication contract are independently established.

## Acceptance boundaries

| Gate | State after this implementation |
| --- | --- |
| Physical Metal operation and readback | Local observation can be receipted. |
| Local receipt integrity | SHA-256-bound and exportable. |
| Canonical receipt signature | Not implemented in the iOS app. |
| Independent Veritas verification | Pending external authority. |
| Formula authorization | Not executed. |
| Runtime Fabric consumption | Not executed. |
| Model inference | Not executed. |
