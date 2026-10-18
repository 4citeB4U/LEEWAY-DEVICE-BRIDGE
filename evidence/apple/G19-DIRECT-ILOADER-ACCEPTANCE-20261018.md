# G19 — Direct iLoader Apple delivery acceptance

**Date:** 2026-10-18  
**Acceptance goal:** prove that the qualified native LeeWay Device Bridge package can travel from the canonical GitHub release, through iLoader's owner-controlled signing route, onto the physical iPhone, and then launch for an observed Metal probe.

## Package identity

| Field | Value | State |
| --- | --- | --- |
| GitHub release | `apple-latest` | VERIFIED |
| Native adapter | `leeway.operator.ios` | VERIFIED from manifest |
| Bundle identifier | `industries.leeway.devicebridge` | VERIFIED from manifest |
| Version / build | `0.1.27` / `27` | VERIFIED from manifest |
| Source revision | `231db31095fdef31c5066bf37e6757a92f2de4cf` | VERIFIED from manifest |
| IPA digest | `833d88a1fb13248b326e39ac26b7c8fd02535202056d2824a47d413575eab007` | VERIFIED against downloaded IPA |
| Local proof copy | `C:\Users\Leona\Downloads\LeeWay-Apple-Proof-20261018\LeeWayDeviceBridge-unsigned.ipa` | OBSERVED |
| iLoader-ready copy | `C:\Users\Leona\Downloads\LeeWayDeviceBridge-0.1.27-build27.ipa` | VERIFIED copied and rehashed |

## Build and publication evidence

1. [Apple Device Bridge Qualification run 39158143870](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39158143870) completed successfully on a GitHub-hosted macOS runner.
2. Its native build, unsigned IPA packaging, and qualification-evidence steps completed successfully.
3. [Apple update-channel publication run 39158244959](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39158244959) completed successfully and published the IPA and manifest under `apple-latest`.
4. The local SHA-256 calculation matches the manifest and GitHub release digest exactly.

**Gate result:** `MACOS_SOURCE_BUILD` and `IPA_LAYOUT_AND_DIGEST` are **VERIFIED**.

## Controlled physical acceptance procedure

The following is the only uncompleted physical action. It deliberately uses the iLoader session already proven to authenticate and install on this iPhone.

1. Connect and unlock the iPhone over USB.
2. In iLoader, confirm the account remains logged in and the intended iPhone is selected.
3. Select **Import IPA**.
4. Choose `C:\Users\Leona\Downloads\LeeWayDeviceBridge-0.1.27-build27.ipa`.
5. Wait for iLoader to report that signing and installation completed.
6. On the iPhone, open **LeeWay Device Bridge** and run **Device Bridge Metal Probe** once.
7. Capture the post-install iLoader result and the app’s Metal observation/receipt screen.

## Acceptance criteria

| Gate | Required evidence | Current state |
| --- | --- | --- |
| Owner-controlled signing and install | iLoader success result for version 0.1.27 build 27 | PENDING PHYSICAL ACTION |
| Installed identity | iLoader iPhone inventory lists `industries.leeway.devicebridge` at the expected version/build | PENDING PHYSICAL ACTION |
| Native launch | LeeWay Device Bridge opens on iPhone | PENDING PHYSICAL ACTION |
| Physical Metal readback | New probe observes the actual device and zero mismatches | PENDING PHYSICAL ACTION |
| Independent receipt verification | A receipt validates through its authorized verifier | PENDING — separate gate |

## Boundary

This acceptance package contains Device Bridge and native Metal service. Its manifest explicitly declares Agent Lee runtime as `RUNTIME_NOT_INSTALLED`, and Formula, Veritas, and receipt authority as external requirements. This procedure proves a package-delivery and native-Metal lane only; it cannot prove Agent Lee inference or governed ecosystem execution by itself.
