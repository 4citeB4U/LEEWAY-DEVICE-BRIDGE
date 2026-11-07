# LeeWay Device Bridge package update protocol

The canonical update manifest is `docs/package-manifest.json`, published by GitHub Pages. It is public discovery metadata, not a credential store, receipt authority, or permission grant.

## Common update contract

Each native package checks the manifest when it is foregrounded and when its owner-authorized bridge reconnects, subject to the six-hour cache interval. A newer package is downloaded over HTTPS, checked against the manifest SHA-256, and handed to the platform-native installer only after the owner confirms. No package silently replaces itself, removes app data, or treats a download as an installed update.

The workflows publish package bytes and metadata from the same GitHub source revision. The package manifest records the platform route, version, build, size, digest, source, and owner-install boundary.

## Platform routes

- **Android:** the native app checks GitHub Pages, downloads the verified APK, and opens Android's package installer after the owner presses **Update**. Android may require the owner to allow installs from this source. The installer confirmation and the resulting package replacement remain Android evidence, not a silent LeeWay action.
- **iPhone/iPad:** the native app checks GitHub Pages and can prompt the owner to open the GitHub `apple-latest` release or copy the IPA URL. The owner imports that GitHub IPA into the existing iLoader installation, which signs and installs it over USB. iOS does not permit an ordinary app to download and replace its own signed executable; GitHub is the package source, while iLoader remains the Apple signing/install authority.
- **Web/PWA:** GitHub Pages plus the service worker is the update route. The browser checks for a new service worker and refreshes the shell on the next app lifecycle; no native package is required.
- **Windows, macOS, and Linux:** this repository currently publishes no native Device Bridge package for these platforms. Their manifest routes are `SOURCE_ONLY`; the PWA or owner-managed source checkout may update from GitHub, but no native self-installer is claimed.
- **Read-aloud Android companion:** it has a separate GitHub Actions APK channel and is not silently folded into the Device Bridge package identity. It must receive its own package entry before a unified updater can claim it.

## Evidence boundary

`UPDATE_AVAILABLE`, `DOWNLOAD_VERIFIED`, `INSTALLER_OPENED`, `OWNER_CONFIRMED`, `PACKAGE_REPLACED`, and `RUNTIME_RECONNECTED` are separate states. A GitHub Actions success, a release asset, or a SHA-256 match does not prove that a phone installed or started the new package.
