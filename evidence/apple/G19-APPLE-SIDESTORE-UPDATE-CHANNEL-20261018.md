# G19 — Apple SideStore update channel qualification

**Date:** 2026-10-18  
**Scope:** publish qualified unsigned iPhone builds from GitHub into one stable LeeWay SideStore update channel.

## Delivery design

The channel uses one portable delivery sequence:

```text
source change on main
  -> GitHub macOS Apple qualification build
  -> generated versioned IPA + manifest
  -> GitHub release asset replacement at apple-latest
  -> SideStore source refresh/update discovery
  -> owner-controlled SideStore signing and iPhone installation
```

GitHub builds, hashes, and publishes. SideStore remains the local Apple Account signer and installer. The installed native app does not replace its own executable code.

## Implemented controls

- Added explicit `CFBundleShortVersionString` and `CFBundleVersion` generation to the iOS target.
- Qualified builds receive `0.1.<GitHub run number>` and the run number as their build identifier.
- The generated package manifest carries the exact version and build alongside the source revision and SHA-256.
- Added **Publish Apple SideStore Update Channel**, which runs only after a successful `main` Apple qualification build and publishes a stable `apple-latest` GitHub release.
- The PWA now exposes **ADD LEEWAY UPDATE CHANNEL**, a one-time `sidestore://` source link.

## First published release

| Field | Observed value |
| --- | --- |
| Qualification build | [39158142452](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39158142452) — PASS |
| Channel publisher | [39158244959](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39158244959) — PASS |
| Stable release | [apple-latest](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/tag/apple-latest) |
| Source revision | `231db31095fdef31c5066bf37e6757a92f2de4cf` |
| IPA version / build | `0.1.27` / `27` |
| IPA SHA-256 | `833d88a1fb13248b326e39ac26b7c8fd02535202056d2824a47d413575eab007` |
| IPA size | `205066` bytes |
| SideStore source | [sidestore-source.json](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/sidestore-source.json) |

The generated SideStore source names the same bundle identifier, declares version `0.1.27`, and points to the same release IPA and matching package manifest digest.

## Verification

- Focused source contracts: **10/10 PASS**.
- Versioned IPA source build and IPA layout/package: **PASS** on the GitHub macOS runner.
- Source JSON and package manifest were fetched from the published release and checked for matching bundle identifier, version, source revision, IPA file, and SHA-256.

## Physical acceptance still required

The owner must add the source to SideStore once and use SideStore’s update control for the installed app. The first source-managed update and later automatic background refresh/update discovery have not yet been observed on the physical iPhone.

This delivery result does not qualify native Metal execution, Formula, Veritas, local model inference, a system call/email, or Learning Ledger admission.
