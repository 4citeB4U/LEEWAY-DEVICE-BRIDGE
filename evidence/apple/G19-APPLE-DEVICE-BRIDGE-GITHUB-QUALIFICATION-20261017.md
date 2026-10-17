# G19 Apple Device Bridge — GitHub macOS qualification

**Date:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Branch:** `feature/apple-device-bridge-qualification-20261017`  
**Commit:** `c22faefb57c0c9ac3cc4bba0f27ad60b822ef0b5`  
**Workflow:** [Apple Device Bridge Qualification run 39007737805](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39007737805)

## Purpose

Qualify the LeeWay Device Bridge iOS adapter source with a GitHub-hosted macOS runner without using Apple signing credentials. This is the canonical Device Bridge route; it does not create a separate Apple authority or product.

## Result

| Check | Result |
| --- | --- |
| GitHub macOS job | PASS — completed in 53 seconds |
| Apple toolchain recording | PASS |
| Third-party runtime identifier gate | PASS — no MLC, llama.cpp, ExecuTorch, or MLX identifier in `apps/apple/Sources` |
| Xcode project generation | PASS |
| Unsigned generic iPhone build | PASS — `BUILD SUCCEEDED` |
| Artifact retention | PASS — 30-day Actions artifact and repository evidence copy |

The build produced an arm64 iPhone application with bundle identity `industries.leeway.devicebridge`, deployment target iOS 17.0, and Device Bridge source under `apps/apple`. The source contains a direct public-Metal compute/readback probe and a fail-closed Formula-authorized model-runtime interface.

## Artifact binding

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `evidence/apple/github-actions-39007737805/xcodebuild-unsigned.log` | 75,511 | `325709596F00CF5B358D7424D63EF0B5FDAFA614CFC0CE0F1156429AABBE1A5F` |

The log records the iPhone SDK build, `LeeWayDeviceBridge` product, `industries.leeway.devicebridge` bundle identity, and final `BUILD SUCCEEDED` marker. It also contains one expected App Intents metadata warning because the current adapter does not yet link App Intents or define App Shortcuts.

## Boundaries preserved

- No MLC Chat code, binary, model, entitlement, branding, or app data was included.
- No Apple certificate, provisioning profile, Apple ID, secret, or signing key was used by the workflow.
- No TestFlight archive, App Store upload, iPhone installation, Metal execution, Formula decision, model inference, or Veritas receipt was claimed.
- The iOS adapter remains `PARTIAL` with `UNVERIFIED` evidence state until the remaining acceptance gates are met.

## Next acceptance gate

Create a separately protected signing-and-TestFlight workflow after the LeeWay Apple developer team, Device Bridge App Store Connect record, signing certificate, provisioning profile, and secret-storage policy are in place. That future workflow must remain in this Device Bridge repository and publish only a LeeWay Device Bridge application.
