# G19 — Apple Agent Lee capability-entry build

**Date:** 2026-10-18  
**Scope:** compile the first Apple-native Agent Lee system entry points while preserving the proven Metal path and platform boundaries.

## Implemented entry points

- `RunLeeWayMetalProbeIntent` exposes the LeeWay-owned native Metal probe to Siri and Shortcuts.
- The iPhone app provides owner-visible system handoffs for a supplied telephone number and drafted email. These open Apple’s configured Phone or Mail handler; they do not complete a call or send mail automatically.
- The app presents the actual Apple capability state, including the fact that arbitrary cross-app pointer, app-control, and screen-observation capabilities are unavailable in the iPhone adapter.
- The portable route for a later macOS adapter is documented separately: owner-approved Accessibility, Screen Recording, and native workspace APIs are required before Mac control may be claimed.

## Qualification evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused source contracts | PASS | 8 assertions passed locally, including the capability boundary, handoff, App Intent, receipt, PWA, package, and source-integrity checks. |
| macOS runner toolchain | PASS | GitHub macOS runner generated the Xcode project. |
| Native unsigned iPhone build | PASS | [Run 39154621016](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39154621016) completed in 54 seconds. |
| IPA layout and digest | PASS | Downloaded IPA digest matches the generated package manifest. |

## Qualified package

```text
artifact:        leeway-device-bridge-apple-unsigned-39154621016
source revision: ca2de1cdb80c62f3fc8c1af274dc2bc0fd64a78b
IPA SHA-256:     4381d33970a5a90d0042031090c915571011dce8e99205f2f5bae41ce0de2815
local download:  C:\Users\Leona\Downloads\LeeWay-Apple-Agent-Capability-Package-39154621016-v2\_temp\leeway-device-bridge-apple-package\LeeWayDeviceBridge-unsigned.ipa
```

## Truthful package boundary

The package manifest continues to declare:

```text
agentLeeRuntime: RUNTIME_NOT_INSTALLED
formula:          EXTERNAL_AUTHORITY_REQUIRED
veritas:          EXTERNAL_AUTHORITY_REQUIRED
receipt:          EXTERNAL_AUTHORITY_REQUIRED
```

The App Intent is a native Apple entry point for a LeeWay Device Bridge action. It is not a local language-model runtime, Formula grant, external Veritas result, or general cross-app automation service.

## Physical gates still required

1. Install this new IPA through the existing owner-controlled signing route.
2. Launch it once, then verify that **Run LeeWay Metal Probe** appears in Shortcuts and produces a fresh local receipt.
3. Test the Phone and Mail handoffs only with an owner-chosen destination and record the result as a system handoff, not as a completed call or delivered email.
4. Establish an authorized external receipt verifier before changing the current pending verification state.

## Contributor handoff

The bounded Apple lane was handed to the canonical C3 mission and contributor rendezvous after the build completed:

- [Runtime Fabric C3 issue #21 handoff](https://github.com/4citeB4U/Leeway-Runtime-Fabric/issues/21#issuecomment-6253958138)
- [LeeWay Contributor Coordination Hub #22 cross-link](https://github.com/4citeB4U/LeeWay-Agent-Skills/issues/22#issuecomment-6253958376)

The handoff records source refs, changed paths, the local and hosted test evidence, the physical iPhone receipt boundary, rollback, and the next physical qualification action. It does not advance C3, Veritas, or Learning Ledger status.
