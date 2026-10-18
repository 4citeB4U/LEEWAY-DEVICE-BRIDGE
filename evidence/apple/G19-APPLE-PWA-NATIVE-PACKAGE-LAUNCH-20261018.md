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

## Publication and workstation evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| PWA source checks | PASS | `apple-pwa-source`, Pages contract, Apple package contract, and source-integrity checks passed locally before publication. |
| Git revision | PASS | Commit `264d946` (`Expose qualified Apple native package in PWA`) was pushed to `main` and the Apple qualification branch. |
| GitHub Pages deployment | PASS | [Pages run 39144910642](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39144910642) completed successfully. |
| Live PWA content | PASS | The deployed page contained the native-package heading, launch control, artifact name, and source revision. |
| Shared Apple workstation | PASS | Codespace `ubiquitous-spork-v66w6445jvv6crxr` fast-forwarded to commit `264d946`. |
| Secondary workstation gate | PASS | [Gate run 39144911846](https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs/39144911846) completed successfully. |

## Delivery sequence for the iPhone

1. Open the installed LeeWay PWA and select **Open Current Native Package**.
2. Download the IPA and its `LEEWAY-APPLE-PACKAGE-MANIFEST.json` from the named artifact.
3. Import the IPA through SideStore, which signs and installs it for the selected Apple account.
4. Open the installed **LeeWay Device** native app and select **Run Device Bridge Metal Probe**.
5. Preserve the generated observation and receipt material before declaring native Metal, Formula, Veritas, or governed Agent Lee execution complete.
