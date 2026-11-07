# LeeWay Device Bridge native iPhone delivery

## Purpose

`apps/apple` is the LeeWay-owned native iOS adapter. It obtains `MTLDevice`, creates a command queue, dispatches the bundled Metal kernel, waits for completion, and checks the readback. This path is separate from the Safari PWA and its browser WebGPU probe.

The **Apple Device Bridge Qualification** workflow builds this source on a GitHub-hosted macOS runner with signing disabled. It then packages the compiled `.app` in the standard `Payload/` IPA layout as an unsigned artifact named `LeeWayDeviceBridge-unsigned.ipa`. The same artifact contains `LEEWAY-APPLE-PACKAGE-MANIFEST.json`, which records the source revision, IPA digest, included native capabilities, and unfulfilled governance gates.

## Archived alternate delivery lane

This document is retained as historical context only. It is not the active LeeWay Apple update route. Use [Apple direct iLoader delivery](./APPLE-DIRECT-ILOADER-DELIVERY.md) for current GitHub package installation.

An unsigned IPA is not installable by iOS by itself. It is an input to a signer such as the existing iLoader installation. iLoader signs an imported IPA using the owner’s Apple development identity and connected-device workflow; those credentials remain local and are never committed to LeeWay source or GitHub Actions.

1. Open the `apple-latest` GitHub release published from the successful **Apple Device Bridge Qualification** workflow.
2. Download `LeeWayDeviceBridge-unsigned.ipa` and `LEEWAY-APPLE-PACKAGE-MANIFEST.json`.
3. Verify the IPA SHA-256 against the manifest.
4. Import that IPA into the existing iLoader installation on the connected iPhone and let iLoader sign/install it.
5. Open **LeeWay Device** and choose **Run Device Bridge Metal Probe**.
6. Preserve the returned adapter ID, physical Metal device name, lane count, mismatch count, and timestamp as local native-observation evidence.

The iLoader route is USB-assisted and remains subject to Apple development-signing authorization. This affects distribution availability; it does not turn browser compute into native Metal or make a local probe a Formula or Veritas result.

## Evidence states

| State | Meaning |
| --- | --- |
| `UNVERIFIED` | The adapter has not successfully completed a direct Metal probe. |
| `LOCAL_READBACK_PASSED_PENDING_RECEIPT` | A native Metal dispatch and readback matched locally. External receipt verification remains required. |
| `FAILED` | The native probe did not establish a clean direct Metal result. |

The app must never report model inference, canonical Formula execution, Veritas approval, or a governed receipt unless those authorities actually run and return their own evidence.
