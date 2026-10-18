# G19 — Apple native IPA delivery lane

**Date:** 2026-10-18  
**Owner:** LeeWay Device Bridge  
**Scope:** native iOS adapter delivery for a physical Metal observation

## Baseline

- `apps/apple` contains the LeeWay-owned `leeway.operator.ios` adapter.
- `MetalDeviceProbe.swift` uses the public Metal API to create the system device, command queue, compute pipeline, command buffer, and deterministic readback.
- GitHub Actions run `39142934955` passed the unsigned iPhone source compilation on a macOS runner.
- The passing compilation does not establish a physical iPhone install or a direct Metal dispatch.

## Repair

The Apple qualification workflow now packages the successfully built app in a standard unsigned IPA artifact. The artifact is intended for an owner-controlled signing route such as SideStore; it is not represented as an installable or Apple-signed binary by itself.

## Next acceptance gate

1. A subsequent macOS qualification run produces the IPA artifact and its build log.
2. SideStore accepts, signs, and installs the artifact on the physical iPhone.
3. The installed LeeWay Device Bridge app reports a native Metal observation with zero mismatches.
4. Independent receipt verification determines whether that local observation is admissible to the verified telemetry lane.

## Repair record

The first packaging qualification, GitHub Actions run `39143217756`, compiled the unsigned iPhone source successfully and created the IPA staging layout. Its final layout assertion failed because `rg` is not present on the GitHub-hosted macOS runner. The workflow now uses the runner's built-in `/usr/bin/grep` for that assertion. No iOS source, Metal kernel, signing material, or device state changed during this repair.

## Verified artifact result

GitHub Actions run `39143362972` passed on commit `bbe5d78`. It completed all required stages:

1. Recorded the macOS Apple build toolchain.
2. Rejected forbidden third-party runtime references from the iOS source boundary.
3. Generated the Xcode project.
4. Built the unsigned iPhone source.
5. Packaged and asserted the standard `Payload/LeeWayDeviceBridge.app/` IPA layout.
6. Preserved `LeeWayDeviceBridge-unsigned.ipa` and the unsigned Xcode build log in the run artifact `leeway-device-bridge-apple-unsigned-39143362972`.

**Result:** PASS — the native LeeWay Device Bridge IPA delivery artifact is available for owner-controlled SideStore signing and physical iPhone qualification.
