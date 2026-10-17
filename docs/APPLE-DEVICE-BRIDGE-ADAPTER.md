# Apple Device Bridge adapter

## Identity and ownership

The iOS application is an implementation of the canonical `leeway.operator.ios` adapter inside `4citeB4U/LEEWAY-DEVICE-BRIDGE`. It is not a separate LeeWay Apple product and does not create a second device authority.

| Concern | Owner |
| --- | --- |
| Device contract, capability states, receipts | LeeWay Device Bridge |
| Formula authorization | Canonical Formula authority |
| iPhone execution and platform sandbox | iOS adapter under Apple rules |
| Physical GPU observation | Public Metal API on the device |
| App signing and TestFlight delivery | LeeWay Apple developer team and App Store Connect |

## Current implementation boundary

`apps/apple` is source-staged. It implements a public Metal probe: obtain `MTLDevice`, submit one deterministic compute kernel, wait for the command buffer, and compare the result on the CPU. The evidence includes the actual physical Metal device name separately from the Device Bridge adapter identity.

It does not contain or rely upon MLC Chat. It does not execute a model, choose an accelerator for a model, issue Formula decisions, verify a receipt signature, enumerate a virtual GPU, access another app's files, or control other iOS applications.

## GitHub Actions build lane

The canonical repository workflow `.github/workflows/apple-device-bridge-qualification.yml` uses a GitHub-hosted macOS runner. It generates the Xcode project from `apps/apple/project.yml`, builds the iPhone source with code signing disabled, and preserves the build log. This is source qualification only.

Before TestFlight delivery, configure the LeeWay Apple developer team, a Device Bridge App Store Connect record, certificate/provisioning credentials in protected GitHub secrets, and a dedicated signing workflow. The unsigned qualification workflow intentionally has no Apple credentials and cannot publish an app.

## Acceptance order

1. GitHub macOS runner compiles the Device Bridge iOS source.
2. A signed LeeWay Device Bridge archive reaches TestFlight through Apple-authorized distribution.
3. The physical iPhone completes the Metal probe with zero readback mismatches.
4. Device Bridge records the observation through its receipt boundary.
5. Formula authorization, a Device Bridge-owned local model runtime, and Veritas independently qualify an actual inference.
