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
