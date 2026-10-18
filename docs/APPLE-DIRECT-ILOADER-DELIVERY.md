# Apple direct iLoader delivery

## Purpose

Deliver or update the native LeeWay Device Bridge IPA when SideStore's phone-side Apple Account session is unavailable. This is the currently verified Apple route for this iPhone.

## Why this route is active

iLoader on the Windows computer is authenticated, sees the connected iPhone, has an observed iOS Development certificate, and has already installed the native LeeWay Device Bridge. SideStore on the phone has a separate `-80045` sign-in blocker. The SideStore blocker does not prevent iLoader from signing and installing a LeeWay package through USB.

## iLoader source qualification

The installed Windows program is **iLoader 2.3.10**. On 2026-10-18, that is the official GitHub latest release and its release tag resolves to the same commit as the public `main` branch: `18907b1a801ed1d5aed3304c5477696c5d3ca411`.

Downloading the GitHub source or rebuilding it would therefore reproduce the same code already running on this computer. The 2.3.10 release updates the Anisette server list; it does not claim to repair SideStore's separate iPhone-side `-80045` sign-in failure. Preserve this functioning iLoader installation, certificate, and account session.

Sources: [official iLoader 2.3.10 release](https://github.com/nab138/iloader/releases/tag/v2.3.10) and [iLoader source repository](https://github.com/nab138/iloader).

## Delivery steps

1. Connect the iPhone to Windows over USB and unlock it if prompted.
2. Open iLoader and confirm the intended iPhone is selected and the account panel says **LOGGED IN AS**.
3. Keep the existing certificate and pairing file. Do not revoke them to prepare an ordinary LeeWay update.
4. Download the current `LeeWayDeviceBridge-unsigned.ipa` from the [LeeWay Apple release](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/tag/apple-latest).
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

This route is USB-assisted and depends on iLoader and Apple free-development signing. It is not automatic on-device updating. It provides a working LeeWay delivery path while SideStore's independent sign-in defect remains unresolved.
