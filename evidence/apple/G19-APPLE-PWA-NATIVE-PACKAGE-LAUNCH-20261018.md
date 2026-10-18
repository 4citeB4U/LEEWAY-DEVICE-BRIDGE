# G19 — Apple PWA native-package launch

**Date:** 2026-10-18  
**Scope:** make the qualified LeeWay native iPhone package reachable from the installed Apple PWA

## Change

The Apple PWA now separates two routes visibly:

1. **LeeWay PWA installation** remains the no-native-code Apple front door for browser diagnostics and the shared cloud workstation.
2. **LeeWay Apple Native Package** opens the current qualified GitHub Actions artifact run for the native Device Bridge IPA.

The package card identifies the exact artifact `leeway-device-bridge-apple-unsigned-39144353786`, source revision `9da1bae`, and the SideStore import and native Metal-probe sequence.

## Evidence boundary

The launch card proves that the PWA exposes the qualified delivery route. It does not prove that SideStore signed or installed the IPA, that the iPhone launched the native app, or that a physical Metal command completed. Those remain separate measured gates.
