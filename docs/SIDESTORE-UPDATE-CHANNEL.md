# LeeWay Apple SideStore update channel

## What updates automatically

The LeeWay PWA is served from GitHub Pages. Its browser shell updates from GitHub when Safari retrieves the updated site and service worker.

Native Apple code is delivered differently. Each successful **Apple Device Bridge Qualification** build triggers the GitHub workflow **Publish Apple SideStore Update Channel**. That workflow publishes three immutable release assets under the stable `apple-latest` release tag:

- `LeeWayDeviceBridge-unsigned.ipa`
- `LEEWAY-APPLE-PACKAGE-MANIFEST.json`
- `sidestore-source.json`

The SideStore source reports the IPA’s actual bundle version, build number, SHA-256 manifest, date, and size. GitHub is the build and package authority; SideStore is the owner-controlled iPhone signer and installer.

## One-time phone setup

1. Ensure SideStore can sign and refresh applications and LocalDevVPN is connected.
2. On the LeeWay Device Bridge PWA, tap **ADD LEEWAY UPDATE CHANNEL**. It opens SideStore with the LeeWay source URL.
3. Add the source once. The app should appear as **LeeWay Device Bridge**.
4. Use SideStore’s update control when it reports a newer LeeWay version. Do not delete the installed app first; that preserves its local app data when SideStore can update the same bundle identifier.

> **Do not enter `sidestore-source.json` in an Anisette Server field.** It is a LeeWay app-update catalog, not an Apple-account authentication service. Anisette settings must use only the built-in SideStore/iLoader providers or an intentionally deployed Anisette endpoint.

## Boundaries

- SideStore may refresh the free development signing period in the background when its VPN and background conditions permit. Its refresh is separate from application-code updates. [SideStore FAQ](https://docs.sidestore.io/docs/faq)
- SideStore requires its LocalDevVPN when installing, updating, or refreshing applications. [SideStore prerequisites](https://docs.sidestore.io/docs/installation/prerequisites)
- iOS does not allow this app to download and execute replacement native code itself. The Apple package remains signed and installed through SideStore. [Apple App Review Guideline 2.5.2](https://developer.apple.com/app-store/review/guidelines/uk/)
- TestFlight is Apple’s managed automatic distribution route, but it requires an Apple Developer Program/App Store Connect distribution setup. [Apple TestFlight](https://developer.apple.com/testflight/)

This channel changes delivery mechanics only. It does not qualify Formula, Veritas, model inference, a call, email delivery, or a Device Bridge receipt.
