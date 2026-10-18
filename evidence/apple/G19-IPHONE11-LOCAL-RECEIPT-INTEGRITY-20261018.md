# G19 — iPhone 11 local receipt integrity verification

**Date:** 2026-10-18  
**Verifier:** local deterministic SHA-256 replay against the receipt implementation  
**Receipt artifact:** [iphone11-metal-receipt-20261018.json](artifacts/iphone11-metal-receipt-20261018.json)

## Submitted receipt

The owner exported the complete JSON receipt from the native iPhone application. It identifies a local Apple Metal probe, with an application-scoped hashed installation binding rather than a raw Apple device identifier.

| Field | Value |
| --- | --- |
| Receipt ID | `B6769723-B871-4F1B-8A69-A95D7F02372D` |
| Evidence ID | `68A252C3-0363-4C86-AC85-12F0759E31C6` |
| Observed at | `2026-10-18T18:02:43Z` |
| Adapter | `leeway.operator.ios` |
| Backend | `Metal` |
| Physical device | `Apple A13 GPU` |
| Lanes / mismatches | `256` / `0` |
| Local result | `PASS` |
| Verification state | `PENDING_EXTERNAL_VERIFICATION` |

## Integrity replay

The verifier applied the receipt source’s canonicalization rules: recursively sorted JSON object keys, ISO-8601 timestamps, compact JSON, and SHA-256. It calculated:

| Hash | Declared | Recomputed | Result |
| --- | --- | --- | --- |
| Evidence | `483ec1ad7245790fd0ef43a6a7f7079ec9bc48ca133c35747a7aa383794f8d21` | `483ec1ad7245790fd0ef43a6a7f7079ec9bc48ca133c35747a7aa383794f8d21` | PASS |
| Receipt | `103fcaa17b744247a84b4bc9a3752c5710f2d9ba3cdeb5857fd3cd1644e5e2e2` | `103fcaa17b744247a84b4bc9a3752c5710f2d9ba3cdeb5857fd3cd1644e5e2e2` | PASS |

The evidence calculation covers the nested `evidence` object. The receipt calculation covers every receipt field except `receiptHash`, matching `AppleDeviceBridgeReceipt.ReceiptPayload` in the native source.

## Acceptance

**PASS — the exported local receipt has intact, reproducible evidence and receipt hashes.**

This confirms that the exported record has not changed relative to the hashes emitted by the app’s local receipt algorithm. It does not turn the local SHA-256 replay into a signature, prove an external verifier received the receipt, or satisfy Formula, Runtime Fabric, Veritas post-gate, model-inference, or Learning Ledger gates.

## Next authority gate

Submit this immutable receipt artifact to the authorized Device Bridge/Veritas verifier when its endpoint and trusted issuer configuration are available. That authority must return a separately recorded decision before this result can advance beyond `PENDING_EXTERNAL_VERIFICATION`.
