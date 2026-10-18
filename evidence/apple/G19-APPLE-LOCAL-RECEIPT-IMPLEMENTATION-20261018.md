# G19 — Apple local Metal receipt implementation

**Date:** 2026-10-18  
**Scope:** add a truthful, exportable local receipt for a completed iPhone native Metal probe

## Acceptance target

After the iOS adapter observes a completed Metal command/readback, it must create a persistent receipt that binds the measured fields to SHA-256 hashes, exposes the receipt for owner export, and explicitly remains pending independent verification. The implementation must not create a second Formula, Veritas, Runtime Fabric, or receipt authority.

## Implemented

- Added `apps/apple/Sources/AppleDeviceBridgeReceipt.swift`.
- Added a hashed, per-install device binding; no raw Apple device identifier is exported.
- Bound the exact `AppleBridgeEvidence` record to `evidenceHash` using canonical, sorted-key JSON and SHA-256.
- Bound the receipt payload to `receiptHash`, excluding the hash field itself.
- Persisted the latest 32 local records in app-local storage.
- Added **Export local receipt** to the native iOS view.
- Marked every new receipt `PENDING_EXTERNAL_VERIFICATION` with post-gate `PENDING_EXTERNAL_VERIFICATION`.
- Added source-contract coverage and [Apple native receipt protocol](../../docs/APPLE-NATIVE-RECEIPT-PROTOCOL.md).

## Build and repair evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused source contracts | PASS | 5 checks passed: receipt source, package boundary, PWA boundary, and source integrity. |
| First macOS compile | FAIL | [Run 39151804300](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39151804300) found an invalid instance call to the static canonical JSON helper. |
| Repair | PASS | Commit `921c5f8` corrected the call to `Self.canonicalData`. |
| Rebuilt iPhone source | PASS | [Run 39151891434](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39151891434) compiled and packaged the repaired iOS source. |
| New IPA/manifest integrity | PASS | IPA digest matched the generated manifest exactly. |

## Qualified package

```text
artifact:        leeway-device-bridge-apple-unsigned-39151891434
source revision: 921c5f88f2a71fb16b594259b034974919083320
IPA SHA-256:     9457b8bd283f038546fb506bccd5b1d1f121892bc25addc7cc77e7ca90bb532f
```

## Remaining physical and authority gates

The physical iPhone 11 passed the previous native Metal probe from the earlier package. It has not yet installed this receipt-enabled IPA, so the new export control and its local receipt have not been observed on-device.

The following remain separate and unexecuted:

- canonical receipt signature and independent verification;
- Formula authorization;
- Runtime Fabric consumption;
- Veritas post-gate acceptance;
- model inference; and
- Learning Ledger admission.
