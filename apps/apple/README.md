# LeeWay Device Bridge — Apple adapter

This is the iOS implementation path of the canonical LeeWay Device Bridge, not a separate Apple product or bridge authority. It uses the registered adapter ID `leeway.operator.ios` and the Apple bundle identity `industries.leeway.devicebridge`.

The source provides a direct Metal device probe, an owner-started native AVFoundation camera provider, and an owner-started token-authenticated local TCP transport. Camera frames are bounded JPEG data with SHA-256-bound local receipts for `vision.session.start`, `vision.frames.observe`, and `vision.session.stop`. The transport is off by default and requires the owner to pair the displayed endpoint and token; USB/WPD alone is not treated as a camera stream.

The native camera provider requires the owner to open LeeWay Device Bridge and grant Camera permission. It does not control arbitrary third-party apps, inspect other app screens, or bypass iOS privacy controls.

The model-runtime interface rejects requests until a LeeWay Formula grant verifier, a Device Bridge-owned local model runtime, and independent receipt verification are connected. A passing Metal readback remains local observation only.

The direct package guide is [docs/APPLE-CAMERA-PROVIDER.md](../../docs/APPLE-CAMERA-PROVIDER.md). It describes the published GitHub download, owner-controlled signing, explicit host pairing, and the remaining live qualification gate.

`project.yml` is an XcodeGen specification used only to create the Xcode project during development and in GitHub Actions. It is not part of the iPhone runtime. The GitHub qualification workflow builds and packages the unsigned IPA plus its digest-bound manifest. The `apple-latest` GitHub release is the current direct download channel for the owner-controlled signing/install path. It does not install an app or create a TestFlight build by itself.

## Consumer distribution branch — 2026-11-07

The existing SwiftUI app now includes a source-qualified Apple Sign in control, a nonce-bound identity-token handoff, a signed App Store build channel and iPad device-family support. The control remains hidden without a configured authoritative HTTPS Apple-session exchange URL, and even an accepted identity credential never grants native Device Bridge commands by itself.

`AppleUpdateCoordinator` keeps App Store upgrades under the `appstore` channel and iLoader/GitHub IPA instructions under the `developer-ipa` channel. The Apple native Metal and camera implementation is preserved. The unsigned IPA remains the developer delivery artifact; a published App Store listing and physical launch are not currently evidenced.

See [Apple consumer distribution](../../docs/APPLE-CONSUMER-DISTRIBUTION-20261107.md) and the existing [TestFlight setup](../../docs/APPLE-TESTFLIGHT-SETUP.md). Source and compilation qualification do not replace Developer Program membership, Apple approval, Runtime-issued sessions or independent Veritas.
