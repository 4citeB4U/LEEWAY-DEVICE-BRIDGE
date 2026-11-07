<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_CUSTOMER_DELIVERY
TAG: LEEWAY.APPLE.CONSUMER_AND_NATIVE_INSTALL_BOUNDARIES
5WH:
WHAT = Explain the one-LeeWay Apple customer distribution and controlled native signing routes.
WHY = Keep general App Store onboarding separate from managed/developer sideloading while preserving existing Metal code.
WHO = LeeWay Industries owner and contributors.
WHERE = docs/APPLE-CONSUMER-DISTRIBUTION-20261107.md.
WHEN = 2026-11-07.
HOW = Native Swift UI, Apple OIDC exchange, Runtime authority, App Store Connect, optional C3-gated Rust installer.
LICENSE = MIT. Upstream isideload 0.5.2 remains an MIT third-party dependency.
-->

# Apple customer delivery — canonical Device Bridge architecture

**One native LeeWay iOS app, one canonical Runtime Fabric, one Device Bridge.** Public customers should not be required to enter Apple Developer account credentials, use USB, import IPAs, or interact with iLoader. Apple App Store distribution is the general audience path. The developer IPA and physical signing worker are controlled test/managed-device facilities, not substitutes for App Review.

## Customer route and current qualification

1. LeeWay Industries owns App ID `industries.leeway.devicebridge` and publishes an Apple-signed build of the existing `apps/apple` target through App Store Connect. `.github/workflows/apple-device-bridge-testflight.yml` already prepares an App Store export/upload, subject to the actual paid Developer Program enrollment, a registered App ID, Sign in with Apple capability, distribution key, provisioning profile, App Store Connect app record and private credentials. The workflow never substitutes a fake identity when unavailable.
2. The App Store listing URL is stored as a real owner-confirmed `packages[apple-native].consumerDistribution` reference inside `docs/package-manifest.json`, not generated from the GitHub project address. `docs/apple-download.js` only offers the public install link when the listing metadata is valid and its host is `apps.apple.com`. The currently published manifest says `NOT_PUBLISHED`; no customer install success is claimed.
3. The native `AppleSignInCoordinator` uses Apple's `AuthenticationServices` and Sign in with Apple entitlement. The Apple password is never collected by LeeWay. A nonce-bound ID token is accepted only as material to hand to a configured, HTTPS LeeWay identity authority; the client never treats a token as an MCP access token or native device grant. The current Runtime exchange contract is `POST /v1/device-bridge/apple/session`. **A production implementation and authoritative returned session are not yet verified.** The button is hidden in builds lacking an approved endpoint.
4. LeeWay Device Bridge enrollment, device identity, permission scope, compliance cards, Formula and Veritas gates still run through the existing canonical Runtime Fabric and Device Bridge. Apple login alone does not enroll a device or authorize privileged commands. The existing native Metal probe, camera and receipt code remain intact, but a new App Store build needs its own physical, hash-linked readback.
5. The public App Store edition uses `LEEWAY_APPLE_DISTRIBUTION_CHANNEL=appstore` and `AppleUpdateCoordinator` delegates future updates to Apple. The separate `developer-ipa` edition uses GitHub's unsigned IPA and may use host-authorized sideloading. No App Store customer should be instructed to update via iLoader.

## Native developer / managed-device route

1. An authorized host obtains `LeeWayDeviceBridge-unsigned.ipa` from the existing `apple-latest` release. Its SHA-256 must match both the manifest and locally downloaded bytes.
2. `operator/installation-adapter.mjs` still provides read-only probe/classification/plan; its legacy `executeInstallation()` functions remain `NOT_IMPLEMENTED`, and must not be silently misrepresented. New executable ownership is separate: the canonical MCP schema `device.apps.install.apple`, `PhysicalAppleAdapter`, and a trusted injected `appleInstallProviders` Map route through the **existing** `Bridge.call` admission and receipts. By default no provider is installed and no command executes.
3. The optional `operator/native-apple-installer/runtime-provider.mjs` expects a real physically-probed mapping between the enrolled USB hardware identity and `usbmuxd` UDID, an owner-approved Runtime decision, a private signing-credential callback, exact IPA and worker-binary measurements, and a private two-factor callback. It refuses unknown installed-app bundle ownership or signing-team drift. It has no public HTTP listener and keeps credentials out of MCP requests.
4. `operator/native-apple-installer` is a LeeWay-owned Rust worker importing the separately licensed MIT `isideload` crate. It requests Apple's normal authentication and provisioning, signs and installs to the exactly selected phone, and queries the native InstallationProxy for the signed LeeWay bundle. It does not grant certificate revocation, trust reset, app erasure, automatic entitlement elevation, or Apple sandbox bypass.
5. A successful native worker response remains **`HOST_INSTALL_OBSERVED_VERITAS_PENDING`**. Physical iOS launch, Metal receipt, independent Veritas POST, canonical receipt custody, and actual account/session pairing still require live qualification. Fake test fixtures must not count as physical evidence.

## Non-negotiable production gates

- **Owner Apple enrollment:** Developer Program membership, current Apple agreements, approved App ID with Sign in with Apple enabled, App Store Connect app and an exact published listing URL.
- **Identity:** a live, independently validated Apple token exchange bound to the existing LeeWay identity/Runtime authority, plus session revocation, nonce replay prevention, correct audience/issuer/signature validation, and live wrong-token tests.
- **Native distribution:** CI-signed IPA, verified entitlements and profile, App Store Connect processing, App Review approval and public customer installation; no arbitrary developer-password collection for customer onboarding.
- **Physical acceptance:** selected physical iPhone and iPad, app installation/launch, active Device Bridge session, owner consent and native Metal probe, fresh release digest-linked receipts and independent Veritas.
- **Scale:** verified multi-tenant isolation, authentication throughput, per-device scope, traffic budgets, data retention, load/recovery tests, plus rate-limiting/observability at measured target traffic. An architecture statement is not a 700-user or 15-million-user load test.
- **No universal machine identity:** all paths, worker binaries, secrets and USB mappings are owner-host deployment bindings, never hardcoded local host assumptions.

## Current limits

Source changes and CI are **not** a public App Store release. GitHub-hosted macOS compilation does not have the owner's Apple distribution identity or a connected iPhone. The current in-session Device Bridge owner-scoped connector provides read-only tools and previously returned `LEEWAY_BRIDGE_DISCOVERY_REGISTRATION_UNVERIFIED`; it cannot approve or execute the physical installation. Credential and certificate material must not be pasted into chat or the repository.

**Original mission remains open until the live source/identity/publisher/physical gates are evidenced.** The draft PR and issue #37 retain the execution chain and exact failures; do not create a rival runtime or abandon existing qualified work.


## Amendment — direct free-account sideload delivery takes priority

The earlier App Store-first framing is **not a mandatory prerequisite for the Creator-approved LeeWay installer**. The primary near-term Apple distribution work is the first-party native host installer (Windows/macOS/Linux), which uses the free Apple Account and its Personal Team via `isideload` in the canonical Device Bridge. No paid Developer Program, App Store Connect record, or App Review is required for this direct sideload lane. Device USB pairing, Apple authentication/2FA and temporary development provisioning still apply, and this cannot guarantee zero-touch on-device installs for millions of unrelated iPhones.

The App Store route described above is an **optional later mass-distribution channel**, with its distinct Apple requirements. The first-party installer build artifacts, source-gated release publisher and Apple-tile distribution manifest are governed under PR #95; only real uploaded binaries make the links available. Keep installed app identity and Metal source intact. Production acceptance remains physical device and independent Veritas specific to the selected distribution lane.
