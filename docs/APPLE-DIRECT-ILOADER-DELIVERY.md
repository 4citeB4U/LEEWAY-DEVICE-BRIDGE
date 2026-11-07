<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_DISTRIBUTION
TAG: LEEWAY.APPLE.ILOADER.DIRECT_DELIVERY
5WH:
WHAT = Explain the official LeeWay iOS IPA and the existing iLoader owner-controlled install handoff.
WHY = Distinguish a downloadable native release from signed installation and physical qualification.
WHO = LeeWay Device Bridge contributors under Creator and LeeWay Standards.
WHERE = docs/APPLE-DIRECT-ILOADER-DELIVERY.md.
WHEN = 2026-10-18 initial route; 2026-11-07 direct Apple download source reconciliation.
HOW = Published artifact identity, source inspection, explicit consent and independent post-install proof.
LICENSE = LeeWay repository terms; upstream iLoader source MIT, branding separately restricted.
-->
# Apple direct iLoader delivery

## Purpose

Deliver or update the native LeeWay Device Bridge IPA from GitHub through the existing iLoader installation. The route has historical owner-host success evidence. Its current availability, selected iPhone, account, and signing state require fresh host preflight before every physical install.

## Why this route is active

Owner-host observations dated 2026-10-18 recorded an authenticated Windows iLoader installation, a selected physical iPhone and an iOS Development certificate; an earlier native LeeWay install was observed. These historic findings must not be treated as proof that the current host is connected, signed in or capable of another install. Preserve the existing certificate, pairing records and installed app.

## iLoader source qualification

The installed Windows program is **iLoader 2.3.10**. On 2026-10-18, that was the official GitHub latest release and its release tag resolved to the same commit as the public `main` branch: `18907b1a801ed1d5aed3304c5477696c5d3ca411`.

Downloading the GitHub source or rebuilding it would therefore reproduce the same code already running on this computer. The 2.3.10 release updates the Anisette server list. Preserve this functioning iLoader installation, certificate, and account session.

Sources: [official iLoader 2.3.10 release](https://github.com/nab138/iloader/releases/tag/v2.3.10) and [iLoader source repository](https://github.com/nab138/iloader).

## Delivery steps

1. Connect the iPhone to Windows over USB and unlock it if prompted.
2. Open iLoader and confirm the intended iPhone is selected and the account panel says **LOGGED IN AS**.
3. Keep the existing certificate and pairing file. Do not revoke them to prepare an ordinary LeeWay update.
4. Press **Download LeeWay Apple App (.IPA)** on the Device Bridge Apple tile; it points directly to [LeeWayDeviceBridge-unsigned.ipa](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/LeeWayDeviceBridge-unsigned.ipa), not the GitHub landing page. Verify the SHA-256 against the canonical `docs/package-manifest.json` and the GitHub release's artifact digest.
5. In iLoader choose **Import IPA** and select that downloaded LeeWay IPA.
6. Let iLoader sign and install it. Capture the result screen.
7. On the iPhone, open LeeWay Device Bridge and run the Metal probe only if a new native execution observation is required.

## Acceptance gate

| Check | Required evidence |
| --- | --- |
| Package identity | GitHub release and manifest identify the intended LeeWay build |
| Install | iLoader reports successful signing and installation |
| Native launch | LeeWay Device Bridge opens on the iPhone |
| Metal claim | A new probe receipt is required before claiming the new build executed Metal |

## Boundary

This route is USB-assisted and depends on iLoader and Apple development signing. It is not automatic on-device updating: GitHub supplies the IPA, the app prompts the owner, and iLoader performs the signed install.

## 2026-11-07 source-level iLoader investigation and LeeWay handoff

The existing [LeeWay REA skill](https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/skills/leeway-rea-reverse-engineering/SKILL.md) remains the canonical skill. **REA CLI/MCP execution against iLoader was NOT_EXECUTED in this ChatGPT session**; this investigation used read-only upstream GitHub source inspection, not binary decompilation, installed-session credentials or physical iPhone telemetry.

Upstream source at `nab138/iloader` commit `96ed06124d7a859692a5ec2864e1b47998d4904c` was inspected:

- `src-tauri/src/device.rs` (blob `c62e6ca50836401e64cda6b1cb87e256e217d190`) selects an `idevice` USBMux/lockdown device provider; that is a native-host boundary, not a web-page feature.
- `src-tauri/src/account.rs` (blob `28749e79a0f877313ceb8236fd7e03d4283bfa90`) composes Apple account authentication, anisette, development certificates and OS keyring storage. LeeWay must not copy secret material or silently re-register accounts.
- `src-tauri/src/pairing.rs` (blob `9b29d9f9fa6361b8d15b93abc92a9cc5a06d37a3`) manages pairing and companion services; device trust belongs to its authorized host.
- `src-tauri/src/sideload.rs` (blob `03f02c4eb5e00e63b2e6496ed7519eba9081fd4f`) implements the Tauri `sideload_operation`; its internal path calls `isideload::Sideloader::install_app` with the selected device provider and pairing record.
- `src-tauri/src/lib.rs` (blob `b217fe90539fb81c16a6b6a37002fb31d2615771`) registers that Tauri command for the application's own frontend. No supported external iLoader CLI or deep-link installer operation was found in the inspected source, so the browser cannot truthfully invoke the internal command.

The iLoader software source is MIT-licensed (blob `78a8b6b5590d0df1d0f9e30a475a88e7069c3df7`); its name and visual branding have separate limits (blob `43c5f5f787e0de8e7a4124f370fd7434405885e7`). This LeeWay repair imports **no upstream implementation code or branding**. Upstream reference: [nab138/iloader](https://github.com/nab138/iloader).

The public Apple tile is owned by `docs/index.html`, `docs/apple-download.js` validates `docs/package-manifest.json`, and the existing `operator/installation-adapter.mjs` now plans an Apple release handoff only when the caller supplies a **freshly measured** IPA digest, observed device/provider preflight and explicit owner approval. A copy of the published SHA-256 is not a measured local digest. The resulting plan is deliberately `executable: false`; it is not proof that iLoader was invoked.

**Still unfulfilled:** a production-authorized host-side signing/install executor, actual USB or other supported Apple distribution connection, real on-device package/version readback, fresh Metal execution and independent Veritas/Receipt Authority admission. iLoader sideloading does not enable arbitrary users to bypass Apple's per-device trust, authentication, code-signing or provisioning requirements. Wider public installation would require a separately qualified Apple-sanctioned distribution lane such as the existing TestFlight workflow with valid account, signatures and provisioning.
