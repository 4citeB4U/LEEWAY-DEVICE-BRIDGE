# G19 — iPhone 11 local Metal receipt observed

**Date:** 2026-10-18  
**Device:** physical iPhone 11 (Apple A13 GPU), owner-supplied on-device photographs  
**Scope:** verify that the receipt-enabled LeeWay Device Bridge IPA, rather than the earlier probe-only IPA, is installed and producing a local receipt.

## Evidence inputs

| Input | SHA-256 |
| --- | --- |
| `codex-clipboard-2d28d14a-4281-4e3b-9f1c-da084185a1b9.png` | `5e1fc73df43071cdb841c98527cde950879bb4ccbaaf26bcaa2a84898d31f159` |
| `codex-clipboard-b6eceb48-288a-4c43-97aa-6ba7edc900a2.png` | `7b34f19b99728e481219431ce093f9a02992bf42db59c52b00d86cd34cc30455` |

The photographs show the receipt UI that was introduced by the receipt-enabled IPA. This is on-device observation supplied by the owner; the host did not remotely control the iPhone.

## Observed fields

| Field | Observed value |
| --- | --- |
| Adapter | `leeway.operator.ios` |
| Adapter state | `LOCAL_READBACK_PASSED_PENDING_RECEIPT` |
| Backend | `Metal` |
| Physical Metal device | `Apple A13 GPU` |
| Compute lanes | `256` |
| Mismatches | `0` |
| Receipt local result | `PASS` |
| Receipt verification | `PENDING_EXTERNAL_VERIFICATION` |
| Evidence-hash prefix | `483ec1ad7245790f...` |
| Receipt-hash prefix | `103fcaa17b744247...` |
| Export control | `Export local receipt` displayed |

## Package lineage

```text
artifact:        leeway-device-bridge-apple-unsigned-39151891434
source revision: 921c5f88f2a71fb16b594259b034974919083320
IPA SHA-256:     9457b8bd283f038546fb506bccd5b1d1f121892bc25addc7cc77e7ca90bb532f
workflow:        https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39151891434
```

## Acceptance result

**PASS — physical native Metal local observation and local receipt creation.**

The new receipt section and its two distinct hashes establish that the receipt-enabled IPA was installed and produced a persisted local record after the observed 256-lane Metal readback. The result is limited to the tested local Metal operation.

## Boundaries and next gate

The photographs show prefixes only. The complete exported JSON was subsequently received and its evidence and receipt hashes were independently recomputed. See [the local receipt integrity verification](G19-IPHONE11-LOCAL-RECEIPT-INTEGRITY-20261018.md). That replay does not establish a signature, canonical Device Bridge verification, Formula authorization, Runtime Fabric consumption, Veritas acceptance, model inference, or Learning Ledger admission.

**Next action:** submit the immutable exported receipt to the authorized Device Bridge/Veritas verifier when its endpoint and trusted issuer are available. The completed local integrity replay remains local until that external authority records acceptance.
