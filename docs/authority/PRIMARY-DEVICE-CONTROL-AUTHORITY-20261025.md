# LeeWay Device Bridge — Primary Device-Control Authority

LEEWAY HEADER — DO NOT REMOVE  
REGION: LEEWAY.DEVICE_BRIDGE.AUTHORITY  
TAG: DEVICE_CONTROL_PRIMARY_AUTHORITY  
WHAT: Establish the primary device-control boundary for LeeWay execution across supported hosts.  
WHY: Prevent duplicate device controllers and avoid confusing Formula, GPU, and observation layers with device authorization.  
WHO: LeeWay Industries — owner-directed architecture decision (2026-10-25).  
WHERE: Existing LeeWay Device Bridge and Runtime Fabric integration.  
HOW: Reuse existing trusted providers, explicit enrollment, request-bound evidence, and fail-closed dispatch.  
AUTHORITY: OWNER_APPROVED_ARCHITECTURE; not a substitute for cryptographic production enrollment.  
LICENSE: Existing repository terms.

## Authority allocation

**LeeWay Device Bridge is the primary device-control authority** for registered physical and software device interfaces. It owns the device command boundary: identify target and capability, authenticate caller, check creator-controlled permissions, admit or reject a command, route it to the registered device adapter, capture observed completion, and return correlated evidence.

- **Agent Lee** owns identity and conversation intent, not direct device-control authority.
- **Runtime Fabric** owns orchestration, request correlation, job lifecycle, and durable dispatch. It calls Device Bridge rather than bypassing it.
- **LeeWay Formula** owns canonical mathematical decisions, including owner-approved H-08 allocation and H-09 pressure/recovery candidate operations; it does not grant device permissions.
- **LDWMD** owns memory-resource lease accounting and does not act as a universal device command authority.
- **LeeWay GPU** supplies admitted compute/inference capabilities through Device Bridge's trusted provider contracts; preview or diagnostic routes never convey production authority.
- **Veritas** independently verifies admission and execution evidence; Device Bridge must not self-sign independent approval.
- **Continuum, Receipt Ledger, and Learning Ledger** provide the existing correlated persistence and readback stages.

## Command acceptance contract

The Device Bridge route must receive an authenticated principal, request/session ID, approved capability, target-device identity, scoped permission, signed/verified authority where required, resource budget, and timeout. Reject absent or mismatched fields, unsupported devices, stale grants, replays, unverified results, or mismatched receipt identities. Public payloads cannot nominate internal provider callbacks, device-control identity, transport secrets, or upstream authority.

For a governed operation, the same request must preserve the chain:
Agent Lee → Runtime Fabric → Formula (as applicable) → Device Bridge authority/admission → registered native/device/GPU adapter → independent Veritas POST → Continuum readback/commit → Receipt Ledger → Learning Ledger.

The returned completion status is **not** accepted unless the requested post-state and required authoritative receipts are verified. Read-only discovery and a 2xx HTTP response cannot certify completion.

## Platform scope

One policy across Windows, Linux, macOS, Android/Samsung, and iOS, with distinct registered native transports. Do not impose a Docker dependency. Do not require Termux, Shizuku, ADB, or an OS-specific setup for an already qualified LeeWay-native transport; qualify each actual device pathway by evidence.

## Preservation of prior evidence

This owner-approved architecture decision does not invalidate existing tested capabilities. In particular, preserve the H-08/H-09 source-verified owner-attested work in `4citeB4U/Leeway-formula-live` (commit `7548234a24e96b6133220de42907293bcd719108`) and its registration candidate (commit `3c87aecd6a0df129562a3570f4bb0c29ec21aacb`). Preserve Runtime Fabric native-core reconciliation evidence (commit `5d4bfd8f028edca5f9658127d7828f1762f7057f`) and Docker-free supervisor repair evidence (commit `a9e49bc26053f523be41c958c4a55b36e7019fcb`).

## Current verification boundary

This file records the owner's primary device-control authority decision and specifies a governed production acceptance contract. It **does not** establish that every live Device Bridge adapter has been enrolled, that a standalone H-08/H-09 production service is exposed, that independent Veritas signatures were issued, or that full end-to-end device execution has occurred. A live deployment must separately prove these facts; do not infer them from owner approval or diagnostic tests.
