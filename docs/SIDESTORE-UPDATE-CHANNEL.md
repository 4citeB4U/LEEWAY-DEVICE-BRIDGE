# Archived Apple SideStore update channel

This file is retained as historical evidence only. SideStore is not the active LeeWay Device Bridge update route and is not required for current Apple package delivery.

Use [Apple direct iLoader delivery](./APPLE-DIRECT-ILOADER-DELIVERY.md) for the live path:

1. Open the GitHub `apple-latest` release.
2. Download `LeeWayDeviceBridge-unsigned.ipa` and verify its package manifest digest.
3. Import the IPA into the existing iLoader installation over USB.
4. Let iLoader sign and install the replacement on the connected iPhone.
5. Open LeeWay Device Bridge and run the Metal probe when a new native execution observation is required.

The current native app points to the GitHub release and iLoader instructions. No `sidestore://` URL or SideStore source is part of the active updater contract.
