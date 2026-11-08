# Archived Apple SideStore preflight

This document is retained for historical troubleshooting evidence only. SideStore is not the active LeeWay Device Bridge installer or update channel.

## Current Apple preflight

Use [Apple direct iLoader delivery](./APPLE-DIRECT-ILOADER-DELIVERY.md) and [iLoader saved setup](./ILOADER-PERSISTENCE.md). Before importing a GitHub package:

1. Connect and unlock the intended iPhone over USB.
2. Confirm iLoader sees the intended device and remains logged in.
3. Preserve the existing pairing record and iOS Development certificate.
4. Download the current IPA and `LEEWAY-APPLE-PACKAGE-MANIFEST.json` from the GitHub `apple-latest` release.
5. Verify the IPA SHA-256 against the package manifest.
6. Use iLoader **Import IPA** to sign and install the package.
7. Open LeeWay Device Bridge, grant the requested permissions, and run the Metal probe for fresh native evidence.

An unsigned GitHub IPA is a package artifact, not proof of installation or execution. iLoader signing/install evidence, native launch evidence, Metal readback, and independent receipt verification remain separate gates.
