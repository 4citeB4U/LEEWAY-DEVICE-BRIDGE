# LeeWay universal package delivery — evidence checkpoint
Date: 2026-11-24
Authority: Existing LeeWay Creator > Standards > Runtime; outside contributor, not Agent Lee.
Owning mission: Engineering #6, Device Bridge #109, installer tracking #142.
Branch: integration/device-console-ui-promotion-20261124 (PR #141, draft/unmerged).

## INVESTIGATE / DIAGNOSE
Observed canonical source and GitHub distribution inventory:
- `docs/package-manifest.json` references 66,462,262-byte Android **debug** APK and
  `apple-latest/LeeWayDeviceBridge-unsigned.ipa`, 448,409 bytes.
- `tests/android-public-debug-release-hold.test.mjs` requires debug public auto-publication to remain disabled.
- Apple native manifest states `UNSIGNED_OWNER_CONTROLLED_SIGNING_REQUIRED`.
- Windows CI `leeway-windows-app-sdk.yml` tests a WinHTTP/UMD native development client; no verified public Windows installer exists.
- No verified Linux native release artifact or signed repository index exists.
- `docs/manifest.webmanifest` and `docs/sw.js` were scoped to the legacy `/docs/` app; the replacement `console-ui` lacked its own PWA manifest and registration.
- Android `AndroidManifest.xml` includes Accessibility, SYSTEM_ALERT_WINDOW, REQUEST_INSTALL_PACKAGES, RECORD_AUDIO, and background receiver/foreground-service controls. Not proof of malware, but material installer review surface. Do not silently remove intended capabilities.

## ATTACHED RESEARCH — EVIDENCE FOR / AGAINST
FOR: One universal *release coordination system* and one browser PWA can share product identity, UI, and protocol; platform-specific native adapters retain mandatory platform packaging and verification.
AGAINST:
- Generated `.mobileconfig` is not equivalent to Apple-signed native executable, and dynamic client-generated profiles are not a reliable trust replacement. No user/device token may be placed in a downloadable profile URL.
- Download methods that avoid Gatekeeper quarantine (`curl|sh`, Homebrew, clearing quarantine) are not evidence of native code safety.
- Winget, Android signature checks, GPG checksums, and signing certificates establish distribution/provenance properties, not guaranteed zero SmartScreen, Play Protect, or malware warnings.
- No Apple paid account: native widespread iOS customer distribution is not solved by an unsigned IPA; a free browser PWA is the supported low-friction product surface. Native iOS remains a separate entitlement/provisioning/install track.
- No PWA may claim background device capabilities equivalent to native adapters.

## PLAN / IMPLEMENT
1. Added optional owner-custodied Android release signing in `apps/android/app/build.gradle.kts` using four private environment bindings; release is non-debuggable.
2. Added manually triggered `android-signed-release-candidate.yml`: refuses unknown signing identity, builds release with Gradle, verifies APK signing, captures certificate, SHA-256, APK permissions, and preserves internal artifact for physical acceptance. Does **not** publicly publish automatically.
3. Added `console-ui/public/manifest.webmanifest`, `console-ui/public/sw.js`, product-root manifest and Safari icon meta tags, optional worker registration; public static assets alone are cached; no identity, API, customer or device responses.
4. Pages workflow copies the two existing canonical PNG icons and verifies install-manifest/worker presence.
5. Added `tests/universal-release-source.test.mjs` to retain Android sign-state and PWA distribution boundaries.
6. Existing UI PR #141 fixes mislabeled unsigned/debug download links and legacy manifest preservation, without pretending signed native installers exist.

## TEST / VALIDATE / REPAIR / RETEST / VERIFY
Source CI: pending final PR head at this checkpoint. Report exact run ID and outcomes after completion; successful tests do not constitute physical package trust.
DO NOT claim a new signed APK has been generated: release signing secrets, original certificate lineage, and signed package acceptance have not been observed.
DO NOT claim Apple IPA, Windows or Linux package physical installation; none executed.

## EVIDENCE / CHECKPOINT / CONTINUE
Original evidence: canonical `docs/package-manifest.json`, `apps/apple/AppleNativePackageManifest.json`, `.github/workflows/android-build.yml`, `apps/android/app/src/main/AndroidManifest.xml`, `docs/manifest.webmanifest`, and GitHub Releases `apple-latest`.
New evidence: PR #141 branch commits and `tests/universal-release-source.test.mjs`.
Remaining:
- Approved original Android release signing custody and upgrade-certificate lineage; static/behavior scans, Play Protect device check, Samsung owner-consent install, negative permission tests, independent receipt.
- Separate signed Windows MSI/MSIX with genuine native service, installer tests and Microsoft reputation observation.
- macOS signed/notarized app if required; Apple iOS native provisioning/install; optional PWA tested on physical Safari without paid native distribution.
- Linux actual adapter executable, architecture-specific .deb/.rpm/AppImage, signed repository/update channel, physical distro qualification.
- Exact approved release manifest URLs only after artifact exists, matching SHA/size/signature and readback from original custodian.
- Runtime owner-session and Gate 1 transport signing remain independently governed, not a shortcut through a public download.
- No automatic native installation, privacy bypass, quarantine removal, or security-scan suppression.
