# LeeWay Device Bridge native iPhone delivery

## Purpose

`apps/apple` is the LeeWay-owned native iOS adapter. It obtains `MTLDevice`, creates a command queue, dispatches the bundled Metal kernel, waits for completion, and checks the readback. This path is separate from the Safari PWA and its browser WebGPU probe.

The **Apple Device Bridge Qualification** workflow builds this source on a GitHub-hosted macOS runner with signing disabled. It then packages the compiled `.app` in the standard `Payload/` IPA layout as an unsigned artifact named `LeeWayDeviceBridge-unsigned.ipa`.

## Sideload delivery lane

An unsigned IPA is not installable by iOS by itself. It is an input to a signer such as SideStore. SideStore re-signs an imported IPA using the owner’s personal development certificate and its local device workflow. That certificate, the signing decision, and Apple Account credentials remain in SideStore and on the owner’s device; they are never committed to LeeWay source or GitHub Actions.

1. Open the successful **Apple Device Bridge Qualification** workflow run in GitHub Actions.
2. Download the `leeway-device-bridge-apple-unsigned-<run-id>` artifact.
3. Extract `LeeWayDeviceBridge-unsigned.ipa`.
4. Import that IPA into SideStore on the iPhone and complete SideStore's normal signing/install flow.
5. Open **LeeWay Device** and choose **Run Device Bridge Metal Probe**.
6. Preserve the returned adapter ID, physical Metal device name, lane count, mismatch count, and timestamp as local native-observation evidence.

With a free Apple Account, SideStore documents a three-app limit and a seven-day development signing period. SideStore must remain refreshed under its own documented process. This affects distribution availability; it does not turn browser compute into native Metal or make a local probe a Formula or Veritas result. [SideStore FAQ](https://docs.sidestore.io/docs/faq)

## Evidence states

| State | Meaning |
| --- | --- |
| `UNVERIFIED` | The adapter has not successfully completed a direct Metal probe. |
| `LOCAL_READBACK_PASSED_PENDING_RECEIPT` | A native Metal dispatch and readback matched locally. External receipt verification remains required. |
| `FAILED` | The native probe did not establish a clean direct Metal result. |

The app must never report model inference, canonical Formula execution, Veritas approval, or a governed receipt unless those authorities actually run and return their own evidence.
