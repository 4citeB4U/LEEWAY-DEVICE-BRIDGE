# LeeWay iPhone native camera provider

The Apple package now includes a native, owner-started AVFoundation camera provider.

## What is included

- Camera permission declaration in the generated iOS app plist.
- Back-camera and front-camera selection inside LeeWay Device Bridge.
- Live local preview after the owner grants Camera permission.
- Bounded JPEG frames, maximum 8 MiB per frame.
- SHA-256 frame binding.
- Local receipt records for camera session start, frame observation, and physical stop.
- An owner-started local TCP camera transport protected by a per-installation pairing token. The transport exposes only `vision.sources.list`, `vision.session.start`, `vision.frames.observe`, and `vision.session.stop`.
- The unsigned IPA and `LEEWAY-APPLE-PACKAGE-MANIFEST.json` in the `apple-latest` GitHub release channel after the qualification workflow succeeds.

## What is not silently claimed

The iPhone app is a native camera provider, not a remote-control bypass. The current package does not claim arbitrary cross-app UI control or cross-app screen observation. The host transport is local-network TCP, owner-started, token-authenticated, and explicitly paired; it does not create a public relay or turn USB/WPD presence into a camera stream.

## Pair the host Device Bridge

1. Install and launch the qualified package, grant Camera and Local Network permission, then open **Camera**.
2. Tap **Start Host Camera Bridge**. Keep the displayed pairing token private and note the displayed TCP port.
3. In the owner-controlled Device Bridge configuration, add `cameraEndpoint` as `tcp://<iPhone-local-address>:<port>` and `cameraTokenEnv` as the name of an environment variable containing the displayed token. Grant the four `vision.*` capabilities only after that pairing is intentionally enrolled.
4. Use `vision.sources.list`, `vision.session.start`, `vision.frames.observe`, and `vision.session.stop` through the governed Device Bridge. The host validates the returned JPEG signature, dimensions, and SHA-256 before producing MCP image content.

Example shape (replace every placeholder; do not commit the token):

```json
{
  "id": "iphone-camera",
  "type": "physical-apple",
  "platform": "ios",
  "hardwareId": "OWNER_ENROLLED_USB_ID",
  "cameraEndpoint": "tcp://IPHONE_LOCAL_ADDRESS:PORT",
  "cameraTokenEnv": "LEEWAY_IPHONE_CAMERA_TOKEN",
  "grants": ["device.health", "device.info", "vision.sources.list", "vision.session.start", "vision.frames.observe", "vision.session.stop"]
}
```

## Owner download path

1. Open the successful **Apple Device Bridge Qualification** workflow run in GitHub Actions.
2. Use the published `apple-latest` release and download `LeeWayDeviceBridge-unsigned.ipa` plus `LEEWAY-APPLE-PACKAGE-MANIFEST.json`.
3. Keep the manifest digest with the IPA.
4. Sign and install through the owner-controlled Apple route already qualified for this workstation.
5. Open LeeWay Device Bridge on the iPhone, grant Camera permission, and use **Open Camera**.

The package being downloadable is evidence of source/build publication. It is not evidence that the IPA is installed, trusted, running, paired to the host Bridge, or production-qualified for remote camera frames. A macOS GitHub build and source tests do not replace owner installation, a real paired iPhone session, advancing frame, physical stop, and independent receipt verification.
