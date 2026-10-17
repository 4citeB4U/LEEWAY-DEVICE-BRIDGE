# G19 Apple PWA install-label verification

**Recorded:** 2026-10-17  
**Repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`  
**Purpose:** remove the ambiguity between the Apple Safari PWA and the Android-only APK.

## Repair

The prior published page led with an Android APK card and used a device-neutral browser-install label. That presentation could reasonably suggest that an Apple user needed an Android download.

The primary card now appears first and identifies the delivery route as:

```text
APPLE IPHONE / IPAD
Install LeeWay from Safari
INSTALL ON APPLE HOME SCREEN
```

It gives the exact Apple flow: open the page in Safari, tap Share, select Add to Home Screen, then tap Add. It explicitly states that there is no Apple file, APK, IPA, or Android download for this route.

The downloadable artifact below the Apple card is now labelled **ANDROID ONLY**. Its description states that it is not for Apple iPhone or iPad.

## Verification gate

The Apple PWA source test asserts the Apple heading, Apple Home Screen control, no-download boundary, native-Metal boundary, and Formula boundary. The existing Pages bootstrap contract remains a paired source check.

## Claim boundary

This label repair does not install an application on an iPhone. Physical installation and browser-compute observations remain separate gates.
